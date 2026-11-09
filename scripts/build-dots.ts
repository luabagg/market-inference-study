// Builds the dot grid used by the landing page map: one dot per 0.42° cell inside
// Brazil, with the cell's population (sum of municipalities whose centroid falls in it).
// Run with: pnpm data:dots   (after pnpm data:ibge)
import { readFile, writeFile } from "node:fs/promises";
import { geoContains } from "d3-geo";
import { merge } from "topojson-client";
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from "topojson-specification";

const STEP = 0.42;

const topo = JSON.parse(await readFile("public/geo/br-municipios.topo.json", "utf8")) as Topology<{
  BRMU: GeometryCollection;
}>;
const { municipalities } = JSON.parse(await readFile("src/data/ibge/municipalities.json", "utf8")) as {
  municipalities: { lon: number; lat: number; population: number; region: string }[];
};

const brazil = merge(topo, topo.objects.BRMU.geometries as (Polygon | MultiPolygon)[]);
const cellKey = (lon: number, lat: number) => `${Math.floor(lon / STEP)}:${Math.floor(lat / STEP)}`;

const cellPopulation = new Map<string, { population: number; region: string }>();
for (const m of municipalities) {
  const key = cellKey(m.lon, m.lat);
  const cell = cellPopulation.get(key) ?? { population: 0, region: m.region };
  cell.population += m.population;
  cellPopulation.set(key, cell);
}

const dots: [number, number, number][] = [];
for (let lon = -74; lon <= -34; lon += STEP) {
  for (let lat = -34; lat <= 5.5; lat += STEP) {
    const cx = lon + STEP / 2;
    const cy = lat + STEP / 2;
    if (!geoContains(brazil, [cx, cy])) continue;
    const population = cellPopulation.get(cellKey(cx, cy))?.population ?? 0;
    dots.push([Number(cx.toFixed(2)), Number(cy.toFixed(2)), population]);
  }
}

await writeFile("src/data/ibge/brazil-dots.json", JSON.stringify(dots));
console.log(`${dots.length} pontos`);
