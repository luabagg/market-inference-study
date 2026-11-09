import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ASSUMPTIONS, DATA_SOURCES, MARKET_SOURCES, METHOD_SOURCES, type Source } from "@/mundo/sources";

export const metadata: Metadata = { title: "Fontes · Fração" };

export default function SourcesPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-[960px] items-center justify-between px-4 sm:px-8">
          <Link href="/" aria-label="Fração, página inicial">
            <Logo />
          </Link>
          <nav className="flex gap-5 text-[13px] font-medium text-slate">
            <Link href="/app" className="hover:text-ink">
              Demonstração
            </Link>
            <Link href="/avancado" className="hover:text-ink">
              Apresentação
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[960px] px-4 py-12 sm:px-8 sm:py-16">
        <h1 className="text-[34px] leading-tight font-medium tracking-[-0.035em]">
          Fontes. <span className="text-slate/75">De onde vem cada dado do projeto, e o que é inventado.</span>
        </h1>

        <Group title="Dados públicos" sources={DATA_SOURCES} />
        <Group title="Método" sources={METHOD_SOURCES} />
        <Group title="Mercado e concorrentes" sources={MARKET_SOURCES} />

        <section className="mt-14">
          <h2 className="text-[20px] font-medium tracking-[-0.02em]">O que não é dado</h2>
          <p className="mt-2 max-w-[680px] text-[14px] leading-relaxed text-slate">
            A base de usuários é simulada. Tudo abaixo é suposição do projeto, escrita no código para poder ser lida e trocada.
          </p>
          <ul className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {ASSUMPTIONS.map((a) => (
              <li key={a.what} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="text-[14px]">{a.what}</span>
                <code className="shrink-0 font-mono text-[12px] text-muted">{a.where}</code>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function Group({ title, sources }: { title: string; sources: Source[] }) {
  return (
    <section className="mt-14">
      <h2 className="text-[20px] font-medium tracking-[-0.02em]">{title}</h2>
      <ul className="mt-5 space-y-3">
        {sources.map((s) => (
          <li key={s.name} className="rounded-xl border border-line bg-white px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-[15px] font-medium">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-brand">
                    {s.name} ↗
                  </a>
                ) : (
                  s.name
                )}
              </h3>
              <span className="text-[13px] text-muted">{s.publisher}</span>
            </div>
            <p className="mt-0.5 text-[13px] text-muted">
              {s.detail}
              {s.license && ` · ${s.license}`}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-slate">{s.usedFor}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
