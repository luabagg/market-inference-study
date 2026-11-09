/**
 * Two populations, one generator run:
 *
 * - the state: a scale model of the households in Rio Grande do Sul, spread over
 *   the municipalities by Census population;
 * - the frame: the households that use the Cestinha app. This is what Fração can
 *   sample from. It over-represents Porto Alegre, richer cities and some
 *   behaviors, the way an app user base would.
 *
 * Real inputs come from IBGE (municipality, population, GDP per capita). The
 * generator in `src/mundo/gerador/` simulates what the app records (signups and
 * shopping lists) from the behaviors registered below, and `consolidar` turns
 * those records into one row per household.
 */
import {
  altaRenda,
  aposentado,
  classeMediaInterior,
  familiaBaixaRendaUrbana,
  familiaRural,
  jovemDeCapital,
} from "@/mundo/gerador/comportamentos";
import { consolidar } from "@/mundo/gerador/consolidar";
import { GeradorDePopulacao } from "@/mundo/gerador/gerador";
import type { Cadastro, Escolaridade, FaixaEtaria, Frequencia, TabelaDeListas, Zona } from "@/mundo/gerador/tipos";
import type { CitySize, RegionCode } from "./geography";
import type { ProductId } from "./products";
import type { StoreType } from "./stores";

/** Households in the scale model of the state. About 60% of them end up using the app. */
export const STATE_HOUSEHOLDS = 100_000;
export const POPULATION_SEED = 20_260_901;

export type IncomeBand = "alta" | "media" | "baixa";

export type Consumer = {
  /** Index in the state population. */
  id: number;
  /** Whether this household is in the app's user base (the sampling frame). */
  usesApp: boolean;
  municipality: number;
  region: RegionCode;
  uf: string;
  size: CitySize;
  zone: Zona;
  /** Id of the generator behavior that produced this consumer. */
  behavior: string;
  lon: number;
  lat: number;
  /** Household income band, from salary quantiles in the frame. */
  income: IncomeBand;
  /** Household income per month, R$. */
  salary: number;
  education: Escolaridade;
  age: FaixaEtaria;
  household: number;
  /** Observed habit, from the number of lists in the quarter. */
  frequency: Frequencia;
  /** Shopping lists created in the last 90 days. Lists are observations, consumers are units. */
  lists: number;
  /** Average planned value per list, R$. */
  ticket: number;
  /** Planned value per month, R$ (quarter total / 3). */
  monthlySpend: number;
  /** Whether any list in the quarter had each line of each category. */
  listed: Record<ProductId, { premium: boolean; popular: boolean; outra: boolean }>;
  /** Whether any list in the quarter was planned for each store type. */
  storeTypes: Record<StoreType, boolean>;
  /** Index in STORES of the store most of this consumer's lists were planned for. */
  mainStore: number;
};

export const BEHAVIORS = [familiaRural, familiaBaixaRendaUrbana, classeMediaInterior, jovemDeCapital, aposentado, altaRenda];

export const INCOME_BANDS: Record<IncomeBand, string> = {
  alta: "Renda alta",
  media: "Renda média",
  baixa: "Renda baixa",
};

export const FREQUENCIES: Record<Frequencia, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};

export const AGES: Record<FaixaEtaria, string> = {
  "18-24": "18 a 24 anos",
  "25-34": "25 a 34 anos",
  "35-44": "35 a 44 anos",
  "45-59": "45 a 59 anos",
  "60+": "60 anos ou mais",
};

export const ZONES: Record<Zona, string> = { urbana: "Zona urbana", rural: "Zona rural" };

export const EDUCATION: Record<Escolaridade, string> = {
  fundamental: "Até o fundamental",
  medio: "Ensino médio",
  superior: "Ensino superior",
};

let cache: { cadastros: Cadastro[]; listas: TabelaDeListas; state: Consumer[]; frame: Consumer[] } | undefined;

/**
 * Signups and shopping lists for every household, plus the consolidated rows.
 * Records of households outside the app are only used to measure the state.
 * Same seed → same data.
 */
export const getAppData = () => {
  if (cache) return cache;
  const { cadastros, listas } = BEHAVIORS.reduce(
    (gerador, comportamento) => gerador.adicionarComportamento(comportamento),
    new GeradorDePopulacao({ semente: POPULATION_SEED, tamanho: STATE_HOUSEHOLDS }),
  ).gerar();
  const state = consolidar(cadastros, listas);
  cache = { cadastros, listas, state, frame: state.filter((c) => c.usesApp) };
  return cache;
};

/** The sampling frame: one row per household that uses the app. */
export const getPopulation = () => getAppData().frame;

/** Every household in the scale model of the state, app users or not. */
export const getStatePopulation = () => getAppData().state;
