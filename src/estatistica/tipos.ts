/**
 * Contrato do motor de amostragem.
 *
 * Tudo que é estatística de amostragem passa por aqui: sorteio, probabilidades
 * de inclusão, pesos, estimadores, variâncias, ICs e dimensionamento.
 * O resto do app (mapa, painel, gerador de dados) só monta as entradas e lê as
 * saídas. Nada neste contrato conhece React, consumidores ou perfis.
 *
 * A notação segue as apostilas de STC 1079 (Partes I a IV):
 *   N, n        tamanho da população e da amostra (AAS / AS)
 *   Nh, mh      tamanho do estrato h e da amostra no estrato (AES)
 *   Wh = Nh/N   peso populacional do estrato
 *   whi = Nh/mh peso amostral (HT) de uma unidade do estrato
 *   z           quantil z_{1-α/2} da normal
 */

/** Gerador uniforme em [0, 1). Injetado para que todo sorteio seja reproduzível. */
export type Rng = () => number;

/** Nível de confiança bilateral, ex. 0.95. */
export type Confianca = 0.9 | 0.95 | 0.99;

/** Saída padrão de qualquer estimador: estimativa → Var → EP → IC e CV (Parte II, §1). */
export type Estimativa = {
  estimativa: number;
  variancia: number;
  ep: number;
  /** z · EP (ou a margem com correção de continuidade, quando pedida). */
  margem: number;
  ic: [number, number];
  /** EP / estimativa. */
  cv: number;
};

// ---------------------------------------------------------------- AAS (Partes I e II)

export type AAS = {
  /** Sorteia n índices distintos de {0, …, N-1}. Todas as C(N, n) amostras equiprováveis. */
  sortear(N: number, n: number, rng: Rng): number[];
  /** πi = n/N (Parte I, §4.2). */
  probInclusao(N: number, n: number): number;
  /** ȳ, Var(ȳ) = (1/n - 1/N) s² (Parte II, §4.1). */
  estimarMedia(amostra: number[], N: number, confianca: Confianca): Estimativa;
  /** Ŷ = N ȳ, Var(Ŷ) = N² (1/n - 1/N) s². */
  estimarTotal(amostra: number[], N: number, confianca: Confianca): Estimativa;
  /**
   * p̂ = média dos 0/1, Var(p̂) = (N-n)/(N-1) · p̂(1-p̂)/(n-1) (convenção da disciplina, Parte II, §9.2).
   * Com `correcaoContinuidade`, a margem soma 1/(2n).
   */
  estimarProporcao(
    amostra: number[],
    N: number,
    confianca: Confianca,
    correcaoContinuidade?: boolean,
  ): Estimativa;
  /** n = N z² S² / (N D² + z² S²), arredondado para cima (Parte II, §7.2). */
  tamanhoParaMedia(params: { N: number; S2: number; D: number; confianca: Confianca }): number;
  /** n = N z² p(1-p) / ((N-1) D² + z² p(1-p)) (Parte II, §10.2). */
  tamanhoParaProporcao(params: { N: number; p: number; D: number; confianca: Confianca }): number;
};

// ---------------------------------------------------------------- AES (Parte III)

export type RegraAlocacao = "proporcional" | "igual" | "neyman" | "otima";

/** O que se sabe de cada estrato no planejamento (antes de sortear). */
export type EstratoPlanejamento = {
  Nh: number;
  /** Desvio padrão Sh,y de referência (piloto ou censo). Usado por Neyman e ótima. */
  Sh?: number;
  /** Custo de observar uma unidade no estrato. Usado pela alocação ótima. */
  Ch?: number;
};

/** O que foi observado em cada estrato depois do sorteio. */
export type EstratoObservado = {
  Nh: number;
  /** Valores y das mh unidades sorteadas no estrato. */
  valores: number[];
};

/** Detalhe por estrato, para tabelas e para visualizar os pesos HT. */
export type ResumoEstrato = {
  Nh: number;
  mh: number;
  /** Wh = Nh / N. */
  Wh: number;
  /** πhi = mh / Nh. */
  pi: number;
  /** whi = Nh / mh. */
  w: number;
  media: number;
  s2: number;
  /** Ŷh = Nh ȳh. */
  total: number;
};

export type EstimativaEstratificada = Estimativa & { estratos: ResumoEstrato[] };

export type AES = {
  /**
   * Divide m entre os estratos (Parte III, §5–6). Retorna mh inteiros com
   * Σ mh = m e 2 ≤ mh ≤ Nh (mh = 1 não permite calcular s²h).
   */
  alocar(estratos: EstratoPlanejamento[], m: number, regra: RegraAlocacao): number[];
  /** AAS independente em cada estrato. Retorna, por estrato, índices em {0, …, Nh-1}. */
  sortear(Nh: number[], mh: number[], rng: Rng): number[][];
  /** Ȳ = Σ Wh ȳh, Var = Σ Wh² (1/mh - 1/Nh) s²h (Parte III, §3.2 e §4.2). */
  estimarMedia(estratos: EstratoObservado[], confianca: Confianca): EstimativaEstratificada;
  /** Ŷ = Σ Nh ȳh, Var = Σ Nh² (1/mh - 1/Nh) s²h (Parte III, §3.1 e §4.1). */
  estimarTotal(estratos: EstratoObservado[], confianca: Confianca): EstimativaEstratificada;
  /**
   * Menor m que garante margem D para a média, dada a participação ah de cada estrato
   * (Parte III, §7). `S2h` é a variância de referência de cada estrato.
   */
  tamanhoParaMedia(params: {
    estratos: { Nh: number; S2h: number }[];
    a: number[];
    D: number;
    confianca: Confianca;
  }): number;
};

// ---------------------------------------------------------------- AS (Parte IV)

export type AmostraSistematica = {
  /** Início sorteado r, em {1, …, k}. */
  inicio: number;
  /** Intervalo k = N / n (inteiro). */
  k: number;
  /** Índices em {0, …, N-1}: r-1, r-1+k, … */
  indices: number[];
};

export type AS = {
  /** Sorteia o início e percorre a lista de k em k. Exige N = n k. */
  sortear(N: number, n: number, rng: Rng): AmostraSistematica;
  /**
   * ȳ_AS com o estimador de variância escolhido:
   * "v1" = dispersão em torno da média (ordem aleatória, §5.1),
   * "v2" = diferenças sucessivas (população ordenada, §5.2).
   * `valores` vem na ordem de seleção.
   */
  estimarMedia(valores: number[], N: number, confianca: Confianca, metodo: "v1" | "v2"): Estimativa;
};

// ---------------------------------------------------------------- Horvitz–Thompson (Parte I, §10)

export type HT = {
  /** wi = 1 / πi. */
  pesos(pi: number[]): number[];
  /** Ŷ_HT = Σ yi / πi. */
  total(y: number[], pi: number[]): number;
};

export type MotorAmostragem = {
  /** z_{1-α/2}: 1,645 / 1,96 / 2,576 (Parte II, §6). */
  z(confianca: Confianca): number;
  aas: AAS;
  aes: AES;
  as: AS;
  ht: HT;
};
