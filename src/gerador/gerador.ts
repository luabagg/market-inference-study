/**
 * Gerador dos domicílios do RS e dos dados que o app Cestinha recebe deles.
 *
 *   const { cadastros, listas } = new GeradorDePopulacao({ semente: 42, tamanho: 100_000 })
 *     .adicionarComportamento(familiaRural)
 *     .adicionarComportamento(jovemDeCapital)
 *     .gerar();
 *
 * Para cada domicílio, em ordem:
 *   1. município do RS, com chance proporcional à população do Censo;
 *   2. zona urbana ou rural, com a parcela rural do município no Censo 2022;
 *   3. comportamento, com chance proporcional a `peso(contexto)` de cada um;
 *   4. atributos do cadastro, chamando as funções do comportamento;
 *   5. se usa o app: chance maior na capital, em cidades mais ricas e para quem
 *      tem `afinidadeComApp` alta;
 *   6. endereço e as listas do trimestre: datas pelo hábito de compra, mercado
 *      (o mais próximo do tipo sorteado, entre lojas reais do OpenStreetMap), itens por categoria,
 *      marca preferida (com troca ocasional), quantidades e valor.
 * A mesma semente gera sempre os mesmos dados.
 *
 * Quem não usa o app também ganha listas: elas são o que essa família compraria,
 * e só servem para saber o valor real no RS inteiro e medir o viés da base.
 *
 * O gerador não calcula nada por consumidor. Quem transforma listas em variáveis
 * (ticket, frequência, "listou a linha premium") é `consolidar.ts`, como faria o
 * time de dados com os registros que chegam do app.
 */
import { type CitySize, MUNICIPALITIES } from "@/data/geography";
import type { IncomeBand } from "@/data/population";
import { PRODUCTS, type Tier, skuPrice } from "@/data/products";
import { logistic, normal, pickWeighted, seededRng } from "@/data/random";
import { nearestStore, type StoreType } from "@/data/stores";
import type { Rng } from "@/estatistica";
import type { Cadastro, Comportamento, Contexto, Frequencia, Sorteio, TabelaDeListas, Zona } from "./tipos";

/** Log-odds de usar o app, antes do porte, da renda da cidade e do comportamento. Calibrado para ~60% dos domicílios. */
const ADOCAO_BASE = 0.45;
/** Por que a base do app não é o RS inteiro: adoção maior na capital e nas cidades grandes. */
const ADOCAO_PORTE: Record<CitySize, number> = { capital: 0.8, grande: 0.4, pequeno: -0.3 };
/** Cada desvio padrão de PIB per capita da cidade soma isto ao log-odds de usar o app. */
const ADOCAO_RENDA_DA_CIDADE = 0.3;
/** Dias entre uma lista e a próxima, em média, para cada hábito. */
const INTERVALO_DIAS: Record<Frequencia, number> = { semanal: 7, quinzenal: 14, mensal: 30 };
/** Listas maiores trazem mais categorias e mais unidades. */
const ESCALA_DA_LISTA: Record<Frequencia, number> = { semanal: 1, quinzenal: 1.8, mensal: 3 };
const DIAS_NO_TRIMESTRE = 90;
/** Chance de, numa lista, comprar a marca de sempre na categoria. */
const FIDELIDADE = 0.8;
/** Chance de pular uma ida ao mercado (viagem, estoque em casa). */
const CHANCE_DE_PULAR = 0.12;
const CODIGO_DO_ITEM: Record<Tier, number> = { premium: 1, popular: 2, outra: 3 };

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

  gerar(): { cadastros: Cadastro[]; listas: TabelaDeListas } {
    if (this.comportamentos.length === 0) throw new Error("Adicione ao menos um comportamento antes de gerar a base.");
    const rng = seededRng(this.opcoes.semente);
    const r = criarSorteio(rng);

    const acumulado = new Float64Array(MUNICIPALITIES.length);
    MUNICIPALITIES.reduce((acc, m, i) => (acumulado[i] = acc + m.population), 0);
    const logPib = MUNICIPALITIES.map((m) => Math.log(m.gdpPerCapita));
    const mediaPib = logPib.reduce((a, b) => a + b, 0) / logPib.length;
    const desvioPib = Math.sqrt(logPib.reduce((a, b) => a + (b - mediaPib) ** 2, 0) / logPib.length);

    // 1ª passada: quem é cada pessoa (contexto, comportamento, atributos e marca de sempre).
    const pessoas = Array.from({ length: this.opcoes.tamanho }, (_, id) => {
      const indice = pickWeighted(acumulado, rng);
      const municipio = MUNICIPALITIES[indice];
      const zona: Zona = r.chance(municipio.ruralShare) ? "rural" : "urbana";
      const ctx: Contexto = {
        municipio,
        zona,
        rendaDaCidade: (logPib[indice] - mediaPib) / desvioPib,
        agro: municipio.agroShare,
        precoRegional: 1,
      };

      const acumuladoPesos = new Float64Array(this.comportamentos.length);
      this.comportamentos.reduce((acc, c, i) => (acumuladoPesos[i] = acc + Math.max(0, c.peso(ctx))), 0);
      const comportamento = this.comportamentos[pickWeighted(acumuladoPesos, rng)];

      const moradores = Math.round(comportamento.moradores(r, ctx));
      const salario = comportamento.salario(r, ctx, { moradores });
      const escolaridade = comportamento.escolaridade(r, ctx, { moradores, salario });
      const idade = comportamento.idade(r, ctx);
      const frequencia = comportamento.frequencia(r, ctx, { moradores, salario, escolaridade, idade });
      const pessoa = { moradores, salario, escolaridade, idade, frequencia };
      const usaOApp = r.chance(
        logistic(ADOCAO_BASE + ADOCAO_PORTE[municipio.size] + ADOCAO_RENDA_DA_CIDADE * ctx.rendaDaCidade + comportamento.afinidadeComApp),
      );

      // Marca de sempre em cada categoria: afinidade do comportamento + renda + bônus da capital.
      const efeitoRenda = Math.log(salario / 4000);
      const capital = municipio.capital ? 0.3 : 0;
      const chances = PRODUCTS.map((p) => {
        const premium = logistic(p.premiumBase + comportamento.afinidadePremium + 0.6 * efeitoRenda + capital);
        const popular = (1 - premium) * logistic(p.valueBase + comportamento.afinidadePopular - 0.5 * efeitoRenda);
        return { premium, popular };
      });
      const marcaDeSempre = chances.map((c) => escolherMarca(c, rng()));

      return { id, indice, ctx, comportamento, pessoa, usaOApp, chances, marcaDeSempre, posicao: [rng(), Math.abs(normal(rng))] as const };
    });

    // Faixa de renda: 40% baixa, 35% média, 25% alta, pelos quantis do RS inteiro (não só de quem usa o app).
    const salarios = Float64Array.from(pessoas.map((p) => p.pessoa.salario)).sort();
    const corteAlta = salarios[Math.floor(0.75 * (salarios.length - 1))];
    const corteBaixa = salarios[Math.floor(0.4 * (salarios.length - 1))];

    // 2ª passada: endereço, mercados mais próximos e as listas do trimestre.
    const listas = { consumidor: [] as number[], dia: [] as number[], valor: [] as number[], item: [] as number[], unidades: [] as number[], loja: [] as number[] };

    const cadastros = pessoas.map((p): Cadastro => {
      const faixaDeRenda: IncomeBand = p.pessoa.salario >= corteAlta ? "alta" : p.pessoa.salario >= corteBaixa ? "media" : "baixa";
      const { lon, lat, bairro } = endereco(p.ctx, faixaDeRenda, p.posicao[0], p.posicao[1]);
      const lojaMaisProxima = lojasDoBairro(p.indice, bairro, p.ctx);
      // Tabela acumulada dos pesos de loja, montada uma vez por pessoa (o sorteio roda em cada lista).
      const pesosDeLoja = p.comportamento.tiposDeLoja(p.ctx, p.pessoa);
      const acumuladoLojas = new Float64Array(TIPOS_DE_LOJA.length);
      TIPOS_DE_LOJA.reduce((acc, tipo, i) => (acumuladoLojas[i] = acc + pesosDeLoja[tipo]), 0);

      // Listas espaçadas pelo hábito, com variação e idas puladas.
      const intervalo = INTERVALO_DIAS[p.pessoa.frequencia];
      const escala = ESCALA_DA_LISTA[p.pessoa.frequencia];
      const dias: number[] = [];
      for (let dia = rng() * intervalo; dia < DIAS_NO_TRIMESTRE; dia += intervalo * Math.exp(0.2 * normal(rng))) {
        if (!r.chance(CHANCE_DE_PULAR)) dias.push(Math.floor(dia));
      }
      if (dias.length === 0) dias.push(Math.floor(rng() * DIAS_NO_TRIMESTRE));

      for (const dia of dias) {
        let valor = p.comportamento.tamanhoDaCompra(r, p.ctx, p.pessoa) * Math.exp(0.2 * normal(rng));
        PRODUCTS.forEach((produto, k) => {
          if (!r.chance(Math.min(0.95, produto.weeklyRate * escala))) {
            listas.item.push(0);
            listas.unidades.push(0);
            return;
          }
          const marca = r.chance(FIDELIDADE) ? p.marcaDeSempre[k] : escolherMarca(p.chances[k], rng());
          const unidades = Math.min(255, 1 + r.poisson(0.2 * p.pessoa.moradores * escala));
          valor += unidades * skuPrice(produto, marca) * p.ctx.precoRegional;
          listas.item.push(CODIGO_DO_ITEM[marca]);
          listas.unidades.push(unidades);
        });
        listas.consumidor.push(p.id);
        listas.dia.push(dia);
        listas.valor.push(valor);
        listas.loja.push(lojaMaisProxima[TIPOS_DE_LOJA[pickWeighted(acumuladoLojas, rng)]]);
      }

      return {
        id: p.id,
        usaOApp: p.usaOApp,
        municipio: p.indice,
        zona: p.ctx.zona,
        comportamento: p.comportamento.id,
        moradores: p.pessoa.moradores,
        salario: Math.round(p.pessoa.salario),
        faixaDeRenda,
        escolaridade: p.pessoa.escolaridade,
        idade: p.pessoa.idade,
        lon,
        lat,
      };
    });

    return {
      cadastros,
      listas: {
        quantidade: listas.consumidor.length,
        consumidor: Int32Array.from(listas.consumidor),
        dia: Uint8Array.from(listas.dia),
        valor: Float32Array.from(listas.valor),
        item: Uint8Array.from(listas.item),
        unidades: Uint8Array.from(listas.unidades),
        loja: Int16Array.from(listas.loja),
      },
    };
  }
}

const TIPOS_DE_LOJA: StoreType[] = ["atacarejo", "supermercado", "mercadinho"];

// Mercado mais próximo de cada tipo, calculado uma vez por bairro sintético (todos os vizinhos usam os mesmos).
const cacheDeLojas = new Map<string, Record<StoreType, number>>();
const lojasDoBairro = (municipio: number, bairro: number, ctx: Contexto) => {
  const chave = `${municipio}:${bairro}`;
  const emCache = cacheDeLojas.get(chave);
  if (emCache) return emCache;
  const [lon, lat] = ctx.municipio.neighborhoods[bairro];
  const lojas = Object.fromEntries(TIPOS_DE_LOJA.map((tipo) => [tipo, nearestStore(lon, lat, tipo)])) as Record<StoreType, number>;
  cacheDeLojas.set(chave, lojas);
  return lojas;
};

const escolherMarca = (c: { premium: number; popular: number }, sorte: number): Tier =>
  sorte < c.premium ? "premium" : sorte < c.premium + c.popular ? "popular" : "outra";

/**
 * Endereço dentro do município: em torno de um dos bairros sintéticos (todos
 * dentro do contorno do IBGE, do centro para fora). Renda alta puxa para o
 * centro; zona rural vai para os bairros mais afastados.
 */
const endereco = (ctx: Contexto, renda: IncomeBand, u: number, espalhamento: number) => {
  const bairros = ctx.municipio.neighborhoods;
  const inclinacao = ctx.zona === "rural" ? 0.35 : renda === "alta" ? 1.8 : renda === "baixa" ? 0.7 : 1;
  const bairro = Math.min(bairros.length - 1, Math.floor(u ** inclinacao * bairros.length));
  const [lon, lat, raio] = bairros[bairro];
  const angulo = 2 * Math.PI * ((u * 7919) % 1);
  const distancia = raio * Math.min(1, espalhamento / 2.5);
  return {
    lon: lon + (Math.cos(angulo) * distancia) / Math.cos((lat * Math.PI) / 180),
    lat: lat + Math.sin(angulo) * distancia,
    bairro,
  };
};
