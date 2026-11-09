// Gabarito: exemplos resolvidos das apostilas de STC 1079.
// Roda contra o motor ativo (referência por padrão, `MOTOR=aluno` para o seu).
import { describe, expect, test } from "vitest";
import { motor } from "./index";

const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Uma amostra com n valores, média ȳ e variância s² exatas.
const amostraCom = (n: number, media: number, s2: number) => {
  const base = Array.from({ length: n }, (_, i) => i - (n - 1) / 2);
  const s2Base = base.reduce((acc, v) => acc + v ** 2, 0) / (n - 1);
  return base.map((v) => media + v * Math.sqrt(s2 / s2Base));
};

describe("Parte I: AAS e Horvitz–Thompson", () => {
  test("πi = n/N e o HT sob AAS reduz a N ȳ", () => {
    // N = 15, n = 3: πi = 0,2 e Ŷ_HT = Σ yi / 0,2 = N ȳ = 15 · 4.
    const pi = motor.aas.probInclusao(15, 3);
    expect(pi).toBe(0.2);
    expect(motor.ht.total([2, 4, 6], [pi, pi, pi])).toBeCloseTo(15 * 4);
    expect(motor.ht.pesos([0.2, 0.5])).toEqual([5, 2]);
  });

  test("sorteio sem reposição devolve n índices distintos dentro de {0, …, N-1}", () => {
    const amostra = motor.aas.sortear(50, 20, seeded(1));
    expect(new Set(amostra).size).toBe(20);
    expect(amostra.every((i) => i >= 0 && i < 50)).toBe(true);
  });

  test("cada unidade aparece com frequência próxima de n/N em muitos sorteios", () => {
    const rng = seeded(7);
    const contagem = new Array(10).fill(0);
    for (let r = 0; r < 20000; r++) motor.aas.sortear(10, 3, rng).forEach((i) => contagem[i]++);
    contagem.forEach((c) => expect(c / 20000).toBeCloseTo(0.3, 1));
  });
});

describe("Parte II: estimação e IC sob AAS", () => {
  test("§6.3: N=100, n=20, ȳ=10, s²=16 → EP 0,8 e IC [8,432; 11,568]", () => {
    const r = motor.aas.estimarMedia(amostraCom(20, 10, 16), 100, 0.95);
    expect(r.estimativa).toBeCloseTo(10);
    expect(r.variancia).toBeCloseTo(0.64);
    expect(r.ep).toBeCloseTo(0.8);
    expect(r.ic[0]).toBeCloseTo(8.432, 3);
    expect(r.ic[1]).toBeCloseTo(11.568, 3);
  });

  test("§6.3: o IC do total é o da média vezes N", () => {
    const r = motor.aas.estimarTotal(amostraCom(20, 10, 16), 100, 0.95);
    expect(r.ic[0]).toBeCloseTo(843.2, 1);
    expect(r.ic[1]).toBeCloseTo(1156.8, 1);
  });

  test("§10.4: 200 favoráveis em n=400 de N=2000, IC com correção [0,45486; 0,54514]", () => {
    const amostra = [...new Array(200).fill(1), ...new Array(200).fill(0)];
    const r = motor.aas.estimarProporcao(amostra, 2000, 0.95, true);
    expect(r.estimativa).toBe(0.5);
    expect(r.variancia).toBeCloseTo(0.0005015, 7);
    expect(r.margem).toBeCloseTo(0.04514, 4);
    expect(r.ic[0]).toBeCloseTo(0.45486, 4);
  });

  test("§10.4: para D = 0,03 com p = 0,5 e N = 2000, n = 697", () => {
    expect(motor.aas.tamanhoParaProporcao({ N: 2000, p: 0.5, D: 0.03, confianca: 0.95 })).toBe(697);
  });

  test("§7.2: tamanho para média arredonda para cima", () => {
    // N z² S² / (N D² + z² S²) = 1000·3,8416·16 / (1000·1 + 3,8416·16) ≈ 57,8
    expect(motor.aas.tamanhoParaMedia({ N: 1000, S2: 16, D: 1, confianca: 0.95 })).toBe(58);
  });
});

describe("Parte III: amostragem estratificada", () => {
  const estratos = [
    { Nh: 600, valores: amostraCom(30, 10, 16) },
    { Nh: 400, valores: amostraCom(20, 20, 25) },
  ];

  test("§4.4: Ȳ = 14, Var = 0,3724, IC [12,804; 15,196]", () => {
    const r = motor.aes.estimarMedia(estratos, 0.95);
    expect(r.estimativa).toBeCloseTo(14);
    expect(r.variancia).toBeCloseTo(0.3724, 4);
    expect(r.ic[0]).toBeCloseTo(12.804, 3);
    expect(r.ic[1]).toBeCloseTo(15.196, 3);
    expect(r.estratos[0].w).toBe(20);
    expect(r.estratos[0].Wh).toBe(0.6);
  });

  test("§4.4: total 14 000 com variância 372 400", () => {
    const r = motor.aes.estimarTotal(estratos, 0.95);
    expect(r.estimativa).toBeCloseTo(14000);
    expect(r.variancia).toBeCloseTo(372400, 0);
  });

  test("§6.2: proporcional 60/40, Neyman 55/45, ótima 71/29", () => {
    const plano = [
      { Nh: 600, Sh: 4, Ch: 1 },
      { Nh: 400, Sh: 5, Ch: 4 },
    ];
    expect(motor.aes.alocar(plano, 100, "proporcional")).toEqual([60, 40]);
    expect(motor.aes.alocar(plano, 100, "neyman")).toEqual([55, 45]);
    expect(motor.aes.alocar(plano, 100, "otima")).toEqual([71, 29]);
    expect(motor.aes.alocar(plano, 100, "igual")).toEqual([50, 50]);
  });

  test("alocação respeita 2 ≤ mh ≤ Nh e soma m", () => {
    const mh = motor.aes.alocar([{ Nh: 3 }, { Nh: 5000 }, { Nh: 40 }], 200, "igual");
    expect(mh.reduce((a, b) => a + b)).toBe(200);
    expect(mh[0]).toBe(3);
    expect(mh.every((m) => m >= 2)).toBe(true);
  });

  test("§7.1: alocação proporcional com D = 1 exige m = 71", () => {
    const m = motor.aes.tamanhoParaMedia({
      estratos: [
        { Nh: 600, S2h: 16 },
        { Nh: 400, S2h: 25 },
      ],
      a: [0.6, 0.4],
      D: 1,
      confianca: 0.95,
    });
    expect(m).toBe(71);
  });
});

describe("Parte IV: amostragem sistemática", () => {
  test("§1.1: N=12, n=4 → k=3 e amostra {r, r+3, r+6, r+9}", () => {
    const s = motor.as.sortear(12, 4, seeded(3));
    expect(s.k).toBe(3);
    expect(s.indices).toEqual([0, 3, 6, 9].map((i) => i + s.inicio - 1));
  });

  test("§5.3: com yi = i e r = 1, V̂1 = 2,5 e V̂2 = 0,75", () => {
    expect(motor.as.estimarMedia([1, 4, 7, 10], 12, 0.95, "v1").variancia).toBeCloseTo(2.5);
    expect(motor.as.estimarMedia([1, 4, 7, 10], 12, 0.95, "v2").variancia).toBeCloseTo(0.75);
  });
});
