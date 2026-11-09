/**
 * Every repetition's estimate as one dot on a shared axis, with the true value
 * as a line. Tighter cloud = smaller error. Pass the same domain to strips that
 * should be compared.
 */
export function SpreadStrip({
  estimates,
  truth,
  domain,
  color = "var(--color-brand)",
  format,
}: {
  estimates: number[];
  truth: number;
  domain: [number, number];
  color?: string;
  format: (v: number) => string;
}) {
  const x = (v: number) => `${((v - domain[0]) / (domain[1] - domain[0])) * 100}%`;
  return (
    <div>
      <div className="relative h-12 rounded bg-canvas" role="img" aria-label="Estimativas das amostras repetidas">
        {estimates.map((e, i) => (
          // Deterministic vertical jitter so dots with close values stay visible.
          <span
            key={i}
            className="absolute h-1.5 w-1.5 -translate-x-1/2 rounded-full opacity-50"
            style={{ left: x(e), top: `${12 + ((i * 7919) % 70)}%`, background: color }}
          />
        ))}
        <span className="absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-ink" style={{ left: x(truth) }} />
      </div>
      <div className="tabular mt-1 flex justify-between text-[11px] text-muted">
        <span>{format(domain[0])}</span>
        <span className="text-ink">valor real {format(truth)}</span>
        <span>{format(domain[1])}</span>
      </div>
    </div>
  );
}

/** Shared domain for several sets of estimates, padded a little on each side. */
export const spreadDomain = (sets: number[][], truth: number): [number, number] => {
  const reach = Math.max(...sets.flat().map((e) => Math.abs(e - truth)));
  return [truth - reach * 1.05, truth + reach * 1.05];
};
