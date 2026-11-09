"use client";

import { BEHAVIORS, type Consumer } from "@/data/population";
import type { Product } from "@/data/products";
import { brl, num, pct, pp } from "@/lib/format";
import type { Study } from "@/sampling/study";
import { STRATUM_COLORS } from "./brazil-canvas";
import { Panel } from "./ui";

const share = (units: Consumer[], test: (c: Consumer) => boolean) => units.filter(test).length / units.length;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * The behaviors the generator used to build the base. The profile columns are
 * computed on the whole target population (that is how the data was made). The
 * "Estimado" column is the study's AES estimate of each behavior's share, so the
 * sample can be checked against the known answer.
 */
export function BehaviorPanel({ study, product, tier }: { study: Study; product: Product; tier: "premium" | "popular" }) {
  const rows = BEHAVIORS.map((behavior, i) => {
    const units = study.units.filter((c) => c.behavior === behavior.id);
    const estimate = study.estimate(`behavior:${behavior.id}`).overall.estimate;
    return {
      behavior,
      color: STRATUM_COLORS[i % STRATUM_COLORS.length],
      share: units.length / study.N,
      estimate,
      household: units.length ? mean(units.map((c) => c.household)) : 0,
      salary: units.length ? median(units.map((c) => c.salary)) : 0,
      college: units.length ? share(units, (c) => c.education === "superior") : 0,
      rural: units.length ? share(units, (c) => c.zone === "rural") : 0,
      monthly: units.length ? share(units, (c) => c.frequency === "mensal") : 0,
      ticket: units.length ? mean(units.map((c) => c.ticket)) : 0,
      brand: units.length ? share(units, (c) => c.brands[product.id] === tier) : 0,
    };
  }).filter((row) => row.share > 0);

  const brandName = tier === "premium" ? product.premium : product.value;

  return (
    <Panel
      title="Comportamentos que formam a base"
      caption={
        <>
          Cada consumidor sintético recebeu um destes comportamentos, sorteado conforme a cidade e a zona em que mora (
          <code className="font-mono text-[12px]">src/gerador/comportamentos.ts</code>). As colunas de perfil usam a
          população-alvo inteira; a coluna “Estimado” vem da amostra deste estudo.
        </>
      }
    >
      <div className="-mx-5 overflow-x-auto">
        <table className="tabular w-full min-w-[980px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-right text-[12px] text-muted">
              <th className="px-5 pb-2 text-left font-medium">Comportamento</th>
              <th className="pb-2 pl-4 text-left font-medium">Participação real</th>
              <th className="pb-2 pl-4 font-medium">Estimado (IC)</th>
              <th className="pb-2 pl-4 font-medium">Moradores</th>
              <th className="pb-2 pl-4 font-medium">Renda mediana</th>
              <th className="pb-2 pl-4 font-medium">Superior</th>
              <th className="pb-2 pl-4 font-medium">Rural</th>
              <th className="pb-2 pl-4 font-medium">Compra do mês</th>
              <th className="pb-2 pl-4 font-medium">Ticket</th>
              <th className="px-5 pb-2 font-medium" title={brandName}>
                {product.name} {tier === "premium" ? "premium" : "popular"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const covered = row.estimate.ic[0] <= row.share && row.share <= row.estimate.ic[1];
              return (
                <tr key={row.behavior.id} className="border-b border-hairline text-right align-top last:border-0">
                  <td className="max-w-[300px] px-5 py-2.5 text-left">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                      {row.behavior.nome}
                    </div>
                    <div className="mt-0.5 pl-4 text-[12px] leading-snug text-muted">{row.behavior.descricao}</div>
                  </td>
                  <td className="py-2.5 pl-4 text-left">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-sm bg-hairline">
                        <div className="h-full rounded-sm" style={{ width: `${Math.min(100, row.share * 250)}%`, background: row.color }} />
                      </div>
                      {pct(row.share)}
                    </div>
                  </td>
                  <td className={`py-2.5 pl-4 ${covered ? "" : "text-sample"}`} title={covered ? "O IC contém o valor real" : "O IC não contém o valor real"}>
                    {pct(row.estimate.estimativa)} <span className="text-[12px] text-muted">± {pp(row.estimate.margem)}</span>
                  </td>
                  <td className="py-2.5 pl-4">{num(row.household, 1)}</td>
                  <td className="py-2.5 pl-4">{brl(row.salary)}</td>
                  <td className="py-2.5 pl-4">{pct(row.college, 0)}</td>
                  <td className="py-2.5 pl-4">{pct(row.rural, 0)}</td>
                  <td className="py-2.5 pl-4">{pct(row.monthly, 0)}</td>
                  <td className="py-2.5 pl-4">{brl(row.ticket)}</td>
                  <td className="px-5 py-2.5 font-medium">{pct(row.brand, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
