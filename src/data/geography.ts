import ibge from "./ibge/municipalities.json";

export type RegionCode = "N" | "NE" | "CO" | "SE" | "S";
/** City size class used as a stratification variable. */
export type CitySize = "capital" | "grande" | "pequeno";

export type Municipality = {
  code: number;
  name: string;
  uf: string;
  region: RegionCode;
  capital: boolean;
  population: number;
  gdpPerCapita: number;
  lon: number;
  lat: number;
  /** Synthetic neighborhood centers inside the IBGE outline: [lon, lat, max scatter radius in degrees]. */
  neighborhoods: [number, number, number][];
  size: CitySize;
};

export const REGIONS: Record<RegionCode, string> = {
  N: "Norte",
  NE: "Nordeste",
  CO: "Centro-Oeste",
  SE: "Sudeste",
  S: "Sul",
};

export const CITY_SIZES: Record<CitySize, string> = {
  capital: "Capitais",
  grande: "Interior, 100 mil+ hab.",
  pequeno: "Interior, até 100 mil hab.",
};

export const IBGE_YEARS = { census: ibge.censusYear, gdp: ibge.gdpYear };

// One locality in the IBGE list has no 2022 census count yet; it cannot host consumers.
export const MUNICIPALITIES: Municipality[] = ibge.municipalities
  .filter((m) => m.population > 0)
  .map((m) => ({
    ...m,
    region: m.region as RegionCode,
    neighborhoods: m.neighborhoods as [number, number, number][],
    size: m.capital ? "capital" : m.population >= 100_000 ? "grande" : "pequeno",
  }));

export const BRAZIL_POPULATION = MUNICIPALITIES.reduce((acc, m) => acc + m.population, 0);
