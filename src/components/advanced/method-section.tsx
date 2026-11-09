"use client";

import { useMemo, useState } from "react";
import { motor } from "@/estatistica";
import { BrazilCanvas, STRATUM_COLORS } from "@/components/app/brazil-canvas";
import { SpreadStrip } from "@/components/app/spread-strip";
import { REGIONS } from "@/data/geography";
import type { Consumer } from "@/data/population";
import { STUDY } from "@/data/study-plan";
import type { MethodsData } from "@/lib/analysis";
import { int, num, pct, pp } from "@/lib/format";
import { methodCopy } from "@/lib/method-copy";
import { type Design, prepareSimulation, runOnce } from "@/sampling/simulation";

const REGION_KEYS = Object.keys(REGIONS);
const SAMPLE_COLOR = "#ff6b35";

/**
 * One sampling method on the study's headline question: a live sample on the
 * map, the method's formulas, the 200 precomputed repetitions and its pros and
 * cons. Stratified designs color dots by region and size them by weight.
 */
export function MethodSection({
  design,
  units,
  data,
  domain,
  formulas,
  children,
}: {
  design: Design;
  units: Consumer[];
  data: MethodsData;
  domain: [number, number];
  formulas: string[];
  children?: React.ReactNode;
}) {
  const [seed, setSeed] = useState(1);
  const ctx = { strata: data.strata, n: data.n, step: data.systematicStep };
  const copy = methodCopy(design, ctx);
  const headline = data.comparison[0];
  const index = headline.results.findIndex((r) => r.design === design);
  const repeated = headline.results[index];
  const stratified = design.startsWith("aes");

  const prepared = useMemo(
    () =>
      prepareSimulation(motor, units, {
        variable: headline.variable,
        design,
        n: data.n,
        stratifyBy: "regionIncome",
        allocationVariable: STUDY.allocationVariable,
        confidence: STUDY.confidence,
      }),
    [units, design, data.n, headline.variable],
  );
  const result = useMemo(() => runOnce(prepared, seed), [prepared, seed]);
  const sample = useMemo(
    () => result.sample.map((s) => ({ ...s, stratum: REGION_KEYS.indexOf(units[s.unit].region) })),
    [result, units],
  );
  const e = result.estimate;
  const covered = e.ic[0] <= prepared.truth && prepared.truth <= e.ic[1];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
      <div className="min-w-0">
        <p className="text-[13px] text-muted">{copy.technical}</p>
        <p className="mt-2 text-[16px] leading-relaxed text-slate">{copy.idea}</p>
        <pre className="mt-5 overflow-x-auto rounded-lg bg-ink px-4 py-3 font-mono text-[12.5px] leading-relaxed text-white/90">
          {formulas.join("\n")}
        </pre>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <List title="A favor" items={copy.pros} dot="bg-brand" />
          <List title="Contra" items={copy.cons} dot="bg-sample" />
        </div>
        {children}
      </div>

      <div className="min-w-0 space-y-4">
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="relative h-[380px]">
            <BrazilCanvas
              units={units}
              sample={sample}
              basemap="nenhum"
              showStores={false}
              onHover={() => {}}
              sampleColor={stratified ? undefined : SAMPLE_COLOR}
            />
          </div>
          {stratified && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line px-4 py-2 text-[11px] text-slate">
              {REGION_KEYS.map((key, i) => (
                <span key={key} className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: STRATUM_COLORS[i] }} />
                  {REGIONS[key]}
                </span>
              ))}
              <span className="text-muted">Ponto maior = peso maior</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="tabular text-[13px] text-slate">
              Amostra nº {seed}:{" "}
              <span className="text-[18px] font-medium text-ink">{pct(e.estimativa)}</span> ± {pp(e.margem)}{" "}
              <span className={covered ? "text-brand" : "text-sample"}>{covered ? "· contém o valor real" : "· não contém o valor real"}</span>
            </div>
            <button onClick={() => setSeed((s) => s + 1)} className="h-8 rounded-md bg-ink px-3 text-[13px] font-medium text-white hover:bg-ink/85">
              Sortear de novo
            </button>
          </div>
          {result.systematic && (
            <p className="tabular mt-2 text-[12px] text-muted">
              Início r = {result.systematic.start}, passo k = {result.systematic.k}, {result.systematic.excluded} usuários fora para que N = nk.
              EP por V̂₁ = {pp(e.ep, 2)}; por V̂₂ = {pp(result.systematic.v2.ep, 2)}.
            </p>
          )}
          <div className="mt-4 text-[12px] text-slate">{int(data.repetitions)} amostras deste método:</div>
          <div className="mt-1">
            <SpreadStrip estimates={repeated.estimates} truth={headline.truth} domain={domain} format={(v) => pct(v)} color={stratified ? "var(--color-s2)" : SAMPLE_COLOR} />
          </div>
          <dl className="tabular mt-4 grid grid-cols-3 gap-3 border-t border-hairline pt-3 text-[12px]">
            <div>
              <dt className="text-muted">EPA exato</dt>
              <dd className="text-[15px] font-medium">{num(repeated.epa, 2)}</dd>
            </div>
            <div>
              <dt className="text-muted">EPA nas repetições</dt>
              <dd className="text-[15px] font-medium">{num(repeated.empiricalEpa, 2)}</dd>
            </div>
            <div>
              <dt className="text-muted">ICs com o valor real</dt>
              <dd className="text-[15px] font-medium">{pct(repeated.coverage)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] leading-snug text-muted">
            O EPA exato é a referência. Com {int(data.repetitions)} amostras, o EPA das repetições varia cerca de 15% para mais ou para menos em torno dele.
          </p>
        </div>

        {result.strata && (
          <details className="rounded-xl border border-line bg-white">
            <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium">Estratos desta amostra ({result.strata.length})</summary>
            <div className="max-h-[320px] overflow-auto border-t border-line">
              <table className="tabular w-full min-w-[520px] text-[12px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-line text-right text-muted">
                    <th className="px-4 py-2 text-left font-medium">Estrato</th>
                    <th className="py-2 font-medium">Nₕ</th>
                    <th className="py-2 font-medium">mₕ</th>
                    <th className="py-2 font-medium">πₕ</th>
                    <th className="py-2 font-medium">wₕ</th>
                    <th className="px-4 py-2 font-medium">ȳₕ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.strata.map((s) => (
                    <tr key={s.key} className="border-b border-hairline text-right last:border-0">
                      <td className="px-4 py-1.5 text-left text-slate">{s.label}</td>
                      <td className="py-1.5">{int(s.Nh)}</td>
                      <td className="py-1.5">{int(s.mh)}</td>
                      <td className="py-1.5">{num(s.pi, 4)}</td>
                      <td className="py-1.5 font-medium">{num(s.w, 1)}</td>
                      <td className="px-4 py-1.5">{pct(s.mean)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function List({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  return (
    <div>
      <h4 className="text-[14px] font-medium">{title}</h4>
      <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-slate">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
