// The app's users are a biased subset of the state. Because both are known
// here, the bias and how much the Census adjustment removes can be checked.
import { describe, expect, test } from "vitest";
import { motor } from "@/estatistica";
import { getPopulation, getStatePopulation } from "@/data/population";
import { ANALYSIS, STUDY } from "@/data/study-plan";
import { censusShares, coverageBias } from "./coverage";
import { compareMethods, recommendedDesign } from "./methods";

const frame = getPopulation();
const state = getStatePopulation();
const share = (units: typeof frame, test: (c: (typeof frame)[number]) => boolean) => units.filter(test).length / units.length;

describe("coverage bias", () => {
  test("app users are a subset of the state with more capital residents and fewer retirees", () => {
    expect(frame.every((c) => c.usesApp)).toBe(true);
    expect(frame.length).toBeLessThan(state.length);
    expect(share(frame, (c) => c.size === "capital")).toBeGreaterThan(share(state, (c) => c.size === "capital"));
    expect(share(frame, (c) => c.age === "60+")).toBeLessThan(share(state, (c) => c.age === "60+"));
  });

  test("Census cell shares add up to the whole state", () => {
    expect([...censusShares().values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  test("the study estimate targets the app users; the Census adjustment moves it toward the state but not all the way", () => {
    const b = coverageBias(motor, state, frame, STUDY, "premium:cafe", 100, 5);
    expect(Math.abs(b.plain - b.truthFrame)).toBeLessThan(0.005);
    expect(Math.abs(b.corrected - b.truthState)).toBeLessThan(Math.abs(b.plain - b.truthState));
    // What is left comes from behaviors the Census does not record.
    expect(Math.abs(b.corrected - b.truthState)).toBeGreaterThan(0.005);
  });
});

describe("method comparison", () => {
  test("the recommended method is the one the study is configured to use", () => {
    const comparison = compareMethods(motor, frame, STUDY, ANALYSIS.questions, 5, 1);
    expect(recommendedDesign(comparison)).toBe(`aes-${STUDY.allocation}`);
  });
});
