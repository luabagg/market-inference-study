"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { PROFILES } from "@/data/profiles";
import { useProfile } from "./profile-context";

const NAV = [
  { href: "/app", label: "Painel do estudo", icon: "M3 13h4v8H3zM10 8h4v13h-4zM17 3h4v18h-4z" },
  { href: "/app/mapa", label: "Mapa da amostra", icon: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <div className="border-b border-line bg-sample-soft px-4 py-2 text-center text-[12px] text-ink/80 sm:px-8">
            Demonstração com dados sintéticos. Empresas e consumidores são fictícios; municípios e população vêm do IBGE.
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
        <ProfileSwitcher onPick={() => setOpen(false)} />
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

function ProfileSwitcher({ onPick }: { onPick: () => void }) {
  const { profile, setProfile } = useProfile();
  return (
    <div className="px-3">
      <div className="px-2 pb-2 text-[11px] font-medium tracking-wide text-muted uppercase">Cliente</div>
      <div className="space-y-1" role="radiogroup" aria-label="Cliente da demonstração">
        {PROFILES.map((p) => {
          const active = p.id === profile.id;
          return (
            <button
              key={p.id}
              role="radio"
              aria-checked={active}
              onClick={() => {
                setProfile(p.id);
                onPick();
              }}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${active ? "border-ink/15 bg-canvas shadow-[0_1px_0_rgba(11,31,51,0.04)]" : "border-transparent hover:bg-canvas"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${active ? "bg-sample" : "bg-line"}`} />
                <span className="text-[14px] font-medium">{p.name}</span>
              </div>
              <div className="mt-0.5 pl-4 text-[12px] text-muted">{p.segment}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
