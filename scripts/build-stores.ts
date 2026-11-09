// Downloads grocery stores in Rio Grande do Sul from OpenStreetMap (Overpass API)
// and writes a compact list for the demo. Run with: pnpm data:stores
//
// Data © OpenStreetMap contributors, available under the Open Database License (ODbL).
// The demo only uses store positions, names and a type. Results are reported by
// store type, never by chain, because list activity in the demo is synthetic.
import { mkdir, writeFile } from "node:fs/promises";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const QUERY = `[out:json][timeout:110];
area["ISO3166-2"="BR-RS"]->.rs;
(nwr["shop"="supermarket"](area.rs);nwr["shop"="wholesale"](area.rs);nwr["shop"="convenience"](area.rs););
out center tags;`;

// Cash-and-carry chains are often tagged as plain supermarkets in OSM.
const ATACAREJO_NAME = /atacad|atacarejo|stok center|macromix|assa[ií]|makro|fort atacad|desco/i;

type Element = { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> };

const response = await fetch(OVERPASS_URL, {
  method: "POST",
  headers: { "User-Agent": "market-inference-study/0.1 (academic project)", "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ data: QUERY }),
});
if (!response.ok) throw new Error(`Overpass ${response.status}`);
const { elements } = (await response.json()) as { elements: Element[] };

// Type codes: 0 = atacarejo, 1 = supermercado, 2 = mercadinho/conveniência.
const stores = elements.flatMap((e) => {
  const lat = e.lat ?? e.center?.lat;
  const lon = e.lon ?? e.center?.lon;
  if (lat === undefined || lon === undefined) return [];
  const name = e.tags.name ?? e.tags.brand ?? "";
  const type = e.tags.shop === "wholesale" || ATACAREJO_NAME.test(name) ? 0 : e.tags.shop === "supermarket" ? 1 : 2;
  return [[Number(lon.toFixed(5)), Number(lat.toFixed(5)), type, name] as const];
});

await mkdir("src/data/osm", { recursive: true });
await writeFile("src/data/osm/stores.json", JSON.stringify({ source: "© OpenStreetMap contributors (ODbL)", stores }));
const byType = [0, 1, 2].map((t) => stores.filter((s) => s[2] === t).length);
console.log(`${stores.length} lojas: ${byType[0]} atacarejos, ${byType[1]} supermercados, ${byType[2]} mercadinhos`);
