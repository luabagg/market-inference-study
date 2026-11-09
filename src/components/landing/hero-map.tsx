"use client";

import { geoMercator } from "d3-geo";
import { useEffect, useRef } from "react";
import dots from "@/data/ibge/brazil-dots.json";

type Pulse = { dot: number; born: number };

const WAVE_EVERY_MS = 1400;
const PULSE_LIFE_MS = 4200;
const PER_WAVE = 14;

// Population-weighted cumulative table, so pulses land where people live.
const cumulative = (() => {
  const table = new Float64Array(dots.length);
  dots.reduce((acc, [, , pop], i) => (table[i] = acc + Math.sqrt(pop) + 40), 0);
  return table;
})();

const pickDot = () => {
  const target = Math.random() * cumulative[cumulative.length - 1];
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

/**
 * Brazil drawn as a dot grid (one dot per ~45 km cell, shade = population from
 * IBGE). Every wave "samples" a handful of cells: they light up and fade.
 */
export function HeroMap({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d")!;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let points: [number, number][] = [];
    let size = { width: 0, height: 0 };
    const pulses: Pulse[] = [];
    let lastWave = -Infinity;
    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      size = { width: rect.width, height: rect.height };
      const projection = geoMercator().fitExtent(
        [
          [8, 8],
          [rect.width - 8, rect.height - 8],
        ],
        { type: "MultiPoint", coordinates: dots.map(([lon, lat]) => [lon, lat]) },
      );
      points = dots.map(([lon, lat]) => projection([lon, lat])!);
    };

    const logs = dots.filter((d) => d[2] > 0).map((d) => Math.log(d[2]));
    const minLog = Math.min(...logs);
    const maxLog = Math.max(...logs);

    const draw = (now: number) => {
      context.clearRect(0, 0, size.width, size.height);
      const cell = Math.max(1.8, size.width / 190);
      dots.forEach(([, , pop], i) => {
        // Empty cells stay light grey; populated cells go from slate to brand green.
        const t = pop > 0 ? (Math.log(pop) - minLog) / (maxLog - minLog) : 0;
        context.fillStyle =
          pop > 0
            ? `rgb(${Math.round(160 - 150 * t)}, ${Math.round(174 - 50 * t)}, ${Math.round(190 - 100 * t)})`
            : "#d5dde6";
        context.beginPath();
        context.arc(points[i][0], points[i][1], cell / 2, 0, Math.PI * 2);
        context.fill();
      });

      if (!reduceMotion && now - lastWave > WAVE_EVERY_MS) {
        lastWave = now;
        for (let k = 0; k < PER_WAVE; k++) pulses.push({ dot: pickDot(), born: now + k * 60 });
      }
      while (pulses.length && now - pulses[0].born > PULSE_LIFE_MS) pulses.shift();

      pulses.forEach(({ dot, born }) => {
        const age = (now - born) / PULSE_LIFE_MS;
        if (age < 0) return;
        const [x, y] = points[dot];
        const fade = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
        context.fillStyle = `rgba(255, 107, 53, ${fade})`;
        context.beginPath();
        context.arc(x, y, cell * 1.25, 0, Math.PI * 2);
        context.fill();
        if (age < 0.5) {
          context.strokeStyle = `rgba(255, 107, 53, ${0.5 * (1 - age / 0.5)})`;
          context.lineWidth = 1;
          context.beginPath();
          context.arc(x, y, cell * (1.5 + age * 14), 0, Math.PI * 2);
          context.stroke();
        }
      });

      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-label="Mapa do Brasil em pontos, com amostras sendo sorteadas" role="img" />;
}
