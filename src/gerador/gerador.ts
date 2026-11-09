/**
 * Gerador da base sintética de consumidores.
 *
 *   const base = new GeradorDePopulacao({ semente: 42, tamanho: 60_000 })
 *     .adicionarComportamento(familiaRural)
 *     .adicionarComportamento(jovemDeCapital)
 *     .gerar();
 *
 * Para cada consumidor, em ordem:
 *   1. município, com chance proporcional a população × adoção do app (região e porte);
 *   2. zona urbana ou rural, com chance que depende do porte da cidade;
 *   3. comportamento, com chance proporcional a `peso(contexto)` de cada um;
 *   4. atributos, chamando as funções do comportamento;
 *   5. listas no trimestre, marcas e posição no mapa.
 * A mesma semente gera sempre a mesma base.
 */
import { type CitySize, MUNICIPALITIES, type RegionCode } from "@/data/geography";
import type { BrandChoice, Consumer, IncomeBand } from "@/data/population";
import { PRODUCTS, type ProductId } from "@/data/products";
import { logistic, normal, pickWeighted, seededRng } from "@/data/random";
import type { Rng } from "@/estatistica";
import type { Comportamento, Contexto, Frequencia, Sorteio, Zona } from "./tipos";

/** Por que o cadastro do app não é o Brasil: adoção maior no Sul/Sudeste e em cidades grandes. */
const ADOCAO_REGIAO: Record<RegionCode, number> = { S: 1.3, SE: 1.2, CO: 1.0, NE: 0.8, N: 0.6 };
const ADOCAO_PORTE: Record<CitySize, number> = { capital: 1.4, grande: 1.1, pequeno: 0.6 };
/** Chance de morar na zona rural, por porte da cidade (suposição, não dado do IBGE). */
const CHANCE_RURAL: Record<CitySize, number> = { capital: 0.02, grande: 0.07, pequeno: 0.38 };
const PRECO_REGIONAL: Record<RegionCode, number> = { S: 1.05, SE: 1.08, CO: 1.0, NE: 0.9, N: 0.97 };
const LISTAS_NO_TRIMESTRE: Record<Frequencia, number> = { semanal: 12, quinzenal: 6, mensal: 3 };
const DIAS_NO_PERIODO = 90;

const criarSorteio = (rng: Rng): Sorteio => ({
  uniforme: rng,
  chance: (p) => rng() < p,
  normal: (media, desvio) => media + desvio * normal(rng),
  logNormal: (mediana, dispersao) => mediana * Math.exp(dispersao * normal(rng)),
  poisson: (media) => {
    const limite = Math.exp(-media);
    let k = 0;
    for (let p = rng(); p > limite; p *= rng()) k++;
    return k;
  },
  categorica: <T extends string>(pesos: Record<T, number>) => {
    const opcoes = Object.entries(pesos) as [T, number][];
    let sorte = rng() * opcoes.reduce((acc, [, peso]) => acc + peso, 0);
    for (const [valor, peso] of opcoes) {
      sorte -= peso;
      if (sorte <= 0) return valor;
    }
    return opcoes[opcoes.length - 1][0];
  },
  entre: (min, max, x) => Math.min(max, Math.max(min, x)),
});

export class GeradorDePopulacao {
  private readonly comportamentos: Comportamento[] = [];

  constructor(private readonly opcoes: { semente: number; tamanho: number }) {}

  adicionarComportamento(comportamento: Comportamento) {
    this.comportamentos.push(comportamento);
    return this;
  }

  gerar(): Consumer[] {
    if (this.comportamentos.length === 0) throw new Error("Adicione ao menos um comportamento antes de gerar a base.");
    const rng = seededRng(this.opcoes.semente);
    const r = criarSorteio(rng);

    const acumulado = new Float64Array(MUNICIPALITIES.length);
    MUNICIPALITIES.reduce((acc, m, i) => {
      acumulado[i] = acc + m.population * ADOCAO_REGIAO[m.region] * ADOCAO_PORTE[m.size];
      return acumulado[i];
    }, 0);
    const logPib = MUNICIPALITIES.map((m) => Math.log(m.gdpPerCapita));
    const mediaPib = logPib.reduce((a, b) => a + b, 0) / logPib.length;
    const desvioPib = Math.sqrt(logPib.reduce((a, b) => a + (b - mediaPib) ** 2, 0) / logPib.length);

    const rascunhos = Array.from({ length: this.opcoes.tamanho }, (_, id) => {
      const indice = pickWeighted(acumulado, rng);
      const municipio = MUNICIPALITIES[indice];
      const zona: Zona = r.chance(CHANCE_RURAL[municipio.size]) ? "rural" : "urbana";
      const ctx: Contexto = {
        municipio,
        zona,
        rendaDaCidade: (logPib[indice] - mediaPib) / desvioPib,
        precoRegional: PRECO_REGIONAL[municipio.region],
      };

      const pesos = this.comportamentos.map((c) => Math.max(0, c.peso(ctx)));
      const comportamento = this.comportamentos[pickWeighted(Float64Array.from(cumulativo(pesos)), rng)];

      const moradores = Math.round(comportamento.moradores(r, ctx));
      const salario = comportamento.salario(r, ctx, { moradores });
      const escolaridade = comportamento.escolaridade(r, ctx, { moradores, salario });
      const idade = comportamento.idade(r, ctx);
      const frequencia = comportamento.frequencia(r, ctx, { moradores, salario, escolaridade, idade });
      const pessoa = { moradores, salario, escolaridade, idade, frequencia };
      const ticket = comportamento.tamanhoDaCompra(r, ctx, pessoa);
      const listas = Math.max(1, r.poisson(LISTAS_NO_TRIMESTRE[frequencia]));

      // Marca: afinidade do comportamento + renda acima ou abaixo de R$ 4.000 + bônus de capital.
      const efeitoRenda = Math.log(salario / 4000);
      const capital = municipio.size === "capital" ? 0.3 : 0;
      const brands = Object.fromEntries(
        PRODUCTS.map((p) => {
          const premium = logistic(p.premiumBase + comportamento.afinidadePremium + 0.6 * efeitoRenda + capital);
          const popular = logistic(p.valueBase + comportamento.afinidadePopular - 0.5 * efeitoRenda);
          const sorte = rng();
          const escolha: BrandChoice =
            sorte < premium ? "premium" : sorte < premium + (1 - premium) * popular ? "popular" : "outra";
          return [p.id, escolha];
        }),
      ) as Record<ProductId, BrandChoice>;

      return { id, indice, ctx, comportamento, pessoa, ticket, listas, brands, sortePosicao: [rng(), Math.abs(normal(rng))] };
    });

    // Faixa de renda: terços desiguais da renda domiciliar na base (40% baixa, 35% média, 25% alta).
    const salarios = Float64Array.from(rascunhos.map((d) => d.pessoa.salario)).sort();
    const corteAlta = salarios[Math.floor(0.75 * (salarios.length - 1))];
    const corteBaixa = salarios[Math.floor(0.4 * (salarios.length - 1))];

    return rascunhos.map((d): Consumer => {
      const income: IncomeBand = d.pessoa.salario >= corteAlta ? "alta" : d.pessoa.salario >= corteBaixa ? "media" : "baixa";
      const [lon, lat] = posicao(d.ctx, income, d.sortePosicao[0], d.sortePosicao[1]);
      return {
        id: d.id,
        municipality: d.indice,
        region: d.ctx.municipio.region,
        uf: d.ctx.municipio.uf,
        size: d.ctx.municipio.size,
        zone: d.ctx.zona,
        behavior: d.comportamento.id,
        lon,
        lat,
        income,
        salary: Math.round(d.pessoa.salario),
        education: d.pessoa.escolaridade,
        age: d.pessoa.idade,
        household: d.pessoa.moradores,
        frequency: d.pessoa.frequencia,
        lists: d.listas,
        ticket: Math.round(d.ticket * 100) / 100,
        monthlySpend: Math.round(((d.ticket * d.listas) / (DIAS_NO_PERIODO / 30)) * 100) / 100,
        brands: d.brands,
      };
    });
  }
}

const cumulativo = (pesos: number[]) => {
  let total = 0;
  return pesos.map((p) => (total += p));
};

/**
 * Ponto dentro do município: em torno de um dos bairros sintéticos (todos dentro
 * do contorno do IBGE, do centro para fora). Renda alta puxa para o centro;
 * zona rural vai para os bairros mais afastados.
 */
const posicao = (ctx: Contexto, renda: IncomeBand, u: number, espalhamento: number): [number, number] => {
  const bairros = ctx.municipio.neighborhoods;
  const inclinacao = ctx.zona === "rural" ? 0.35 : renda === "alta" ? 1.8 : renda === "baixa" ? 0.7 : 1;
  const [lon, lat, raio] = bairros[Math.min(bairros.length - 1, Math.floor(u ** inclinacao * bairros.length))];
  const angulo = 2 * Math.PI * ((u * 7919) % 1);
  const distancia = raio * Math.min(1, espalhamento / 2.5);
  return [lon + (Math.cos(angulo) * distancia) / Math.cos((lat * Math.PI) / 180), lat + Math.sin(angulo) * distancia];
};
