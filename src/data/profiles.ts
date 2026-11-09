/**
 * Demo client profiles. All three companies are fictional. Each profile is a
 * study a client bought: a target population inside the frame, a stratified
 * design, and the variables the client cares about.
 */
import type { RegraAlocacao } from "@/estatistica";
import type { StratifierId, VariableId } from "@/sampling/variables";
import type { Consumer } from "./population";
import type { ProductId } from "./products";

export type ProfileId = "premium" | "popular" | "atacarejo";

export type Profile = {
  id: ProfileId;
  name: string;
  segment: string;
  pitch: string;
  /** Which brand tier this client sells; the atacarejo carries both. */
  tier: "premium" | "popular" | null;
  targetLabel: string;
  inTarget: (c: Consumer) => boolean;
  /** Strata are the cross of these two variables, so both work as report breakdowns. */
  strata: [StratifierId, StratifierId];
  allocation: RegraAlocacao;
  /** Variable whose Sh drives a Neyman allocation. Fixed so the sample does not change with the product filter. */
  allocationVariable: VariableId;
  sampleSize: number;
  seed: number;
  defaultProduct: ProductId;
};

export const PROFILES: Profile[] = [
  {
    id: "premium",
    name: "Casa Nobre",
    segment: "Marca premium de mercearia",
    pitch: "Quer saber em que bairros e cidades a linha premium entra na lista, e onde ainda perde para a marca de preço.",
    tier: "premium",
    targetLabel: "Todos os consumidores ativos da base",
    inTarget: () => true,
    strata: ["income", "size"],
    allocation: "neyman",
    allocationVariable: "premium:cafe",
    sampleSize: 1500,
    seed: 101,
    defaultProduct: "cafe",
  },
  {
    id: "popular",
    name: "Bom Dia Alimentos",
    segment: "Marca de preço acessível",
    pitch: "Vende no Brasil inteiro e precisa saber em que regiões a marca já é a escolha padrão da cesta.",
    tier: "popular",
    targetLabel: "Todos os consumidores ativos da base",
    inTarget: () => true,
    strata: ["region", "income"],
    allocation: "proporcional",
    allocationVariable: "popular:cafe",
    sampleSize: 1500,
    seed: 202,
    defaultProduct: "arroz",
  },
  {
    id: "atacarejo",
    name: "Rede Sertão Atacarejo",
    segment: "Atacarejo no interior",
    pitch: "Planeja lojas fora das capitais e quer medir quem faz a compra do mês e quanto gasta por ida ao mercado.",
    tier: null,
    targetLabel: "Consumidores fora das capitais",
    inTarget: (c) => c.size !== "capital",
    strata: ["region", "size"],
    allocation: "neyman",
    allocationVariable: "ticket",
    sampleSize: 1200,
    seed: 303,
    defaultProduct: "arroz",
  },
];

export const profileById = (id: ProfileId) => PROFILES.find((p) => p.id === id)!;
