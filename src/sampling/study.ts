/**
 * A delivered research study: one stratified sample drawn once with a fixed
 * seed, then used to estimate every variable the client asks about.
 *
 * Strata are the cross of two variables (e.g. region × income). Any group of
 * one variable is a union of strata, so its estimate is still a plain AES
 * estimate over that subset of strata (no domain estimation needed).
 */
import type { EstimativaEstratificada, MotorAmostragem, Rng } from "@/estatistica";
import type { Consumer } from "@/data/population";
import type { StudyPlan } from "@/data/study-plan";
import { seededRng } from "@/data/random";
import { compareKeys, STRATIFIERS, buildStrata, variable, type VariableId } from "./variables";

export type GroupEstimate = { key: string; label: string; estimate: EstimativaEstratificada; truth: number };

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const sd = (values: number[]) => {
  const m = mean(values);
  return Math.sqrt(values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1));
};

/** Strata, allocation and a draw function for the plan. `draw` returns unit indices grouped by stratum. */
export const designStudy = (motor: MotorAmostragem, units: Consumer[], plan: StudyPlan) => {
  const [first, second] = plan.strata.map((id) => STRATIFIERS[id]);
  const strata = buildStrata(
    units,
    (c) => `${first.key(c)}|${second.key(c)}`,
    (key) => key.split("|").map((part, i) => (i === 0 ? first : second).name(part)).join(" · "),
  );
  const sizes = strata.map((s) => s.units.length);
  const allocationValue = variable(plan.allocationVariable).value;
  const allocation = motor.aes.alocar(
    strata.map((s) => ({ Nh: s.units.length, Sh: sd(s.units.map((u) => allocationValue(units[u]))) })),
    plan.sampleSize,
    plan.allocation,
  );
  const draw = (rng: Rng) => motor.aes.sortear(sizes, allocation, rng).map((local, h) => local.map((i) => strata[h].units[i]));
  return { first, second, strata, sizes, allocation, draw };
};

export const runStudy = (motor: MotorAmostragem, units: Consumer[], plan: StudyPlan) => {
  const { first, second, strata, sizes, allocation, draw } = designStudy(motor, units, plan);
  const drawn = draw(seededRng(plan.seed));

  const estimate = (variableId: VariableId) => {
    const value = variable(variableId).value;
    const observed = strata.map((s, h) => ({ Nh: sizes[h], valores: drawn[h].map((u) => value(units[u])) }));

    const forStrata = (keep: (key: string) => boolean) => ({
      estimate: motor.aes.estimarMedia(observed.filter((_, h) => keep(strata[h].key)), plan.confidence),
      truth: mean(strata.filter((s) => keep(s.key)).flatMap((s) => s.units.map((u) => value(units[u])))),
    });

    const breakdown = (part: 0 | 1): GroupEstimate[] => {
      const name = (part === 0 ? first : second).name;
      const keys = [...new Set(strata.map((s) => s.key.split("|")[part]))].sort(compareKeys);
      return keys.map((key) => ({ key, label: name(key), ...forStrata((k) => k.split("|")[part] === key) }));
    };

    return { overall: forStrata(() => true), byFirst: breakdown(0), bySecond: breakdown(1) };
  };

  return {
    plan,
    units,
    N: units.length,
    m: drawn.reduce((acc, g) => acc + g.length, 0),
    first,
    second,
    strata: strata.map((s, h) => ({ key: s.key, label: s.label, Nh: sizes[h], mh: allocation[h] })),
    /** Sampled unit indices with their stratum. */
    sample: drawn.flatMap((group, h) => group.map((unit) => ({ unit, stratum: h, weight: sizes[h] / allocation[h] }))),
    estimate,
  };
};

export type Study = ReturnType<typeof runStudy>;
