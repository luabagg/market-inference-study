/**
 * Real grocery stores in Rio Grande do Sul from OpenStreetMap. Only positions,
 * names and a store type are used. All list activity tied to them is synthetic,
 * so the demo reports results by store type, never by chain.
 */
import osm from "./osm/stores.json";

export type StoreType = "atacarejo" | "supermercado" | "mercadinho";

export const STORE_TYPES: Record<StoreType, string> = {
  atacarejo: "Atacarejo",
  supermercado: "Supermercado",
  mercadinho: "Mercadinho e conveniência",
};

const TYPE_BY_CODE: StoreType[] = ["atacarejo", "supermercado", "mercadinho"];

export type Store = { lon: number; lat: number; type: StoreType; name: string };

export const STORES: Store[] = (osm.stores as [number, number, number, string][]).map(([lon, lat, type, name]) => ({
  lon,
  lat,
  type: TYPE_BY_CODE[type],
  name: name || "Sem nome no OpenStreetMap",
}));

export const STORE_ATTRIBUTION = osm.source;

// Grid index (0.1° cells) per store type for nearest-store lookups.
const CELL = 0.1;
const cellKey = (x: number, y: number) => `${x}:${y}`;
const grids = Object.fromEntries(
  TYPE_BY_CODE.map((type) => {
    const grid = new Map<string, number[]>();
    STORES.forEach((s, i) => {
      if (s.type !== type) return;
      const key = cellKey(Math.floor(s.lon / CELL), Math.floor(s.lat / CELL));
      const list = grid.get(key);
      if (list) list.push(i);
      else grid.set(key, [i]);
    });
    return [type, grid];
  }),
) as Record<StoreType, Map<string, number[]>>;

/** Squared distance on a local plane, with longitude scaled by cos(lat). Only used to compare. */
const distance2 = (lon: number, lat: number, s: Store) => {
  const dx = (s.lon - lon) * Math.cos((lat * Math.PI) / 180);
  const dy = s.lat - lat;
  return dx * dx + dy * dy;
};

/** Index of the nearest store of a type, searching rings of grid cells outward. */
export const nearestStore = (lon: number, lat: number, type: StoreType) => {
  const grid = grids[type];
  const cx = Math.floor(lon / CELL);
  const cy = Math.floor(lat / CELL);
  let best = -1;
  let bestDistance = Infinity;
  for (let ring = 0; ring < 80; ring++) {
    for (let x = cx - ring; x <= cx + ring; x++) {
      for (let y = cy - ring; y <= cy + ring; y++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== ring) continue;
        for (const i of grid.get(cellKey(x, y)) ?? []) {
          const d = distance2(lon, lat, STORES[i]);
          if (d < bestDistance) {
            bestDistance = d;
            best = i;
          }
        }
      }
    }
    // Any store beyond this ring is at least `ring` cells away, so stop once the best is closer.
    if (best >= 0 && Math.sqrt(bestDistance) <= ring * CELL * Math.cos((lat * Math.PI) / 180)) break;
  }
  return best;
};

/** Distance in km between a point and a store (equirectangular, fine at city scale). */
export const distanceKm = (lon: number, lat: number, store: Store) => Math.sqrt(distance2(lon, lat, store)) * 111.32;
