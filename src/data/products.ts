/**
 * Product categories tracked in shopping lists. Every brand here is fictional.
 * `premiumBase` and `valueBase` set the national log-odds of a list containing
 * each tier; the generator shifts them by neighborhood income and city size.
 */
export const PRODUCTS = [
  { id: "cafe", name: "Café", premium: "Casa Nobre Especial", value: "Bom Dia Tradicional", premiumBase: -1.5, valueBase: -0.2 },
  { id: "azeite", name: "Azeite", premium: "Casa Nobre Extravirgem", value: "Bom Dia Composto", premiumBase: -1.9, valueBase: -0.6 },
  { id: "cerveja", name: "Cerveja", premium: "Casa Nobre Puro Malte", value: "Bom Dia Pilsen", premiumBase: -1.7, valueBase: -0.1 },
  { id: "sabao", name: "Sabão em pó", premium: "Casa Nobre Concentrado", value: "Bom Dia Multiuso", premiumBase: -2.1, valueBase: -0.3 },
  { id: "arroz", name: "Arroz", premium: "Casa Nobre Agulhinha", value: "Bom Dia Tipo 1", premiumBase: -2.0, valueBase: 0.2 },
  { id: "chocolate", name: "Chocolate", premium: "Casa Nobre 70% Cacau", value: "Bom Dia ao Leite", premiumBase: -1.6, valueBase: -0.4 },
] as const;

export type Product = (typeof PRODUCTS)[number];
export type ProductId = Product["id"];

export const productById = (id: ProductId) => PRODUCTS.find((p) => p.id === id)!;
