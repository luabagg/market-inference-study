import { describe, expect, test } from "vitest";
import { altaRenda, familiaRural, jovemDeCapital } from "./comportamentos";
import { GeradorDePopulacao } from "./gerador";
import type { Comportamento } from "./tipos";

const gerar = (semente: number, ...comportamentos: Comportamento[]) =>
  comportamentos
    .reduce((g, c) => g.adicionarComportamento(c), new GeradorDePopulacao({ semente, tamanho: 4000 }))
    .gerar();

const proporcao = <T>(itens: T[], teste: (item: T) => boolean) => itens.filter(teste).length / itens.length;

describe("GeradorDePopulacao", () => {
  test("a mesma semente gera a mesma base, e outra semente gera outra", () => {
    const a = gerar(1, familiaRural, jovemDeCapital);
    expect(gerar(1, familiaRural, jovemDeCapital)).toEqual(a);
    expect(gerar(2, familiaRural, jovemDeCapital)).not.toEqual(a);
  });

  test("só aparecem os comportamentos registrados", () => {
    const base = gerar(3, jovemDeCapital, altaRenda);
    expect(new Set(base.map((c) => c.behavior))).toEqual(new Set([jovemDeCapital.id, altaRenda.id]));
  });

  test("um comportamento novo muda a base do jeito que suas funções dizem", () => {
    const soMensal: Comportamento = { ...jovemDeCapital, id: "so-mensal", frequencia: () => "mensal" };
    expect(gerar(4, soMensal).every((c) => c.frequency === "mensal")).toBe(true);
  });

  test("o peso decide quem aparece onde: família rural fica na zona rural, jovem fica na cidade", () => {
    const base = gerar(5, familiaRural, jovemDeCapital);
    const rurais = base.filter((c) => c.zone === "rural");
    expect(proporcao(rurais, (c) => c.behavior === familiaRural.id)).toBeGreaterThan(0.9);
    expect(proporcao(base.filter((c) => c.size === "capital"), (c) => c.behavior === jovemDeCapital.id)).toBeGreaterThan(0.9);
  });

  test("família rural faz compra do mês com mais frequência e lista mais marca popular que o jovem da capital", () => {
    const base = gerar(6, familiaRural, jovemDeCapital);
    const rural = base.filter((c) => c.behavior === familiaRural.id);
    const jovem = base.filter((c) => c.behavior === jovemDeCapital.id);
    expect(proporcao(rural, (c) => c.frequency === "mensal")).toBeGreaterThan(proporcao(jovem, (c) => c.frequency === "mensal") + 0.4);
    expect(proporcao(rural, (c) => c.brands.cafe === "popular")).toBeGreaterThan(proporcao(jovem, (c) => c.brands.cafe === "popular"));
  });

  test("gerar sem comportamentos é um erro explícito", () => {
    expect(() => new GeradorDePopulacao({ semente: 1, tamanho: 10 }).gerar()).toThrow(/comportamento/);
  });
});
