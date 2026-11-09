/**
 * Synthetic sampling frame: the consumers registered in the Cestinha shopping
 * list app. This is NOT the Brazilian population. It over-represents big cities
 * and the South/Southeast, the way an app user base would.
 *
 * Real inputs come from IBGE (municipality, population, GDP per capita). The
 * consumers themselves are drawn by the generator in `src/gerador/` from the
 * behaviors registered below.
 */
import {
  altaRenda,
  aposentado,
  classeMediaInterior,
  familiaBaixaRendaUrbana,
  familiaRural,
  jovemDeCapital,
} from "@/gerador/comportamentos";
import { GeradorDePopulacao } from "@/gerador/gerador";
import type { Escolaridade, FaixaEtaria, Frequencia, Zona } from "@/gerador/tipos";
import type { CitySize, RegionCode } from "./geography";
import type { ProductId } from "./products";

export const FRAME_SIZE = 60_000;
export const POPULATION_SEED = 20_260_901;

export type IncomeBand = "alta" | "media" | "baixa";
/** What a consumer's lists contain for a product: none/other brand, premium tier, value tier. */
export type BrandChoice = "outra" | "premium" | "popular";

export type Consumer = {
  id: number;
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
  frequency: Frequencia;
  /** Shopping lists created in the last 90 days. Lists are observations, consumers are units. */
  lists: number;
  /** Average planned spend per list, R$. */
  ticket: number;
  /** Average planned spend per month, R$. */
  monthlySpend: number;
  brands: Record<ProductId, BrandChoice>;
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

export const ZONES: Record<Zona, string> = { urbana: "Zona urbana", rural: "Zona rural" };

export const EDUCATION: Record<Escolaridade, string> = {
  fundamental: "Até o fundamental",
  medio: "Ensino médio",
  superior: "Ensino superior",
};

let cache: Consumer[] | undefined;

/** The full frame, generated once per page load. Same seed → same consumers. */
export const getPopulation = () =>
  (cache ??= BEHAVIORS.reduce(
    (gerador, comportamento) => gerador.adicionarComportamento(comportamento),
    new GeradorDePopulacao({ semente: POPULATION_SEED, tamanho: FRAME_SIZE }),
  ).gerar());
