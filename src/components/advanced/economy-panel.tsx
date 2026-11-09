"use client";

import { useState } from "react";
import { BASEMAP_LABELS, type Basemap, BrazilCanvas, basemapLegend } from "@/components/app/brazil-canvas";
import { Panel, Segmented } from "@/components/app/ui";
import { IBGE_YEARS, MUNICIPALITIES, type Sector, SECTORS, STATE_POPULATION } from "@/mundo/geography";
import { brl, int, num, pct } from "@/lib/format";

const SECTOR_COLORS: Record<Sector, string> = {
  agro: "#8fa95a",
  industria: "#2f6fde",
  servicos: "#0a7c5a",
  publico: "#9fb0c2",
};

const sectorTotals = (Object.keys(SECTORS) as Sector[]).map((sector) => ({
  sector,
  value: MUNICIPALITIES.reduce((acc, m) => acc + m.valueAdded[sector], 0),
}));
const totalValueAdded = sectorTotals.reduce((acc, s) => acc + s.value, 0);
const ruralPopulation = MUNICIPALITIES.reduce((acc, m) => acc + m.population * m.ruralShare, 0);
const agroTowns = MUNICIPALITIES.filter((m) => m.agroShare >= 0.3).length;

const TOP: Record<Exclude<Basemap, "nenhum">, { value: (m: (typeof MUNICIPALITIES)[number]) => number; format: (v: number) => string }> = {
  renda: { value: (m) => m.gdpPerCapita, format: brl },
  agro: { value: (m) => m.agroShare, format: (v) => pct(v, 0) },
  rural: { value: (m) => m.ruralShare, format: (v) => pct(v, 0) },
};

/** The real IBGE economy of the state, and how it feeds the generator. */
export function EconomyPanel() {
  const [basemap, setBasemap] = useState<Exclude<Basemap, "nenhum">>("agro");
  const legend = basemapLegend(basemap);
  const top = [...MUNICIPALITIES].sort((a, b) => TOP[basemap].value(b) - TOP[basemap].value(a)).slice(0, 5);

  return (
    <Panel
      title="A economia do RS, por município"
      caption={`IBGE: PIB dos Municípios (PIB ${IBGE_YEARS.gdp}, atividades ${IBGE_YEARS.sectors}) e Censo ${IBGE_YEARS.census}. Dados reais, não simulados.`}
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0">
          <Segmented
            label="Indicador"
            value={basemap}
            onChange={setBasemap}
            options={(["agro", "renda", "rural"] as const).map((b) => ({ value: b, label: BASEMAP_LABELS[b] }))}
          />
          <div className="relative mt-3 h-[380px] overflow-hidden rounded-lg border border-line">
            <BrazilCanvas units={[]} sample={[]} basemap={basemap} showStores={false} onHover={() => {}} />
          </div>
          {legend && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate">
              {legend.rows.map((row) => (
                <span key={row.label} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-3.5 rounded-sm border border-line" style={{ background: row.color }} />
                  {row.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-[14px] font-medium">De onde vem o valor adicionado do estado ({IBGE_YEARS.sectors})</h3>
            <div className="mt-3 flex h-4 overflow-hidden rounded-sm">
              {sectorTotals.map((s) => (
                <span key={s.sector} style={{ width: `${(s.value / totalValueAdded) * 100}%`, background: SECTOR_COLORS[s.sector] }} />
              ))}
            </div>
            <ul className="tabular mt-3 space-y-1 text-[13px]">
              {sectorTotals.map((s) => (
                <li key={s.sector} className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-slate">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SECTOR_COLORS[s.sector] }} />
                    {SECTORS[s.sector]}
                  </span>
                  <span>
                    {pct(s.value / totalValueAdded)} <span className="text-muted">· R$ {num(s.value / 1e6, 1)} bi</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line text-[13px]">
            <div className="bg-white p-3">
              <dt className="text-muted">População rural (Censo)</dt>
              <dd className="tabular text-[17px] font-medium">{pct(ruralPopulation / STATE_POPULATION)}</dd>
            </div>
            <div className="bg-white p-3">
              <dt className="text-muted">Cidades com 30%+ do PIB no campo</dt>
              <dd className="tabular text-[17px] font-medium">
                {int(agroTowns)} de {int(MUNICIPALITIES.length)}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="text-[14px] font-medium">Maiores valores: {BASEMAP_LABELS[basemap].toLowerCase()}</h3>
            <ol className="tabular mt-2 space-y-1 text-[13px]">
              {top.map((m) => (
                <li key={m.code} className="flex justify-between gap-3">
                  <span className="truncate text-slate">{m.name}</span>
                  <span>{TOP[basemap].format(TOP[basemap].value(m))}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg bg-canvas p-3 text-[13px] leading-relaxed text-slate">
            <span className="font-medium text-ink">Como isso entra no gerador. </span>
            Cada domicílio cai num município pela população do Censo e, dentro dele, num setor censitário pelo número de domicílios. O setor diz se a casa é urbana ou rural. A família
            rural aparece mais onde a agropecuária pesa no PIB, e a renda de todos os perfis sobe com o PIB per capita da cidade.
          </div>
        </div>
      </div>
    </Panel>
  );
}
