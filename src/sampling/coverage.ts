/**
 * Coverage bias: the app's users are not the state's households.
 *
 * Horvitz–Thompson weights fix the unequal chances that the sampling design
 * creates, because the design sets them. They cannot fix who installed the app:
 * nobody knows that chance in advance. What can be done is to compare the app's
 * users with Census totals on something both record (here, where people live:
 * region × city size) and give each cell the weight it has in the state. That
 * is a post-stratified Hájek mean, built from the same `motor.ht.total`:
 *
 *   ȳ_g = Σ_g yᵢ/πᵢ ÷ Σ_g 1/πᵢ        (weighted mean inside cell g)
 *   ȳ_corrected = Σ_g W_g ȳ_g          (W_g = cell share in the Census)
 *
 * It only removes the part of the bias explained by the cells. Users also
 * differ in habits the Census does not see, and that part stays.
 */
import type { MotorAmostragem } from "@/estatistica";
import { CITY_SIZES, type CitySize, MUNICIPALITIES, REGIONS, STATE_POPULATION } from "@/data/geography";
import { AGES, type Consumer, INCOME_BANDS, ZONES } from "@/data/population";
import { seededRng } from "@/data/random";
import type { StudyPlan } from "@/data/study-plan";
import { designStudy } from "./study";
import { compareKeys, variable, type VariableId } from "./variables";

const cellOf = (c: { region: string; size: CitySize }) => `${c.region}|${c.size}`;

/** Census share of each region × city size cell, from IBGE municipal population. */
export const censusShares = () => {
  const shares = new Map<string, number>();
  MUNICIPALITIES.forEach((m) => shares.set(cellOf(m), (shares.get(cellOf(m)) ?? 0) + m.population / STATE_POPULATION));
  return shares;
};

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

export const coverageBias = (
  motor: MotorAmostragem,
  state: Consumer[],
  frame: Consumer[],
  plan: StudyPlan,
  variableId: VariableId,
  repetitions: number,
  seed: number,
) => {
  const value = variable(variableId).value;
  const W = censusShares();
  const design = designStudy(motor, frame, plan);
  const rng = seededRng(seed);

  const once = () => {
    const drawn = design.draw(rng);
    const plain = motor.aes.estimarMedia(
      drawn.map((group, h) => ({ Nh: design.sizes[h], valores: group.map((u) => value(frame[u])) })),
      plan.confidence,
    ).estimativa;

    const cells = new Map<string, { y: number[]; pi: number[] }>();
    drawn.forEach((group, h) =>
      group.forEach((u) => {
        const key = cellOf(frame[u]);
        const cell = cells.get(key) ?? { y: [], pi: [] };
        cell.y.push(value(frame[u]));
        cell.pi.push(design.allocation[h] / design.sizes[h]);
        cells.set(key, cell);
      }),
    );
    // A cell with nobody sampled drops out and the others are rescaled to sum to 1.
    const sampled = [...cells.entries()];
    const weightSum = sampled.reduce((acc, [key]) => acc + (W.get(key) ?? 0), 0);
    const corrected = sampled.reduce((acc, [key, cell]) => {
      const cellMean = motor.ht.total(cell.y, cell.pi) / motor.ht.total(cell.y.map(() => 1), cell.pi);
      return acc + ((W.get(key) ?? 0) / weightSum) * cellMean;
    }, 0);
    return { plain, corrected };
  };

  const runs = Array.from({ length: repetitions }, once);
  return {
    variable: variableId,
    truthState: mean(state.map(value)),
    truthFrame: mean(frame.map(value)),
    plain: mean(runs.map((r) => r.plain)),
    corrected: mean(runs.map((r) => r.corrected)),
    first: runs[0],
  };
};

export type CoverageBias = ReturnType<typeof coverageBias>;

/** Share of each group among app users and in the state. `census` marks the rows backed by real IBGE totals. */
export const compareProfiles = (state: Consumer[], frame: Consumer[]) => {
  const share = (units: Consumer[], keyOf: (c: Consumer) => string) => {
    const counts = new Map<string, number>();
    units.forEach((c) => counts.set(keyOf(c), (counts.get(keyOf(c)) ?? 0) + 1));
    return (key: string) => (counts.get(key) ?? 0) / units.length;
  };
  const rows = (keyOf: (c: Consumer) => string, labels: Record<string, string>, stateShare?: (key: string) => number) => {
    const app = share(frame, keyOf);
    const rs = stateShare ?? share(state, keyOf);
    return Object.keys(labels)
      .sort(compareKeys)
      .map((key) => ({ key, label: labels[key], app: app(key), state: rs(key) }));
  };
  const censusBy = (keyOf: (m: (typeof MUNICIPALITIES)[number]) => string) => (key: string) =>
    MUNICIPALITIES.filter((m) => keyOf(m) === key).reduce((acc, m) => acc + m.population, 0) / STATE_POPULATION;

  return {
    /** Real IBGE shares on the state side. */
    census: {
      size: rows((c) => c.size, CITY_SIZES, censusBy((m) => m.size)),
      region: rows((c) => c.region, REGIONS, censusBy((m) => m.region)),
    },
    /** Both sides from the synthetic model: assumptions, not Census figures. */
    model: {
      age: rows((c) => c.age, AGES),
      income: rows((c) => c.income, INCOME_BANDS),
      zone: rows((c) => c.zone, ZONES),
      household: rows(householdBand, HOUSEHOLD_BANDS),
    },
  };
};

const HOUSEHOLD_BANDS = { "1": "1 morador", "2": "2 moradores", "3-4": "3 ou 4 moradores", "5+": "5 ou mais" };
const householdBand = (c: Consumer) => (c.household <= 2 ? String(c.household) : c.household <= 4 ? "3-4" : "5+");
