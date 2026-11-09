/**
 * What can be measured on a consumer (y) and how the frame can be split into
 * strata. This file turns domain objects into the plain numbers and keys the
 * statistics engine expects.
 */
import { CITY_SIZES, type CitySize, REGIONS, type RegionCode } from "@/data/geography";
import { BEHAVIORS, type Consumer, EDUCATION, INCOME_BANDS, type IncomeBand, ZONES } from "@/data/population";
import type { Escolaridade, Zona } from "@/gerador/tipos";
import { PRODUCTS, type ProductId, productById, skuName, type Tier } from "@/data/products";
import { STORE_TYPES, type StoreType } from "@/data/stores";

export type VariableId =
  | "ticket"
  | "salary"
  | "monthlySpend"
  | "monthly"
  | `premium:${ProductId}`
  | `popular:${ProductId}`
  | `outra:${ProductId}`
  | `store:${StoreType}`
  | `behavior:${string}`;

export type Variable = {
  id: VariableId;
  label: string;
  /** Proportions are means of 0/1 values; the engine treats them differently under AAS. */
  kind: "mean" | "proportion";
  value: (c: Consumer) => number;
};

export const variable = (id: VariableId): Variable => {
  if (id === "ticket") return { id, label: "Ticket médio do consumidor (R$)", kind: "mean", value: (c) => c.ticket };
  if (id === "salary") return { id, label: "Renda domiciliar mensal (R$)", kind: "mean", value: (c) => c.salary };
  if (id === "monthlySpend")
    return { id, label: "Gasto planejado por mês (R$)", kind: "mean", value: (c) => c.monthlySpend };
  if (id === "monthly")
    return { id, label: "Faz compra do mês", kind: "proportion", value: (c) => (c.frequency === "mensal" ? 1 : 0) };
  if (id.startsWith("store:")) {
    const type = id.slice("store:".length) as StoreType;
    return { id, label: `Planejou lista para ${STORE_TYPES[type].toLowerCase()}`, kind: "proportion", value: (c) => (c.storeTypes[type] ? 1 : 0) };
  }
  if (id.startsWith("behavior:")) {
    const behaviorId = id.slice("behavior:".length);
    const behavior = BEHAVIORS.find((b) => b.id === behaviorId);
    return { id, label: `Comportamento: ${behavior?.nome ?? behaviorId}`, kind: "proportion", value: (c) => (c.behavior === behaviorId ? 1 : 0) };
  }
  const [tier, productId] = id.split(":") as [Tier, ProductId];
  const product = productById(productId);
  return {
    id,
    label: `Listou ${skuName(product, tier)} no trimestre`,
    kind: "proportion",
    value: (c) => (c.listed[productId][tier] ? 1 : 0),
  };
};

export const SIMULATOR_VARIABLES: VariableId[] = [
  "ticket",
  "monthlySpend",
  "salary",
  "monthly",
  ...(Object.keys(STORE_TYPES) as StoreType[]).map((t): VariableId => `store:${t}`),
  ...PRODUCTS.flatMap((p) => [`premium:${p.id}`, `popular:${p.id}`, `outra:${p.id}`] as VariableId[]),
];

export type StratifierId = "region" | "size" | "income" | "zone" | "education" | "behavior" | "regionIncome";

type Stratifier = { id: StratifierId; label: string; key: (c: Consumer) => string; name: (key: string) => string };

export const STRATIFIERS: Record<StratifierId, Stratifier> = {
  region: { id: "region", label: "Região intermediária", key: (c) => c.region, name: (k) => REGIONS[k as RegionCode] },
  size: { id: "size", label: "Porte da cidade", key: (c) => c.size, name: (k) => CITY_SIZES[k as CitySize] },
  income: { id: "income", label: "Faixa de renda", key: (c) => c.income, name: (k) => INCOME_BANDS[k as IncomeBand] },
  zone: { id: "zone", label: "Zona", key: (c) => c.zone, name: (k) => ZONES[k as Zona] },
  education: { id: "education", label: "Escolaridade", key: (c) => c.education, name: (k) => EDUCATION[k as Escolaridade] },
  behavior: {
    id: "behavior",
    label: "Comportamento",
    key: (c) => c.behavior,
    name: (k) => BEHAVIORS.find((b) => b.id === k)?.nome ?? k,
  },
  // The study's own strata: region × income band.
  regionIncome: {
    id: "regionIncome",
    label: "Região × faixa de renda",
    key: (c) => `${c.region}|${c.income}`,
    name: (k) => {
      const [region, income] = k.split("|");
      return `${REGIONS[region]} · ${INCOME_BANDS[income as IncomeBand]}`;
    },
  },
};

// Stable display order for stratum keys.
const KEY_ORDER = [
  ...Object.keys(REGIONS),
  ...Object.keys(CITY_SIZES),
  ...Object.keys(INCOME_BANDS),
  ...Object.keys(ZONES),
  ...Object.keys(EDUCATION),
  ...BEHAVIORS.map((b) => b.id),
];
const compareKey = (a: string, b: string) => {
  const ia = KEY_ORDER.indexOf(a);
  const ib = KEY_ORDER.indexOf(b);
  return ia >= 0 && ib >= 0 ? ia - ib : a.localeCompare(b);
};

/** Orders keys like "alta|capital" part by part. */
export const compareKeys = (a: string, b: string) => {
  const pa = a.split("|");
  const pb = b.split("|");
  const differing = pa.findIndex((part, i) => part !== pb[i]);
  return differing < 0 ? 0 : compareKey(pa[differing], pb[differing]);
};

export type Stratum = { key: string; label: string; units: number[] };

/** Splits unit indices into non-overlapping strata that cover the whole frame (Parte III, §1). */
export const buildStrata = (units: Consumer[], keyOf: (c: Consumer) => string, labelOf: (key: string) => string) => {
  const groups = new Map<string, number[]>();
  units.forEach((c, i) => {
    const key = keyOf(c);
    const members = groups.get(key);
    if (members) members.push(i);
    else groups.set(key, [i]);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => compareKeys(a, b))
    .map(([key, members]): Stratum => ({ key, label: labelOf(key), units: members }));
};
