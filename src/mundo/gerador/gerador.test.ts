import { describe, expect, test } from "vitest";
import { PRODUCTS } from "@/mundo/products";
import { STORES } from "@/mundo/stores";
import { altaRenda, familiaRural, jovemDeCapital } from "./comportamentos";
import { consolidar, frequenciaObservada } from "./consolidar";
import { GeradorDePopulacao } from "./gerador";
import type { Comportamento } from "./tipos";

const gerar = (semente: number, ...comportamentos: Comportamento[]) =>
  comportamentos
    .reduce((g, c) => g.adicionarComportamento(c), new GeradorDePopulacao({ semente, tamanho: 3000 }))
    .gerar();

const base = (semente: number, ...comportamentos: Comportamento[]) => {
  const { cadastros, listas } = gerar(semente, ...comportamentos);
  return consolidar(cadastros, listas);
};

const proporcao = <T>(itens: T[], teste: (item: T) => boolean) => itens.filter(teste).length / itens.length;

describe("GeradorDePopulacao", () => {
  test("a mesma semente gera os mesmos dados do app, e outra semente gera outros", () => {
    const a = gerar(1, familiaRural, jovemDeCapital);
    expect(gerar(1, familiaRural, jovemDeCapital)).toEqual(a);
    expect(gerar(2, familiaRural, jovemDeCapital).listas.valor).not.toEqual(a.listas.valor);
  });

  test("só aparecem os comportamentos registrados", () => {
    const { cadastros } = gerar(3, jovemDeCapital, altaRenda);
    expect(new Set(cadastros.map((c) => c.comportamento))).toEqual(new Set([jovemDeCapital.id, altaRenda.id]));
  });

  test("toda pessoa tem ao menos uma lista e as listas ficam dentro do trimestre", () => {
    const { cadastros, listas } = gerar(4, familiaRural, jovemDeCapital);
    expect(new Set(listas.consumidor).size).toBe(cadastros.length);
    expect(Math.max(...listas.dia)).toBeLessThan(90);
    expect(listas.item.length).toBe(listas.quantidade * PRODUCTS.length);
  });

  test("o peso decide quem aparece onde: família rural fica na zona rural", () => {
    const { cadastros } = gerar(5, familiaRural, jovemDeCapital);
    const rurais = cadastros.filter((c) => c.zona === "rural");
    expect(proporcao(rurais, (c) => c.comportamento === familiaRural.id)).toBeGreaterThan(0.9);
  });

  test("um comportamento mensal gera poucas listas, e a consolidação o classifica como compra do mês", () => {
    const soMensal: Comportamento = { ...jovemDeCapital, id: "so-mensal", frequencia: () => "mensal" };
    const consumidores = base(6, soMensal);
    expect(proporcao(consumidores, (c) => c.frequency === "mensal")).toBeGreaterThan(0.9);
  });

  test("família rural faz mais compra do mês e lista mais a linha Clássico que o jovem da capital", () => {
    const consumidores = base(7, familiaRural, jovemDeCapital);
    const rural = consumidores.filter((c) => c.behavior === familiaRural.id);
    const jovem = consumidores.filter((c) => c.behavior === jovemDeCapital.id);
    expect(proporcao(rural, (c) => c.frequency === "mensal")).toBeGreaterThan(proporcao(jovem, (c) => c.frequency === "mensal") + 0.4);
    expect(proporcao(rural, (c) => c.listed.cafe.popular)).toBeGreaterThan(proporcao(jovem, (c) => c.listed.cafe.popular));
    expect(proporcao(jovem, (c) => c.listed.cafe.premium)).toBeGreaterThan(proporcao(rural, (c) => c.listed.cafe.premium));
  });

  test("cada lista aponta para um mercado real, e a família rural usa mais atacarejo que o jovem da capital", () => {
    const { listas } = gerar(9, familiaRural, jovemDeCapital);
    expect(Array.from(listas.loja).every((i) => i >= 0 && i < STORES.length)).toBe(true);
    const consumidores = base(9, familiaRural, jovemDeCapital);
    const rural = consumidores.filter((c) => c.behavior === familiaRural.id);
    const jovem = consumidores.filter((c) => c.behavior === jovemDeCapital.id);
    expect(proporcao(rural, (c) => c.storeTypes.atacarejo)).toBeGreaterThan(proporcao(jovem, (c) => c.storeTypes.atacarejo) + 0.2);
  });

  test("gerar sem comportamentos é um erro explícito", () => {
    expect(() => new GeradorDePopulacao({ semente: 1, tamanho: 10 }).gerar()).toThrow(/comportamento/);
  });
});

describe("consolidar", () => {
  test("o hábito observado vem da quantidade de listas no trimestre", () => {
    expect(frequenciaObservada(3)).toBe("mensal");
    expect(frequenciaObservada(6)).toBe("quinzenal");
    expect(frequenciaObservada(12)).toBe("semanal");
  });

  test("o ticket do consumidor é a média do valor das suas listas", () => {
    const { cadastros, listas } = gerar(8, altaRenda);
    const consumidores = consolidar(cadastros, listas);
    const primeiro = consumidores[0];
    const valores = Array.from(listas.valor.subarray(0, primeiro.lists));
    expect(primeiro.ticket).toBeCloseTo(valores.reduce((a, b) => a + b, 0) / valores.length, 1);
  });
});
