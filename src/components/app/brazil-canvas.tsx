"use client";

import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { MUNICIPALITIES, type Municipality } from "@/mundo/geography";
import type { Consumer } from "@/mundo/population";
import { STORE_TYPES, STORES, type StoreType } from "@/mundo/stores";
import { brl, int, pct } from "@/lib/format";

export const STRATUM_COLORS = ["#0a7c5a", "#2f6fde", "#e2873a", "#9a4fc4", "#d64575", "#1f9fb4", "#a07a10", "#5b6b7f"];

export type SampledPoint = { unit: number; stratum: number; weight: number };
export type Basemap = "renda" | "agro" | "rural" | "nenhum";

export const STORE_COLORS: Record<StoreType, string> = { atacarejo: "#b4441b", supermercado: "#0b1f33", mercadinho: "#7a8aa0" };

type Mesh = Topology<{ [name: string]: GeometryCollection<{ codarea: string }> }>;
/** screen = base · k + (x, y), where base is the fitted projection. */
type Zoom = { k: number; x: number; y: number };
type View = { width: number; height: number; projection: GeoProjection };
type MunicipalityShape = { code: number; path: Path2D; bounds: [[number, number], [number, number]] };

const IDENTITY: Zoom = { k: 1, x: 0, y: 0 };
const MAX_ZOOM = 80;
const ANIMATION_MS = 450;

const MUNICIPALITY_BY_CODE = new Map(MUNICIPALITIES.map((m, i) => [m.code, i]));

// Choropleth backgrounds from IBGE data, in municipal quintiles.
const METRICS: Record<Exclude<Basemap, "nenhum">, { label: string; value: (m: Municipality) => number; format: (v: number) => string; fills: string[] }> = {
  renda: { label: "PIB per capita", value: (m) => m.gdpPerCapita, format: (v) => brl(v), fills: ["#f3f6f9", "#e6edf3", "#d4e0ea", "#bccfdd", "#9fb8cc"] },
  agro: { label: "Peso da agropecuária no PIB", value: (m) => m.agroShare, format: (v) => pct(v, 0), fills: ["#f6f7f1", "#eaeedb", "#d9e2bd", "#c3d29a", "#a8bd74"] },
  rural: { label: "População rural", value: (m) => m.ruralShare, format: (v) => pct(v, 0), fills: ["#f8f5f1", "#efe6da", "#e3d3bd", "#d4bc9b", "#c1a179"] },
};
const NO_FILL = "#f3f6f9";

const breaksOf = (basemap: Exclude<Basemap, "nenhum">) => {
  const sorted = MUNICIPALITIES.map(METRICS[basemap].value).sort((a, b) => a - b);
  return [0.2, 0.4, 0.6, 0.8].map((q) => sorted[Math.floor(q * sorted.length)]);
};
const BREAKS = Object.fromEntries(Object.keys(METRICS).map((k) => [k, breaksOf(k as Exclude<Basemap, "nenhum">)])) as Record<Exclude<Basemap, "nenhum">, number[]>;

const fillFor = (basemap: Basemap, code: number) => {
  const index = MUNICIPALITY_BY_CODE.get(code);
  if (basemap === "nenhum" || index === undefined) return NO_FILL;
  const value = METRICS[basemap].value(MUNICIPALITIES[index]);
  return METRICS[basemap].fills[BREAKS[basemap].filter((b) => value >= b).length];
};

export const BASEMAP_LABELS: Record<Basemap, string> = {
  renda: "PIB per capita",
  agro: "Agropecuária",
  rural: "População rural",
  nenhum: "Sem fundo",
};

/** Legend rows for a background: color and the value range of each quintile. */
export const basemapLegend = (basemap: Basemap) => {
  if (basemap === "nenhum") return null;
  const metric = METRICS[basemap];
  const breaks = BREAKS[basemap];
  return {
    title: metric.label,
    rows: metric.fills.map((color, i) => ({
      color,
      label: i === 0 ? `até ${metric.format(breaks[0])}` : i === 4 ? `${metric.format(breaks[3])} ou mais` : `${metric.format(breaks[i - 1])} a ${metric.format(breaks[i])}`,
    })),
  };
};

// Borders between IBGE intermediate regions are drawn thicker than municipal ones.
const regionOf = (geometry: { properties?: unknown }) => {
  const index = MUNICIPALITY_BY_CODE.get(Number((geometry.properties as { codarea: string }).codarea));
  return index === undefined ? "" : MUNICIPALITIES[index].region;
};

let meshPromise: Promise<Mesh> | undefined;
const loadMesh = () => (meshPromise ??= fetch("/geo/rs-municipios.topo.json").then((r) => r.json() as Promise<Mesh>));

const clampZoom = (zoom: Zoom, view: View): Zoom => {
  const k = Math.min(MAX_ZOOM, Math.max(1, zoom.k));
  // Keep at least part of the map on screen while panning.
  const x = Math.min(view.width * 0.5, Math.max(view.width * 0.5 - view.width * k, zoom.x));
  const y = Math.min(view.height * 0.5, Math.max(view.height * 0.5 - view.height * k, zoom.y));
  return k === 1 ? IDENTITY : { k, x, y };
};

/** Zoom that keeps the base point under (sx, sy) fixed while scaling to k. */
const zoomAround = (zoom: Zoom, k: number, sx: number, sy: number): Zoom => {
  const bx = (sx - zoom.x) / zoom.k;
  const by = (sy - zoom.y) / zoom.k;
  return { k, x: sx - bx * k, y: sy - by * k };
};

/**
 * IBGE municipal mesh on a canvas, with the frame as faint dots and the sample
 * on top. Sampled dot area grows with the HT weight w = 1/π. Click a
 * municipality to zoom into it; scroll to zoom, drag to pan.
 */
export function BrazilCanvas({
  units,
  sample,
  basemap,
  showStores,
  onHover,
  sampleColor,
}: {
  units: Consumer[];
  sample: SampledPoint[];
  basemap: Basemap;
  showStores: boolean;
  onHover: (hit: { point: SampledPoint; x: number; y: number } | null) => void;
  /** One color and one size for every sampled dot, instead of stratum colors and weight-sized dots. */
  sampleColor?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<HTMLCanvasElement>(null);
  const [topology, setTopology] = useState<Mesh | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [zoom, setZoom] = useState<Zoom>(IDENTITY);
  const [focus, setFocus] = useState<number | null>(null);
  const [hoveredStore, setHoveredStore] = useState<{ index: number; x: number; y: number } | null>(null);
  // Event handlers and animation frames read the latest zoom from here, not from a stale closure.
  const zoomRef = useRef(zoom);
  const animationRef = useRef(0);
  const applyZoom = (next: Zoom) => {
    zoomRef.current = next;
    setZoom(next);
  };
  const dragRef = useRef<{ startX: number; startY: number; zoom: Zoom; moved: boolean } | null>(null);

  useEffect(() => {
    loadMesh().then(setTopology);
  }, []);

  const shapes = useMemo(() => {
    if (!topology) return null;
    const municipalities = topology.objects[Object.keys(topology.objects)[0]];
    return {
      municipalities: feature(topology, municipalities),
      regions: mesh(topology, municipalities, (a, b) => regionOf(a) !== regionOf(b)),
      outline: mesh(topology, municipalities, (a, b) => a === b),
    };
  }, [topology]);

  // Fit the projection to the container and keep it in sync on resize.
  useEffect(() => {
    if (!shapes) return;
    const wrapper = wrapperRef.current!;
    const observer = new ResizeObserver(() => {
      const { width, height } = wrapper.getBoundingClientRect();
      const projection = geoMercator().fitExtent(
        [
          [12, 12],
          [width - 12, height - 12],
        ],
        shapes.municipalities,
      );
      setView({ width, height, projection });
      applyZoom(IDENTITY);
      setFocus(null);
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [shapes]);

  // Paths in base (unzoomed) coordinates, built once per size so zooming only re-fills them.
  const paths = useMemo(() => {
    if (!view || !shapes) return null;
    const toPath = geoPath(view.projection);
    const municipalities: MunicipalityShape[] = shapes.municipalities.features.map((f) => {
      const code = Number(f.properties.codarea);
      return { code, path: new Path2D(toPath(f) ?? ""), bounds: toPath.bounds(f) };
    });
    return {
      municipalities,
      regions: new Path2D(toPath(shapes.regions) ?? ""),
      outline: new Path2D(toPath(shapes.outline) ?? ""),
    };
  }, [view, shapes]);

  const projected = useMemo(() => (view ? units.map((c) => view.projection([c.lon, c.lat])!) : []), [units, view]);
  const projectedStores = useMemo(() => (view ? STORES.map((s) => view.projection([s.lon, s.lat])!) : []), [view]);
  const toScreen = (i: number) => [projected[i][0] * zoom.k + zoom.x, projected[i][1] * zoom.k + zoom.y] as const;

  // Base layer: municipalities, borders, and the whole frame.
  useEffect(() => {
    if (!view || !paths) return;
    const ratio = window.devicePixelRatio || 1;
    const context = prepareCanvas(baseRef.current!, view);
    context.setTransform(ratio * zoom.k, 0, 0, ratio * zoom.k, ratio * zoom.x, ratio * zoom.y);
    paths.municipalities.forEach((m) => {
      context.fillStyle = fillFor(basemap, m.code);
      context.fill(m.path);
    });
    // Municipal borders only help once the map is zoomed in.
    if (zoom.k > 3) {
      context.strokeStyle = "rgba(255, 255, 255, 0.9)";
      context.lineWidth = 0.6 / zoom.k;
      paths.municipalities.forEach((m) => context.stroke(m.path));
    }
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.2 / zoom.k;
    context.stroke(paths.regions);
    context.strokeStyle = "#9fb0c2";
    context.lineWidth = 0.8 / zoom.k;
    context.stroke(paths.outline);
    const focused = paths.municipalities.find((m) => m.code === focus);
    if (focused) {
      context.strokeStyle = "#0b1f33";
      context.lineWidth = 1.6 / zoom.k;
      context.stroke(focused.path);
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "rgba(11, 31, 51, 0.16)";
    const size = 1 + Math.log2(zoom.k) * 0.6;
    projected.forEach(([bx, by]) => {
      const x = bx * zoom.k + zoom.x;
      const y = by * zoom.k + zoom.y;
      if (x < 0 || y < 0 || x > view.width || y > view.height) return;
      context.fillRect(x - size / 2, y - size / 2, size, size);
    });
  }, [view, paths, projected, basemap, zoom, focus]);

  // Sample layer.
  useEffect(() => {
    if (!view) return;
    const context = prepareCanvas(dotsRef.current!, view);
    const minWeight = Math.min(...sample.map((s) => s.weight));
    const grow = 1 + 0.3 * Math.log2(zoom.k);
    sample.forEach((s) => {
      const x = projected[s.unit][0] * zoom.k + zoom.x;
      const y = projected[s.unit][1] * zoom.k + zoom.y;
      if (x < -20 || y < -20 || x > view.width + 20 || y > view.height + 20) return;
      context.beginPath();
      const radius = sampleColor ? 2.6 : Math.min(2.6 * Math.sqrt(s.weight / minWeight), 10);
      context.arc(x, y, Math.min(radius * grow, 14), 0, Math.PI * 2);
      context.fillStyle = sampleColor ?? STRATUM_COLORS[s.stratum % STRATUM_COLORS.length];
      context.globalAlpha = 0.8;
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = "#ffffff";
      context.lineWidth = 0.6;
      context.stroke();
    });
    if (showStores) {
      const size = 3 + Math.log2(zoom.k) * 0.9;
      projectedStores.forEach(([bx, by], i) => {
        const x = bx * zoom.k + zoom.x;
        const y = by * zoom.k + zoom.y;
        if (x < 0 || y < 0 || x > view.width || y > view.height) return;
        context.fillStyle = STORE_COLORS[STORES[i].type];
        context.strokeStyle = "#ffffff";
        context.lineWidth = 0.8;
        context.fillRect(x - size / 2, y - size / 2, size, size);
        context.strokeRect(x - size / 2, y - size / 2, size, size);
      });
    }
  }, [view, sample, projected, zoom, showStores, projectedStores, sampleColor]);

  const animateTo = (target: Zoom) => {
    if (!view) return;
    cancelAnimationFrame(animationRef.current);
    const from = zoomRef.current;
    const to = clampZoom(target, view);
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / ANIMATION_MS);
      const ease = 1 - (1 - t) ** 3;
      // Interpolate scale geometrically so zooming feels even at every level.
      const k = from.k * (to.k / from.k) ** ease;
      // Keep the screen point that maps to the target center moving smoothly.
      const centerFrom = { x: (view.width / 2 - from.x) / from.k, y: (view.height / 2 - from.y) / from.k };
      const centerTo = { x: (view.width / 2 - to.x) / to.k, y: (view.height / 2 - to.y) / to.k };
      const cx = centerFrom.x + (centerTo.x - centerFrom.x) * ease;
      const cy = centerFrom.y + (centerTo.y - centerFrom.y) * ease;
      applyZoom(t === 1 ? to : { k, x: view.width / 2 - cx * k, y: view.height / 2 - cy * k });
      if (t < 1) animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
  };

  const zoomToMunicipality = (shape: MunicipalityShape) => {
    if (!view) return;
    const [[x0, y0], [x1, y1]] = shape.bounds;
    const k = Math.min(MAX_ZOOM, 0.55 / Math.max((x1 - x0) / view.width, (y1 - y0) / view.height));
    setFocus(shape.code);
    animateTo({ k, x: view.width / 2 - ((x0 + x1) / 2) * k, y: view.height / 2 - ((y0 + y1) / 2) * k });
  };

  const reset = () => {
    setFocus(null);
    animateTo(IDENTITY);
  };

  const zoomBy = (factor: number) => {
    if (!view) return;
    const current = zoomRef.current;
    animateTo(zoomAround(current, current.k * factor, view.width / 2, view.height / 2));
  };

  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !view) return;
    const onWheel = (event: WheelEvent) => {
      const current = zoomRef.current;
      // At full view, scrolling down keeps scrolling the page.
      if (current.k === 1 && event.deltaY > 0) return;
      event.preventDefault();
      cancelAnimationFrame(animationRef.current);
      const rect = wrapper.getBoundingClientRect();
      const k = current.k * Math.exp(-event.deltaY * 0.0025);
      applyZoom(clampZoom(zoomAround(current, k, event.clientX - rect.left, event.clientY - rect.top), view));
    };
    wrapper.addEventListener("wheel", onWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", onWheel);
  }, [view]);

  const pointer = (event: React.PointerEvent) => {
    const rect = wrapperRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    const { x, y } = pointer(event);
    dragRef.current = { startX: x, startY: y, zoom: zoomRef.current, moved: false };
    wrapperRef.current!.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const { x, y } = pointer(event);
    const drag = dragRef.current;
    if (drag && view) {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved && drag.zoom.k > 1) {
        cancelAnimationFrame(animationRef.current);
        applyZoom(clampZoom({ ...drag.zoom, x: drag.zoom.x + dx, y: drag.zoom.y + dy }, view));
        onHover(null);
        return;
      }
    }
    let best: SampledPoint | null = null;
    let bestDistance = 64;
    sample.forEach((s) => {
      const [sx, sy] = toScreen(s.unit);
      const distance = (sx - x) ** 2 + (sy - y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = s;
      }
    });
    onHover(best ? { point: best, x, y } : null);
    if (best || !showStores) return setHoveredStore(null);
    let bestStore = -1;
    let bestStoreDistance = 49;
    projectedStores.forEach(([bx, by], i) => {
      const distance = (bx * zoom.k + zoom.x - x) ** 2 + (by * zoom.k + zoom.y - y) ** 2;
      if (distance < bestStoreDistance) {
        bestStoreDistance = distance;
        bestStore = i;
      }
    });
    setHoveredStore(bestStore >= 0 ? { index: bestStore, x, y } : null);
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved || !paths) return;
    const { x, y } = pointer(event);
    const bx = (x - zoom.x) / zoom.k;
    const by = (y - zoom.y) / zoom.k;
    const hit = paths.municipalities.find(
      (m) =>
        bx >= m.bounds[0][0] &&
        bx <= m.bounds[1][0] &&
        by >= m.bounds[0][1] &&
        by <= m.bounds[1][1] &&
        hitContext().isPointInPath(m.path, bx, by),
    );
    if (!hit) return reset();
    if (hit.code === focus) return reset();
    zoomToMunicipality(hit);
  };

  const focusIndex = focus === null ? undefined : MUNICIPALITY_BY_CODE.get(focus);
  const focusStats = useMemo(() => {
    if (focusIndex === undefined) return null;
    const inFrame = units.filter((c) => c.municipality === focusIndex).length;
    const inSample = sample.filter((s) => units[s.unit].municipality === focusIndex).length;
    return { municipality: MUNICIPALITIES[focusIndex], inFrame, inSample };
  }, [focusIndex, units, sample]);

  return (
    <div
      ref={wrapperRef}
      className={`relative h-full w-full touch-none select-none ${zoom.k > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        onHover(null);
        setHoveredStore(null);
      }}
    >
      {!topology && (
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-muted">
          Carregando malha municipal do IBGE…
        </div>
      )}
      <canvas ref={baseRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={dotsRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Mapa do Rio Grande do Sul com os consumidores sorteados" />

      {hoveredStore && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-line bg-white px-2.5 py-1.5 text-[12px] shadow-md"
          style={{ left: hoveredStore.x + 12, top: hoveredStore.y + 12 }}
        >
          <div className="font-medium">{STORES[hoveredStore.index].name}</div>
          <div className="text-muted">{STORE_TYPES[STORES[hoveredStore.index].type]} · OpenStreetMap</div>
        </div>
      )}

      <div className="absolute top-4 right-4 flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
        <ZoomButton label="Aproximar" onClick={() => zoomBy(2)}>
          +
        </ZoomButton>
        <ZoomButton label="Afastar" onClick={() => zoomBy(0.5)}>
          −
        </ZoomButton>
        <ZoomButton label="Ver o estado inteiro" onClick={reset} disabled={zoom.k === 1}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </ZoomButton>
      </div>

      {focusStats ? (
        <div
          className="absolute top-4 left-4 w-[240px] rounded-lg border border-line bg-white/95 p-3 text-[12px] shadow-sm backdrop-blur"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[14px] font-medium text-ink">{focusStats.municipality.name}</div>
              <div className="text-muted">
                {focusStats.municipality.regionName} · {int(focusStats.municipality.population)} hab. (Censo 2022)
              </div>
            </div>
            <button onClick={reset} className="text-muted hover:text-ink" aria-label="Fechar e voltar ao estado">
              ✕
            </button>
          </div>
          <dl className="tabular mt-2 grid grid-cols-2 gap-y-0.5">
            <dt className="text-muted">PIB per capita</dt>
            <dd className="text-right">{brl(focusStats.municipality.gdpPerCapita)}</dd>
            <dt className="text-muted">Agropecuária no PIB</dt>
            <dd className="text-right">{pct(focusStats.municipality.agroShare, 0)}</dd>
            <dt className="text-muted">População rural</dt>
            <dd className="text-right">{pct(focusStats.municipality.ruralShare, 0)}</dd>
            {units.length > 0 && (
              <>
                <dt className="text-muted">Usuários do app</dt>
                <dd className="text-right">{int(focusStats.inFrame)}</dd>
                <dt className="text-muted">Sorteados</dt>
                <dd className="text-right font-medium">{int(focusStats.inSample)}</dd>
              </>
            )}
          </dl>
        </div>
      ) : (
        topology && (
          <div className="pointer-events-none absolute top-4 left-4 rounded-md bg-white/85 px-2.5 py-1.5 text-[11px] text-slate">
            Clique em uma cidade para aproximar
          </div>
        )
      )}
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center border-b border-line text-[16px] text-ink last:border-0 hover:bg-canvas disabled:text-muted/50"
    >
      {children}
    </button>
  );
}

let hitCanvas: CanvasRenderingContext2D | undefined;
/** Untransformed context used only for point-in-polygon tests in base coordinates. */
const hitContext = () => (hitCanvas ??= document.createElement("canvas").getContext("2d")!);

const prepareCanvas = (canvas: HTMLCanvasElement, view: { width: number; height: number }) => {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = view.width * ratio;
  canvas.height = view.height * ratio;
  const context = canvas.getContext("2d")!;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, view.width, view.height);
  return context;
};
