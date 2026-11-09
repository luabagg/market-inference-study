/**
 * Every sampling method in the course, run on the same frame with the same
 * sample size, many times over. Because the frame is synthetic, the true value
 * is known, so each method's error can be measured instead of assumed.
 *
 * Methods are ranked by their exact design variance (known here because the
 * frame is synthetic). The repetitions show the same thing the way a class
 * would see it: a histogram of estimates and how often the interval hits.
 *
 * One sample answers every question in the study, so the recommendation is the
 * method with the smallest average variance across all of them, not the one
 * that wins a single question.
 */
import type { MotorAmostragem } from "@/estatistica";
import type { Consumer } from "@/data/population";
import type { StudyPlan } from "@/data/study-plan";
import { type Design, prepareSimulation, repeat } from "./simulation";
import { variable, type VariableId } from "./variables";

export type MethodResult = {
  design: Design;
  meanEstimate: number;
  /** Share of 95% intervals that contained the true value. */
  coverage: number;
  /** Average half-width of the interval. */
  meanMargin: number;
  /** Exact variance relative to simple random sampling of the same size (EPA). Below 1 beats AAS. */
  epa: number;
  /** Variance across the repetitions relative to AAS's: should agree with `epa` up to noise. */
  empiricalEpa: number;
  /** Estimates of the first repetitions, for the histograms. */
  estimates: number[];
};

export type QuestionComparison = {
  variable: VariableId;
  label: string;
  kind: "mean" | "proportion";
  truth: number;
  results: MethodResult[];
};

export const COMPARED_DESIGNS: Design[] = ["aas", "aes-proporcional", "aes-neyman", "aes-igual", "as"];

export const compareMethods = (
  motor: MotorAmostragem,
  units: Consumer[],
  plan: StudyPlan,
  questions: VariableId[],
  repetitions: number,
  seed: number,
): QuestionComparison[] =>
  questions.map((variableId) => {
    const runs = COMPARED_DESIGNS.map((design) => {
      const prepared = prepareSimulation(motor, units, {
        variable: variableId,
        design,
        n: plan.sampleSize,
        stratifyBy: "regionIncome",
        allocationVariable: plan.allocationVariable,
        confidence: plan.confidence,
      });
      return { design, prepared, summary: repeat(prepared, repetitions, seed) };
    });
    const aas = runs[0];
    const v = variable(variableId);
    return {
      variable: variableId,
      label: v.label,
      kind: v.kind,
      truth: runs[0].prepared.truth,
      results: runs.map(({ design, prepared, summary }) => ({
        design,
        meanEstimate: summary.meanEstimate,
        coverage: summary.coverage,
        meanMargin: summary.meanMargin,
        epa: prepared.variance / aas.prepared.variance,
        empiricalEpa: summary.empiricalVariance / aas.summary.empiricalVariance,
        estimates: summary.estimates,
      })),
    };
  });

/** Average EPA of each design across every question. */
export const averageEpa = (comparison: QuestionComparison[]) =>
  COMPARED_DESIGNS.map((design, i) => ({
    design,
    epa: comparison.reduce((acc, q) => acc + q.results[i].epa, 0) / comparison.length,
  }));

/** The design with the smallest average variance across the study's questions. */
export const recommendedDesign = (comparison: QuestionComparison[]) =>
  averageEpa(comparison).reduce((best, r) => (r.epa < best.epa ? r : best)).design;
