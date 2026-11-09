/**
 * A generic app-store listing for Cestinha, the fictional shopping-list app
 * behind Fração's data. Deliberately not styled after any real store.
 */
export function AppListing({ downloads, users }: { downloads: string; users: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_30px_60px_-30px_rgba(11,31,51,0.35)] sm:p-6">
      <div className="flex items-center gap-4">
        <CestinhaIcon />
        <div className="min-w-0">
          <div className="text-[18px] font-medium tracking-[-0.01em]">Cestinha: lista de compras</div>
          <div className="text-[13px] text-brand">Fração Dados</div>
          <div className="text-[12px] text-muted">Compras · Sem anúncios</div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 divide-x divide-line text-center">
        <div>
          <dd className="text-[15px] font-medium">4,7 ★</dd>
          <dt className="text-[11px] text-muted">3,1 mil avaliações</dt>
        </div>
        <div>
          <dd className="text-[15px] font-medium">{downloads}</dd>
          <dt className="text-[11px] text-muted">downloads</dt>
        </div>
        <div>
          <dd className="text-[15px] font-medium">{users}</dd>
          <dt className="text-[11px] text-muted">famílias ativas</dt>
        </div>
      </dl>

      <div className="mt-5 flex h-10 items-center justify-center rounded-full bg-brand text-[14px] font-medium text-white">Instalar</div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Screen title="Compra do mês" footer="R$ 412 · Atacarejo, 2,1 km">
          <Item done label="Arroz 5 kg" qty="2" />
          <Item done label="Café 500 g" qty="2" />
          <Item label="Óleo 900 ml" qty="3" />
          <Item label="Sabão em pó" qty="1" />
          <Item label="Leite 1 L" qty="12" />
        </Screen>
        <Screen title="Mercados perto" footer="Preço estimado da lista">
          <Store name="Atacarejo" detail="2,1 km · R$ 412" best />
          <Store name="Supermercado" detail="0,8 km · R$ 447" />
          <Store name="Mercadinho" detail="0,3 km · R$ 468" />
        </Screen>
        <Screen title="Seu mês" footer="3 listas em outubro">
          <div className="flex h-[74px] items-end gap-1.5 px-1">
            {[40, 64, 30, 88, 52, 70].map((h, i) => (
              <span key={i} className="flex-1 rounded-sm bg-brand/70" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="mt-2 text-[8px] text-muted">Gasto planejado por semana</div>
        </Screen>
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-slate">
        Monte a lista em família, veja o mercado mais em conta perto de casa e acompanhe quanto vai gastar no mês. Grátis.
      </p>
    </div>
  );
}

function CestinhaIcon() {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand" aria-hidden>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10h16l-1.6 9.2a1.5 1.5 0 0 1-1.5 1.3H7.1a1.5 1.5 0 0 1-1.5-1.3L4 10z" />
        <path d="M8 10 11 4M16 10l-3-6M9 14v3M12 14v3M15 14v3" />
      </svg>
    </span>
  );
}

function Screen({ title, footer, children }: { title: string; footer: string; children: React.ReactNode }) {
  return (
    <div className="flex aspect-[9/16] flex-col rounded-xl border border-line bg-canvas p-2">
      <div className="mx-auto mb-2 h-1 w-6 rounded-full bg-line" />
      <div className="mb-1.5 truncate text-[10px] font-medium">{title}</div>
      <div className="min-h-0 flex-1 space-y-1 overflow-hidden">{children}</div>
      <div className="mt-1.5 truncate border-t border-line pt-1 text-[8px] text-slate">{footer}</div>
    </div>
  );
}

function Item({ label, qty, done = false }: { label: string; qty: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-1 rounded bg-white px-1 py-0.5 text-[8px]">
      <span className={`h-2 w-2 shrink-0 rounded-sm border ${done ? "border-brand bg-brand" : "border-line"}`} />
      <span className={`flex-1 truncate ${done ? "text-muted line-through" : ""}`}>{label}</span>
      <span className="text-muted">{qty}</span>
    </div>
  );
}

function Store({ name, detail, best = false }: { name: string; detail: string; best?: boolean }) {
  return (
    <div className={`rounded px-1.5 py-1 text-[8px] ${best ? "bg-brand-soft" : "bg-white"}`}>
      <div className="truncate font-medium">{name}</div>
      <div className="truncate text-muted">{detail}</div>
    </div>
  );
}
