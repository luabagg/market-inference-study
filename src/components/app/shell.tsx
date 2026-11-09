"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { STATE_NAME } from "@/data/geography";
import { ORGANIZATION } from "@/data/products";
import { STUDY } from "@/data/study-plan";

const NAV = [
  { href: "/app", label: "Resultados", icon: "M3 13h4v8H3zM10 8h4v13h-4zM17 3h4v18h-4z" },
  { href: "/app/mapa", label: "Onde estão os usuários", icon: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14" },
  { href: "/app/metodos", label: "Como sorteamos", icon: "M4 6h16M4 12h10M4 18h6" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <div className="border-b border-line bg-sample-soft px-4 py-2 text-center text-[12px] text-ink/80 sm:px-8">
            Demonstração com dados simulados. Empresas e usuários são fictícios; municípios e população vêm do IBGE.
          </div>
          <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="fixed right-3 bottom-3 z-40 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-lg lg:hidden"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "Fechar menu" : "Menu"}
      </button>
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center px-5">
          <Link href="/" aria-label="Voltar ao site">
            <Logo />
          </Link>
        </div>
        <OrganizationCard />
        <nav className="mt-4 space-y-0.5 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-[14px] font-medium transition ${active ? "bg-brand-soft text-brand-strong" : "text-slate hover:bg-canvas hover:text-ink"}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-line p-5 text-[12px] leading-relaxed text-muted">
          <Link href="/avancado" className="block font-medium text-ink hover:text-brand">
            Página da apresentação ›
          </Link>
          <Link href="/fontes" className="mb-3 block font-medium text-ink hover:text-brand">
            Fontes dos dados ›
          </Link>
          Motor estatístico:{" "}
          <code className="rounded bg-canvas px-1 py-0.5 font-mono text-[11px] text-ink">
            {process.env.NEXT_PUBLIC_MOTOR === "aluno" ? "aluno.ts" : "referencia.ts"}
          </code>
          <br />
          Troque em <code className="font-mono text-[11px]">src/estatistica/index.ts</code>
        </div>
      </aside>
    </>
  );
}

function OrganizationCard() {
  return (
    <div className="px-3">
      <div className="rounded-lg border border-ink/15 bg-canvas px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sample" />
          <span className="text-[14px] font-medium">{ORGANIZATION.name}</span>
        </div>
        <div className="mt-0.5 pl-4 text-[12px] text-muted">{STUDY.title}</div>
        <div className="pl-4 text-[12px] text-muted">Base: app Cestinha, {STATE_NAME}</div>
      </div>
    </div>
  );
}
