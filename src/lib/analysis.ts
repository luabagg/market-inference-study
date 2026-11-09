/**
 * Server-side numbers for the demo pages. Each page renders these as plain
 * props, so the browser never runs the study, the 200-sample comparison or the
 * bias check. Results are memoized per process: the frame and seeds are fixed.
 */
import { type Estimativa, motor } from "@/estatistica";
import { getPopulation, getStatePopulation } from "@/data/population";
import { PRODUCTS, type ProductId } from "@/data/products";
import { STORE_TYPES, type StoreType } from "@/data/stores";
import { ANALYSIS, STUDY } from "@/data/study-plan";
import { compareProfiles, coverageBias } from "@/sampling/coverage";
import { averageEpa, compareMethods, recommendedDesign } from "@/sampling/methods";
import { type GroupEstimate, runStudy } from "@/sampling/study";

const figure = (e: Estimativa) => ({ value: e.estimativa, low: e.ic[0], high: e.ic[1], margin: e.margem });
export type Figure = ReturnType<typeof figure>;
export type FigureRow = Figure & { label: string };

const rows = (groups: GroupEstimate[]): FigureRow[] => groups.map((g) => ({ label: g.label, ...figure(g.estimate) }));

const memo = <T,>(compute: () => T) => {
  let value: T | undefined;
  return () => (value ??= compute());
};

export const getDashboardData = memo(() => {
  const study = runStudy(motor, getPopulation(), STUDY);
  const line = (id: `${"premium" | "popular"}:${ProductId}`) => {
    const e = study.estimate(id);
    return { overall: figure(e.overall.estimate), byRegion: rows(e.byFirst), byIncome: rows(e.bySecond) };
  };
  const ticket = study.estimate("ticket");
  const monthly = study.estimate("monthly");
  const storeTypes = Object.keys(STORE_TYPES) as StoreType[];
  return {
    N: study.N,
    m: study.m,
    strata: study.strata.length,
    products: Object.fromEntries(
      PRODUCTS.map((p) => [
        p.id,
        { premium: line(`premium:${p.id}`), popular: line(`popular:${p.id}`), outra: figure(study.estimate(`outra:${p.id}`).overall.estimate) },
      ]),
    ) as Record<ProductId, { premium: ReturnType<typeof line>; popular: ReturnType<typeof line>; outra: Figure }>,
    ticket: { overall: figure(ticket.overall.estimate), byIncome: rows(ticket.bySecond) },
    monthly: { overall: figure(monthly.overall.estimate), byRegion: rows(monthly.byFirst) },
    stores: storeTypes.map((type) => ({ label: STORE_TYPES[type], ...figure(study.estimate(`store:${type}`).overall.estimate) })),
    atacarejoByRegion: rows(study.estimate("store:atacarejo").byFirst),
    profiles: compareProfiles(getStatePopulation(), getPopulation()),
  };
});

export type DashboardData = ReturnType<typeof getDashboardData>;

export const getMethodsData = memo(() => {
  const frame = getPopulation();
  const state = getStatePopulation();
  const comparison = compareMethods(motor, frame, STUDY, ANALYSIS.questions, ANALYSIS.repetitions, ANALYSIS.seed);
  return {
    N: frame.length,
    stateHouseholds: state.length,
    n: STUDY.sampleSize,
    repetitions: ANALYSIS.repetitions,
    strata: new Set(frame.map((c) => `${c.region}|${c.income}`)).size,
    systematicStep: Math.floor(frame.length / STUDY.sampleSize),
    comparison,
    average: averageEpa(comparison),
    recommended: recommendedDesign(comparison),
    bias: ANALYSIS.questions.map((q) => coverageBias(motor, state, frame, STUDY, q, ANALYSIS.repetitions, ANALYSIS.seed)),
  };
});

export type MethodsData = ReturnType<typeof getMethodsData>;
