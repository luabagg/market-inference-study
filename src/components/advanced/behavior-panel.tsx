"use client";

import { BEHAVIORS, type Consumer } from "@/mundo/population";
import { brl, num, pct } from "@/lib/format";
import { STRATUM_COLORS } from "@/components/app/brazil-canvas";
import { Panel } from "@/components/app/ui";

const share = (units: Consumer[], test: (c: Consumer) => boolean) => units.filter(test).length / units.length;
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/**
 * The behaviors the generator used to build the state. The app-share column
 * shows where coverage bias comes from: each behavior has its own chance of
 * installing the app.
 */
export function BehaviorPanel({ state, frame }: { state: Consumer[]; frame: Consumer[] }) {
  const rows = BEHAVIORS.map((behavior, i) => {
    const units = state.filter((c) => c.behavior === behavior.id);
    return {
      behavior,
      color: STRATUM_COLORS[i % STRATUM_COLORS.length],
      inState: units.length / state.length,
      inApp: share(frame, (c) => c.behavior === behavior.id),
      adoption: share(units, (c) => c.usesApp),
      household: units.reduce((acc, c) => acc + c.household, 0) / units.length,
      salary: median(units.map((c) => c.salary)),
      monthly: share(units, (c) => c.frequency === "mensal"),
      premium: share(units, (c) => c.listed.cafe.premium),
    };
  });

  return (
    <Panel
      title="Comportamentos que formam a base"
      caption={
        <>
          Cada domicílio sintético recebeu um destes perfis, sorteado conforme a cidade e a zona em que mora (
          <code className="font-mono text-[12px]">src/mundo/gerador/comportamentos.ts</code>). O cliente nunca vê esta coluna.
        </>
      }
    >
      <div className="-mx-5 overflow-x-auto">
        <table className="tabular w-full min-w-[960px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-right text-[12px] text-muted">
              <th className="px-5 pb-2 text-left font-medium">Comportamento</th>
              <th className="pb-2 pl-4 font-medium">No RS</th>
              <th className="pb-2 pl-4 font-medium">No app</th>
              <th className="pb-2 pl-4 font-medium">Usa o app</th>
              <th className="pb-2 pl-4 font-medium">Moradores</th>
              <th className="pb-2 pl-4 font-medium">Renda mediana</th>
              <th className="pb-2 pl-4 font-medium">Compra do mês</th>
              <th className="px-5 pb-2 font-medium">Café Reserva</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.behavior.id} className="border-b border-hairline text-right align-top last:border-0">
                <td className="max-w-[320px] px-5 py-2.5 text-left">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                    {row.behavior.nome}
                  </div>
                  <div className="mt-0.5 pl-4 text-[12px] leading-snug text-muted">{row.behavior.descricao}</div>
                </td>
                <td className="py-2.5 pl-4">{pct(row.inState)}</td>
                <td className={`py-2.5 pl-4 font-medium ${row.inApp > row.inState ? "text-brand" : "text-sample"}`}>{pct(row.inApp)}</td>
                <td className="py-2.5 pl-4">{pct(row.adoption, 0)}</td>
                <td className="py-2.5 pl-4">{num(row.household, 1)}</td>
                <td className="py-2.5 pl-4">{brl(row.salary)}</td>
                <td className="py-2.5 pl-4">{pct(row.monthly, 0)}</td>
                <td className="px-5 py-2.5">{pct(row.premium, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
