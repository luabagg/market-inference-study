/** Fração mark: a 3×3 grid where three dots are "sampled". */
export function Logo({ className = "" }: { className?: string }) {
  const sampled = new Set([1, 3, 8]);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => (
          <circle
            key={i}
            cx={3 + (i % 3) * 7}
            cy={3 + Math.floor(i / 3) * 7}
            r={2.4}
            fill={sampled.has(i) ? "var(--color-sample)" : "var(--color-ink)"}
            opacity={sampled.has(i) ? 1 : 0.85}
          />
        ))}
      </svg>
      <span className="text-[19px] font-semibold tracking-[-0.03em]">fração</span>
    </span>
  );
}
