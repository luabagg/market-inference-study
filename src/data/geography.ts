import ibge from "./ibge/municipalities.json";

/** IBGE intermediate geographic region code (8 in Rio Grande do Sul). */
export type RegionCode = string;
/** City size class used as a stratification variable. */
export type CitySize = "capital" | "grande" | "pequeno";

export type Municipality = {
  code: number;
  name: string;
  uf: string;
  region: RegionCode;
  regionName: string;
  capital: boolean;
  population: number;
  gdpPerCapita: number;
  /** Share of residents living in rural areas (Censo 2022, SIDRA 9923). */
  ruralShare: number;
  /** Gross value added by activity, R$ thousand (PIB dos Municípios, SIDRA 5938). */
  valueAdded: Record<Sector, number>;
  /** Share of the local economy that is agriculture and livestock (agropecuária / total value added). */
  agroShare: number;
  lon: number;
  lat: number;
  /** Synthetic neighborhood centers inside the IBGE outline: [lon, lat, max scatter radius in degrees]. */
  neighborhoods: [number, number, number][];
  size: CitySize;
};

export type Sector = "agro" | "industria" | "servicos" | "publico";

export const SECTORS: Record<Sector, string> = {
  agro: "Agropecuária",
  industria: "Indústria",
  servicos: "Serviços",
  publico: "Administração pública",
};

export const STATE_NAME = "Rio Grande do Sul";

export const CITY_SIZES: Record<CitySize, string> = {
  capital: "Porto Alegre",
  grande: "Cidades com 100 mil+ hab.",
  pequeno: "Cidades com até 100 mil hab.",
};

export const IBGE_YEARS = { census: ibge.censusYear, gdp: ibge.gdpYear, sectors: ibge.sectorYear };

export const MUNICIPALITIES: Municipality[] = ibge.municipalities
  .filter((m) => m.population > 0)
  .map((m) => ({
    ...m,
    agroShare: m.valueAdded.agro / Object.values(m.valueAdded).reduce((a, b) => a + b, 0),
    neighborhoods: m.neighborhoods as [number, number, number][],
    size: m.capital ? "capital" : m.population >= 100_000 ? "grande" : "pequeno",
  }));

/** Intermediate regions of the state, ordered by IBGE code. */
export const REGIONS: Record<RegionCode, string> = Object.fromEntries(
  [...new Map(MUNICIPALITIES.map((m) => [m.region, m.regionName])).entries()].sort(([a], [b]) => a.localeCompare(b)),
);

export const STATE_POPULATION = MUNICIPALITIES.reduce((acc, m) => acc + m.population, 0);
