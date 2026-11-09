const intFormat = new Intl.NumberFormat("pt-BR");
const brlFormat = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const int = (n: number) => intFormat.format(Math.round(n));
export const brl = (n: number) => brlFormat.format(n);
export const brlExact = (n: number) => brlCents.format(n);
export const pct = (p: number, digits = 1) => `${(p * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
/** Margin of a proportion in percentage points. */
export const pp = (p: number, digits = 1) => `${(p * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })} p.p.`;
export const num = (n: number, digits = 2) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const compact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
    : n >= 1000
      ? `${Math.round(n / 1000).toLocaleString("pt-BR")} mil`
      : int(n);
