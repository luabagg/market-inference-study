"use client";

import { useMemo, useState } from "react";
import { type Confianca, type EstimativaEstratificada, motor } from "@/estatistica";
import { getPopulation } from "@/data/population";
import { PRODUCTS, type ProductId, productById } from "@/data/products";
import { brl, int, num, pct, pp } from "@/lib/format";
import { type GroupEstimate, runStudy } from "@/sampling/study";
import type { VariableId } from "@/sampling/variables";
import { BehaviorPanel } from "./behavior-panel";
import { useProfile } from "./profile-context";
import { type BarRow, EstimateBars, Panel, Segmented, Toggle } from "./ui";

const CONFIDENCE_OPTIONS: { value: Confianca; label: string }[] = [
  { value: 0.9, label: "90%" },
  { value: 0.95, label: "95%" },
  { value: 0.99, label: "99%" },
];

const toRows = (groups: GroupEstimate[]): BarRow[] =>
  groups.map((g) => ({ label: g.label, value: g.estimate.estimativa, low: g.estimate.ic[0], high: g.estimate.ic[1], truth: g.truth }));

export function Dashboard() {
  const { profile } = useProfile();
  const [productChoice, setProductChoice] = useState<Record<string, ProductId>>({});
  const [confidence, setConfidence] = useState<Confianca>(0.95);
  const [showTruth, setShowTruth] = useState(false);

  const productId = productChoice[profile.id] ?? profile.defaultProduct;
  const product = productById(productId);

  // One study per client: the sample is drawn once and reused for every variable.
  const study = useMemo(() => runStudy(motor, getPopulation(), profile, confidence), [profile, confidence]);

  const shareVariable: VariableId = `${profile.tier ?? "popular"}:${productId}`;
  const share = study.estimate(shareVariable);
  const ticket = study.estimate("ticket");
  const spend = study.estimate("monthlySpend");
  const monthly = study.estimate("monthly");
  const productRows = PRODUCTS.map((p) => ({
    product: p,
    premium: study.estimate(`premium:${p.id}`).overall,
    popular: study.estimate(`popular:${p.id}`).overall,
  }));

  const brandName = profile.tier === "premium" ? product.premium : product.value;
  const shareTitle = profile.tier ? `${brandName} na lista` : `${product.value} na lista`;
  const confidenceLabel = `${confidence * 100}%`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] text-muted">{profile.segment}</p>
          <h1 className="text-[26px] font-medium tracking-[-0.03em]">{profile.name}</h1>
          <p className="mt-1 max-w-[640px] text-[14px] text-slate">{profile.pitch}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Nível de confiança" value={confidence} options={CONFIDENCE_OPTIONS} onChange={setConfidence} />
          <Toggle checked={showTruth} onChange={setShowTruth} label="Mostrar valor real da base" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] font-medium text-slate">Produto</span>
        {PRODUCTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setProductChoice((c) => ({ ...c, [profile.id]: p.id }))}
            className={`rounded-full border px-3 py-1 text-[13px] font-medium transition ${p.id === productId ? "border-ink bg-ink text-white" : "border-line bg-white text-slate hover:border-ink/30"}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <StudyStrip study={study} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title={shareTitle} estimate={share.overall.estimate} truth={share.overall.truth} kind="proportion" showTruth={showTruth} confidence={confidenceLabel} />
        <Kpi title="Ticket médio do consumidor" estimate={ticket.overall.estimate} truth={ticket.overall.truth} kind="brl" showTruth={showTruth} confidence={confidenceLabel} />
        <Kpi title="Gasto planejado por mês" estimate={spend.overall.estimate} truth={spend.overall.truth} kind="brl" showTruth={showTruth} confidence={confidenceLabel} />
        <Kpi title="Lares com compra do mês" estimate={monthly.overall.estimate} truth={monthly.overall.truth} kind="proportion" showTruth={showTruth} confidence={confidenceLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`${shareTitle}, por ${study.first.label.toLowerCase()}`} caption={`Proporção estimada e IC de ${confidenceLabel}`}>
          <EstimateBars rows={toRows(share.byFirst)} format={pct} max={maxOf(share.byFirst, 0.1)} showTruth={showTruth} />
        </Panel>
        <Panel title={`${shareTitle}, por ${study.second.label.toLowerCase()}`} caption={`Proporção estimada e IC de ${confidenceLabel}`}>
          <EstimateBars rows={toRows(share.bySecond)} format={pct} max={maxOf(share.bySecond, 0.1)} showTruth={showTruth} />
        </Panel>
        <Panel title={`Ticket médio, por ${study.first.label.toLowerCase()}`} caption="Média entre consumidores do valor que cada um planeja gastar por lista">
          <EstimateBars rows={toRows(ticket.byFirst)} format={brl} max={maxOf(ticket.byFirst, 100)} color="var(--color-s2)" showTruth={showTruth} />
        </Panel>
        <Panel
          title={`Compra do mês, por ${study.second.label.toLowerCase()}`}
          caption="Lares que concentram as compras em uma ida grande ao mercado"
        >
          <EstimateBars rows={toRows(monthly.bySecond)} format={pct} max={maxOf(monthly.bySecond, 0.1)} color="var(--color-s3)" showTruth={showTruth} />
        </Panel>
      </div>

      <BehaviorPanel study={study} product={product} tier={profile.tier ?? "popular"} />

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Panel title="Premium e preço acessível, por categoria" caption="Proporção de consumidores com cada linha na lista. Selecione a categoria acima para detalhar.">
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate">
            <Legend color="var(--color-brand)" label="Casa Nobre (premium)" />
            <Legend color="var(--color-s3)" label="Bom Dia (preço acessível)" />
          </div>
          <div className="space-y-3">
            {productRows.map((row) => (
              <div key={row.product.id} className={`rounded-lg px-3 py-2 ${row.product.id === productId ? "bg-canvas" : ""}`}>
                <div className="mb-1.5 text-[13px] font-medium">{row.product.name}</div>
                <PairBar estimate={row.premium.estimate} truth={row.premium.truth} color="var(--color-brand)" showTruth={showTruth} />
                <PairBar estimate={row.popular.estimate} truth={row.popular.truth} color="var(--color-s3)" showTruth={showTruth} />
              </div>
            ))}
          </div>
        </Panel>
        <DesignTable study={study} estimate={share.overall.estimate} />
      </div>
    </div>
  );
}

const maxOf = (groups: GroupEstimate[], step: number) =>
  Math.ceil(Math.max(...groups.map((g) => g.estimate.ic[1], 0)) / step) * step;

function StudyStrip({ study }: { study: ReturnType<typeof runStudy> }) {
  const allocation = { proporcional: "proporcional", neyman: "de Neyman", igual: "igual", otima: "ótima" }[study.profile.allocation];
  const items = [
    ["População-alvo", `${study.profile.targetLabel} · N = ${int(study.N)}`],
    ["Amostra", `${int(study.m)} consumidores (${pct(study.m / study.N)} da população-alvo)`],
    ["Plano", `Estratificada, alocação ${allocation}, ${study.strata.length} estratos (${study.first.label.toLowerCase()} × ${study.second.label.toLowerCase()})`],
    ["Listas dos sorteados", `${int(study.listsInSample)} de ${int(study.listsInFrame)} no trimestre`],
  ];
  return (
    <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="bg-white px-4 py-3">
          <dt className="text-[12px] text-muted">{label}</dt>
          <dd className="mt-0.5 text-[13px] font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Kpi({
  title,
  estimate,
  truth,
  kind,
  showTruth,
  confidence,
}: {
  title: string;
  estimate: EstimativaEstratificada;
  truth: number;
  kind: "proportion" | "brl";
  showTruth: boolean;
  confidence: string;
}) {
  const format = kind === "proportion" ? pct : brl;
  const margin = kind === "proportion" ? pp(estimate.margem) : brl(estimate.margem);
  const covered = estimate.ic[0] <= truth && truth <= estimate.ic[1];
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="truncate text-[13px] text-slate" title={title}>
        {title}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="tabular text-[28px] font-medium tracking-[-0.03em]">{format(estimate.estimativa)}</span>
        <span className="tabular text-[13px] text-muted">± {margin}</span>
      </div>
      <div className="tabular mt-3 flex justify-between border-t border-hairline pt-3 text-[12px] text-muted">
        <span>
          IC {confidence}: {format(estimate.ic[0])} a {format(estimate.ic[1])}
        </span>
        <span>CV {num(estimate.cv * 100, 1)}%</span>
      </div>
      {showTruth && (
        <div className={`mt-2 text-[12px] font-medium ${covered ? "text-brand" : "text-sample"}`}>
          Valor real: {format(truth)} {covered ? "(dentro do IC)" : "(fora do IC)"}
        </div>
      )}
    </div>
  );
}

function PairBar({ estimate, truth, color, showTruth }: { estimate: EstimativaEstratificada; truth: number; color: string; showTruth: boolean }) {
  const x = (v: number) => `${Math.min(100, (v / 0.7) * 100)}%`;
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="relative h-2.5 flex-1 rounded-sm bg-hairline">
        <div className="absolute inset-y-0 left-0 rounded-sm" style={{ width: x(estimate.estimativa), background: color }} />
        <div className="absolute top-1/2 h-px bg-ink/60" style={{ left: x(estimate.ic[0]), width: `calc(${x(estimate.ic[1])} - ${x(estimate.ic[0])})` }} />
        {showTruth && <div className="absolute -inset-y-1 w-[3px] -translate-x-1/2 rounded-full bg-sample" style={{ left: x(truth) }} />}
      </div>
      <span className="tabular w-[92px] text-right text-[12px] text-slate">
        {pct(estimate.estimativa)} <span className="text-muted">± {num(estimate.margem * 100, 1)}</span>
      </span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function DesignTable({ study, estimate }: { study: ReturnType<typeof runStudy>; estimate: EstimativaEstratificada }) {
  return (
    <Panel
      title="Plano amostral"
      caption={
        <>
          π<sub>h</sub> = m<sub>h</sub>/N<sub>h</sub> é a chance de sorteio no estrato; w<sub>h</sub> = N<sub>h</sub>/m<sub>h</sub> é quantos consumidores cada sorteado representa.
        </>
      }
    >
      <div className="-mx-5 overflow-x-auto">
        <table className="tabular w-full min-w-[440px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-muted">
              <th className="px-5 pb-2 font-medium">Estrato</th>
              <th className="pb-2 text-right font-medium">N<sub>h</sub></th>
              <th className="pb-2 text-right font-medium">m<sub>h</sub></th>
              <th className="pb-2 text-right font-medium">π<sub>h</sub></th>
              <th className="px-5 pb-2 text-right font-medium">w<sub>h</sub></th>
            </tr>
          </thead>
          <tbody>
            {study.strata.map((s, h) => {
              const row = estimate.estratos[h];
              return (
                <tr key={s.key} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-2 text-slate">{s.label}</td>
                  <td className="py-2 text-right">{int(row.Nh)}</td>
                  <td className="py-2 text-right">{int(row.mh)}</td>
                  <td className="py-2 text-right">{num(row.pi, 3)}</td>
                  <td className="px-5 py-2 text-right font-medium">{num(row.w, 1)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line text-[12px] font-medium">
              <td className="px-5 pt-2">Total</td>
              <td className="pt-2 text-right">{int(study.N)}</td>
              <td className="pt-2 text-right">{int(study.m)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}
