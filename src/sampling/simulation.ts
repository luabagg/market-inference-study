/**
 * Sampling simulator used by the map. It prepares engine inputs from the frame,
 * asks the engine to draw and estimate, and compares the estimate with the true
 * population parameter (known here because the population is synthetic).
 *
 * All statistics come from the injected `motor`. The only thing computed here
 * is the population parameter itself, which is a plain census mean, not an
 * estimate.
 */
import type { Confianca, Estimativa, EstimativaEstratificada, MotorAmostragem, RegraAlocacao, Rng } from "@/estatistica";
import type { Consumer } from "@/data/population";
import { seededRng } from "@/data/random";
import { buildStrata, STRATIFIERS, type StratifierId, type Stratum, variable, type VariableId } from "./variables";

export type Design = "aas" | "aes-proporcional" | "aes-igual" | "aes-neyman" | "as";

export const DESIGNS: Record<Design, { label: string; short: string }> = {
  aas: { label: "Aleatória simples (AAS)", short: "AAS" },
  "aes-proporcional": { label: "Estratificada, alocação proporcional", short: "AES prop." },
  "aes-igual": { label: "Estratificada, alocação igual", short: "AES igual" },
  "aes-neyman": { label: "Estratificada, alocação de Neyman", short: "AES Neyman" },
  as: { label: "Sistemática, lista ordenada norte → sul", short: "AS" },
};

export type SimulationConfig = {
  variable: VariableId;
  design: Design;
  n: number;
  stratifyBy: StratifierId;
  confidence: Confianca;
  /** Variable whose Sh drives a Neyman allocation. Defaults to the variable being estimated. */
  allocationVariable?: VariableId;
};

/** Unit indices drawn from `units`, grouped by stratum (a single group outside AES). */
type Draw = { groups: number[][]; start?: number };

export type SampledUnit = { unit: number; stratum: number; pi: number; weight: number };

export type StratumRow = {
  key: string;
  label: string;
  Nh: number;
  mh: number;
  pi: number;
  w: number;
  mean: number;
  s2: number;
  trueMean: number;
};

export type SimulationResult = {
  estimate: Estimativa;
  sample: SampledUnit[];
  strata: StratumRow[] | null;
  /** Systematic only: start r, interval k, units left out so that N = n k, and the v2 estimate. */
  systematic: { start: number; k: number; excluded: number; v2: Estimativa } | null;
};

const mean = (values: ArrayLike<number>) => {
  let total = 0;
  for (let i = 0; i < values.length; i++) total += values[i];
  return total / values.length;
};

const populationSd = (values: number[]) => {
  const m = mean(values);
  return Math.sqrt(values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1));
};

export const prepareSimulation = (motor: MotorAmostragem, units: Consumer[], config: SimulationConfig) => {
  const v = variable(config.variable);
  const y = Float64Array.from(units, v.value);
  const N = units.length;
  const n = Math.min(config.n, N);
  const truth = mean(y);
  const stratifier = STRATIFIERS[config.stratifyBy];
  const strata = buildStrata(units, stratifier.key, stratifier.name);
  const stratumOf = new Int32Array(N);
  strata.forEach((s, h) => s.units.forEach((u) => (stratumOf[u] = h)));

  const context: PlanContext = { motor, units, y, strata, stratumOf, N, n, config };
  const plan = config.design.startsWith("aes")
    ? stratifiedPlan(context)
    : config.design === "as"
      ? systematicPlan(context)
      : simpleRandomPlan(context);

  const describe = (draw: Draw): SimulationResult => {
    const estimate = plan.estimate(draw);
    return {
      estimate,
      sample: draw.groups.flatMap((g, h) => g.map((unit) => plan.inclusion(unit, h))),
      strata:
        "estratos" in estimate
          ? estimate.estratos.map((r, h) => ({
              key: strata[h].key,
              label: strata[h].label,
              Nh: r.Nh,
              mh: r.mh,
              pi: r.pi,
              w: r.w,
              mean: r.media,
              s2: r.s2,
              trueMean: mean(strata[h].units.map((u) => y[u])),
            }))
          : null,
      systematic: plan.systematic?.(draw) ?? null,
    };
  };

  const sample = plan.sample;
  const estimate = plan.estimate;
  return { N, n, truth, variable: v, strata, stratumOf, sample, estimate, describe, variance: plan.variance };
};

export type PreparedSimulation = ReturnType<typeof prepareSimulation>;

export const runOnce = (prepared: PreparedSimulation, seed: number) =>
  prepared.describe(prepared.sample(seededRng(seed)));

export type RepetitionSummary = {
  estimates: number[];
  /** Share of intervals that contain the true parameter. */
  coverage: number;
  meanEstimate: number;
  /** Variance of the estimates across repetitions: the empirical sampling variance. */
  empiricalVariance: number;
  /** Average half-width of the intervals. */
  meanMargin: number;
};

/** Draws `times` independent samples to show the sampling distribution of the estimator. */
export const repeat = (prepared: PreparedSimulation, times: number, seed: number): RepetitionSummary => {
  const rng = seededRng(seed);
  const results = Array.from({ length: times }, () => prepared.estimate(prepared.sample(rng)));
  const estimates = results.map((r) => r.estimativa);
  const meanEstimate = mean(estimates);
  return {
    estimates,
    coverage: results.filter((r) => r.ic[0] <= prepared.truth && prepared.truth <= r.ic[1]).length / times,
    meanEstimate,
    empiricalVariance: estimates.reduce((acc, e) => acc + (e - meanEstimate) ** 2, 0) / (times - 1),
    meanMargin: mean(results.map((r) => r.margem)),
  };
};

type PlanContext = {
  motor: MotorAmostragem;
  units: Consumer[];
  y: Float64Array;
  strata: Stratum[];
  stratumOf: Int32Array;
  N: number;
  n: number;
  config: SimulationConfig;
};

/** One sampling design: how to draw, how to estimate, and each unit's π. */
type Plan = {
  sample: (rng: Rng) => Draw;
  estimate: (draw: Draw) => Estimativa | EstimativaEstratificada;
  /** `group` is the stratum index for AES, 0 otherwise. */
  inclusion: (unit: number, group: number) => SampledUnit;
  systematic?: (draw: Draw) => NonNullable<SimulationResult["systematic"]>;
  /**
   * Exact mean squared error of the design's estimator around the true mean,
   * from the whole frame. A population quantity, not an estimate: it is only
   * known because the frame is synthetic, and it ranks designs without the
   * noise of a finite number of repetitions.
   */
  variance: number;
};

const stratifiedPlan = ({ motor, units, y, strata, n, config }: PlanContext): Plan => {
  const sizes = strata.map((s) => s.units.length);
  // Neyman needs Sh. A real study would take it from a previous wave or a pilot;
  // here it comes from the frame, which the simulator is allowed to see.
  const allocationValue = config.allocationVariable && variable(config.allocationVariable).value;
  const allocationY = (u: number) => (allocationValue ? allocationValue(units[u]) : y[u]);
  const allocation = motor.aes.alocar(
    strata.map((s) => ({ Nh: s.units.length, Sh: populationSd(s.units.map(allocationY)) })),
    n,
    config.design.slice(4) as RegraAlocacao,
  );
  return {
    sample: (rng) => ({
      groups: motor.aes.sortear(sizes, allocation, rng).map((local, h) => local.map((i) => strata[h].units[i])),
    }),
    estimate: (draw) =>
      motor.aes.estimarMedia(
        draw.groups.map((g, h) => ({ Nh: sizes[h], valores: g.map((u) => y[u]) })),
        config.confidence,
      ),
    inclusion: (unit, h) => {
      const pi = allocation[h] / sizes[h];
      return { unit, stratum: h, pi, weight: 1 / pi };
    },
    variance: strata.reduce((acc, s, h) => {
      const Wh = sizes[h] / units.length;
      return acc + Wh ** 2 * (1 / allocation[h] - 1 / sizes[h]) * populationSd(s.units.map((u) => y[u])) ** 2;
    }, 0),
  };
};

// The list is ordered north to south, which spreads the sample across latitudes
// like an implicit geographic stratification. The last N - nk units are left out
// so that N = nk, as the apostila's formulas require.
const systematicPlan = ({ motor, units, y, stratumOf, N, n, config }: PlanContext): Plan => {
  const ordered = Array.from({ length: N }, (_, i) => i).sort((a, b) => units[b].lat - units[a].lat);
  const k = Math.floor(N / n);
  const listSize = n * k;
  const pi = motor.aas.probInclusao(listSize, n);
  const values = (draw: Draw) => draw.groups[0].map((u) => y[u]);
  return {
    sample: (rng) => {
      const s = motor.as.sortear(listSize, n, rng);
      return { groups: [s.indices.map((i) => ordered[i])], start: s.inicio };
    },
    estimate: (draw) => motor.as.estimarMedia(values(draw), listSize, config.confidence, "v1"),
    inclusion: (unit) => ({ unit, stratum: stratumOf[unit], pi, weight: 1 / pi }),
    // Only k samples are possible (one per start r), so the exact error averages over all of them.
    variance: mean(
      Array.from({ length: k }, (_, r) => (mean(Array.from({ length: n }, (_, j) => y[ordered[r + j * k]])) - mean(y)) ** 2),
    ),
    systematic: (draw) => ({
      start: draw.start ?? 1,
      k,
      excluded: N - listSize,
      v2: motor.as.estimarMedia(values(draw), listSize, config.confidence, "v2"),
    }),
  };
};

const simpleRandomPlan = ({ motor, y, stratumOf, N, n, config }: PlanContext): Plan => {
  const S2 = populationSd(Array.from(y)) ** 2;
  const pi = motor.aas.probInclusao(N, n);
  const isProportion = variable(config.variable).kind === "proportion";
  return {
    sample: (rng) => ({ groups: [motor.aas.sortear(N, n, rng)] }),
    estimate: (draw) => {
      const values = draw.groups[0].map((u) => y[u]);
      return isProportion
        ? motor.aas.estimarProporcao(values, N, config.confidence)
        : motor.aas.estimarMedia(values, N, config.confidence);
    },
    inclusion: (unit) => ({ unit, stratum: stratumOf[unit], pi, weight: 1 / pi }),
    variance: (1 / n - 1 / N) * S2,
  };
};

export type { Stratum };
