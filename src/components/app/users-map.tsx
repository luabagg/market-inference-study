"use client";

import { useMemo, useState } from "react";
import { motor } from "@/estatistica";
import { MUNICIPALITIES } from "@/mundo/geography";
import { AGES, getPopulation, INCOME_BANDS } from "@/mundo/population";
import { distanceKm, STORE_ATTRIBUTION, STORE_TYPES, STORES, type StoreType } from "@/mundo/stores";
import { STUDY } from "@/sampling/study-plan";
import { int, num } from "@/lib/format";
import { runStudy } from "@/sampling/study";
import { BASEMAP_LABELS, type Basemap, BrazilCanvas, basemapLegend, type SampledPoint, STORE_COLORS } from "./brazil-canvas";
import { Segmented, Toggle } from "./ui";

const SAMPLE_COLOR = "#ff6b35";

/** Where the app's users live and who was drawn for the study. */
export function UsersMap() {
  const units = useMemo(() => getPopulation(), []);
  const sample = useMemo(() => runStudy(motor, units, STUDY).sample, [units]);
  const cities = useMemo(() => new Set(units.map((c) => c.municipality)).size, [units]);
  const [showStores, setShowStores] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("nenhum");
  const legend = basemapLegend(basemap);
  const [hover, setHover] = useState<{ point: SampledPoint; x: number; y: number } | null>(null);
  const hovered = hover ? units[hover.point.unit] : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-medium tracking-[-0.03em]">Onde estão os usuários</h1>
        <p className="mt-1 max-w-[720px] text-[14px] leading-relaxed text-slate">
          Cada ponto cinza é um domicílio que usa o Cestinha. Os laranja são os {int(sample.length)} sorteados para o estudo. Clique
          numa cidade para aproximar.
        </p>
      </header>

      <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
        {[
          ["Usuários no RS", int(units.length)],
          ["Cidades com usuários", `${int(cities)} de ${int(MUNICIPALITIES.length)}`],
          ["Sorteados no estudo", int(sample.length)],
        ].map(([label, value]) => (
          <div key={label} className="bg-white px-5 py-4">
            <dt className="text-[12px] text-muted">{label}</dt>
            <dd className="tabular mt-0.5 text-[22px] font-medium tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 text-[12px] text-slate">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ink/25" /> Usuário do app
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: SAMPLE_COLOR }} /> Sorteado no estudo
            </span>
            {showStores &&
              (Object.keys(STORE_TYPES) as StoreType[]).map((type) => (
                <span key={type} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2" style={{ background: STORE_COLORS[type] }} />
                  {STORE_TYPES[type]}
                </span>
              ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Fundo do mapa"
              value={basemap}
              onChange={setBasemap}
              options={(["nenhum", "renda", "agro", "rural"] as Basemap[]).map((b) => ({ value: b, label: BASEMAP_LABELS[b] }))}
            />
            <Toggle checked={showStores} onChange={setShowStores} label={`Mercados (${int(STORES.length)})`} />
          </div>
        </div>
        <div className="relative h-[520px] sm:h-[680px]">
          <BrazilCanvas units={units} sample={sample} basemap={basemap} showStores={showStores} onHover={setHover} sampleColor={SAMPLE_COLOR} />
          {hover && hovered && (
            <div
              className="pointer-events-none absolute z-10 w-[220px] rounded-lg border border-line bg-white p-3 text-[12px] shadow-lg"
              style={{ left: hover.x + 14, top: hover.y + 14 }}
            >
              <div className="font-medium text-ink">{MUNICIPALITIES[hovered.municipality].name}</div>
              <div className="text-muted">
                {AGES[hovered.age]} · {hovered.household} {hovered.household === 1 ? "morador" : "moradores"}
              </div>
              <div className="text-muted">{INCOME_BANDS[hovered.income]}</div>
              <div className="mt-1 text-slate">
                Compra mais em {STORE_TYPES[STORES[hovered.mainStore].type].toLowerCase()}, a{" "}
                {num(distanceKm(hovered.lon, hovered.lat, STORES[hovered.mainStore]), 1)} km
              </div>
            </div>
          )}
          {(showStores || legend) && (
            <div className="pointer-events-none absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-md bg-white/90 px-3 py-2 text-[11px] text-slate">
              {legend && (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="font-medium text-ink">{legend.title} (IBGE)</span>
                  {legend.rows.map((row) => (
                    <span key={row.label} className="inline-flex items-center gap-1">
                      <span className="h-2 w-3 rounded-sm border border-line" style={{ background: row.color }} />
                      {row.label}
                    </span>
                  ))}
                </div>
              )}
              {showStores && <div className={legend ? "mt-1" : ""}>Mercados: {STORE_ATTRIBUTION}</div>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
