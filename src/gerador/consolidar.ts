/**
 * Dos dados do app para a unidade amostral.
 *
 * O app registra listas (observações). A pesquisa sorteia consumidores
 * (unidades). Este passo junta as listas de cada pessoa ao seu cadastro e
 * calcula as variáveis que os estudos medem.
 */
import { MUNICIPALITIES } from "@/data/geography";
import type { Consumer } from "@/data/population";
import { PRODUCTS } from "@/data/products";
import { STORES } from "@/data/stores";
import type { Cadastro, Frequencia, TabelaDeListas } from "./tipos";

const DIAS_NO_TRIMESTRE = 90;
const MESES_NO_TRIMESTRE = DIAS_NO_TRIMESTRE / 30;

/**
 * Hábito observado pela quantidade de listas no trimestre: até 4 é compra do
 * mês, até 8 é quinzenal, acima disso é semanal.
 */
export const frequenciaObservada = (listas: number): Frequencia =>
  listas <= 4 ? "mensal" : listas <= 8 ? "quinzenal" : "semanal";

export const consolidar = (cadastros: Cadastro[], listas: TabelaDeListas): Consumer[] => {
  const categorias = PRODUCTS.length;
  const quantidade = new Int32Array(cadastros.length);
  const soma = new Float64Array(cadastros.length);
  // Por consumidor e categoria, bits: 1 = listou premium, 2 = listou clássica, 4 = listou outra marca.
  const marcas = new Uint8Array(cadastros.length * categorias);
  // Bits por consumidor: 1 = listou para atacarejo, 2 = supermercado, 4 = mercadinho.
  const tiposDeLoja = new Uint8Array(cadastros.length);
  const BIT_DO_TIPO = { atacarejo: 1, supermercado: 2, mercadinho: 4 } as const;
  // Mercado principal: o que mais aparece nas listas da pessoa (listas vêm em blocos por pessoa).
  const lojaPrincipal = new Int16Array(cadastros.length).fill(-1);
  const contagemDeLojas = new Map<number, number>();

  for (let l = 0; l < listas.quantidade; l++) {
    const c = listas.consumidor[l];
    if (l === 0 || listas.consumidor[l - 1] !== c) contagemDeLojas.clear();
    quantidade[c]++;
    soma[c] += listas.valor[l];
    const loja = listas.loja[l];
    tiposDeLoja[c] |= BIT_DO_TIPO[STORES[loja].type];
    const vezes = (contagemDeLojas.get(loja) ?? 0) + 1;
    contagemDeLojas.set(loja, vezes);
    if (lojaPrincipal[c] < 0 || vezes > (contagemDeLojas.get(lojaPrincipal[c]) ?? 0)) lojaPrincipal[c] = loja;
    for (let k = 0; k < categorias; k++) {
      const item = listas.item[l * categorias + k];
      if (item > 0) marcas[c * categorias + k] |= 1 << (item - 1);
    }
  }

  return cadastros.map((cadastro, c): Consumer => {
    const municipio = MUNICIPALITIES[cadastro.municipio];
    const listed = Object.fromEntries(
      PRODUCTS.map((p, k) => {
        const bits = marcas[c * categorias + k];
        return [p.id, { premium: (bits & 1) > 0, popular: (bits & 2) > 0, outra: (bits & 4) > 0 }];
      }),
    ) as Consumer["listed"];
    return {
      id: cadastro.id,
      usesApp: cadastro.usaOApp,
      municipality: cadastro.municipio,
      region: municipio.region,
      uf: municipio.uf,
      size: municipio.size,
      zone: cadastro.zona,
      behavior: cadastro.comportamento,
      lon: cadastro.lon,
      lat: cadastro.lat,
      income: cadastro.faixaDeRenda,
      salary: cadastro.salario,
      education: cadastro.escolaridade,
      age: cadastro.idade,
      household: cadastro.moradores,
      frequency: frequenciaObservada(quantidade[c]),
      lists: quantidade[c],
      ticket: Math.round((soma[c] / Math.max(1, quantidade[c])) * 100) / 100,
      monthlySpend: Math.round((soma[c] / MESES_NO_TRIMESTRE) * 100) / 100,
      listed,
      storeTypes: {
        atacarejo: (tiposDeLoja[c] & 1) > 0,
        supermercado: (tiposDeLoja[c] & 2) > 0,
        mercadinho: (tiposDeLoja[c] & 4) > 0,
      },
      mainStore: lojaPrincipal[c],
    };
  });
};

