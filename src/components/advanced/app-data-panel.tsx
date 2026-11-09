"use client";

import { useState } from "react";
import { MUNICIPALITIES } from "@/data/geography";
import { BEHAVIORS, EDUCATION, FREQUENCIES, getAppData, INCOME_BANDS, ZONES } from "@/data/population";
import { PRODUCTS, skuName, type Tier } from "@/data/products";
import { distanceKm, STORE_TYPES, STORES } from "@/data/stores";
import { brl, brlExact, int, num } from "@/lib/format";
import { Panel } from "@/components/app/ui";

const QUARTER_START = Date.UTC(2026, 7, 1); // 1 Aug 2026: day 0 of the simulated quarter
const TIER_BY_CODE: Tier[] = ["premium", "premium", "popular", "outra"];
const TIER_STYLE: Record<Tier, string> = {
  premium: "bg-brand-soft text-brand-strong",
  popular: "bg-sample-soft text-[#a4461d]",
  outra: "bg-canvas text-slate",
};

const formatDay = (day: number) =>
  new Date(QUARTER_START + day * 86_400_000).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });

/** First list of a consumer: lists are stored consumer by consumer, so a binary search finds the block. */
const firstListOf = (consumidor: Int32Array, id: number) => {
  let lo = 0;
  let hi = consumidor.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (consumidor[mid] < id) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

/**
 * What the app actually records for one person (signup + every list in the
 * quarter), next to the single row the consolidation step produces from it.
 */
export function AppDataPanel() {
  const { cadastros, listas, state, frame } = getAppData();
  const [pick, setPick] = useState(7);
  // Only app users: the app has no records of anyone else.
  const id = frame[(pick * 7919) % frame.length].id;
  const cadastro = cadastros[id];
  const consumer = state[id];
  const municipality = MUNICIPALITIES[cadastro.municipio];
  const categories = PRODUCTS.length;

  const start = firstListOf(listas.consumidor, id);
  const lists = Array.from({ length: consumer.lists }, (_, i) => {
    const l = start + i;
    return {
      day: listas.dia[l],
      value: listas.valor[l],
      store: STORES[listas.loja[l]],
      items: PRODUCTS.flatMap((product, k) => {
        const code = listas.item[l * categories + k];
        return code === 0 ? [] : [{ product, tier: TIER_BY_CODE[code], units: listas.unidades[l * categories + k] }];
      }),
    };
  });

  return (
    <Panel
      title="Como chegam os dados do app"
      caption={`${int(frame.length)} cadastros no app. A pesquisa sorteia pessoas; as listas de cada uma viram uma linha da base.`}
      action={
        <button
          onClick={() => setPick((p) => p + 1)}
          className="h-8 shrink-0 rounded-md border border-line bg-white px-3 text-[13px] font-medium hover:border-ink/30"
        >
          Outro consumidor
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h3 className="mb-2 text-[13px] font-medium text-slate">Listas recebidas: {consumer.lists} no trimestre</h3>
          <ol className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {lists.map((list, i) => (
              <li key={i} className="rounded-lg border border-line p-3">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-medium">{formatDay(list.day)}</span>
                  <span className="tabular font-medium">{brlExact(list.value)}</span>
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {list.store.name} · {STORE_TYPES[list.store.type].toLowerCase()} · {num(distanceKm(cadastro.lon, cadastro.lat, list.store), 1)} km
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {list.items.length === 0 && <span className="text-[12px] text-muted">Nenhuma categoria acompanhada nesta lista</span>}
                  {list.items.map((item) => (
                    <span key={item.product.id} className={`rounded px-1.5 py-0.5 text-[12px] ${TIER_STYLE[item.tier]}`}>
                      {item.units}× {skuName(item.product, item.tier)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-[13px] font-medium text-slate">Cadastro</h3>
            <dl className="grid grid-cols-2 gap-y-1 text-[13px]">
              <dt className="text-muted">Cidade</dt>
              <dd className="text-right">{municipality.name}</dd>
              <dt className="text-muted">Zona</dt>
              <dd className="text-right">{ZONES[cadastro.zona]}</dd>
              <dt className="text-muted">Moradores</dt>
              <dd className="text-right">{cadastro.moradores}</dd>
              <dt className="text-muted">Renda da casa</dt>
              <dd className="text-right">
                {brl(cadastro.salario)} ({INCOME_BANDS[cadastro.faixaDeRenda].toLowerCase()})
              </dd>
              <dt className="text-muted">Escolaridade</dt>
              <dd className="text-right">{EDUCATION[cadastro.escolaridade]}</dd>
              <dt className="text-muted">Comportamento (oculto)</dt>
              <dd className="text-right text-slate">{BEHAVIORS.find((b) => b.id === cadastro.comportamento)?.nome}</dd>
            </dl>
          </div>
          <div className="rounded-lg bg-canvas p-3">
            <h3 className="mb-2 text-[13px] font-medium text-slate">Linha na base (consolidada)</h3>
            <dl className="tabular grid grid-cols-2 gap-y-1 text-[13px]">
              <dt className="text-muted">Listas no trimestre</dt>
              <dd className="text-right">{consumer.lists}</dd>
              <dt className="text-muted">Hábito observado</dt>
              <dd className="text-right">{FREQUENCIES[consumer.frequency]}</dd>
              <dt className="text-muted">Ticket médio</dt>
              <dd className="text-right">{brlExact(consumer.ticket)}</dd>
              <dt className="text-muted">Gasto por mês</dt>
              <dd className="text-right">{brlExact(consumer.monthlySpend)}</dd>
              <dt className="text-muted">Mercado principal</dt>
              <dd className="text-right text-[12px]">{STORE_TYPES[STORES[consumer.mainStore].type]}</dd>
              {PRODUCTS.map((p) => (
                <div key={p.id} className="contents">
                  <dt className="text-muted">{p.name}</dt>
                  <dd className="text-right text-[12px]">
                    {[consumer.listed[p.id].premium && "Reserva", consumer.listed[p.id].popular && "Clássico", consumer.listed[p.id].outra && "outras"]
                      .filter(Boolean)
                      .join(", ") || "não listou"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </Panel>
  );
}
