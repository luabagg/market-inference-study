import Image from "next/image";
import Link from "next/link";
import { HeroMap } from "@/components/landing/hero-map";
import { LiveCounter } from "@/components/landing/live-counter";
import { Logo } from "@/components/logo";
import { IBGE_YEARS } from "@/data/geography";
import { brl, compact, int, pct, pp } from "@/lib/format";
import { getLandingFacts } from "@/lib/landing-facts";

const CLIENTS = [
  { name: "Casa Nobre", className: "font-serif italic text-[21px] tracking-tight" },
  { name: "Bom Dia", className: "font-extrabold text-[20px] tracking-[-0.04em]" },
  { name: "REDE SERTÃO", className: "font-semibold text-[15px] tracking-[0.18em]" },
  { name: "mercantil ipê", className: "font-medium text-[19px] tracking-tight lowercase" },
  { name: "Grupo Maré", className: "font-bold text-[18px] tracking-[-0.02em]" },
];

export default function Home() {
  const facts = getLandingFacts();

  return (
    <div className="overflow-x-clip">
      <Header />

      {/* Hero */}
      <section className="relative border-b border-line">
        <Frame className="grid min-h-[680px] items-center gap-6 pt-28 pb-16 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div className="rise relative z-10">
            <p className="mb-8 text-[13px] text-slate">
              Listas de compras recebidas nos últimos 90 dias:{" "}
              <span className="font-medium text-ink">
                <LiveCounter start={facts.lists} />
              </span>
            </p>
            <h1 className="text-[36px] leading-[1.1] font-medium tracking-[-0.035em] sm:text-[46px]">
              Saiba o que o Brasil vai colocar no carrinho.{" "}
              <span className="text-slate/75">
                A Fração transforma listas de supermercado em estimativas de consumo, com margem de erro, para cada
                região do país.
              </span>
            </h1>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="inline-flex h-11 items-center gap-1.5 rounded-md bg-ink px-5 text-[15px] font-medium text-white transition hover:bg-ink/85"
              >
                Abrir a demonstração <span aria-hidden>›</span>
              </Link>
              <a
                href="#contato"
                className="inline-flex h-11 items-center rounded-md border border-line px-5 text-[15px] font-medium text-ink transition hover:border-ink/30"
              >
                Falar com vendas
              </a>
            </div>
          </div>
          <div className="relative -mx-4 aspect-square w-[calc(100%+2rem)] sm:mx-0 sm:w-full lg:-mr-16 lg:w-[calc(100%+4rem)]">
            <HeroMap className="absolute inset-0 h-full w-full" />
            <FloatingCard
              className="top-[8%] left-[0%] hidden sm:block"
              label="Amostra sorteada"
              value={`${int(facts.sampleSize)} consumidores`}
              note="9 estratos de renda × porte"
            />
            <FloatingCard
              className="right-[0%] bottom-[6%]"
              label="Café premium, renda alta"
              value={pct(facts.premiumByIncome[0].value)}
              note={`± ${pp(facts.premiumByIncome[0].margin)} com 95% de confiança`}
            />
          </div>
        </Frame>
      </section>

      {/* Clients */}
      <section className="border-b border-line">
        <Frame className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5 py-8 text-ink/75">
          {CLIENTS.map((c) => (
            <span key={c.name} className={c.className}>
              {c.name}
            </span>
          ))}
        </Frame>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="border-b border-line scroll-mt-16">
        <Frame className="py-24">
          <SectionTitle
            strong="Da lista no celular ao relatório."
            soft="As famílias já planejam a compra no celular. Usamos essas listas no lugar de questionários e entrevistadores."
          />
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
            <Step
              n="1"
              title="As famílias planejam a compra"
              body={`No app Cestinha, ${compact(facts.consumers)} famílias montam a lista antes de ir ao mercado. Cada item, marca e quantidade vira um registro anônimo.`}
            />
            <Step
              n="2"
              title="Sorteamos quem entra na conta"
              body="Para cada estudo, sorteamos uma amostra separada por região, porte da cidade e faixa de renda. Quem representa mais gente pesa mais no resultado."
            />
            <Step
              n="3"
              title="Você recebe o número e a margem"
              body="Toda estimativa vem com intervalo de confiança. Fica claro o que é diferença real entre regiões e o que é variação de amostra."
            />
          </div>
        </Frame>
      </section>

      {/* Use cases */}
      <section id="casos" className="border-b border-line bg-canvas scroll-mt-16">
        <Frame className="py-24">
          <SectionTitle
            strong="Perguntas que um gerente de categoria faz toda semana."
            soft="Exemplos tirados da demonstração, com a mesma base sintética e o mesmo método."
          />
          <div className="mt-14 grid gap-4 lg:grid-cols-6">
            <Card className="lg:col-span-3" title="Onde a marca premium entra na lista" caption="Casa Nobre Especial · café · por faixa de renda">
              <Bars rows={facts.premiumByIncome} format={pct} marginFormat={pp} max={0.6} color="var(--color-brand)" />
            </Card>
            <Card className="lg:col-span-3" title="Compra do mês ou compra da semana" caption="Lares que fazem uma compra grande por mês">
              <Bars rows={facts.monthlyBySize} format={pct} marginFormat={pp} max={0.8} color="var(--color-s2)" />
            </Card>
            <Card className="lg:col-span-2" title="Ticket médio por região" caption="Média por consumidor do valor planejado em cada lista">
              <ul className="divide-y divide-line text-[14px]">
                {facts.ticketByRegion.map((r) => (
                  <li key={r.label} className="flex items-baseline justify-between py-2">
                    <span className="text-slate">{r.label}</span>
                    <span className="tabular font-medium">
                      {brl(r.value)} <span className="text-[12px] font-normal text-muted">± {brl(r.margin)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="lg:col-span-4" title="Quanto custa cada ponto de precisão" caption="Consumidores necessários para estimar uma proporção, 95% de confiança">
              <div className="grid grid-cols-3 gap-3">
                {facts.sizes.map((s) => (
                  <div key={s.D} className="rounded-lg border border-line bg-white p-4">
                    <div className="text-[12px] text-muted">Margem de ± {pp(s.D, 0)}</div>
                    <div className="tabular mt-1 text-[26px] font-medium tracking-tight">{int(s.n)}</div>
                    <div className="mt-3 h-1.5 rounded-full bg-hairline">
                      <div className="h-full rounded-full bg-sample" style={{ width: `${(s.n / facts.sizes[2].n) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-slate">
                Cortar a margem pela metade pede perto de quatro vezes mais consumidores. Por isso o preço de um estudo
                sai da margem de erro que você precisa.
              </p>
            </Card>
          </div>
        </Frame>
      </section>

      {/* Product preview */}
      <section className="border-b border-line">
        <Frame className="grid items-center gap-12 py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionTitle
              strong="Um painel por estudo."
              soft="Escolha o produto, compare regiões e veja como a amostra foi desenhada. Cada número mostra de onde veio."
            />
            <ul className="mt-8 space-y-3 text-[15px] text-slate">
              <li className="flex gap-3">
                <Dot /> Estimativas com intervalo de confiança em todos os gráficos
              </li>
              <li className="flex gap-3">
                <Dot /> Mapa com cada consumidor sorteado e o peso que ele recebe
              </li>
              <li className="flex gap-3">
                <Dot /> Plano amostral aberto: estratos, tamanhos e alocação
              </li>
            </ul>
            <Link href="/app" className="mt-10 inline-flex items-center gap-1.5 text-[15px] font-medium text-brand hover:text-brand-strong">
              Ver o painel da Casa Nobre <span aria-hidden>›</span>
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-line shadow-[0_30px_60px_-30px_rgba(11,31,51,0.35)]">
            <Image src="/preview-painel.png" alt="Painel da demonstração com estimativas por renda e porte" width={1440} height={900} className="w-full" />
          </div>
        </Frame>
      </section>

      {/* Numbers */}
      <section className="bg-ink text-white">
        <Frame className="py-24">
          <h2 className="max-w-[640px] text-[32px] leading-tight font-medium tracking-[-0.03em]">
            Consumidores nas 27 unidades da federação.{" "}
            <span className="text-white/55">
              Construída sobre o Censo {IBGE_YEARS.census} e o PIB dos Municípios {IBGE_YEARS.gdp}, do IBGE.
            </span>
          </h2>
          <dl className="mt-14 grid grid-cols-2 gap-y-10 border-t border-white/15 pt-10 md:grid-cols-4">
            <Stat value={compact(facts.consumers)} label="famílias ativas no app" />
            <Stat value={int(facts.municipalities)} label="municípios com consumidores" />
            <Stat value={compact(facts.lists)} label="listas a cada trimestre" />
            <Stat value={`± ${pp(facts.typicalMargin)}`} label="margem de um estudo padrão" />
          </dl>
        </Frame>
      </section>

      {/* Privacy and limits */}
      <section id="privacidade" className="border-b border-line scroll-mt-16">
        <Frame className="grid gap-14 py-24 md:grid-cols-2">
          <div>
            <h3 className="text-[22px] font-medium tracking-[-0.02em]">Você recebe números agregados.</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-slate">
              Nenhuma lista individual sai da Fração. Os relatórios mostram estimativas para grupos de consumidores, e
              cada célula publicada precisa ter amostra suficiente para não identificar ninguém. Quem usa o Cestinha
              autoriza o uso anônimo no cadastro e pode sair quando quiser.
            </p>
          </div>
          <div>
            <h3 className="text-[22px] font-medium tracking-[-0.02em]">O que os números medem.</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-slate">
              Uma lista registra intenção de compra. O que vai para o caixa pode ser diferente. E quem usa o app não
              representa o Brasil inteiro: a base tem mais gente nas capitais e no Sul e Sudeste. A estratificação e os
              pesos corrigem a composição dentro da base, mas quem nunca instalou o app fica fora da conta.
            </p>
          </div>
        </Frame>
      </section>

      {/* CTA */}
      <section id="contato" className="scroll-mt-16">
        <Frame className="flex flex-col items-start justify-between gap-8 py-20 md:flex-row md:items-center">
          <h2 className="max-w-[560px] text-[30px] leading-tight font-medium tracking-[-0.03em]">
            Veja um estudo completo.{" "}
            <span className="text-slate/80">Três clientes usam a mesma base para perguntas diferentes. Como a Fração é um projeto acadêmico, a demonstração faz o papel da conversa com vendas.</span>
          </h2>
          <Link
            href="/app"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-ink px-5 text-[15px] font-medium text-white transition hover:bg-ink/85"
          >
            Abrir a demonstração <span aria-hidden>›</span>
          </Link>
        </Frame>
      </section>

      <footer className="border-t border-line bg-canvas">
        <Frame className="flex flex-col gap-4 py-10 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <Logo className="text-ink" />
          <p className="max-w-[520px] md:text-right">
            Projeto acadêmico de Técnicas de Amostragem (STC 1079, UFSM). A Fração, seus clientes e os consumidores são
            fictícios. Municípios, população e PIB vêm do IBGE.
          </p>
        </Frame>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <Frame className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="Fração, página inicial">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] font-medium text-ink/80 md:flex">
          <a href="#como-funciona" className="hover:text-ink">
            Como funciona
          </a>
          <a href="#casos" className="hover:text-ink">
            Casos de uso
          </a>
          <a href="#privacidade" className="hover:text-ink">
            Privacidade
          </a>
        </nav>
        <div className="flex items-center gap-2 text-[14px] font-medium">
          <Link href="/app" className="rounded-md px-3 py-1.5 text-ink/80 hover:text-ink">
            Entrar
          </Link>
          <a href="#contato" className="hidden rounded-md bg-ink px-3.5 py-1.5 text-white hover:bg-ink/85 sm:inline-block">
            Falar com vendas
          </a>
        </div>
      </Frame>
    </header>
  );
}

/** Centered content column. */
function Frame({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1160px] px-4 sm:px-8">
      <div className={`relative ${className}`}>
        {children}
      </div>
    </div>
  );
}

function SectionTitle({ strong, soft }: { strong: string; soft: string }) {
  return (
    <h2 className="max-w-[720px] text-[30px] leading-[1.15] font-medium tracking-[-0.03em] sm:text-[36px]">
      {strong} <span className="text-slate/80">{soft}</span>
    </h2>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="bg-white p-8">
      <div className="tabular flex h-7 w-7 items-center justify-center rounded-full border border-line text-[13px] font-medium text-slate">
        {n}
      </div>
      <h3 className="mt-6 text-[17px] font-medium tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-slate">{body}</p>
    </div>
  );
}

function Card({ title, caption, className = "", children }: { title: string; caption: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-line bg-white p-6 ${className}`}>
      <h3 className="text-[17px] font-medium tracking-[-0.01em]">{title}</h3>
      <p className="mt-1 mb-6 text-[13px] text-muted">{caption}</p>
      {children}
    </div>
  );
}

function Bars({
  rows,
  format,
  marginFormat,
  max,
  color,
}: {
  rows: { label: string; value: number; margin: number }[];
  format: (v: number) => string;
  marginFormat: (v: number) => string;
  max: number;
  color: string;
}) {
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
            <span className="text-slate">{r.label}</span>
            <span className="tabular font-medium">
              {format(r.value)} <span className="font-normal text-muted">± {marginFormat(r.margin)}</span>
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-hairline">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
            {/* Confidence interval whisker */}
            <div
              className="absolute -inset-y-1 border-x-2 border-ink/50"
              style={{ left: `${((r.value - r.margin) / max) * 100}%`, width: `${((2 * r.margin) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FloatingCard({ label, value, note, className }: { label: string; value: string; note: string; className: string }) {
  return (
    <div className={`absolute z-10 rounded-lg border border-line bg-white/95 px-4 py-3 shadow-[0_12px_32px_-12px_rgba(11,31,51,0.25)] backdrop-blur ${className}`}>
      <div className="text-[12px] text-muted">{label}</div>
      <div className="tabular text-[20px] font-medium tracking-tight">{value}</div>
      <div className="text-[12px] text-slate">{note}</div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="tabular text-[34px] font-medium tracking-[-0.03em]">{value}</dd>
      <dd className="mt-1 text-[14px] text-white/60">{label}</dd>
    </div>
  );
}

function Dot() {
  return <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sample" aria-hidden />;
}
