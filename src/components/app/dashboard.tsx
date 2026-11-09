"use client";

import Link from "next/link";
import { useState } from "react";
import { ORGANIZATION, PRODUCTS, type ProductId, productById } from "@/mundo/products";
import { STORE_ATTRIBUTION } from "@/mundo/stores";
import { STUDY } from "@/sampling/study-plan";
import type { DashboardData, Figure, FigureRow } from "@/lib/analysis";
import { brl, int, num, pct } from "@/lib/format";
import { EstimateBars, Panel } from "./ui";
import { UsersPanel } from "./users-panel";

const PREMIUM_COLOR = "var(--color-brand)";
const VALUE_COLOR = "var(--color-s3)";

/** The client's view of the study: results only, no sampling controls. */
export function Dashboard({ data }: { data: DashboardData }) {
  const [productId, setProductId] = useState<ProductId>(STUDY.defaultProduct);
  const product = productById(productId);
  const lines = data.products[productId];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[13px] text-muted">{ORGANIZATION.name}</p>
        <h1 className="text-[26px] font-medium tracking-[-0.03em]">{STUDY.title}</h1>
        <p className="mt-1 max-w-[720px] text-[14px] leading-relaxed text-slate">
          Resultados de {int(data.m)} usuários do Cestinha sorteados entre {int(data.N)} no RS, a partir das listas dos últimos
          três meses. O número depois do ± é a margem de erro, com 95% de confiança.{" "}
          <Link href="/app/metodos" className="font-medium text-brand hover:text-brand-strong">
            Como sorteamos ›
          </Link>
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {PRODUCTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setProductId(p.id)}
            className={`rounded-full border px-3 py-1 text-[13px] font-medium transition ${p.id === productId ? "border-ink bg-ink text-white" : "border-line bg-white text-slate hover:border-ink/30"}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title={`Listaram ${product.premium}`} figure={lines.premium.overall} color={PREMIUM_COLOR} />
        <Kpi title={`Listaram ${product.value}`} figure={lines.popular.overall} color={VALUE_COLOR} />
        <Kpi title={`Listaram ${product.name.toLowerCase()} de outra marca`} figure={lines.outra} color="#9fb0c2" />
        <Kpi title="Gasto planejado por compra" figure={data.ticket.overall} money />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`${product.name}: Reserva e Clássico por região`} caption="Usuários que listaram cada linha nos últimos três meses" action={<LineLegend />}>
          <PairedGroups premium={lines.premium.byRegion} popular={lines.popular.byRegion} />
        </Panel>
        <Panel title={`${product.name}: Reserva e Clássico por renda`} caption="A linha Reserva cresce com a renda; a Clássico, ao contrário" action={<LineLegend />}>
          <PairedGroups premium={lines.premium.byIncome} popular={lines.popular.byIncome} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Onde vão comprar" caption="Usuários com ao menos uma lista para cada tipo de mercado">
          <EstimateBars rows={data.stores} format={pct} max={1} color="var(--color-s6)" />
          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            Lojas reais do RS ({STORE_ATTRIBUTION}). Mostramos tipos de loja, nunca redes: as listas desta demonstração são simuladas.
          </p>
        </Panel>
        <Panel title="Compra do mês, por região" caption="Usuários que vão ao mercado uma vez por mês, com uma lista grande">
          <EstimateBars rows={data.monthly.byRegion} format={pct} max={ceil(data.monthly.byRegion, 0.1)} color="var(--color-s4)" />
        </Panel>
        <Panel title="Gasto por compra, por renda" caption="Média do valor planejado em cada lista">
          <EstimateBars rows={data.ticket.byIncome} format={brl} max={ceil(data.ticket.byIncome, 100)} color="var(--color-s2)" />
        </Panel>
      </div>

      <UsersPanel profiles={data.profiles} />
    </div>
  );
}

const ceil = (rows: FigureRow[], step: number) => Math.ceil(Math.max(...rows.map((r) => r.high)) / step) * step;

function Kpi({ title, figure, color, money = false }: { title: string; figure: Figure; color?: string; money?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-center gap-2 text-[13px] text-slate">
        {color && <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />}
        <span className="truncate" title={title}>
          {title}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="tabular text-[28px] font-medium tracking-[-0.03em]">{money ? brl(figure.value) : pct(figure.value)}</span>
        <span className="tabular text-[13px] text-muted">± {money ? brl(figure.margin) : `${num(figure.margin * 100, 1)} p.p.`}</span>
      </div>
      <div className="mt-1 text-[12px] text-muted">{money ? "por lista, média dos usuários" : "dos usuários, nos últimos três meses"}</div>
    </div>
  );
}

/** Two bars per group: Reserva on top, Clássico below. */
function PairedGroups({ premium, popular }: { premium: FigureRow[]; popular: FigureRow[] }) {
  const max = Math.max(ceil(premium, 0.1), ceil(popular, 0.1));
  return (
    <div className="space-y-3">
      {premium.map((group, i) => (
        <div key={group.label}>
          <div className="mb-1 text-[13px] text-slate">{group.label}</div>
          <PairBar figure={group} color={PREMIUM_COLOR} max={max} />
          <PairBar figure={popular[i]} color={VALUE_COLOR} max={max} />
        </div>
      ))}
    </div>
  );
}

function PairBar({ figure, color, max }: { figure: Figure; color: string; max: number }) {
  const x = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="relative h-2.5 flex-1 rounded-sm bg-hairline">
        <div className="absolute inset-y-0 left-0 rounded-sm" style={{ width: x(figure.value), background: color }} />
        <div className="absolute top-1/2 h-px bg-ink/60" style={{ left: x(figure.low), width: `calc(${x(figure.high)} - ${x(figure.low)})` }} />
      </div>
      <span className="tabular w-[92px] text-right text-[12px] text-slate">
        {pct(figure.value)} <span className="text-muted">± {num(figure.margin * 100, 1)}</span>
      </span>
    </div>
  );
}

function LineLegend() {
  return (
    <div className="hidden shrink-0 flex-col gap-1 text-[12px] text-slate sm:flex">
      <Legend color={PREMIUM_COLOR} label="Reserva" />
      <Legend color={VALUE_COLOR} label="Clássico" />
    </div>
  );
}

export function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
