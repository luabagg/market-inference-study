/**
 * Contrato do gerador da base sintética.
 *
 * Um Comportamento é um tipo de consumidor (ex.: família grande da zona rural).
 * O gerador sorteia, para cada consumidor, um município, a zona (urbana ou
 * rural) e um comportamento com probabilidade proporcional ao `peso` de cada
 * comportamento naquele contexto. Depois chama as funções do comportamento,
 * na ordem em que aparecem abaixo, para sortear os atributos.
 */
import type { Municipality } from "@/data/geography";

export type Zona = "urbana" | "rural";
export type Escolaridade = "fundamental" | "medio" | "superior";
export type Frequencia = "semanal" | "quinzenal" | "mensal";
export type FaixaEtaria = "18-24" | "25-34" | "35-44" | "45-59" | "60+";

/** Onde o consumidor mora. Já está sorteado quando o comportamento é escolhido. */
export type Contexto = {
  municipio: Municipality;
  zona: Zona;
  /** PIB per capita do município em desvios padrão da média nacional (log). */
  rendaDaCidade: number;
  /** Nível de preço regional (1 = média nacional). */
  precoRegional: number;
};

/** Sorteios prontos, todos usando a mesma semente do gerador. */
export type Sorteio = {
  /** Uniforme em [0, 1). */
  uniforme(): number;
  /** Verdadeiro com probabilidade p. */
  chance(p: number): boolean;
  normal(media: number, desvio: number): number;
  /** Valores positivos com cauda à direita, como renda e gasto. */
  logNormal(mediana: number, dispersao: number): number;
  /** Contagens, como número de moradores. */
  poisson(media: number): number;
  /** Escolhe uma chave com probabilidade proporcional ao valor. */
  categorica<T extends string>(pesos: Record<T, number>): T;
  /** Limita x ao intervalo [min, max]. */
  entre(min: number, max: number, x: number): number;
};

/** Atributos já sorteados, na ordem do comportamento. */
export type Pessoa = {
  moradores: number;
  /** Renda domiciliar mensal, R$. */
  salario: number;
  escolaridade: Escolaridade;
  idade: FaixaEtaria;
  frequencia: Frequencia;
};

export type Comportamento = {
  id: string;
  nome: string;
  descricao: string;
  /** Chance relativa de um consumidor neste contexto ter este comportamento. */
  peso(ctx: Contexto): number;
  moradores(r: Sorteio, ctx: Contexto): number;
  salario(r: Sorteio, ctx: Contexto, p: Pick<Pessoa, "moradores">): number;
  escolaridade(r: Sorteio, ctx: Contexto, p: Pick<Pessoa, "moradores" | "salario">): Escolaridade;
  idade(r: Sorteio, ctx: Contexto): FaixaEtaria;
  frequencia(r: Sorteio, ctx: Contexto, p: Omit<Pessoa, "frequencia">): Frequencia;
  /** Valor planejado por lista de compras, R$. */
  tamanhoDaCompra(r: Sorteio, ctx: Contexto, p: Pessoa): number;
  /** Desvio no log-odds de listar a marca premium e a marca popular. */
  afinidadePremium: number;
  afinidadePopular: number;
};
