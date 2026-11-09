// Downloads public IBGE data and writes the compact files the app reads.
// Run with: pnpm data:ibge
//
// The demo covers Rio Grande do Sul only (497 municipalities), so each city has
// enough consumers to look populated on the map.
//
// Sources (all public, servicodados.ibge.gov.br / apisidra.ibge.gov.br):
// - Malha municipal do RS (TopoJSON, qualidade máxima)
// - Censo 2022, tabela 4709: população residente por município
// - Censo 2022, tabela 9923: população residente por situação do domicílio (urbana/rural)
// - PIB dos Municípios, tabela 5938: PIB e valor adicionado por atividade (agropecuária,
//   indústria, serviços, administração pública), a preços correntes. PIB do último ano
//   disponível; a abertura por atividade, do último ano com dados (SECTOR_YEAR)
// - Localidades: região geográfica intermediária de cada município do RS
import { mkdir, writeFile } from "node:fs/promises";
import { geoBounds, geoCentroid, geoContains } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

const UF_CODE = 43;
const CAPITAL_CODE = 4314902; // Porto Alegre
const RS_MESH_URL = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${UF_CODE}?formato=application/json&qualidade=maxima&intrarregiao=municipio`;
const POP_URL = `https://apisidra.ibge.gov.br/values/t/4709/n6/in%20n3%20${UF_CODE}/v/93/p/2022`;
const PIB_URL = `https://apisidra.ibge.gov.br/values/t/5938/n6/in%20n3%20${UF_CODE}/v/37/p/last`;
const RURAL_URL = `https://apisidra.ibge.gov.br/values/t/9923/n6/in%20n3%20${UF_CODE}/v/93/p/2022/c1/2`;
// Valor adicionado bruto (R$ mil): agropecuária, indústria, serviços (exceto públicos), administração pública.
// O IBGE publica a abertura por atividade com atraso: em nov/2026, 2022 e 2023 ainda vêm como "...".
const SECTOR_YEAR = 2021;
const SECTORS = { agro: 513, industria: 517, servicos: 6575, publico: 525 } as const;
const VA_URL = `https://apisidra.ibge.gov.br/values/t/5938/n6/in%20n3%20${UF_CODE}/v/${Object.values(SECTORS).join(",")}/p/${SECTOR_YEAR}`;
const LOCALIDADES_URL = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${UF_CODE}/municipios`;

type SidraRow = { V: string; D1C: string; D2C: string; D3N: string };
type Localidade = {
  id: number;
  nome: string;
  "regiao-imediata": { "regiao-intermediaria": { id: number; nome: string } };
};
type Mesh = Topology<{ [key: string]: GeometryCollection<{ codarea: string }> }>;

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json() as Promise<T>;
};

// SIDRA returns a header row first; values may be "-" or "..." when missing.
const sidraByCode = (rows: SidraRow[]) => new Map(rows.slice(1).map((row) => [Number(row.D1C), Number(row.V) || 0]));

const [rsMesh, popRows, pibRows, ruralRows, vaRows, localidades] = await Promise.all([
  getJson<Mesh>(RS_MESH_URL),
  getJson<SidraRow[]>(POP_URL),
  getJson<SidraRow[]>(PIB_URL),
  getJson<SidraRow[]>(RURAL_URL),
  getJson<SidraRow[]>(VA_URL),
  getJson<Localidade[]>(LOCALIDADES_URL),
]);

const population = sidraByCode(popRows);
const pibThousands = sidraByCode(pibRows);
const pibYear = pibRows[1].D3N;
const rural = sidraByCode(ruralRows);
const valueAdded = Object.fromEntries(
  Object.entries(SECTORS).map(([sector, variable]) => [
    sector,
    sidraByCode([vaRows[0], ...vaRows.slice(1).filter((row) => Number(row.D2C) === variable)]),
  ]),
) as Record<keyof typeof SECTORS, Map<number, number>>;

const meshObject = rsMesh.objects[Object.keys(rsMesh.objects)[0]];
const features = feature(rsMesh, meshObject).features;
const centroids = new Map(features.map((f) => [Number(f.properties.codarea), geoCentroid(f)]));

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
// (rejection sampling in its bounding box), one per ~15k residents, up to 40.
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
    const wanted = Math.max(2, Math.min(40, Math.round((population.get(code) ?? 0) / 15_000)));
    const points: [number, number, number][] = [];
    for (let tries = 0; points.length < wanted && tries < wanted * 300; tries++) {
      const candidate: [number, number] = [x0 + random() * (x1 - x0), y0 + random() * (y1 - y0)];
      if (!geoContains(f, candidate)) continue;
      const r = Math.min(0.025, distanceToBorder(candidate, rings) * 0.9);
      points.push([Number(candidate[0].toFixed(4)), Number(candidate[1].toFixed(4)), Number(r.toFixed(4))]);
    }
    const distance = ([lon, lat]: number[]) => Math.hypot(lon - center[0], lat - center[1]);
    return [code, points.sort((a, b) => distance(a) - distance(b))];
  }),
);

const municipalities = localidades.map((loc) => {
  const pop = population.get(loc.id) ?? 0;
  const pib = pibThousands.get(loc.id) ?? 0;
  const [lon, lat] = centroids.get(loc.id) ?? [0, 0];
  const region = loc["regiao-imediata"]["regiao-intermediaria"];
  return {
    code: loc.id,
    name: loc.nome,
    uf: "RS",
    region: String(region.id),
    regionName: region.nome,
    capital: loc.id === CAPITAL_CODE,
    population: pop,
    gdpPerCapita: pop > 0 ? Math.round((pib * 1000) / pop) : 0,
    ruralShare: pop > 0 ? Number(((rural.get(loc.id) ?? 0) / pop).toFixed(4)) : 0,
    /** Valor adicionado bruto por atividade, R$ mil. */
    valueAdded: Object.fromEntries(Object.entries(valueAdded).map(([sector, values]) => [sector, Math.round(values.get(loc.id) ?? 0)])),
    lon: Number(lon.toFixed(4)),
    lat: Number(lat.toFixed(4)),
    neighborhoods: neighborhoods.get(loc.id) ?? [],
  };
});

await mkdir("src/data/ibge", { recursive: true });
await mkdir("public/geo", { recursive: true });
await writeFile(
  "src/data/ibge/municipalities.json",
  JSON.stringify({ gdpYear: Number(pibYear), sectorYear: SECTOR_YEAR, censusYear: 2022, municipalities }),
);
await writeFile("public/geo/rs-municipios.topo.json", JSON.stringify(rsMesh));

console.log(
  `${municipalities.length} municípios do RS, PIB ${pibYear}, ` +
    `população ${municipalities.reduce((s, m) => s + m.population, 0).toLocaleString("pt-BR")}, ` +
    `${municipalities.reduce((s, m) => s + m.neighborhoods.length, 0)} bairros sintéticos`,
);
