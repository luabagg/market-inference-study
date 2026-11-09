"use client";

export function Panel({
  title,
  caption,
  action,
  className = "",
  children,
}: {
  title: string;
  caption?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-white ${className}`}>
      <header className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.01em]">{title}</h2>
          {caption && <p className="mt-0.5 text-[13px] text-muted">{caption}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-line bg-white p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${o.value === value ? "bg-ink text-white" : "text-slate hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-slate">{label}</span>
      {children}
    </label>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-[14px] text-ink outline-none focus:border-brand"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-brand" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      {label}
    </label>
  );
}

export type BarRow = { label: string; value: number; low: number; high: number; truth?: number };

/** Horizontal bars with confidence-interval whiskers and an optional true-value marker. */
export function EstimateBars({
  rows,
  format,
  max,
  color = "var(--color-brand)",
  showTruth = false,
}: {
  rows: BarRow[];
  format: (v: number) => string;
  max: number;
  color?: string;
  showTruth?: boolean;
}) {
  const x = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-slate">{r.label}</span>
            <span className="tabular shrink-0 font-medium">
              {format(r.value)}{" "}
              <span className="font-normal text-muted">
                [{format(r.low)}; {format(r.high)}]
              </span>
            </span>
          </div>
          <div className="relative h-3 rounded-sm bg-hairline">
            <div className="absolute inset-y-0 left-0 rounded-sm opacity-85" style={{ width: x(r.value), background: color }} />
            <div
              className="absolute top-1/2 h-px bg-ink/70"
              style={{ left: x(r.low), width: `calc(${x(r.high)} - ${x(r.low)})` }}
            />
            <div className="absolute -inset-y-1 w-px bg-ink/70" style={{ left: x(r.low) }} />
            <div className="absolute -inset-y-1 w-px bg-ink/70" style={{ left: x(r.high) }} />
            {showTruth && r.truth !== undefined && (
              <div
                className="absolute -inset-y-1.5 w-[3px] -translate-x-1/2 rounded-full bg-sample"
                style={{ left: x(r.truth) }}
                title={`Valor real na base: ${format(r.truth)}`}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
