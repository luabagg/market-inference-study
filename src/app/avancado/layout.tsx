import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Apresentação · Fração" };

const SECTIONS = [
  ["dados", "Dados"],
  ["aas", "AAS"],
  ["aes", "Estratificada"],
  ["as", "Sistemática"],
  ["ht", "Horvitz–Thompson"],
  ["comparacao", "Comparação"],
  ["vies", "Viés"],
  ["laboratorio", "Laboratório"],
];

export default function AdvancedLayout({ children }: LayoutProps<"/avancado">) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-4 sm:px-8">
          <Link href="/" aria-label="Fração, página inicial" className="shrink-0">
            <Logo />
          </Link>
          <nav className="flex min-w-0 flex-1 gap-4 overflow-x-auto text-[13px] font-medium whitespace-nowrap text-slate">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="hover:text-ink">
                {label}
              </a>
            ))}
            <Link href="/fontes" className="hover:text-ink">
              Fontes
            </Link>
          </nav>
          <Link href="/app" className="hidden shrink-0 text-[13px] font-medium text-brand hover:text-brand-strong sm:block">
            Ver a demonstração ›
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-12 sm:px-8 sm:py-16">
        <h1 className="max-w-[760px] text-[34px] leading-[1.1] font-medium tracking-[-0.035em] sm:text-[42px]">
          Como a Fração sorteia.{" "}
          <span className="text-slate/75">Os métodos de Técnicas de Amostragem aplicados à base do Cestinha, um de cada vez.</span>
        </h1>
        <div className="mt-16">{children}</div>
      </main>
    </div>
  );
}
