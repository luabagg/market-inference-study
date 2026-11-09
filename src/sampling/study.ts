/**
 * A delivered research study: one stratified sample drawn once with a fixed
 * seed, then used to estimate every variable the client asks about.
 *
 * Strata are the cross of two variables (e.g. income × city size). Any group of
 * one variable is a union of strata, so its estimate is still a plain AES
 * estimate over that subset of strata (no domain estimation needed).
 */
import type { Confianca, EstimativaEstratificada, MotorAmostragem } from "@/estatistica";
import type { Consumer } from "@/data/population";
import type { Profile } from "@/data/profiles";
import { seededRng } from "@/data/random";
import { compareKeys, STRATIFIERS, buildStrata, variable, type VariableId } from "./variables";

export type GroupEstimate = { key: string; label: string; estimate: EstimativaEstratificada; truth: number };

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const sd = (values: number[]) => {
  const m = mean(values);
  return Math.sqrt(values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1));
};

export const runStudy = (motor: MotorAmostragem, population: Consumer[], profile: Profile, confidence: Confianca) => {
  const units = population.filter(profile.inTarget);
  const [first, second] = profile.strata.map((id) => STRATIFIERS[id]);
  const strata = buildStrata(
    units,
    (c) => `${first.key(c)}|${second.key(c)}`,
    (key) => key.split("|").map((part, i) => (i === 0 ? first : second).name(part)).join(" · "),
  );

  const allocationValue = variable(profile.allocationVariable).value;
  const allocation = motor.aes.alocar(
    strata.map((s) => ({ Nh: s.units.length, Sh: sd(s.units.map((u) => allocationValue(units[u]))) })),
    profile.sampleSize,
    profile.allocation,
  );
  const drawn = motor.aes
    .sortear(strata.map((s) => s.units.length), allocation, seededRng(profile.seed))
    .map((local, h) => local.map((i) => strata[h].units[i]));

  const estimate = (variableId: VariableId) => {
    const value = variable(variableId).value;
    const observed = strata.map((s, h) => ({ Nh: s.units.length, valores: drawn[h].map((u) => value(units[u])) }));

    const forStrata = (keep: (key: string) => boolean) => ({
      estimate: motor.aes.estimarMedia(observed.filter((_, h) => keep(strata[h].key)), confidence),
      truth: mean(strata.filter((s) => keep(s.key)).flatMap((s) => s.units.map((u) => value(units[u])))),
    });

    const breakdown = (part: 0 | 1): GroupEstimate[] => {
      const name = (part === 0 ? first : second).name;
      const keys = [...new Set(strata.map((s) => s.key.split("|")[part]))].sort(compareKeys);
      return keys.map((key) => ({ key, label: name(key), ...forStrata((k) => k.split("|")[part] === key) }));
    };

    return { overall: forStrata(() => true), byFirst: breakdown(0), bySecond: breakdown(1) };
  };

  const sampleUnits = drawn.flat();
  return {
    profile,
    units,
    N: units.length,
    m: sampleUnits.length,
    listsInFrame: units.reduce((acc, c) => acc + c.lists, 0),
    listsInSample: sampleUnits.reduce((acc, u) => acc + units[u].lists, 0),
    first,
    second,
    strata: strata.map((s, h) => ({ key: s.key, label: s.label, Nh: s.units.length, mh: allocation[h] })),
    estimate,
  };
};

export type Study = ReturnType<typeof runStudy>;
