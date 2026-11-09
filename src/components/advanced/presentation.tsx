"use client";

import { useMemo, useState } from "react";
import { motor } from "@/estatistica";
import { BiasSection } from "@/components/app/methods-view";
import { Segmented } from "@/components/app/ui";
import { spreadDomain } from "@/components/app/spread-strip";
import { getPopulation, getStatePopulation } from "@/mundo/population";
import { STUDY } from "@/sampling/study-plan";
import type { MethodsData } from "@/lib/analysis";
import { int, num, pct } from "@/lib/format";
import { methodCopy } from "@/lib/method-copy";
import { prepareSimulation, runOnce } from "@/sampling/simulation";
import { AppDataPanel } from "./app-data-panel";
import { BehaviorPanel } from "./behavior-panel";
import { EconomyPanel } from "./economy-panel";
import { SamplingLab } from "./lab";
import { MethodSection } from "./method-section";

type Allocation = "aes-proporcional" | "aes-neyman" | "aes-igual";

const ALLOCATION_FORMULA: Record<Allocation, string> = {
  "aes-proporcional": "proporcional:  mₕ = m · Nₕ / N",
  "aes-neyman": "Neyman:        mₕ = m · NₕSₕ / Σ NₖSₖ   (Sₕ do Café Reserva)",
  "aes-igual": "igual:         mₕ = m / H",
};

/** The presentation page: the statistics the client never sees, one method per section. */
export function Presentation({ data }: { data: MethodsData }) {
  const frame = useMemo(() => getPopulation(), []);
  const state = useMemo(() => getStatePopulation(), []);
  const [allocation, setAllocation] = useState<Allocation>("aes-proporcional");
  const headline = data.comparison[0];
  const domain = spreadDomain(headline.results.map((r) => r.estimates), headline.truth);
  const ctx = { strata: data.strata, n: data.n, step: data.systematicStep };

  return (
    <div className="space-y-24">
      <Section id="dados" title="Da população ao número">
        <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
          <Tier label="População" value={`${int(data.stateHouseholds)} domicílios`} note="Modelo do RS em escala, distribuído pelos municípios conforme o Censo." />
          <Tier label="Cadastro (o que dá para sortear)" value={`N = ${int(data.N)} usuários`} note="Quem usa o Cestinha. É daqui que sai toda amostra." />
          <Tier label="Amostra" value={`n = ${int(data.n)}`} note={`Pergunta principal: ${headline.label.toLowerCase()}.`} />
        </dl>
        <p className="mt-6 max-w-[760px] text-[15px] leading-relaxed text-slate">
          Como a base é simulada, o valor real de cada pergunta é conhecido: {pct(headline.truth)} dos usuários listaram Café Reserva.
          Isso permite medir o erro de cada método em vez de supor. Todas as contas abaixo passam pelo motor em{" "}
          <code className="font-mono text-[13px]">src/estatistica/</code>.
        </p>
        <div className="mt-8 space-y-6">
          <EconomyPanel />
          <BehaviorPanel state={state} frame={frame} />
          <AppDataPanel />
        </div>
      </Section>

      <Section id="aas" title="Amostragem aleatória simples">
        <MethodSection
          design="aas"
          units={frame}
          data={data}
          domain={domain}
          formulas={["πᵢ = n / N", "ȳ = Σ yᵢ / n", "V̂(ȳ) = (1 − n/N) · s² / n", "proporção: V̂(p̂) = (N − n)/(N − 1) · p̂(1 − p̂)/(n − 1)"]}
        />
      </Section>

      <Section id="aes" title="Amostragem estratificada">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-[13px] text-slate">Alocação</span>
          <Segmented
            label="Alocação"
            value={allocation}
            onChange={setAllocation}
            options={(["aes-proporcional", "aes-neyman", "aes-igual"] as Allocation[]).map((d) => ({
              value: d,
              label: d === "aes-proporcional" ? "Proporcional" : d === "aes-neyman" ? "Neyman" : "Igual",
            }))}
          />
          <span className="text-[13px] text-muted">{methodCopy(allocation, ctx).name}</span>
        </div>
        <MethodSection
          key={allocation}
          design={allocation}
          units={frame}
          data={data}
          domain={domain}
          formulas={[
            `H = ${data.strata} estratos (região × faixa de renda)`,
            "ȳ_st = Σ Wₕ ȳₕ,   Wₕ = Nₕ / N",
            "V̂(ȳ_st) = Σ Wₕ² (1 − mₕ/Nₕ) · s²ₕ / mₕ",
            ALLOCATION_FORMULA[allocation],
          ]}
        />
      </Section>

      <Section id="as" title="Amostragem sistemática">
        <MethodSection
          design="as"
          units={frame}
          data={data}
          domain={domain}
          formulas={[
            "lista ordenada de norte a sul",
            "k = ⌊N / n⌋,   r sorteado em 1..k",
            "amostra: r, r + k, r + 2k, …",
            "V̂₁ = (1 − n/N) · s² / n            (ordem aleatória)",
            "V̂₂ = (1 − n/N) · Σ(yᵢ₊₁ − yᵢ)² / (2n(n − 1))",
          ]}
        />
      </Section>

      <Section id="ht" title="Horvitz–Thompson: o mesmo resultado escrito com pesos">
        <HorvitzThompson units={frame} n={data.n} />
      </Section>

      <Section id="comparacao" title="Qual método usar">
        <Comparison data={data} />
      </Section>

      <Section id="vies" title="Viés de cobertura: o que o Horvitz–Thompson não corrige">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="min-w-0 space-y-4 text-[15px] leading-relaxed text-slate">
            <p>
              O peso wᵢ = 1/πᵢ corrige chances desiguais que <em>o plano</em> cria. O plano decide πᵢ, então πᵢ é conhecido. Na alocação igual,
              um usuário de um estrato pequeno tem mais chance de ser sorteado e por isso pesa menos. O estimador continua não viesado para a
              média dos usuários.
            </p>
            <p>
              A chance de alguém ter instalado o Cestinha ninguém decidiu e ninguém conhece. Sem esse π não há peso, e o sorteio perfeito
              continua estimando os usuários, não o RS. Isso é viés de cobertura.
            </p>
            <p>
              O que dá para fazer: comparar o cadastro com o Censo em algo que os dois registram (aqui, região × porte da cidade) e dar a
              cada célula g o peso Wg que ela tem no estado. É a ideia do HT com π estimado (pós-estratificação). Corrige o que vem de onde
              as pessoas moram. O que vem do comportamento, que o Censo não mede, fica.
            </p>
          </div>
          <pre className="h-fit min-w-0 overflow-x-auto rounded-lg bg-ink px-4 py-3 font-mono text-[12.5px] leading-relaxed text-white/90">
            {[
              "dentro de cada célula g (região × porte):",
              "  ȳ_g = Σ_g yᵢ/πᵢ  ÷  Σ_g 1/πᵢ        (Hájek, com motor.ht.total)",
              "",
              "média ajustada ao RS:",
              "  ȳ_aj = Σ_g W_g · ȳ_g,   W_g = população da célula no Censo / RS",
              "",
              "viés de cobertura = média dos usuários − média do RS",
            ].join("\n")}
          </pre>
        </div>
        <div className="mt-8">
          <BiasSection data={data} />
        </div>
      </Section>

      <Section id="laboratorio" title="Laboratório">
        <SamplingLab />
      </Section>
    </div>
  );
}

function HorvitzThompson({ units, n }: { units: ReturnType<typeof getPopulation>; n: number }) {
  // Equal allocation gives very different π across strata, which is when the weights matter most.
  const result = useMemo(() => {
    const prepared = prepareSimulation(motor, units, {
      variable: "premium:cafe",
      design: "aes-igual",
      n,
      stratifyBy: "regionIncome",
      confidence: STUDY.confidence,
    });
    const r = runOnce(prepared, 1);
    const y = r.sample.map((s) => prepared.variable.value(units[s.unit]));
    const pi = r.sample.map((s) => s.pi);
    const weights = motor.ht.pesos(pi);
    return {
      N: prepared.N,
      total: motor.ht.total(y, pi),
      Nhat: motor.ht.total(y.map(() => 1), pi),
      minW: Math.min(...weights),
      maxW: Math.max(...weights),
      unweighted: y.reduce((a, b) => a + b, 0) / y.length,
      truth: prepared.truth,
    };
  }, [units, n]);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4 text-[15px] leading-relaxed text-slate">
        <p>
          Todo plano probabilístico dá a cada unidade uma chance πᵢ de entrar. O estimador de Horvitz–Thompson soma cada resposta
          dividida pela sua chance: quem tinha pouca chance de ser sorteado representa muita gente.
        </p>
        <p>
          Na AAS e na alocação proporcional, π é igual para todos e o HT vira N·ȳ. Na alocação igual, um usuário de um estrato pequeno
          vale {num(result.minW, 1)} pessoas e um de um estrato grande vale {num(result.maxW, 1)}. Ignorar esses pesos dá{" "}
          {pct(result.unweighted)}, longe do valor real de {pct(result.truth)}.
        </p>
      </div>
      <dl className="tabular divide-y divide-line rounded-xl border border-line bg-white text-[14px]">
        {[
          ["Soma dos pesos", "N̂ = Σ wᵢ", int(result.Nhat), `N real = ${int(result.N)}`],
          ["Usuários que listaram Café Reserva", "Ŷ = Σ wᵢ yᵢ", int(result.total), "estimativa do total"],
          ["Proporção", "Ŷ / N", pct(result.total / result.N), `valor real ${pct(result.truth)}`],
          ["Sem pesos", "Σ yᵢ / n", pct(result.unweighted), "o erro de esquecer π"],
        ].map(([label, formula, value, note]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-5 py-3">
            <div>
              <dt className="text-slate">{label}</dt>
              <code className="font-mono text-[12px] text-muted">{formula}</code>
            </div>
            <dd className="text-right">
              <div className="font-medium">{value}</div>
              <div className="text-[12px] text-muted">{note}</div>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Comparison({ data }: { data: MethodsData }) {
  const ctx = { strata: data.strata, n: data.n, step: data.systematicStep };
  const designs = data.comparison[0].results.map((r) => r.design);
  return (
    <div>
      <p className="max-w-[760px] text-[15px] leading-relaxed text-slate">
        EPA = variância do método ÷ variância da AAS com o mesmo n. Abaixo de 1, o método erra menos que a AAS. O EPA exato vem da base
        inteira; o das repetições é o que a turma veria sorteando {int(data.repetitions)} vezes. Como a mesma amostra responde todas as
        perguntas, a recomendação usa a média.
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="tabular w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-right text-[12px] text-muted">
              <th className="px-5 py-3 text-left font-medium">Método</th>
              {data.comparison.map((q) => (
                <th key={q.variable} className="py-3 pl-3 font-medium">
                  {q.label}
                </th>
              ))}
              <th className="px-5 py-3 font-medium">EPA médio</th>
            </tr>
          </thead>
          <tbody>
            {designs.map((design, i) => (
              <tr key={design} className={`border-b border-hairline text-right last:border-0 ${design === data.recommended ? "bg-brand-soft/60" : ""}`}>
                <td className="px-5 py-3 text-left">
                  <div className="font-medium">{methodCopy(design, ctx).technical}</div>
                  {design === data.recommended && <div className="text-[12px] text-brand-strong">recomendado e usado no estudo</div>}
                </td>
                {data.comparison.map((q) => (
                  <td key={q.variable} className="py-3 pl-3">
                    <div className="font-medium">{num(q.results[i].epa, 2)}</div>
                    <div className="text-[11px] text-muted">
                      rep. {num(q.results[i].empiricalEpa, 2)} · IC {pct(q.results[i].coverage, 0)}
                    </div>
                  </td>
                ))}
                <td className="px-5 py-3 text-[15px] font-medium">{num(data.average[i].epa, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-[760px] text-[14px] leading-relaxed text-slate">
        Neyman ganha na pergunta usada para alocar e perde nas outras. Na sistemática, o V̂₁ supõe ordem aleatória; com a lista ordenada de
        norte a sul, a cobertura dos intervalos se afasta dos 95%. A alocação igual serve para comparar estratos, não para o total.
      </p>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-8 text-[28px] leading-tight font-medium tracking-[-0.03em]">{title}</h2>
      {children}
    </section>
  );
}

function Tier({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-white p-5">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="tabular mt-1 text-[22px] font-medium tracking-tight">{value}</dd>
      <dd className="mt-1 text-[13px] leading-relaxed text-slate">{note}</dd>
    </div>
  );
}
