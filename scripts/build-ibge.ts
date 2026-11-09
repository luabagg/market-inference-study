// Downloads public IBGE data and writes the compact files the app reads.
// Run with: pnpm data:ibge
//
// Sources (all public, servicodados.ibge.gov.br / apisidra.ibge.gov.br):
// - Malha municipal (TopoJSON, qualidade intermediária)
// - Censo 2022, tabela 4709: população residente por município
// - PIB dos Municípios, tabela 5938: PIB a preços correntes (último ano disponível)
// - Localidades: UF e região de cada município
import { writeFile, mkdir } from "node:fs/promises";
import { geoBounds, geoCentroid, geoContains } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

const MESH_URL =
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/json&qualidade=intermediaria&intrarregiao=municipio";
const POP_URL = "https://apisidra.ibge.gov.br/values/t/4709/n6/all/v/93/p/2022";
const PIB_URL = "https://apisidra.ibge.gov.br/values/t/5938/n6/all/v/37/p/last";
const LOCALIDADES_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";

const CAPITAL_CODES = new Set([
  1100205, 1200401, 1302603, 1400100, 1501402, 1600303, 1721000, 2111300, 2211001,
  2304400, 2408102, 2507507, 2611606, 2704302, 2800308, 2927408, 3106200, 3205309,
  3304557, 3550308, 4106902, 4205407, 4314902, 5002704, 5103403, 5208707, 5300108,
]);

type SidraRow = { V: string; D1C: string; D3N: string };
type Localidade = {
  id: number;
  nome: string;
  microrregiao: { mesorregiao: { UF: { sigla: string; regiao: { sigla: string } } } } | null;
  "regiao-imediata": { "regiao-intermediaria": { UF: { sigla: string; regiao: { sigla: string } } } };
};

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json() as Promise<T>;
};

// SIDRA returns a header row first; values may be "-" or "..." when missing.
const sidraByCode = (rows: SidraRow[]) =>
  new Map(rows.slice(1).map((row) => [Number(row.D1C), Number(row.V)]));

const [mesh, popRows, pibRows, localidades] = await Promise.all([
  getJson<Topology<{ BRMU: GeometryCollection<{ codarea: string }> }>>(MESH_URL),
  getJson<SidraRow[]>(POP_URL),
  getJson<SidraRow[]>(PIB_URL),
  getJson<Localidade[]>(LOCALIDADES_URL),
]);

const population = sidraByCode(popRows);
const pibThousands = sidraByCode(pibRows);
const pibYear = pibRows[1].D3N;

const features = feature(mesh, mesh.objects.BRMU).features;
const centroids = new Map(
  features.map((f) => [Number(f.properties.codarea), geoCentroid(f)]),
);

// Distance in degrees from a point to the nearest edge of a polygon, measured on a
// local equirectangular plane (longitude scaled by cos(lat)).
const distanceToBorder = (point: [number, number], rings: number[][][]) => {
  const scale = Math.cos((point[1] * Math.PI) / 180);
  const toPlane = ([lon, lat]: number[]) => [(lon - point[0]) * scale, lat - point[1]];
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = toPlane(ring[i - 1]);
      const [bx, by] = toPlane(ring[i]);
      const dx = bx - ax;
      const dy = by - ay;
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return best;
};

// Synthetic neighborhood centers: points drawn uniformly inside each municipality
// (rejection sampling in its bounding box), one per ~50k residents, up to 24.
// Each keeps its distance to the border, so consumers scattered around it stay
// inside the municipality. Sorted from the centroid outward.
let seed = 7;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const neighborhoods = new Map(
  features.map((f) => {
    const code = Number(f.properties.codarea);
    const center = centroids.get(code)!;
    const rings =
      f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates.flat() : [];
    const [[x0, y0], [x1, y1]] = geoBounds(f);
    const wanted = Math.max(1, Math.min(24, Math.round((population.get(code) ?? 0) / 50_000)));
    const points: [number, number, number][] = [];
    for (let tries = 0; points.length < wanted && tries < wanted * 200; tries++) {
      const candidate: [number, number] = [x0 + random() * (x1 - x0), y0 + random() * (y1 - y0)];
      if (!geoContains(f, candidate)) continue;
      const r = Math.min(0.03, distanceToBorder(candidate, rings) * 0.9);
      points.push([Number(candidate[0].toFixed(4)), Number(candidate[1].toFixed(4)), Number(r.toFixed(4))]);
    }
    const distance = ([lon, lat]: number[]) => Math.hypot(lon - center[0], lat - center[1]);
    return [code, points.sort((a, b) => distance(a) - distance(b))];
  }),
);

const municipalities = localidades.map((loc) => {
  const uf = loc.microrregiao?.mesorregiao.UF ?? loc["regiao-imediata"]["regiao-intermediaria"].UF;
  const pop = population.get(loc.id) ?? 0;
  const pib = pibThousands.get(loc.id) ?? 0;
  const [lon, lat] = centroids.get(loc.id) ?? [0, 0];
  return {
    code: loc.id,
    name: loc.nome,
    uf: uf.sigla,
    region: uf.regiao.sigla,
    capital: CAPITAL_CODES.has(loc.id),
    population: pop,
    gdpPerCapita: pop > 0 ? Math.round((pib * 1000) / pop) : 0,
    lon: Number(lon.toFixed(4)),
    lat: Number(lat.toFixed(4)),
    neighborhoods: neighborhoods.get(loc.id) ?? [],
  };
});

await mkdir("src/data/ibge", { recursive: true });
await mkdir("public/geo", { recursive: true });
await writeFile(
  "src/data/ibge/municipalities.json",
  JSON.stringify({ gdpYear: Number(pibYear), censusYear: 2022, municipalities }),
);
await writeFile("public/geo/br-municipios.topo.json", JSON.stringify(mesh));

console.log(
  `${municipalities.length} municípios, ${CAPITAL_CODES.size} capitais, PIB ${pibYear}, ` +
    `população total ${municipalities.reduce((s, m) => s + m.population, 0).toLocaleString("pt-BR")}`,
);
