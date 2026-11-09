"use client";

import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Histogram of estimates from repeated samples, with the true parameter marked. */
export function RepetitionChart({
  estimates,
  truth,
  format,
}: {
  estimates: number[];
  truth: number;
  format: (v: number) => string;
}) {
  const BINS = 28;
  const min = Math.min(...estimates, truth);
  const max = Math.max(...estimates, truth);
  const width = (max - min) / BINS || 1;
  const bins = Array.from({ length: BINS }, (_, i) => ({ x: min + (i + 0.5) * width, count: 0 }));
  estimates.forEach((e) => bins[Math.min(BINS - 1, Math.floor((e - min) / width))].count++);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={bins} margin={{ top: 16, right: 8, bottom: 0, left: -24 }} barCategoryGap={1}>
        <XAxis
          dataKey="x"
          type="number"
          domain={[min, max]}
          tickFormatter={format}
          tick={{ fontSize: 11, fill: "#6b7c93" }}
          tickCount={5}
          axisLine={{ stroke: "#e3e8ee" }}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: "#6b7c93" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "#f6f9fc" }}
          formatter={(value) => [value, "amostras"]}
          labelFormatter={(label) => `≈ ${format(Number(label))}`}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e3e8ee" }}
        />
        <Bar dataKey="count" fill="#2f6fde" fillOpacity={0.75} isAnimationActive={false} />
        <ReferenceLine x={truth} stroke="#ff6b35" strokeWidth={2} label={{ value: "valor real", position: "top", fontSize: 11, fill: "#ff6b35" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
