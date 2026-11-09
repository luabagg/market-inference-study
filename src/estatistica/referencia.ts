/**
 * Implementação de referência do motor de amostragem.
 *
 * Cada bloco cita a seção da apostila de onde vem a fórmula. A ideia é que este
 * arquivo possa ser apagado e reescrito à mão (veja `aluno.ts`); os testes em
 * `motor.test.ts` usam os exemplos resolvidos das apostilas como gabarito.
 */
import type {
  AAS,
  AES,
  AS,
  Confianca,
  Estimativa,
  EstimativaEstratificada,
  EstratoObservado,
  HT,
  MotorAmostragem,
  Rng,
} from "./tipos";

// Parte II, §6: valores usuais de z_{1-α/2}.
const Z: Record<Confianca, number> = { 0.9: 1.645, 0.95: 1.96, 0.99: 2.576 };

const soma = (valores: number[]) => valores.reduce((acc, v) => acc + v, 0);
const media = (valores: number[]) => soma(valores) / valores.length;

// Parte II, §2: s² = Σ (yi - ȳ)² / (n - 1).
const varianciaAmostral = (valores: number[]) => {
  const m = media(valores);
  return soma(valores.map((v) => (v - m) ** 2)) / (valores.length - 1);
};

// Parte II, §5–6: EP = √Var, D = z EP, IC = θ̂ ± D, CV = EP / θ̂.
const montarEstimativa = (estimativa: number, variancia: number, z: number, extraMargem = 0): Estimativa => {
  const ep = Math.sqrt(variancia);
  const margem = z * ep + extraMargem;
  return {
    estimativa,
    variancia,
    ep,
    margem,
    ic: [estimativa - margem, estimativa + margem],
    cv: estimativa === 0 ? Number.NaN : ep / estimativa,
  };
};

// Fisher–Yates parcial: as n primeiras posições formam uma AAS sem reposição.
const sortearSemReposicao = (N: number, n: number, rng: Rng) => {
  const indices = Array.from({ length: N }, (_, i) => i);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (N - i));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, n);
};

// ---------------------------------------------------------------- AAS

const aas: AAS = {
  sortear: sortearSemReposicao,

  probInclusao: (N, n) => n / N,

  estimarMedia(amostra, N, confianca) {
    const n = amostra.length;
    return montarEstimativa(media(amostra), (1 / n - 1 / N) * varianciaAmostral(amostra), Z[confianca]);
  },

  estimarTotal(amostra, N, confianca) {
    const n = amostra.length;
    return montarEstimativa(
      N * media(amostra),
      N ** 2 * (1 / n - 1 / N) * varianciaAmostral(amostra),
      Z[confianca],
    );
  },

  // Parte II, §9.2: fórmula do gabarito, com (N - n)/(N - 1) e p̂(1 - p̂)/(n - 1).
  estimarProporcao(amostra, N, confianca, correcaoContinuidade = false) {
    const n = amostra.length;
    const p = media(amostra);
    const variancia = ((N - n) / (N - 1)) * ((p * (1 - p)) / (n - 1));
    return montarEstimativa(p, variancia, Z[confianca], correcaoContinuidade ? 1 / (2 * n) : 0);
  },

  tamanhoParaMedia({ N, S2, D, confianca }) {
    const z2 = Z[confianca] ** 2;
    return Math.ceil((N * z2 * S2) / (N * D ** 2 + z2 * S2));
  },

  tamanhoParaProporcao({ N, p, D, confianca }) {
    const z2pq = Z[confianca] ** 2 * p * (1 - p);
    return Math.ceil((N * z2pq) / ((N - 1) * D ** 2 + z2pq));
  },
};

// ---------------------------------------------------------------- AES

/**
 * Distribui m em inteiros proporcionais a `pesos`, respeitando min ≤ mh ≤ max.
 * Estratos que estouram um limite ficam presos nele e o restante é redistribuído;
 * o arredondamento final usa os maiores restos para manter Σ mh = m.
 */
const distribuirComLimites = (pesos: number[], m: number, min: number[], max: number[]) => {
  const fixo: (number | null)[] = pesos.map(() => null);
  for (;;) {
    const livres = pesos.flatMap((_, h) => (fixo[h] === null ? [h] : []));
    const mLivre = m - soma(fixo.map((f) => f ?? 0));
    const somaPesos = soma(livres.map((h) => pesos[h]));
    const alvo = new Map(
      livres.map((h) => [h, somaPesos > 0 ? (mLivre * pesos[h]) / somaPesos : mLivre / livres.length]),
    );
    const estouros = livres.filter((h) => alvo.get(h)! < min[h] || alvo.get(h)! > max[h]);
    if (estouros.length === 0) {
      const ideal = pesos.map((_, h) => fixo[h] ?? alvo.get(h)!);
      const mh = ideal.map(Math.floor);
      const porResto = ideal
        .map((v, h) => ({ h, resto: v - Math.floor(v) }))
        .sort((a, b) => b.resto - a.resto);
      for (let falta = m - soma(mh), i = 0; falta > 0; i = (i + 1) % porResto.length) {
        const h = porResto[i].h;
        if (mh[h] < max[h]) {
          mh[h]++;
          falta--;
        }
      }
      return mh;
    }
    estouros.forEach((h) => {
      fixo[h] = alvo.get(h)! < min[h] ? min[h] : max[h];
    });
  }
};

const estimarEstratificado = (
  estratos: EstratoObservado[],
  confianca: Confianca,
  escala: "media" | "total",
): EstimativaEstratificada => {
  const N = soma(estratos.map((e) => e.Nh));
  const resumos = estratos.map(({ Nh, valores }) => {
    const mh = valores.length;
    const mediaH = media(valores);
    return {
      Nh,
      mh,
      Wh: Nh / N,
      pi: mh / Nh,
      w: Nh / mh,
      media: mediaH,
      s2: varianciaAmostral(valores),
      total: Nh * mediaH,
    };
  });
  // Parte III, §4.1: Var(Ŷ) = Σ Nh² (1/mh - 1/Nh) s²h. A da média divide por N².
  const varTotal = soma(resumos.map((r) => r.Nh ** 2 * (1 / r.mh - 1 / r.Nh) * r.s2));
  const total = soma(resumos.map((r) => r.total));
  const base =
    escala === "total"
      ? montarEstimativa(total, varTotal, Z[confianca])
      : montarEstimativa(total / N, varTotal / N ** 2, Z[confianca]);
  return { ...base, estratos: resumos };
};

const aes: AES = {
  // Parte III, §5–6: proporcional ∝ Nh, igual ∝ 1, Neyman ∝ Nh Sh, ótima ∝ Nh Sh / √Ch.
  alocar(estratos, m, regra) {
    const pesos = estratos.map((e) => {
      if (regra === "proporcional") return e.Nh;
      if (regra === "igual") return 1;
      if (regra === "neyman") return e.Nh * (e.Sh ?? 0);
      return (e.Nh * (e.Sh ?? 0)) / Math.sqrt(e.Ch ?? 1);
    });
    return distribuirComLimites(
      pesos,
      m,
      estratos.map((e) => Math.min(2, e.Nh)),
      estratos.map((e) => e.Nh),
    );
  },

  // Parte III, §2: sorteios independentes, uma AAS em cada estrato.
  sortear: (Nh, mh, rng) => Nh.map((tamanho, h) => sortearSemReposicao(tamanho, mh[h], rng)),

  estimarMedia: (estratos, confianca) => estimarEstratificado(estratos, confianca, "media"),
  estimarTotal: (estratos, confianca) => estimarEstratificado(estratos, confianca, "total"),

  // Parte III, §7: m ≥ Σ (Wh² S²h / ah) / (V + (1/N) Σ Wh S²h), com V = (D / z)².
  tamanhoParaMedia({ estratos, a, D, confianca }) {
    const N = soma(estratos.map((e) => e.Nh));
    const W = estratos.map((e) => e.Nh / N);
    const V = (D / Z[confianca]) ** 2;
    const numerador = soma(estratos.map((e, h) => (W[h] ** 2 * e.S2h) / a[h]));
    const correcao = soma(estratos.map((e, h) => W[h] * e.S2h)) / N;
    return Math.ceil(numerador / (V + correcao));
  },
};

// ---------------------------------------------------------------- AS

const as: AS = {
  // Parte IV, §1.1: R ~ U{1, …, k}, s_r = {r, r+k, …, r+(n-1)k}.
  sortear(N, n, rng) {
    if (N % n !== 0) throw new Error(`AS exige N = n k (N=${N}, n=${n})`);
    const k = N / n;
    const inicio = 1 + Math.floor(rng() * k);
    return { inicio, k, indices: Array.from({ length: n }, (_, j) => inicio - 1 + j * k) };
  },

  // Parte IV, §5.1 (v1) e §5.2 (v2).
  estimarMedia(valores, N, confianca, metodo) {
    const n = valores.length;
    const fpc = 1 / n - 1 / N;
    const dispersao =
      metodo === "v1"
        ? varianciaAmostral(valores)
        : soma(valores.slice(1).map((v, j) => (valores[j] - v) ** 2)) / (2 * (n - 1));
    return montarEstimativa(media(valores), fpc * dispersao, Z[confianca]);
  },
};

// ---------------------------------------------------------------- HT

const ht: HT = {
  pesos: (pi) => pi.map((p) => 1 / p),
  total: (y, pi) => soma(y.map((yi, i) => yi / pi[i])),
};

export const motorReferencia: MotorAmostragem = { z: (c) => Z[c], aas, aes, as, ht };
