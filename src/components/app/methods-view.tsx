"use client";

import Link from "next/link";
import { useState } from "react";
import type { MethodsData } from "@/lib/analysis";
import { brl, int, num, pct } from "@/lib/format";
import { methodCopy } from "@/lib/method-copy";
import type { Design } from "@/sampling/simulation";
import { SpreadStrip, spreadDomain } from "./spread-strip";
import { Panel } from "./ui";

type Question = MethodsData["comparison"][number];

const formatter = (q: { kind: "mean" | "proportion" }) => (q.kind === "proportion" ? (v: number) => pct(v) : brl);
const marginText = (q: { kind: "mean" | "proportion" }, margin: number) =>
  q.kind === "proportion" ? `± ${num(margin * 100, 1)} p.p.` : `± ${brl(margin)}`;
const SHORT_LABEL: Record<string, string> = {
  "premium:cafe": "Café Reserva",
  ticket: "Gasto por compra",
  monthly: "Compra do mês",
};

/** Client-facing comparison of sampling methods: the recommended one first, the others one click away. */
export function MethodsView({ data }: { data: MethodsData }) {
  const [selected, setSelected] = useState<Design>(data.recommended);
  const ctx = { strata: data.strata, n: data.n, step: data.systematicStep };
  const designs = data.comparison[0].results.map((r) => r.design);
  const headline = data.comparison[0];
  const index = designs.indexOf(selected);
  const copy = methodCopy(selected, ctx);
  const result = headline.results[index];
  const equivalent = data.n / data.average[index].epa;
  const domain = spreadDomain(headline.results.map((r) => r.estimates), headline.truth);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-medium tracking-[-0.03em]">Como sorteamos</h1>
        <p className="mt-1 max-w-[760px] text-[14px] leading-relaxed text-slate">
          Não perguntamos para os {int(data.N)} usuários: sorteamos {int(data.n)}. O jeito de sortear muda o tamanho do erro. Testamos
          cada método {int(data.repetitions)} vezes nesta base, nas três perguntas do estudo, e ficamos com o que errou menos no conjunto.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Método de sorteio">
        {designs.map((design) => (
          <button
            key={design}
            role="radio"
            aria-checked={design === selected}
            onClick={() => setSelected(design)}
            className={`rounded-full border px-3 py-1 text-[13px] font-medium transition ${design === selected ? "border-ink bg-ink text-white" : "border-line bg-white text-slate hover:border-ink/30"}`}
          >
            {methodCopy(design, ctx).name}
            {design === data.recommended && <span className={design === selected ? "text-white/70" : "text-brand"}> · recomendado</span>}
          </button>
        ))}
      </div>

      <section className={`rounded-xl border bg-white p-6 ${selected === data.recommended ? "border-brand/50" : "border-line"}`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[20px] font-medium tracking-[-0.02em]">{copy.name}</h2>
          {selected === data.recommended ? (
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-medium text-brand-strong">Usado no estudo</span>
          ) : (
            <button onClick={() => setSelected(data.recommended)} className="text-[13px] font-medium text-brand hover:text-brand-strong">
              Voltar ao recomendado
            </button>
          )}
        </div>
        <p className="mt-1 text-[12px] text-muted">{copy.technical}</p>
        <p className="mt-3 max-w-[720px] text-[15px] leading-relaxed text-slate">{copy.idea}</p>

        <dl className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          <Stat label={`Margem típica em ${SHORT_LABEL[headline.variable]}`} value={marginText(headline, result.meanMargin)} />
          <Stat label="Rende como um sorteio simples de" value={`${int(equivalent)} pessoas`} />
          <Stat label={`Intervalos que acertaram, em ${int(data.repetitions)}`} value={`${pct(result.coverage)} (meta: 95%)`} />
        </dl>

        <div className="mt-6">
          <div className="mb-2 text-[13px] text-slate">
            {SHORT_LABEL[headline.variable]}: cada ponto é uma amostra de {int(data.n)} pessoas. Quanto mais perto da linha, melhor.
          </div>
          <SpreadStrip estimates={result.estimates} truth={headline.truth} domain={domain} format={formatter(headline)} />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <List title="A favor" items={copy.pros} tone="good" />
          <List title="Contra" items={copy.cons} tone="bad" />
        </div>
      </section>

      <Panel title="Todos os métodos, lado a lado" caption={`Margem média de ${int(data.repetitions)} amostras de ${int(data.n)} pessoas em cada pergunta`}>
        <div className="-mx-5 overflow-x-auto">
          <table className="tabular w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-right text-[12px] text-muted">
                <th className="px-5 pb-2 text-left font-medium">Método</th>
                {data.comparison.map((q) => (
                  <th key={q.variable} className="pb-2 pl-3 font-medium">
                    {SHORT_LABEL[q.variable]}
                  </th>
                ))}
                <th className="px-5 pb-2 font-medium">Rende como sorteio simples de</th>
              </tr>
            </thead>
            <tbody>
              {designs.map((design, i) => (
                <tr
                  key={design}
                  onClick={() => setSelected(design)}
                  className={`cursor-pointer border-b border-hairline text-right last:border-0 hover:bg-canvas ${design === data.recommended ? "font-medium" : ""}`}
                >
                  <td className="px-5 py-2.5 text-left">
                    {methodCopy(design, ctx).name}
                    {design === data.recommended && <span className="ml-2 text-[12px] text-brand">recomendado</span>}
                  </td>
                  {data.comparison.map((q) => (
                    <td key={q.variable} className="py-2.5 pl-3">
                      {marginText(q, q.results[i].meanMargin)}
                    </td>
                  ))}
                  <td className="px-5 py-2.5">{int(data.n / data.average[i].epa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <BiasSection data={data} />

      <p className="text-[13px] text-muted">
        As fórmulas, os pesos de cada sorteado e as repetições estão na{" "}
        <Link href="/avancado" className="font-medium text-brand hover:text-brand-strong">
          página da apresentação
        </Link>
        .
      </p>
    </div>
  );
}

export function BiasSection({ data }: { data: MethodsData }) {
  const question = (variable: string) => data.comparison.find((q) => q.variable === variable) as Question;
  const headline = data.bias[0];
  const q = question(headline.variable);
  const format = formatter(q);
  // Signed gap to the state value, so an adjustment that overshoots shows up as a sign flip.
  const gap = (b: MethodsData["bias"][number], value: number) => {
    const d = value - b.truthState;
    const sign = d > 0 ? "+" : d < 0 ? "−" : "";
    return question(b.variable).kind === "proportion" ? `${sign}${num(Math.abs(d) * 100, 1)} p.p.` : `${sign}${brl(Math.abs(d))}`;
  };
  return (
    <section id="vies" className="scroll-mt-6 rounded-xl border border-line bg-white p-6">
      <h2 className="text-[20px] font-medium tracking-[-0.02em]">Quem usa o app não é o RS inteiro</h2>
      <p className="mt-2 max-w-[760px] text-[14px] leading-relaxed text-slate">
        Um sorteio bem feito acerta o retrato de quem usa o Cestinha. Se a pergunta é sobre o estado, falta uma etapa: o app tem mais
        gente da capital e das cidades ricas. Ajustamos cada sorteado pelo peso que a região e o porte da cidade dele têm no Censo. Isso corrige a parte
        da diferença que vem de onde as pessoas moram. A parte que vem do jeito de ser de quem instala um app de lista continua lá.
      </p>

      <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`${SHORT_LABEL[q.variable]} no RS inteiro`} value={format(headline.truthState)} note="valor real do modelo" />
        <Stat label="Entre os usuários do app" value={format(headline.truthFrame)} note="valor real da base" />
        <Stat label="Estimativa da amostra" value={format(headline.plain)} note="mira nos usuários" />
        <Stat label="Estimativa ajustada pelo Censo" value={format(headline.corrected)} note={`diferença para o RS: ${gap(headline, headline.corrected)}, era ${gap(headline, headline.plain)}`} />
      </div>

      <div className="-mx-6 mt-6 overflow-x-auto">
        <table className="tabular w-full min-w-[620px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-right text-[12px] text-muted">
              <th className="px-6 pb-2 text-left font-medium">Pergunta</th>
              <th className="pb-2 pl-3 font-medium">RS inteiro</th>
              <th className="pb-2 pl-3 font-medium">Amostra</th>
              <th className="pb-2 pl-3 font-medium">Ajustada</th>
              <th className="pb-2 pl-3 font-medium">Diferença antes</th>
              <th className="px-6 pb-2 font-medium">Diferença depois</th>
            </tr>
          </thead>
          <tbody>
            {data.bias.map((b) => {
              const f = formatter(question(b.variable));
              return (
                <tr key={b.variable} className="border-b border-hairline text-right last:border-0">
                  <td className="px-6 py-2.5 text-left">{SHORT_LABEL[b.variable]}</td>
                  <td className="py-2.5 pl-3">{f(b.truthState)}</td>
                  <td className="py-2.5 pl-3">{f(b.plain)}</td>
                  <td className="py-2.5 pl-3">{f(b.corrected)}</td>
                  <td className="py-2.5 pl-3">{gap(b, b.plain)}</td>
                  <td className="px-6 py-2.5 font-medium">{gap(b, b.corrected)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-muted">
        Médias de {int(data.repetitions)} amostras. Diferença = estimativa menos o valor do RS inteiro. O ajuste pode passar do ponto: quando
        o sinal troca, ele corrigiu demais, porque a célula do Censo junta gente com hábitos diferentes. O valor do RS inteiro só é conhecido porque a base é simulada: num estudo real, ele é
        justamente o que não se sabe.
      </p>
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-[18px] font-medium tracking-tight">{value}</dd>
      {note && <dd className="text-[12px] text-slate">{note}</dd>}
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" }) {
  return (
    <div>
      <h3 className="text-[14px] font-medium">{title}</h3>
      <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-slate">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone === "good" ? "bg-brand" : "bg-sample"}`} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
