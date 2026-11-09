/**
 * Catalog tracked in the shopping lists. The demo client, Serra Azul Alimentos,
 * is fictional and sells two lines in every category: a premium SKU and a value
 * SKU. Every other brand on a list counts as a competitor.
 *
 * Prices are R$ per unit at the national average price level. `premiumBase` and
 * `valueBase` are the log-odds that a consumer prefers each Serra Azul line
 * before behavior and income adjustments. `weeklyRate` is the chance the
 * category shows up on a weekly list (larger lists include more categories).
 */
export const ORGANIZATION = {
  name: "Serra Azul Alimentos",
  segment: "Indústria de alimentos e mercearia",
  pitch:
    "Vende uma linha premium e uma linha de preço acessível em cada categoria. Quer saber onde cada uma entra na lista e onde perde para a concorrência.",
  premiumLine: "Serra Azul Reserva",
  valueLine: "Serra Azul Clássico",
};

export const PRODUCTS = [
  { id: "cafe", name: "Café", unit: "500 g", premium: "Café Reserva", value: "Café Clássico", premiumPrice: 34.9, valuePrice: 18.9, otherPrice: 22.5, premiumBase: -1.4, valueBase: -0.3, weeklyRate: 0.35 },
  { id: "azeite", name: "Azeite", unit: "500 ml", premium: "Azeite Reserva Extravirgem", value: "Azeite Clássico Composto", premiumPrice: 49.9, valuePrice: 19.9, otherPrice: 32, premiumBase: -1.8, valueBase: -0.7, weeklyRate: 0.12 },
  { id: "cerveja", name: "Cerveja", unit: "lata 350 ml", premium: "Cerveja Reserva Puro Malte", value: "Cerveja Clássica Pilsen", premiumPrice: 5.9, valuePrice: 3.2, otherPrice: 4.1, premiumBase: -1.6, valueBase: -0.2, weeklyRate: 0.3 },
  { id: "sabao", name: "Sabão em pó", unit: "1,6 kg", premium: "Sabão Reserva Concentrado", value: "Sabão Clássico Multiuso", premiumPrice: 39.9, valuePrice: 19.9, otherPrice: 27, premiumBase: -2, valueBase: -0.4, weeklyRate: 0.15 },
  { id: "arroz", name: "Arroz", unit: "5 kg", premium: "Arroz Reserva Agulhinha", value: "Arroz Clássico Tipo 1", premiumPrice: 36.9, valuePrice: 24.9, otherPrice: 28, premiumBase: -1.9, valueBase: 0.1, weeklyRate: 0.2 },
  { id: "chocolate", name: "Chocolate", unit: "barra 90 g", premium: "Chocolate Reserva 70% Cacau", value: "Chocolate Clássico ao Leite", premiumPrice: 14.9, valuePrice: 6.5, otherPrice: 8.9, premiumBase: -1.5, valueBase: -0.5, weeklyRate: 0.25 },
] as const;

export type Product = (typeof PRODUCTS)[number];
export type ProductId = Product["id"];
/** Which SKU a list line refers to. */
export type Tier = "premium" | "popular" | "outra";

export const TIER_LABEL: Record<Tier, string> = {
  premium: ORGANIZATION.premiumLine,
  popular: ORGANIZATION.valueLine,
  outra: "Outras marcas",
};

export const productById = (id: ProductId) => PRODUCTS.find((p) => p.id === id)!;

export const skuName = (product: Product, tier: Tier) =>
  tier === "premium" ? product.premium : tier === "popular" ? product.value : `${product.name} (outras marcas)`;

export const skuPrice = (product: Product, tier: Tier) =>
  tier === "premium" ? product.premiumPrice : tier === "popular" ? product.valuePrice : product.otherPrice;
