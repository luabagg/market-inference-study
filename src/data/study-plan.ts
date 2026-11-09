/**
 * Study configuration. Everything the demo shows comes from these two objects:
 * change a value here and every page follows (no selectors in the UI).
 *
 * STUDY is the study the demo client bought: one stratified sample of the app's
 * users in Rio Grande do Sul, drawn once and reused for every question.
 * ANALYSIS controls the method comparison and the coverage-bias check.
 */
import type { Confianca, RegraAlocacao } from "@/estatistica";
import type { StratifierId, VariableId } from "@/sampling/variables";
import type { ProductId } from "./products";

export type StudyPlan = {
  title: string;
  targetLabel: string;
  /** Strata are the cross of these two variables, so both work as report breakdowns. */
  strata: [StratifierId, StratifierId];
  allocation: RegraAlocacao;
  /** Variable whose Sh drives a Neyman allocation (in the study, if chosen, and in the method comparison). */
  allocationVariable: VariableId;
  sampleSize: number;
  confidence: Confianca;
  seed: number;
  defaultProduct: ProductId;
};

export const STUDY: StudyPlan = {
  title: "Linhas Reserva e Clássico no RS",
  targetLabel: "Domicílios que usam o Cestinha no RS",
  strata: ["region", "income"],
  // Proportional wins the comparison in /app/metodos: lowest average variance across the questions below.
  allocation: "proporcional",
  allocationVariable: "premium:cafe",
  sampleSize: 1500,
  confidence: 0.95,
  seed: 101,
  defaultProduct: "cafe",
};

export const ANALYSIS = {
  /** Samples drawn per method to measure how much each one varies. */
  repetitions: 200,
  seed: 7,
  /** Questions every method is tested on. The first one is the study's headline question. */
  questions: ["premium:cafe", "ticket", "monthly"] satisfies VariableId[],
};
