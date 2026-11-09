/**
 * Every outside source the project uses, and every assumption that is not
 * data. Rendered at /fontes and listed in the README; keep the two in sync.
 */
import { IBGE_YEARS } from "./geography";

export type Source = {
  name: string;
  publisher: string;
  /** Table, dataset or edition. */
  detail: string;
  url?: string;
  usedFor: string;
  license?: string;
};

export const DATA_SOURCES: Source[] = [
  {
    name: "Censo Demográfico 2022: população residente",
    publisher: "IBGE",
    detail: "SIDRA, tabela 4709, por município",
    url: "https://sidra.ibge.gov.br/tabela/4709",
    usedFor: "Quantos domicílios do modelo ficam em cada município e os pesos do ajuste pelo Censo.",
  },
  {
    name: "Censo Demográfico 2022: população por situação do domicílio",
    publisher: "IBGE",
    detail: "SIDRA, tabela 9923, urbana e rural, por município",
    url: "https://sidra.ibge.gov.br/tabela/9923",
    usedFor: "População rural de cada município no mapa e no painel da economia.",
  },
  {
    name: "Censo Demográfico 2022: agregados por setores censitários",
    publisher: "IBGE",
    detail: "Malha de setores do RS com atributos (GeoPackage), domicílios particulares ocupados (V0007) e situação urbana/rural",
    url: "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/malha_com_atributos/setores/gpkg/UF/RS/",
    usedFor: "Onde cada domicílio do modelo mora: o setor é sorteado pelo número de domicílios e diz se a casa é urbana ou rural.",
  },
  {
    name: `PIB dos Municípios: PIB ${IBGE_YEARS.gdp}`,
    publisher: "IBGE",
    detail: "SIDRA, tabela 5938, variável 37 (PIB a preços correntes)",
    url: "https://sidra.ibge.gov.br/tabela/5938",
    usedFor: "PIB per capita de cada município: renda da cidade no gerador e fundo do mapa.",
  },
  {
    name: `PIB dos Municípios: valor adicionado por atividade, ${IBGE_YEARS.sectors}`,
    publisher: "IBGE",
    detail: "SIDRA, tabela 5938, variáveis 513, 517, 6575 e 525",
    url: "https://sidra.ibge.gov.br/tabela/5938",
    usedFor: `Peso da agropecuária em cada município, que define onde aparecem as famílias rurais. ${IBGE_YEARS.sectors} é o ano mais recente com a abertura por atividade.`,
  },
  {
    name: "Malha municipal",
    publisher: "IBGE",
    detail: "API de malhas v3: RS em qualidade máxima e Brasil em qualidade mínima",
    url: "https://servicodados.ibge.gov.br/api/docs/malhas?versao=3",
    usedFor: "Contorno dos municípios nos mapas, e o mapa de pontos do Brasil.",
  },
  {
    name: "Localidades: regiões geográficas intermediárias",
    publisher: "IBGE",
    detail: "API de localidades v1, municípios do RS",
    url: "https://servicodados.ibge.gov.br/api/docs/localidades",
    usedFor: "As 8 regiões intermediárias do RS, usadas como estratos e nas quebras do painel.",
  },
  {
    name: "Mercados do Rio Grande do Sul",
    publisher: "OpenStreetMap, via Overpass API",
    detail: "shop=supermarket, shop=wholesale e shop=convenience no RS",
    url: "https://www.openstreetmap.org/copyright",
    usedFor: "Posição, nome e tipo das lojas para onde as listas apontam. Resultados só por tipo de loja, nunca por rede.",
    license: "© OpenStreetMap contributors, ODbL",
  },
];

export const METHOD_SOURCES: Source[] = [
  {
    name: "Teoria da Amostragem, Partes I a IV",
    publisher: "STC 1079, Técnicas de Amostragem, UFSM",
    detail: "Apostilas da disciplina",
    usedFor: "Fórmulas de AAS, AES, alocação, amostragem sistemática e Horvitz–Thompson; os exemplos resolvidos são o gabarito dos testes.",
  },
];

export const MARKET_SOURCES: Source[] = [
  {
    name: "Kantar Worldpanel amplia painel no Brasil",
    publisher: "Kantar",
    detail: "Painel de domicílios com leitura de código de barras",
    url: "https://www.kantar.com/brazil/campaigns/wp/2024/kantar-se-expande",
    usedFor: "Posicionamento frente a concorrentes.",
  },
  {
    name: "Scanntech: dados de venda no caixa",
    publisher: "Exame",
    detail: "Reportagem",
    url: "https://exame.com/exame-in/a-startup-de-30-anos-que-esta-transformando-o-uso-de-dados-no-varejo",
    usedFor: "Posicionamento frente a concorrentes.",
  },
  {
    name: "Horus (Neogrid): leitura de notas fiscais",
    publisher: "Startupi",
    detail: "Reportagem",
    url: "https://startupi.com.br/neogrid-investe-r-7-milhoes-em-startup-de-inteligencia-de-mercado-com-foco-em-dados/",
    usedFor: "Posicionamento frente a concorrentes.",
  },
];

/** What is invented. Shown next to the sources so nobody mistakes it for data. */
export const ASSUMPTIONS: { what: string; where: string }[] = [
  { what: "A Fração, o app Cestinha, a Serra Azul Alimentos, seus produtos e preços", where: "src/mundo/products.ts" },
  { what: "Os seis comportamentos de consumo: tamanho da casa, renda, escolaridade, idade, hábito de compra e marcas", where: "src/mundo/gerador/comportamentos.ts" },
  { what: "Quem usa o app: chance maior na capital, em cidades mais ricas e para alguns comportamentos", where: "src/mundo/gerador/gerador.ts" },
  { what: "Todas as listas de compras e o que tem nelas", where: "src/mundo/gerador/gerador.ts" },
  { what: "Idade, renda e zona do RS no painel “Quem usa o Cestinha” (só “Onde moram” vem do Censo)", where: "src/sampling/coverage.ts" },
  { what: "Downloads, avaliação e número de avaliações do app na landing page", where: "src/lib/landing-facts.ts" },
];
