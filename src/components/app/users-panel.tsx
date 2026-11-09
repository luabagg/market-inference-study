"use client";

import Link from "next/link";
import { IBGE_YEARS } from "@/mundo/geography";
import type { DashboardData } from "@/lib/analysis";
import { pct } from "@/lib/format";
import { Panel } from "./ui";

type Rows = DashboardData["profiles"]["census"]["size"];

const APP_COLOR = "var(--color-brand)";
const STATE_COLOR = "#b8c4d1";

/** Who uses the app next to who lives in the state: the gap a study has to account for. */
export function UsersPanel({ profiles }: { profiles: DashboardData["profiles"] }) {
  const groups: { title: string; rows: Rows; census: boolean }[] = [
    { title: "Onde moram", rows: profiles.census.size, census: true },
    { title: "Idade de quem responde", rows: profiles.model.age, census: false },
    { title: "Renda da casa", rows: profiles.model.income, census: false },
    { title: "Zona", rows: profiles.model.zone, census: false },
  ];
  return (
    <Panel
      title="Quem usa o Cestinha"
      caption="Todos os usuários do app, comparados com os domicílios do RS"
      action={
        <div className="hidden shrink-0 flex-col gap-1 text-[12px] text-slate sm:flex">
          <Swatch color={APP_COLOR} label="Usuários do app" />
          <Swatch color={STATE_COLOR} label="Rio Grande do Sul" />
        </div>
      }
    >
      <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-[14px] font-medium">{g.title}</h3>
              <span className="text-right text-[11px] text-muted">
                {g.census ? `RS: Censo ${IBGE_YEARS.census}, IBGE` : "RS: modelo da demonstração"}
              </span>
            </div>
            <div className="space-y-2.5">
              {g.rows.map((r) => (
                <div key={r.key}>
                  <div className="mb-1 flex justify-between gap-3 text-[13px]">
                    <span className="truncate text-slate">{r.label}</span>
                    <span className="tabular shrink-0">
                      {pct(r.app)} <span className="text-muted">vs {pct(r.state)}</span>
                    </span>
                  </div>
                  <Bar value={r.app} color={APP_COLOR} />
                  <Bar value={r.state} color={STATE_COLOR} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 max-w-[760px] text-[13px] leading-relaxed text-slate">
        O app tem mais gente de Porto Alegre, de renda alta e jovem do que o estado. Os números do painel descrevem quem usa o
        Cestinha. Para falar do RS inteiro, ajustamos pelo Censo, e isso só corrige parte da diferença.{" "}
        <Link href="/app/metodos#vies" className="font-medium text-brand hover:text-brand-strong">
          Ver o ajuste ›
        </Link>
      </p>
    </Panel>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="mt-0.5 h-1.5 rounded-full bg-hairline">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, value * 100)}%`, background: color }} />
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
