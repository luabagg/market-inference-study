import Link from "next/link";
import { AppListing } from "@/components/landing/app-listing";
import { HeroMap } from "@/components/landing/hero-map";
import { LiveCounter } from "@/components/landing/live-counter";
import { Logo } from "@/components/logo";
import { IBGE_YEARS } from "@/mundo/geography";
import { brl, compact, int, pct, pp } from "@/lib/format";
import { getLandingFacts } from "@/lib/landing-facts";

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
            <h1 className="text-[38px] leading-[1.08] font-medium tracking-[-0.035em] sm:text-[52px]">
              A gente cuida dos dados. Você cuida de vender.
            </h1>
            <p className="mt-6 max-w-[540px] text-[18px] leading-relaxed text-slate">
              {compact(facts.users)} famílias gaúchas montam a lista de compras no Cestinha, o nosso app. A Fração transforma essas
              listas em números sobre o seu consumidor: quem compra a sua marca, onde e quanto gasta.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="inline-flex h-11 items-center gap-1.5 rounded-md bg-ink px-5 text-[15px] font-medium text-white transition hover:bg-ink/85"
              >
                Ver a demonstração <span aria-hidden>›</span>
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
              value={`${int(facts.sampleSize)} famílias`}
              note="separadas por região e faixa de renda"
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

      {/* Numbers */}
      <section className="bg-ink text-white">
        <Frame className="py-16">
          <dl className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
            <Stat value={compact(facts.users)} label="famílias usando o app no RS" />
            <Stat value={compact(facts.lists)} label="listas de compras a cada três meses" />
            <Stat value={`${int(facts.cities)} de ${int(facts.stateCities)}`} label="cidades gaúchas com usuários" />
            <Stat value={`± ${pp(facts.typicalMargin)}`} label={`margem de erro com ${int(facts.sampleSize)} famílias`} />
          </dl>
        </Frame>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="border-b border-line bg-canvas scroll-mt-16">
        <Frame className="py-24">
          <SectionTitle strong="Como chega até você." soft="Sem questionário e sem entrevistador: os dados vêm do nosso app." />
          <div className="mt-14 grid items-start gap-10 lg:grid-cols-[1fr_1.05fr]">
            <AppListing downloads={`${compact(facts.downloads)}+`} users={compact(facts.users)} />
            <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              <Step
                n="1"
                title="A família monta a lista no Cestinha"
                body="Cada item vira um registro anônimo: produto, marca, quantidade e o mercado onde a família pretende comprar."
              />
              <Step
                n="2"
                title="Sorteamos quem entra na conta"
                body={`Para cada estudo, sorteamos cerca de ${int(facts.sampleSize)} famílias, separadas por região e faixa de renda, para que nenhum grupo fique de fora.`}
              />
              <Step
                n="3"
                title="Você recebe o número e a margem"
                body="Todo resultado vem com margem de erro. Assim dá para saber se a diferença entre duas regiões é real ou é só variação de amostra."
              />
            </ol>
          </div>
        </Frame>
      </section>

      {/* What you get */}
      <section id="dados" className="border-b border-line scroll-mt-16">
        <Frame className="py-24">
          <SectionTitle
            strong="O que a família planeja comprar, antes de entrar no mercado."
            soft="Você recebe percentuais e médias com margem de erro, nunca a lista de alguém. Exemplos da demonstração:"
          />
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            <Card title="Quem põe o café premium na lista" caption="Café Reserva, da Serra Azul, por renda da casa">
              <Bars rows={facts.premiumByIncome} max={0.7} color="var(--color-brand)" />
            </Card>
            <Card title="Onde a lista vai ser comprada" caption="Famílias com ao menos uma lista para cada tipo de loja">
              <Bars rows={facts.stores} max={1} color="var(--color-s6)" />
            </Card>
            <Card title="Como a família compra" caption="Média entre as famílias do app">
              <div className="space-y-6">
                <Figure value={brl(facts.ticket.estimativa)} margin={brl(facts.ticket.margem)} label="planejados por compra" />
                <Figure value={pct(facts.monthly.estimativa)} margin={pp(facts.monthly.margem)} label="fazem uma compra grande por mês" />
              </div>
            </Card>
          </div>
          <Link href="/app" className="mt-10 inline-flex items-center gap-1.5 text-[15px] font-medium text-brand hover:text-brand-strong">
            Ver o estudo completo da Serra Azul <span aria-hidden>›</span>
          </Link>
        </Frame>
      </section>

      {/* Limits and privacy */}
      <section id="limites" className="border-b border-line scroll-mt-16">
        <Frame className="grid gap-14 py-24 md:grid-cols-2">
          <div>
            <h3 className="text-[22px] font-medium tracking-[-0.02em]">Quem usa o app não é o estado inteiro.</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-slate">
              O Cestinha tem mais gente de Porto Alegre, das cidades ricas e jovem do que o Rio Grande do Sul. Mostramos esse perfil em
              todo estudo e, quando a pergunta é sobre o estado, ajustamos pelo Censo {IBGE_YEARS.census} do IBGE. O ajuste corrige o que
              vem de onde as pessoas moram. O que sobra, a gente diz no relatório.
            </p>
          </div>
          <div>
            <h3 className="text-[22px] font-medium tracking-[-0.02em]">Ninguém vê a lista de ninguém.</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-slate">
              Nenhuma lista individual sai da Fração. Os relatórios mostram números de grupos, e cada grupo publicado precisa ser grande
              o bastante para não identificar ninguém. Quem usa o Cestinha autoriza o uso anônimo no cadastro e pode sair quando quiser.
            </p>
          </div>
        </Frame>
      </section>

      {/* CTA */}
      <section id="contato" className="scroll-mt-16">
        <Frame className="flex flex-col items-start justify-between gap-8 py-20 md:flex-row md:items-center">
          <h2 className="max-w-[580px] text-[30px] leading-tight font-medium tracking-[-0.03em]">
            Veja um estudo pronto.{" "}
            <span className="text-slate/80">
              A Fração é um projeto acadêmico, então a demonstração faz o papel da conversa com vendas.
            </span>
          </h2>
          <Link
            href="/app"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-ink px-5 text-[15px] font-medium text-white transition hover:bg-ink/85"
          >
            Ver a demonstração <span aria-hidden>›</span>
          </Link>
        </Frame>
      </section>

      <footer className="border-t border-line bg-canvas">
        <Frame className="flex flex-col gap-4 py-10 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <Logo className="text-ink" />
          <p className="max-w-[520px] md:text-right">
            Projeto acadêmico de Técnicas de Amostragem (STC 1079, UFSM). A Fração, o Cestinha, seus clientes e usuários são fictícios.
            Municípios, população e PIB vêm do IBGE; mercados, do OpenStreetMap.{" "}
            <Link href="/fontes" className="underline hover:text-ink">
              Fontes
            </Link>{" "}
            ·{" "}
            <Link href="/avancado" className="underline hover:text-ink">
              Apresentação
            </Link>
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
            O app
          </a>
          <a href="#dados" className="hover:text-ink">
            O que você recebe
          </a>
          <a href="#limites" className="hover:text-ink">
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
      <div className={className}>{children}</div>
    </div>
  );
}

function SectionTitle({ strong, soft }: { strong: string; soft: string }) {
  return (
    <h2 className="max-w-[760px] text-[30px] leading-[1.15] font-medium tracking-[-0.03em] sm:text-[36px]">
      {strong} <span className="text-slate/80">{soft}</span>
    </h2>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="p-8">
      <div className="tabular flex h-7 w-7 items-center justify-center rounded-full border border-line text-[13px] font-medium text-slate">
        {n}
      </div>
      <h3 className="mt-6 text-[17px] font-medium tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-slate">{body}</p>
    </li>
  );
}

function Card({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <h3 className="text-[17px] font-medium tracking-[-0.01em]">{title}</h3>
      <p className="mt-1 mb-6 text-[13px] text-muted">{caption}</p>
      {children}
    </div>
  );
}

function Bars({ rows, max, color }: { rows: { label: string; value: number; margin: number }[]; max: number; color: string }) {
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-slate">{r.label}</span>
            <span className="tabular shrink-0 font-medium">
              {pct(r.value)} <span className="font-normal text-muted">± {pp(r.margin)}</span>
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-hairline">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Figure({ value, margin, label }: { value: string; margin: string; label: string }) {
  return (
    <div>
      <div className="tabular text-[30px] font-medium tracking-[-0.03em]">
        {value} <span className="text-[14px] font-normal text-muted">± {margin}</span>
      </div>
      <div className="text-[14px] text-slate">{label}</div>
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
      <dd className="tabular text-[32px] font-medium tracking-[-0.03em]">{value}</dd>
      <dd className="mt-1 text-[14px] text-white/60">{label}</dd>
    </div>
  );
}
