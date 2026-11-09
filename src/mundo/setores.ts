import setores from "./ibge/setores.json";
import { MUNICIPALITIES } from "./geography";

/** One Census 2022 tract (setor censitário), summarized by `pnpm data:setores`. */
export type Tract = {
  /** A point inside the tract. */
  lon: number;
  lat: number;
  /** Scatter radius in degrees that keeps households around the point inside the tract. */
  radius: number;
  /** Occupied private households (Censo 2022, V0007). */
  households: number;
  rural: boolean;
};

const byCode = setores.municipalities as Record<string, number[][]>;

/** Tracts with households, per municipality, in the same order as `MUNICIPALITIES`. */
export const TRACTS: Tract[][] = MUNICIPALITIES.map((m) =>
  (byCode[String(m.code)] ?? []).map(([lon, lat, radius, households, rural]) => ({ lon, lat, radius, households, rural: rural === 1 })),
);
