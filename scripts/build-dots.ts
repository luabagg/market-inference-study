// Builds the dot grid used by the landing page map: one dot per 0.42° cell inside
// Brazil, with the cell's population (sum of municipalities whose centroid falls in it).
// Run with: pnpm data:dots
//
// Sources (public): IBGE municipal mesh of Brazil and Censo 2022 (SIDRA table 4709).
import { writeFile } from "node:fs/promises";
import { geoCentroid, geoContains } from "d3-geo";
import { feature, merge } from "topojson-client";
import type { GeometryCollection, MultiPolygon, Polygon, Topology } from "topojson-specification";

const STEP = 0.42;
const MESH_URL = "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/json&qualidade=minima&intrarregiao=municipio";
const POP_URL = "https://apisidra.ibge.gov.br/values/t/4709/n6/all/v/93/p/2022";

const getJson = async <T,>(url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return (await response.json()) as T;
};

const topo = await getJson<Topology<{ [key: string]: GeometryCollection<{ codarea: string }> }>>(MESH_URL);
const municipalities = topo.objects[Object.keys(topo.objects)[0]];
// SIDRA returns a header row first; D1C is the municipality code and V the population.
const population = new Map(
  (await getJson<{ D1C: string; V: string }[]>(POP_URL)).slice(1).map((row) => [row.D1C, Number(row.V) || 0]),
);

const brazil = merge(topo, municipalities.geometries as (Polygon | MultiPolygon)[]);
const cellKey = (lon: number, lat: number) => `${Math.floor(lon / STEP)}:${Math.floor(lat / STEP)}`;

const cellPopulation = new Map<string, number>();
for (const f of feature(topo, municipalities).features) {
  const [lon, lat] = geoCentroid(f);
  const key = cellKey(lon, lat);
  cellPopulation.set(key, (cellPopulation.get(key) ?? 0) + (population.get(f.properties.codarea) ?? 0));
}

const dots: [number, number, number][] = [];
for (let lon = -74; lon <= -34; lon += STEP) {
  for (let lat = -34; lat <= 5.5; lat += STEP) {
    const cx = lon + STEP / 2;
    const cy = lat + STEP / 2;
    if (!geoContains(brazil, [cx, cy])) continue;
    dots.push([Number(cx.toFixed(2)), Number(cy.toFixed(2)), cellPopulation.get(cellKey(cx, cy)) ?? 0]);
  }
}

await writeFile("src/data/ibge/brazil-dots.json", JSON.stringify(dots));
console.log(`${dots.length} pontos`);
