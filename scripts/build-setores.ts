// Census 2022 tracts (setores censitários) of RS: where households actually live.
// Run with: pnpm data:setores
//
// Source: IBGE, Censo 2022, "Agregados por setores censitários", malha com atributos
// (GeoPackage of RS, ~55 MB). Downloaded once into .cache/ (gitignored) and read with
// Node's built-in SQLite. Only a compact summary is committed:
//   per tract [lon, lat, scatter radius in degrees, occupied households (V0007), rural 0/1]
// The point is inside the tract and the radius keeps scattered households inside it too.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { geoContains } from "d3-geo";

const URL =
  "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/malha_com_atributos/setores/gpkg/UF/RS/RS_setores_CD2022.gpkg";
const CACHE = ".cache/ibge/RS_setores_CD2022.gpkg";
/** Interior candidates tried per tract; the one farthest from the border wins. */
const CANDIDATES = 12;

if (!existsSync(CACHE)) {
  console.log(`Baixando ${URL}`);
  const response = await fetch(URL);
  if (!response.ok) throw new Error(`${response.status} ${URL}`);
  await mkdir(".cache/ibge", { recursive: true });
  await writeFile(CACHE, Buffer.from(await response.arrayBuffer()));
}

type Row = { geom: Uint8Array; CD_MUN: string; SITUACAO: string | null; v0007: number };
const db = new DatabaseSync(CACHE, { readOnly: true });
const rows = db
  .prepare("select geom, CD_MUN, SITUACAO, v0007 from RS_setores_CD2022 where v0007 > 0 order by CD_SETOR")
  .all() as unknown as Row[];

// GeoPackage geometry = "GP" header (+ optional envelope) followed by standard WKB.
// The RS file only has simple polygons (checked: geometry_type_name = POLYGON).
const ENVELOPE_BYTES = [0, 32, 48, 48, 64];
const parsePolygon = (blob: Uint8Array): number[][][] => {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  let at = 8 + ENVELOPE_BYTES[(blob[3] >> 1) & 7];
  const little = view.getUint8(at) === 1;
  const type = view.getUint32(at + 1, little);
  if (type !== 3) throw new Error(`geometria inesperada: WKB ${type}`);
  at += 5;
  const ringCount = view.getUint32(at, little);
  at += 4;
  return Array.from({ length: ringCount }, () => {
    const points = view.getUint32(at, little);
    at += 4;
    return Array.from({ length: points }, () => {
      const point = [view.getFloat64(at, little), view.getFloat64(at + 8, little)];
      at += 16;
      return point;
    });
  });
};

// Distance in degrees from a point to the nearest edge, on a local equirectangular
// plane (longitude scaled by cos(lat)).
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

let seed = 7;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const round = (x: number) => Number(x.toFixed(4));
const byMunicipality: Record<string, number[][]> = {};
let households = 0;
let ruralHouseholds = 0;

for (const row of rows) {
  const rings = parsePolygon(row.geom);
  // d3 is spherical: an outer ring wound the wrong way means "everything except the tract".
  // It wants it clockwise (negative shoelace area with x = lon, y = lat); holes the opposite.
  const clockwise = (ring: number[][]) => ring.reduce((acc, [x, y], i) => acc + (ring[(i + 1) % ring.length][0] - x) * (ring[(i + 1) % ring.length][1] + y), 0) > 0;
  const polygon = {
    type: "Polygon" as const,
    coordinates: rings.map((ring, i) => (clockwise(ring) === (i === 0) ? ring : [...ring].reverse())),
  };
  const xs = rings[0].map((p) => p[0]);
  const ys = rings[0].map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let best: [number, number] = [(x0 + x1) / 2, (y0 + y1) / 2];
  let bestDistance = geoContains(polygon, best) ? distanceToBorder(best, rings) : 0;
  for (let found = 0, tries = 0; found < CANDIDATES && tries < CANDIDATES * 50; tries++) {
    const candidate: [number, number] = [x0 + random() * (x1 - x0), y0 + random() * (y1 - y0)];
    if (!geoContains(polygon, candidate)) continue;
    found++;
    const distance = distanceToBorder(candidate, rings);
    if (distance > bestDistance) [best, bestDistance] = [candidate, distance];
  }
  const rural = row.SITUACAO === "Rural" ? 1 : 0;
  (byMunicipality[row.CD_MUN] ??= []).push([round(best[0]), round(best[1]), round(bestDistance * 0.9), row.v0007, rural]);
  households += row.v0007;
  ruralHouseholds += rural * row.v0007;
}

await writeFile("src/mundo/ibge/setores.json", JSON.stringify({ censusYear: 2022, municipalities: byMunicipality }));
console.log(
  `${rows.length} setores com domicílios em ${Object.keys(byMunicipality).length} municípios, ` +
    `${households.toLocaleString("pt-BR")} domicílios, ${((100 * ruralHouseholds) / households).toFixed(1)}% rurais`,
);
