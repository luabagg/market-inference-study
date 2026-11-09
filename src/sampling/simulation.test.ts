// The synthetic population is fully known, so the simulator can check the
// design-based properties the course proves: unbiasedness and ~95% coverage.
import { describe, expect, test } from "vitest";
import { motor } from "@/estatistica";
import { getPopulation } from "@/data/population";
import { PROFILES } from "@/data/profiles";
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

  test("Neyman allocation beats proportional when strata differ in spread", () => {
    const run = (design: Design) =>
      repeat(prepareSimulation(motor, population, { variable: "ticket", design, n: 400, stratifyBy: "income", confidence: 0.95 }), 300, 7)
        .empiricalVariance;
    expect(run("aes-neyman")).toBeLessThan(run("aes-proporcional") * 1.05);
    expect(run("aes-proporcional")).toBeLessThan(run("aas"));
  });
});

describe("study", () => {
  test.each(PROFILES)("$name: sample size matches the plan and group estimates use every stratum", (profile) => {
    const study = runStudy(motor, population, profile, 0.95);
    expect(study.m).toBe(profile.sampleSize);
    const share = study.estimate(profile.tier ? `${profile.tier}:${profile.defaultProduct}` : "monthly");
    const groupN = share.byFirst.reduce((acc, g) => acc + g.estimate.estratos.reduce((a, s) => a + s.Nh, 0), 0);
    expect(groupN).toBe(study.N);
  });
});
