"use client";

import { useMemo, useState } from "react";
import { type Confianca, motor } from "@/estatistica";
import { MUNICIPALITIES } from "@/data/geography";
import { distanceKm, STORE_ATTRIBUTION, STORE_TYPES, STORES, type StoreType } from "@/data/stores";
import { STUDY } from "@/data/study-plan";
import { BEHAVIORS, type Consumer, getPopulation, ZONES } from "@/data/population";
import { brl, brlExact, int, num, pct, pp } from "@/lib/format";
import {
  DESIGNS,
  type Design,
  prepareSimulation,
  repeat,
  type RepetitionSummary,
  runOnce,
  type SimulationConfig,
} from "@/sampling/simulation";
import { SIMULATOR_VARIABLES, STRATIFIERS, type StratifierId, variable, type VariableId } from "@/sampling/variables";
import { BASEMAP_LABELS, type Basemap, BrazilCanvas, type SampledPoint, STORE_COLORS, STRATUM_COLORS } from "@/components/app/brazil-canvas";
import { Field, Panel, Segmented, Select, Toggle } from "@/components/app/ui";
import { RepetitionChart } from "./repetition-chart";

const REPETITIONS = 500;

/** Free-form simulator for the live presentation: any variable, design, strata and n. */
export function SamplingLab() {
  const units = useMemo(() => getPopulation(), []);

  const [config, setConfig] = useState<SimulationConfig>({
    variable: "ticket",
    design: "aes-igual",
    n: 600,
    stratifyBy: "region",
    confidence: 0.95,
  });
  const [seed, setSeed] = useState(1);
  const [basemap, setBasemap] = useState<Basemap>("renda");
  const [showStores, setShowStores] = useState(false);
  const [hover, setHover] = useState<{ point: SampledPoint; x: number; y: number } | null>(null);
  const [repetition, setRepetition] = useState<{ key: string; design: RepetitionSummary; aas: RepetitionSummary } | null>(null);
  const [running, setRunning] = useState(false);

  const strataCount = useMemo(
    () => new Set(units.map(STRATIFIERS[config.stratifyBy].key)).size,
    [units, config.stratifyBy],
  );
  // AES needs at least 2 units per stratum to compute s²h.
  const minN = config.design.startsWith("aes") ? 2 * strataCount : 10;
  const effective = { ...config, n: Math.max(config.n, minN) };
  const configKey = JSON.stringify(effective);

  const prepared = useMemo(() => prepareSimulation(motor, units, effective), [units, configKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const result = useMemo(() => runOnce(prepared, seed), [prepared, seed]);

  const v = prepared.variable;
  const format = v.kind === "proportion" ? pct : brl;
  const formatMargin = v.kind === "proportion" ? pp : brl;
  const estimate = result.estimate;
  const covered = estimate.ic[0] <= prepared.truth && prepared.truth <= estimate.ic[1];

  // Horvitz–Thompson view of the same sample: Σ w y and Σ w (= N̂).
  const sampledY = result.sample.map((s) => v.value(units[s.unit]));
  const pis = result.sample.map((s) => s.pi);
  const htTotal = motor.ht.total(sampledY, pis);
  const htN = motor.ht.total(sampledY.map(() => 1), pis);

  const update = <K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const runRepetitions = () => {
    setRunning(true);
    // Let the button paint its busy state before the synchronous work starts.
    setTimeout(() => {
      const aasPrepared = prepareSimulation(motor, units, { ...effective, design: "aas" });
      setRepetition({
        key: configKey,
        design: repeat(prepared, REPETITIONS, seed * 7919),
        aas: repeat(aasPrepared, REPETITIONS, seed * 7919 + 1),
      });
      setRunning(false);
    }, 30);
  };
  const currentRepetition = repetition?.key === configKey ? repetition : null;

  const hovered = hover ? units[hover.point.unit] : null;

  return (
    <div className="space-y-6">
      <p className="max-w-[760px] text-[14px] text-slate">
        {STUDY.targetLabel}, N = {int(units.length)}. Cada ponto cinza é um usuário. Os coloridos são os sorteados, e o tamanho de
        cada um mostra o peso w = 1/π: quantos usuários ele representa na estimativa.
      </p>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Panel title="Plano amostral" className="h-fit">
          <div className="space-y-4">
            <Field label="O que estimar">
              <Select
                value={config.variable}
                onChange={(value) => update("variable", value as VariableId)}
                options={SIMULATOR_VARIABLES.map((id) => ({ value: id, label: variable(id).label }))}
              />
            </Field>
            <Field label="Plano">
              <Select
                value={config.design}
                onChange={(value) => update("design", value as Design)}
                options={(Object.keys(DESIGNS) as Design[]).map((d) => ({ value: d, label: DESIGNS[d].label }))}
              />
            </Field>
            <Field label={config.design.startsWith("aes") ? "Estratos" : "Cores no mapa"}>
              <Select
                value={config.stratifyBy}
                onChange={(value) => update("stratifyBy", value as StratifierId)}
                options={(Object.keys(STRATIFIERS) as StratifierId[]).map((s) => ({ value: s, label: STRATIFIERS[s].label }))}
              />
            </Field>
            <Field label={`Tamanho da amostra: n = ${int(effective.n)}`}>
              <input
                type="range"
                min={minN}
                max={3000}
                step={10}
                value={effective.n}
                onChange={(e) => update("n", Number(e.target.value))}
                className="w-full accent-[var(--color-brand)]"
              />
              <div className="flex justify-between text-[11px] text-muted">
                <span>{minN}</span>
                <span>fração n/N = {pct(effective.n / units.length, 2)}</span>
                <span>3.000</span>
              </div>
            </Field>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-slate">Confiança</span>
              <Segmented
                label="Confiança"
                value={config.confidence}
                onChange={(value) => update("confidence", value as Confianca)}
                options={[
                  { value: 0.9, label: "90%" },
                  { value: 0.95, label: "95%" },
                  { value: 0.99, label: "99%" },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setSeed((s) => s + 1)}
                className="h-9 rounded-md bg-ink text-[13px] font-medium text-white transition hover:bg-ink/85"
              >
                Sortear de novo
              </button>
              <button
                onClick={runRepetitions}
                disabled={running}
                className="h-9 rounded-md border border-line bg-white text-[13px] font-medium transition hover:border-ink/30 disabled:opacity-60"
              >
                {running ? "Calculando…" : `Repetir ${REPETITIONS}×`}
              </button>
            </div>
            <p className="text-[12px] text-muted">Sorteio nº {seed}. O mesmo número sempre gera a mesma amostra.</p>
            <SampleSizeHelper
              key={configKey}
              units={units}
              result={result}
              prepared={prepared}
              confidence={config.confidence}
              onUse={(n) => update("n", n)}
            />
          </div>
        </Panel>

        <section className="relative overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate">
              {(prepared.strata.length <= 8 ? prepared.strata : prepared.strata.slice(0, 8)).map((s, h) => (
                <span key={s.key} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STRATUM_COLORS[h % STRATUM_COLORS.length] }} />
                  {s.label}
                </span>
              ))}
              {prepared.strata.length > 8 && <span className="text-muted">+{prepared.strata.length - 8} estratos (cores repetem)</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
            <Toggle checked={showStores} onChange={setShowStores} label={`Mercados (${int(STORES.length)}, OSM)`} />
            <Segmented
              label="Fundo do mapa"
              value={basemap}
              onChange={setBasemap}
              options={(["renda", "agro", "rural", "nenhum"] as Basemap[]).map((b) => ({ value: b, label: BASEMAP_LABELS[b] }))}
            />
            </div>
          </div>
          <div className="relative h-[560px] sm:h-[680px]">
            <BrazilCanvas units={units} sample={result.sample} basemap={basemap} showStores={showStores} onHover={setHover} />
            {hover && hovered && (
              <div
                className="pointer-events-none absolute z-10 w-[220px] rounded-lg border border-line bg-white p-3 text-[12px] shadow-lg"
                style={{ left: Math.min(hover.x + 14, 9999), top: hover.y + 14 }}
              >
                <div className="font-medium text-ink">
                  {MUNICIPALITIES[hovered.municipality].name} · {hovered.uf}
                </div>
                <div className="text-slate">{BEHAVIORS.find((b) => b.id === hovered.behavior)?.nome}</div>
                <div className="text-muted">
                  {ZONES[hovered.zone]} · {hovered.household} moradores · {brl(hovered.salary)}/mês
                </div>
                <div className="text-muted">
                  Mercado principal: {STORE_TYPES[STORES[hovered.mainStore].type].toLowerCase()},{" "}
                  {num(distanceKm(hovered.lon, hovered.lat, STORES[hovered.mainStore]), 1)} km
                </div>
                <dl className="tabular mt-2 grid grid-cols-2 gap-y-0.5">
                  <dt className="text-muted">y</dt>
                  <dd className="text-right">{v.kind === "proportion" ? (v.value(hovered) ? "1 (sim)" : "0 (não)") : brlExact(v.value(hovered))}</dd>
                  <dt className="text-muted">π</dt>
                  <dd className="text-right">{num(hover.point.weight ? 1 / hover.point.weight : 0, 4)}</dd>
                  <dt className="text-muted">w = 1/π</dt>
                  <dd className="text-right font-medium">{num(hover.point.weight, 1)}</dd>
                </dl>
              </div>
            )}
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-md bg-white/90 px-3 py-2 text-[11px] text-slate backdrop-blur">
              {basemap !== "nenhum" ? `Fundo: ${BASEMAP_LABELS[basemap].toLowerCase()} por município (IBGE), em quintis. ` : ""}
              Ponto maior = peso maior.
              {showStores && (
                <span className="mt-1 flex flex-wrap gap-x-3">
                  {(Object.keys(STORE_TYPES) as StoreType[]).map((type) => (
                    <span key={type} className="inline-flex items-center gap-1">
                      <span className="h-2 w-2" style={{ background: STORE_COLORS[type] }} />
                      {STORE_TYPES[type]}
                    </span>
                  ))}
                  <span>{STORE_ATTRIBUTION}</span>
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Estimativa desta amostra" caption={`${DESIGNS[effective.design].label} · n = ${int(prepared.n)}`}>
          <div className="tabular text-[30px] font-medium tracking-[-0.03em]">{format(estimate.estimativa)}</div>
          <div className="tabular text-[13px] text-slate">
            IC {config.confidence * 100}%: {format(estimate.ic[0])} a {format(estimate.ic[1])} (± {formatMargin(estimate.margem)})
          </div>
          <dl className="tabular mt-4 grid grid-cols-2 gap-y-1.5 border-t border-hairline pt-4 text-[13px]">
            <dt className="text-muted">Valor real (parâmetro)</dt>
            <dd className="text-right font-medium">{format(prepared.truth)}</dd>
            <dt className="text-muted">Erro desta amostra</dt>
            <dd className="text-right">{v.kind === "proportion" ? pp(estimate.estimativa - prepared.truth) : brl(estimate.estimativa - prepared.truth)}</dd>
            <dt className="text-muted">Erro padrão</dt>
            <dd className="text-right">{v.kind === "proportion" ? pp(estimate.ep, 2) : brlExact(estimate.ep)}</dd>
            <dt className="text-muted">CV</dt>
            <dd className="text-right">{num(estimate.cv * 100, 1)}%</dd>
          </dl>
          <div className={`mt-4 rounded-md px-3 py-2 text-[13px] font-medium ${covered ? "bg-brand-soft text-brand-strong" : "bg-sample-soft text-[#b4441b]"}`}>
            {covered ? "O intervalo contém o valor real." : "O intervalo não contém o valor real. Acontece em cerca de 1 a cada 20 amostras com 95%."}
          </div>
          {result.systematic && (
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              Início r = {result.systematic.start}, intervalo k = {result.systematic.k}. {result.systematic.excluded} unidades no fim da
              lista ficam fora para que N = nk. Variância por diferenças sucessivas (V̂₂): EP ={" "}
              {v.kind === "proportion" ? pp(result.systematic.v2.ep, 2) : brlExact(result.systematic.v2.ep)}.
            </p>
          )}
        </Panel>

        <Panel title="Horvitz–Thompson" caption="O mesmo resultado escrito com pesos">
          <div className="space-y-3 text-[13px]">
            <Formula label="Soma dos pesos" expression="N̂ = Σ wᵢ" value={int(htN)} note={`N real = ${int(prepared.N)}`} />
            <Formula
              label="Total estimado"
              expression="Ŷ = Σ wᵢ yᵢ"
              value={v.kind === "proportion" ? `${int(htTotal)} consumidores` : brl(htTotal)}
            />
            <Formula label="Média" expression="Ŷ / N" value={format(htTotal / prepared.N)} note="igual à estimativa ao lado" />
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            {effective.design.startsWith("aes")
              ? "Cada estrato tem seu π = mₕ/Nₕ. Estratos com menos sorteados por consumidor recebem pesos maiores."
              : "Na AAS e na sistemática, π = n/N para todos, então todos os pesos são iguais e o HT vira N·ȳ."}
          </p>
        </Panel>

        <Panel
          title={`Distribuição em ${REPETITIONS} amostras`}
          caption="Sorteia de novo várias vezes e compara com o valor real"
        >
          {currentRepetition ? (
            <>
              <RepetitionChart estimates={currentRepetition.design.estimates} truth={prepared.truth} format={format} />
              <dl className="tabular mt-3 grid grid-cols-2 gap-y-1.5 text-[13px]">
                <dt className="text-muted">Média das estimativas</dt>
                <dd className="text-right">{format(currentRepetition.design.meanEstimate)}</dd>
                <dt className="text-muted">ICs que contêm o real</dt>
                <dd className="text-right font-medium">{pct(currentRepetition.design.coverage)}</dd>
                <dt className="text-muted">Variância vs. AAS (EPA)</dt>
                <dd className="text-right font-medium">
                  {num(currentRepetition.design.empiricalVariance / currentRepetition.aas.empiricalVariance, 2)}
                </dd>
              </dl>
              <p className="mt-2 text-[12px] text-muted">
                {currentRepetition.design.empiricalVariance < currentRepetition.aas.empiricalVariance
                  ? "EPA abaixo de 1: este plano erra menos que uma AAS do mesmo tamanho."
                  : "EPA acima de 1: uma AAS do mesmo tamanho erraria menos que este plano."}
              </p>
            </>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-line text-center text-[13px] text-muted">
              <p>Nenhuma repetição para este plano ainda.</p>
              <button onClick={runRepetitions} disabled={running} className="mt-3 font-medium text-brand hover:text-brand-strong">
                {running ? "Calculando…" : `Repetir ${REPETITIONS}×`}
              </button>
            </div>
          )}
        </Panel>
      </div>

      {result.strata && (
        <Panel title="Estratos" caption="O que o motor recebeu e devolveu para cada estrato. A última coluna só existe porque a base é sintética.">
          <div className="-mx-5 overflow-x-auto">
            <table className="tabular w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-line text-right text-[12px] text-muted">
                  <th className="px-5 pb-2 text-left font-medium">Estrato</th>
                  <th className="pb-2 font-medium">Nₕ</th>
                  <th className="pb-2 font-medium">mₕ</th>
                  <th className="pb-2 font-medium">πₕ</th>
                  <th className="pb-2 font-medium">wₕ</th>
                  <th className="pb-2 font-medium">ȳₕ</th>
                  <th className="pb-2 font-medium">s²ₕ</th>
                  <th className="px-5 pb-2 font-medium">Ȳₕ real</th>
                </tr>
              </thead>
              <tbody>
                {result.strata.map((s, h) => (
                  <tr key={s.key} className="border-b border-hairline text-right last:border-0">
                    <td className="px-5 py-2 text-left">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: STRATUM_COLORS[h % STRATUM_COLORS.length] }} />
                        {s.label}
                      </span>
                    </td>
                    <td className="py-2">{int(s.Nh)}</td>
                    <td className="py-2">{int(s.mh)}</td>
                    <td className="py-2">{num(s.pi, 4)}</td>
                    <td className="py-2 font-medium">{num(s.w, 1)}</td>
                    <td className="py-2">{format(s.mean)}</td>
                    <td className="py-2">{num(s.s2, v.kind === "proportion" ? 3 : 0)}</td>
                    <td className="px-5 py-2 text-muted">{format(s.trueMean)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Formula({ label, expression, value, note }: { label: string; expression: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2 last:border-0">
      <div>
        <div className="text-slate">{label}</div>
        <code className="font-mono text-[12px] text-muted">{expression}</code>
      </div>
      <div className="text-right">
        <div className="tabular font-medium">{value}</div>
        {note && <div className="text-[11px] text-muted">{note}</div>}
      </div>
    </div>
  );
}

/**
 * Sample size for a target margin D, using the current sample as the pilot
 * (Parte II §7 and §10; Parte III §7).
 */
function SampleSizeHelper({
  units,
  result,
  prepared,
  confidence,
  onUse,
}: {
  units: Consumer[];
  result: ReturnType<typeof runOnce>;
  prepared: ReturnType<typeof prepareSimulation>;
  confidence: Confianca;
  onUse: (n: number) => void;
}) {
  const isProportion = prepared.variable.kind === "proportion";
  const [input, setInput] = useState(isProportion ? "2" : "10");
  const D = Number(input.replace(",", ".")) / (isProportion ? 100 : 1);
  const N = prepared.N;

  const required = (() => {
    if (!(D > 0)) return null;
    if (result.strata) {
      const m = result.strata.reduce((acc, s) => acc + s.mh, 0);
      return motor.aes.tamanhoParaMedia({
        estratos: result.strata.map((s) => ({ Nh: s.Nh, S2h: s.s2 })),
        a: result.strata.map((s) => s.mh / m),
        D,
        confianca: confidence,
      });
    }
    if (isProportion)
      return motor.aas.tamanhoParaProporcao({ N, p: result.estimate.estimativa, D, confianca: confidence });
    // A single stratum covering everyone is an AAS: reuse it to get the pilot s².
    const values = result.sample.map((s) => prepared.variable.value(units[s.unit]));
    const S2 = motor.aes.estimarMedia([{ Nh: N, valores: values }], confidence).estratos[0].s2;
    return motor.aas.tamanhoParaMedia({ N, S2, D, confianca: confidence });
  })();

  return (
    <div className="rounded-lg border border-line bg-canvas p-3">
      <div className="text-[12px] font-medium text-slate">Quantos sortear para uma margem de</div>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="decimal"
          className="h-8 w-20 rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-brand"
          aria-label="Margem de erro desejada"
        />
        <span className="text-[13px] text-slate">{isProportion ? "p.p." : "reais"}</span>
        <span className="tabular ml-auto text-[15px] font-medium">{required ? `n = ${int(required)}` : "–"}</span>
      </div>
      {required && (
        <button
          onClick={() => onUse(Math.min(3000, required))}
          className="mt-2 text-[12px] font-medium text-brand hover:text-brand-strong"
        >
          Usar este tamanho{required > 3000 ? " (limite do simulador: 3.000)" : ""}
        </button>
      )}
      <p className="mt-1 text-[11px] leading-snug text-muted">
        Usa a amostra atual como piloto{result.strata ? " e mantém a mesma alocação entre estratos" : ""}.
      </p>
    </div>
  );
}
