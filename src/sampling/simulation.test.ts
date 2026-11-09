// The synthetic population is fully known, so the simulator can check the
// design-based properties the course proves: unbiasedness and ~95% coverage.
import { describe, expect, test } from "vitest";
import { motor } from "@/estatistica";
import { getPopulation } from "@/mundo/population";
import { STUDY } from "@/sampling/study-plan";
import { type Design, prepareSimulation, repeat } from "./simulation";
import { runStudy } from "./study";

const population = getPopulation();

describe("simulator", () => {
  test.each<Design>(["aas", "aes-proporcional", "aes-neyman", "aes-igual"])(
    "%s: estimates center on the true mean and 95%% intervals cover it about 95%% of the time",
    (design) => {
      const prepared = prepareSimulation(motor, population, {
        variable: "ticket",
        design,
        n: 400,
        stratifyBy: "size",
        confidence: 0.95,
      });
      const summary = repeat(prepared, 400, 42);
      const se = Math.sqrt(summary.empiricalVariance / 400);
      expect(Math.abs(summary.meanEstimate - prepared.truth)).toBeLessThan(4 * se);
      expect(summary.coverage).toBeGreaterThan(0.9);
      expect(summary.coverage).toBeLessThan(0.99);
    },
  );

  test("strata related to y cut variance, and Neyman cuts it further", () => {
    const variance = (design: Design) =>
      prepareSimulation(motor, population, { variable: "ticket", design, n: 400, stratifyBy: "behavior", confidence: 0.95 }).variance;
    // Neyman is optimal for the variable it allocates on (up to rounding mh to integers).
    expect(variance("aes-neyman")).toBeLessThan(variance("aes-proporcional") * 1.01);
    expect(variance("aes-proporcional")).toBeLessThan(variance("aas"));
  });
});

describe("study", () => {
  test("sample size matches the plan, and each breakdown covers every stratum exactly once", () => {
    const study = runStudy(motor, population, STUDY);
    expect(study.m).toBe(STUDY.sampleSize);
    const share = study.estimate(`premium:${STUDY.defaultProduct}`);
    for (const groups of [share.byFirst, share.bySecond]) {
      const groupN = groups.reduce((acc, g) => acc + g.estimate.estratos.reduce((a, s) => a + s.Nh, 0), 0);
      expect(groupN).toBe(study.N);
    }
  });
});

describe("exact design variance", () => {
  test.each<Design>(["aas", "aes-proporcional", "aes-neyman", "aes-igual", "as"])(
    "%s: the variance across repeated samples matches the exact one",
    (design) => {
      const prepared = prepareSimulation(motor, population, {
        variable: "premium:cafe",
        design,
        n: STUDY.sampleSize,
        stratifyBy: "regionIncome",
        allocationVariable: STUDY.allocationVariable,
        confidence: 0.95,
      });
      const ratio = repeat(prepared, 400, 11).empiricalVariance / prepared.variance;
      expect(ratio).toBeGreaterThan(0.75);
      expect(ratio).toBeLessThan(1.3);
    },
  );
});
