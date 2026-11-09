/**
 * Os seis comportamentos que formam a base sintética. Os valores são
 * suposições plausíveis para o Brasil de 2026, não estimativas oficiais.
 * Para criar um novo, copie um objeto, mude os números e registre com
 * `gerador.adicionarComportamento(...)` em `src/data/population.ts`.
 */
import type { Comportamento } from "./tipos";

export const familiaRural: Comportamento = {
  id: "familia-rural",
  nome: "Família grande da zona rural",
  descricao: "Casa cheia, renda baixa, uma compra grande por mês na cidade mais próxima.",
  // Mais comum onde a economia da cidade é agropecuária (dado do IBGE), inclusive na sede de cidades pequenas.
  peso: (ctx) => (ctx.zona === "rural" ? 2 + 8 * ctx.agro : ctx.municipio.size === "pequeno" ? 0.1 + 1.2 * ctx.agro : 0.02),
  moradores: (r) => r.entre(3, 8, 3 + r.poisson(1.6)),
  salario: (r, ctx) => r.logNormal(2400 * Math.exp(0.15 * ctx.rendaDaCidade), 0.35),
  escolaridade: (r) => r.categorica({ fundamental: 0.6, medio: 0.33, superior: 0.07 }),
  idade: (r) => r.categorica({ "18-24": 0.08, "25-34": 0.24, "35-44": 0.3, "45-59": 0.26, "60+": 0.12 }),
  frequencia: (r) => r.categorica({ mensal: 0.78, quinzenal: 0.17, semanal: 0.05 }),
  tamanhoDaCompra: (r, ctx, p) => r.logNormal(95 * p.moradores * ctx.precoRegional, 0.28),
  tiposDeLoja: (ctx, p) => (p.frequencia === "mensal" ? { atacarejo: 6, supermercado: 3, mercadinho: 1 } : { atacarejo: 2, supermercado: 4, mercadinho: 4 }),
  afinidadePremium: -1.1,
  afinidadePopular: 0.9,
  afinidadeComApp: -0.9,
};

export const familiaBaixaRendaUrbana: Comportamento = {
  id: "baixa-renda-urbana",
  nome: "Família de baixa renda na cidade",
  descricao: "Vive na periferia, recebe no começo do mês e concentra a compra logo depois.",
  peso: (ctx) => (ctx.zona === "rural" ? 0.3 : 3.2 - 0.8 * ctx.rendaDaCidade),
  moradores: (r) => r.entre(2, 7, 2 + r.poisson(1.8)),
  salario: (r, ctx) => r.logNormal(2900 * Math.exp(0.15 * ctx.rendaDaCidade), 0.3),
  escolaridade: (r) => r.categorica({ fundamental: 0.38, medio: 0.52, superior: 0.1 }),
  idade: (r) => r.categorica({ "18-24": 0.16, "25-34": 0.3, "35-44": 0.26, "45-59": 0.2, "60+": 0.08 }),
  frequencia: (r) => r.categorica({ mensal: 0.5, quinzenal: 0.35, semanal: 0.15 }),
  tamanhoDaCompra: (r, ctx, p) =>
    r.logNormal((p.frequencia === "mensal" ? 115 : 55) * p.moradores * ctx.precoRegional, 0.3),
  tiposDeLoja: (ctx, p) => (p.frequencia === "mensal" ? { atacarejo: 6, supermercado: 3, mercadinho: 1 } : { atacarejo: 2, supermercado: 4, mercadinho: 4 }),
  afinidadePremium: -0.8,
  afinidadePopular: 0.7,
  afinidadeComApp: 0,
};

export const classeMediaInterior: Comportamento = {
  id: "classe-media-interior",
  nome: "Família de classe média do interior",
  descricao: "Carro na garagem, compra quinzenal no supermercado do bairro, troca de marca na promoção.",
  peso: (ctx) => (ctx.zona === "rural" ? 0.6 : ctx.municipio.size === "capital" ? 1.2 : 3),
  moradores: (r) => r.entre(2, 6, 2 + r.poisson(1.3)),
  salario: (r, ctx) => r.logNormal(6200 * Math.exp(0.2 * ctx.rendaDaCidade), 0.35),
  escolaridade: (r) => r.categorica({ fundamental: 0.12, medio: 0.5, superior: 0.38 }),
  idade: (r) => r.categorica({ "18-24": 0.06, "25-34": 0.24, "35-44": 0.32, "45-59": 0.28, "60+": 0.1 }),
  frequencia: (r) => r.categorica({ mensal: 0.25, quinzenal: 0.5, semanal: 0.25 }),
  tamanhoDaCompra: (r, ctx, p) =>
    r.logNormal((p.frequencia === "mensal" ? 140 : p.frequencia === "quinzenal" ? 90 : 55) * p.moradores * ctx.precoRegional, 0.3),
  tiposDeLoja: (ctx, p) => (p.frequencia === "mensal" ? { atacarejo: 5, supermercado: 5, mercadinho: 0.5 } : { atacarejo: 2, supermercado: 7, mercadinho: 1 }),
  afinidadePremium: 0,
  afinidadePopular: 0,
  afinidadeComApp: 0.3,
};

export const jovemDeCapital: Comportamento = {
  id: "jovem-capital",
  nome: "Jovem ou casal sem filhos na capital",
  descricao: "Mora em apartamento, faz várias listas pequenas por semana e paga mais por conveniência.",
  peso: (ctx) => (ctx.zona === "rural" ? 0.02 : ctx.municipio.size === "capital" ? 3 : ctx.municipio.size === "grande" ? 1.2 : 0.2),
  moradores: (r) => r.entre(1, 2, 1 + r.poisson(0.5)),
  salario: (r, ctx) => r.logNormal(7000 * Math.exp(0.2 * ctx.rendaDaCidade), 0.45),
  escolaridade: (r) => r.categorica({ fundamental: 0.03, medio: 0.32, superior: 0.65 }),
  idade: (r) => r.categorica({ "18-24": 0.3, "25-34": 0.55, "35-44": 0.15, "45-59": 0, "60+": 0 }),
  frequencia: (r) => r.categorica({ mensal: 0.05, quinzenal: 0.2, semanal: 0.75 }),
  tamanhoDaCompra: (r, ctx, p) => r.logNormal(85 * p.moradores * ctx.precoRegional * (p.salario / 7000) ** 0.3, 0.35),
  tiposDeLoja: () => ({ atacarejo: 0.5, supermercado: 5, mercadinho: 4.5 }),
  afinidadePremium: 0.7,
  afinidadePopular: -0.4,
  afinidadeComApp: 1.2,
};

export const aposentado: Comportamento = {
  id: "aposentado",
  nome: "Aposentado",
  descricao: "Mora sozinho ou com o cônjuge, vai ao mercado várias vezes por semana e é fiel à marca.",
  peso: (ctx) => (ctx.zona === "rural" ? 0.8 : 1.3),
  moradores: (r) => r.entre(1, 3, 1 + r.poisson(0.6)),
  salario: (r, ctx) => r.logNormal(3400 * Math.exp(0.2 * ctx.rendaDaCidade), 0.45),
  escolaridade: (r) => r.categorica({ fundamental: 0.5, medio: 0.32, superior: 0.18 }),
  idade: () => "60+",
  frequencia: (r) => r.categorica({ mensal: 0.2, quinzenal: 0.25, semanal: 0.55 }),
  tamanhoDaCompra: (r, ctx, p) => r.logNormal(75 * p.moradores * ctx.precoRegional, 0.3),
  tiposDeLoja: () => ({ atacarejo: 1, supermercado: 6, mercadinho: 3 }),
  afinidadePremium: 0.1,
  afinidadePopular: 0.2,
  afinidadeComApp: -1.2,
};

export const altaRenda: Comportamento = {
  id: "alta-renda",
  nome: "Família de alta renda",
  descricao: "Bairro nobre, compra semanal e listas com marcas importadas e premium.",
  peso: (ctx) => (ctx.zona === "rural" ? 0.05 : Math.max(0.1, 0.6 + 0.7 * ctx.rendaDaCidade + (ctx.municipio.size === "capital" ? 0.8 : 0))),
  moradores: (r) => r.entre(2, 6, 2 + r.poisson(1.2)),
  salario: (r, ctx) => r.logNormal(19000 * Math.exp(0.15 * ctx.rendaDaCidade), 0.45),
  escolaridade: (r) => r.categorica({ fundamental: 0.02, medio: 0.13, superior: 0.85 }),
  idade: (r) => r.categorica({ "18-24": 0.03, "25-34": 0.2, "35-44": 0.35, "45-59": 0.3, "60+": 0.12 }),
  frequencia: (r) => r.categorica({ mensal: 0.08, quinzenal: 0.27, semanal: 0.65 }),
  tamanhoDaCompra: (r, ctx, p) => r.logNormal(120 * p.moradores * ctx.precoRegional, 0.35),
  tiposDeLoja: () => ({ atacarejo: 0.5, supermercado: 8, mercadinho: 1.5 }),
  afinidadePremium: 1.6,
  afinidadePopular: -1.2,
  afinidadeComApp: 0.7,
};

export const COMPORTAMENTOS = [
  familiaRural,
  familiaBaixaRendaUrbana,
  classeMediaInterior,
  jovemDeCapital,
  aposentado,
  altaRenda,
];
