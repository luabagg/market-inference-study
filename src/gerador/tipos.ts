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
import type { IncomeBand } from "@/data/population";
import type { StoreType } from "@/data/stores";

export type Zona = "urbana" | "rural";
export type Escolaridade = "fundamental" | "medio" | "superior";
export type Frequencia = "semanal" | "quinzenal" | "mensal";
export type FaixaEtaria = "18-24" | "25-34" | "35-44" | "45-59" | "60+";

/** Onde o consumidor mora. Já está sorteado quando o comportamento é escolhido. */
export type Contexto = {
  municipio: Municipality;
  zona: Zona;
  /** PIB per capita do município em desvios padrão da média do RS (log). */
  rendaDaCidade: number;
  /** Peso da agropecuária na economia do município, 0 a 1 (PIB dos Municípios, IBGE). */
  agro: number;
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
  /** Peso de cada tipo de mercado como destino de uma lista. A loja é a mais próxima daquele tipo. */
  tiposDeLoja(ctx: Contexto, p: Pessoa): Record<StoreType, number>;
  /** Desvio no log-odds de listar a marca premium e a marca popular. */
  afinidadePremium: number;
  afinidadePopular: number;
  /**
   * Desvio no log-odds de usar o app Cestinha. É o que torna a base do app
   * diferente do RS: uma parte vem de onde a pessoa mora (corrigível com o
   * IBGE), e esta parte vem do jeito de ser, que o Censo não mede.
   */
  afinidadeComApp: number;
};

/**
 * Um domicílio do RS. Para quem usa o app, é a ficha de cadastro. `comportamento`
 * não aparece para o cliente: só existe porque a base é sintética e serve para
 * conferir o que a amostra estima.
 */
export type Cadastro = {
  id: number;
  /** Se o domicílio usa o app. Quem não usa só existe para medir o RS inteiro; o app nunca vê esses dados. */
  usaOApp: boolean;
  /** Índice em MUNICIPALITIES. */
  municipio: number;
  zona: Zona;
  comportamento: string;
  moradores: number;
  salario: number;
  /** Faixa declarada no cadastro, pelos quantis da renda na base (40% baixa, 35% média, 25% alta). */
  faixaDeRenda: IncomeBand;
  escolaridade: Escolaridade;
  idade: FaixaEtaria;
  lon: number;
  lat: number;
};

/**
 * Listas recebidas pelo app no trimestre, uma linha por lista. Fica em colunas
 * (typed arrays) para caber na memória do navegador.
 */
export type TabelaDeListas = {
  quantidade: number;
  consumidor: Int32Array;
  /** Dia do trimestre, 0 a 89. */
  dia: Uint8Array;
  /** Valor planejado da lista, R$. */
  valor: Float32Array;
  /**
   * Uma entrada por lista e categoria (lista × PRODUCTS.length):
   * 0 = categoria fora da lista, 1 = linha premium, 2 = linha clássica, 3 = outra marca.
   */
  item: Uint8Array;
  /** Unidades da categoria naquela lista (mesmo índice de `item`). */
  unidades: Uint8Array;
  /** Mercado onde a lista vai ser comprada: índice em STORES (lojas reais do OpenStreetMap). */
  loja: Int16Array;
};
