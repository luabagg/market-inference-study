# market-inference-study

Protótipo de pitch para STC 1079 (Técnicas de Amostragem, UFSM). A **Fração** é uma empresa fictícia de pesquisa de mercado que estima consumo a partir de listas de compras feitas no app Cestinha. O produto vendido são estimativas com margem de erro, nunca dados individuais.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # gabarito das apostilas + propriedades do simulador
```

| Rota | O que tem |
| --- | --- |
| `/` | Landing page: mapa do Brasil no topo, o app Cestinha em "Como chega até você". Os números citados são calculados no build a partir da mesma base e do mesmo estudo da demo. |
| `/app` | Demo para o cliente (Serra Azul Alimentos, fictícia, sem login): só resultados, sem seletores de amostragem. Linhas Reserva e Clássico por categoria, região e renda, tipos de loja e quem usa o app comparado com o RS. |
| `/app/mapa` | Onde estão os usuários e quem foi sorteado no estudo. Clique numa cidade para aproximar. |
| `/app/metodos` | Como sorteamos, em linguagem de cliente: o método recomendado, os outros um clique depois, prós e contras e o ajuste pelo Censo. |
| `/fontes` | Todas as fontes de dados, de método e de mercado, e a lista do que é suposição. Vem de `src/mundo/sources.ts`. |
| `/avancado` | Página da apresentação: uma seção por método (AAS, estratificada com três alocações, sistemática, HT), a comparação por EPA, o viés de cobertura e o laboratório livre. |

Tudo o que a demo mostra sai de `src/sampling/study-plan.ts`: `STUDY` (estratos, alocação, n, confiança, semente) e `ANALYSIS` (repetições e perguntas da comparação). Mude ali e as páginas acompanham.

## Posicionamento frente a concorrentes reais

Pesquisa rápida feita em nov/2026, só para orientar o pitch:

- **Kantar Worldpanel:** painel fixo de domicílios que registram compras com leitura de código de barras. A própria Kantar anunciou expansão de 11,3 mil para 26,3 mil lares até 2026 ([kantar.com](https://www.kantar.com/brazil/campaigns/wp/2024/kantar-se-expande)).
- **Scanntech:** dados de venda capturados no caixa (ticket do PDV) de supermercados conectados ([Exame](https://exame.com/exame-in/a-startup-de-30-anos-que-esta-transformando-o-uso-de-dados-no-varejo)).
- **Horus (Neogrid):** leitura de notas fiscais de compras no varejo ([Startupi](https://startupi.com.br/neogrid-investe-r-7-milhoes-em-startup-de-inteligencia-de-mercado-com-foco-em-dados/)).

Todos medem a compra feita. A Fração mede a intenção, antes da compra, e por isso entra como complemento: a mesma pergunta respondida uma etapa antes. A diferença de método também conta: a Kantar usa um painel desenhado para representar a população, enquanto a base do Cestinha é um cadastro de quem instalou o app. A demo mostra como a amostragem probabilística funciona dentro desse cadastro e quanto do viés de cobertura o ajuste pelo Censo consegue tirar.

## Unidades da pesquisa (Parte I, §1.2)

- **Unidade de referência:** o lar (a compra é da casa).
- **Unidade de amostragem:** a conta no app Cestinha, chamada de "consumidor" no código.
- **Unidade informante:** quem monta a lista.

O "ticket médio do consumidor" é a média, entre consumidores, do valor médio que cada um planeja por lista. Ele é maior que o ticket médio por lista, porque quem faz compra do mês cria menos listas, e listas maiores.

## Onde fica a estatística

Toda a teoria de amostragem está em `src/estatistica/`, sem React e sem conhecer consumidores.

```
src/estatistica/
  tipos.ts        contrato MotorAmostragem (AAS, AES, AS, HT), na notação das apostilas
  referencia.ts   implementação pronta, com a seção da apostila em cada fórmula
  aluno.ts        o mesmo contrato com stubs, para você escrever
  index.ts        escolhe qual motor o app usa
  motor.test.ts   exemplos resolvidos das Partes I a IV como gabarito
```

A base simulada (municípios e setores do IBGE, mercados, produtos e o gerador de cadastros e listas) fica toda em `src/mundo/`. Para trabalhar nas contas não é preciso abrir essa pasta.

O resto do app só monta entradas e lê saídas. `src/sampling/` recebe o motor como parâmetro (injeção simples, sem container):

- `simulation.ts`: transforma a base em `Nh`, valores `y` e índices; pede ao motor sorteio, alocação e estimativa; compara com o parâmetro real.
- `study.ts`: o estudo entregue ao cliente (plano em `src/sampling/study-plan.ts`): uma amostra AES de 1.500 usuários, com estratos = região intermediária × faixa de renda (24 estratos) e alocação proporcional, reaproveitada para todas as variáveis.
- `methods.ts`: roda AAS, AES (proporcional, Neyman, igual) e sistemática com o mesmo n, nas três perguntas de `ANALYSIS`. Ordena os métodos pela variância exata do plano (conhecida porque a base é sintética) e mostra as repetições para comparar. A recomendação é o menor EPA médio: a proporcional (cerca de 0,89 da AAS). Neyman ganha só na pergunta usada para alocar (Café Reserva) e perde nas outras, e um teste garante que o estudo usa o método recomendado.
- `coverage.ts`: viés de cobertura. O peso 1/π do HT corrige chances que o plano cria; não corrige quem instalou o app. O ajuste usa células região × porte da cidade com pesos do Censo (média de Hájek com `motor.ht.total` em cada célula). No Café Reserva e na compra do mês corrige perto de 40% da diferença; no gasto por compra passa do ponto. O resto vem de comportamentos que o Censo não mede.
- `variables.ts`: o que se mede em um consumidor (y) e como formar estratos.

### Usar o seu motor

```bash
MOTOR=aluno pnpm test               # roda o gabarito contra src/estatistica/aluno.ts
NEXT_PUBLIC_MOTOR=aluno pnpm dev    # app inteiro usando o seu motor
```

A barra lateral do app mostra qual motor está ativo. Com o motor do aluno, as páginas da demo e a apresentação param na primeira função que ainda não existe e mostram a seção da apostila correspondente. A landing page usa sempre `referencia.ts`, para o pitch continuar no ar enquanto o seu motor está incompleto. Os testes de `motor.test.ts` vêm direto dos exemplos das apostilas (IC [8,432; 11,568], n = 697, Var = 0,3724, alocações 60/40, 55/45 e 71/29, m = 71, V̂₁ = 2,5 e V̂₂ = 0,75).

## Dados

A demo cobre só o **Rio Grande do Sul** (497 municípios), para cada cidade ter consumidores suficientes no mapa. A landing continua com o mapa do Brasil, que é a visão da empresa.

| Camada | Origem | Arquivo |
| --- | --- | --- |
| Municípios do RS, região geográfica intermediária, centroide | IBGE (malha municipal e localidades) | `src/mundo/ibge/municipalities.json` |
| População 2022 | Censo, SIDRA tabela 4709 | idem |
| PIB per capita 2023 | PIB dos Municípios, SIDRA tabela 5938 | idem |
| Valor adicionado por atividade 2021 (agropecuária, indústria, serviços, administração pública) | PIB dos Municípios, SIDRA tabela 5938 (2022 e 2023 ainda sem abertura) | idem |
| População urbana e rural 2022 | Censo, SIDRA tabela 9923 | idem |
| Malha do RS para o mapa | IBGE, TopoJSON qualidade máxima | `public/geo/rs-municipios.topo.json` |
| 25.228 setores censitários com domicílios: um ponto dentro do setor, domicílios ocupados e situação urbana/rural | Censo 2022, agregados por setores (malha com atributos) | `src/mundo/ibge/setores.json` |
| Grade de pontos do Brasil (landing) | IBGE, malha nacional e Censo | `src/mundo/ibge/brazil-dots.json` |
| 3.371 mercados do RS (posição, nome, tipo) | © OpenStreetMap contributors, ODbL, via Overpass | `src/mundo/osm/stores.json` |
| Cadastros e listas do app | sintético, semente fixa | `src/mundo/gerador/` (registrado em `src/mundo/population.ts`) |

A lista completa, com links, está em `/fontes` (`src/mundo/sources.ts`). `pnpm data:ibge` baixa os dados do RS de novo; `pnpm data:dots` refaz a grade do Brasil; `pnpm data:stores` baixa os mercados do OpenStreetMap; `pnpm data:setores` baixa a malha de setores do Censo (55 MB, guardada em `.cache/`, fora do git) e resume em `setores.json`.

Os mercados são lojas reais: 188 atacarejos (tag `shop=wholesale` ou nome de rede de atacarejo, como Atacadão e Stok Center), 2.131 supermercados e 1.052 mercadinhos e lojas de conveniência. A atividade das listas ligada a elas é sintética, então a demo mostra resultados por tipo de loja e nunca por rede; o nome só aparece como rótulo no mapa e nos exemplos de listas.

### Quem é quem

- **RS (população):** 100 mil domicílios sintéticos, um modelo em escala do estado distribuído pelos municípios conforme o Censo. Só serve para medir o viés de cobertura.
- **Dados do app:** os cerca de 60 mil domicílios que usam o Cestinha e as cerca de 390 mil listas deles no trimestre (1º de agosto a 29 de outubro de 2026). Cada lista tem dia, valor, o mercado onde vai ser comprada e, para cada categoria acompanhada, a linha listada (Reserva, Clássico ou outra marca) e a quantidade.
- **Cadastro (marco amostral):** uma linha por usuário, montada a partir das listas por `src/mundo/gerador/consolidar.ts`. Não é o RS: o app tem mais gente de Porto Alegre, das cidades ricas e jovem.
- **Amostra:** os consumidores sorteados pelo plano. Cada um tem π e w = 1/π.
- **Listas:** observações. A unidade amostral é o consumidor, não a lista.
- **Cliente B2B:** a Serra Azul Alimentos, fictícia, com uma linha premium (Reserva) e uma de preço acessível (Clássico) em cada categoria (`src/mundo/products.ts`).

### Como os dados do app são gerados (`src/mundo/gerador/`)

O gerador é o segundo "motor" do projeto: separado do resto, para dar para apresentar como a base foi feita.

```ts
const { cadastros, listas } = new GeradorDePopulacao({ semente: 20_260_901, tamanho: 100_000 })
  .adicionarComportamento(familiaRural)
  .adicionarComportamento(jovemDeCapital)
  // ...
  .gerar();
const consumidores = consolidar(cadastros, listas);
```

Um comportamento (`src/mundo/gerador/tipos.ts`) é um tipo de consumidor com:

- `peso(contexto)`: chance relativa de aparecer, dado município, zona urbana/rural, renda da cidade e peso da agropecuária;
- uma função por atributo, chamadas nesta ordem: `moradores`, `salario`, `escolaridade`, `idade`, `frequencia`, `tamanhoDaCompra`. Cada uma recebe um objeto de sorteio (`logNormal`, `poisson`, `categorica`...) e os atributos já sorteados, então o valor da compra pode depender do tamanho da família, por exemplo;
- `tiposDeLoja(contexto, pessoa)`: peso de atacarejo, supermercado e mercadinho como destino de cada lista;
- `afinidadePremium` e `afinidadePopular`: desvio na chance de preferir cada linha da Serra Azul;
- `afinidadeComApp`: desvio na chance de usar o app. É a parte do viés de cobertura que o Censo não enxerga.

Para cada domicílio, o gerador sorteia, em ordem:

1. Município do RS, com chance proporcional à população do Censo.
2. Setor censitário do município, com chance proporcional aos domicílios ocupados do Censo 2022. O setor dá o endereço e a zona (12,0% dos domicílios do RS estão em setores rurais).
3. Comportamento, com chance proporcional a `peso(contexto)` de cada comportamento registrado. O contexto traz dados do IBGE: porte, zona, PIB per capita da cidade e o peso da agropecuária no PIB dela. A família rural, por exemplo, pesa `2 + 8 × agro` na zona rural.
4. Os atributos do cadastro, chamando as funções do comportamento. A faixa de renda (alta 25%, média 35%, baixa 40%) sai dos quantis da renda no RS inteiro.
5. Se usa o app: logística de 0,45 + porte (capital +0,8; 100 mil+ +0,4; menores −0,3) + 0,3 × renda da cidade + `afinidadeComApp`. Dá cerca de 60% dos domicílios.
6. A marca de sempre em cada categoria (afinidade do comportamento + efeito da renda + bônus da capital).
7. As listas do trimestre: uma a cada 7, 14 ou 30 dias conforme o hábito, com variação e 12% de idas puladas. Cada lista vai para um tipo de mercado sorteado por `tiposDeLoja` e, dentro do tipo, para a loja mais próxima do setor da pessoa. Cada categoria entra com uma chance que cresce com o tamanho da lista; a marca é a de sempre em 80% das vezes; a quantidade cresce com o número de moradores. O valor é o resto da compra (`tamanhoDaCompra`) mais os itens acompanhados, a preço de tabela.
8. O endereço: um ponto ao redor do centro do setor sorteado, sem sair dele.

`consolidar` faz o papel do time de dados: ticket = média do valor das listas; gasto por mês = total do trimestre / 3; hábito observado pela quantidade de listas (até 4 = compra do mês, até 8 = quinzenal, acima = semanal); "listou Café Reserva" = alguma lista do trimestre teve o item; "planejou lista para atacarejo" = alguma lista apontou para um atacarejo; mercado principal = a loja que mais aparece nas listas. A apresentação mostra, para um usuário, as listas e a linha que sai delas. Quem não usa o app também ganha listas: elas definem o valor real do RS.

## Hipóteses e limites

- Os estimadores, variâncias e ICs seguem as apostilas: z = 1,645 / 1,96 / 2,576, correção finita, proporção na AAS com (N−n)/(N−1) · p̂(1−p̂)/(n−1).
- Na AES, cada estrato precisa de mₕ ≥ 2 para calcular s²ₕ. A alocação garante isso e arredonda pelos maiores restos.
- Neyman usa Sₕ calculado na base inteira. Num estudo real viria de uma onda anterior ou de um piloto.
- No painel, quebras por uma variável usam a união dos estratos daquele grupo, então continuam sendo estimativas AES exatas (não há estimação por domínio).
- Na sistemática, a lista de consumidores é ordenada de norte a sul. Se N não é múltiplo de n, as últimas N − nk unidades ficam fora para valer N = nk, como na apostila.
- O hábito observado pode diferir do hábito do comportamento: quem compra por mês mas fez 5 listas no trimestre aparece como quinzenal. É o mesmo erro de medida que um app real teria.
- Lista é intenção de compra, não compra realizada. Estratificação e pesos corrigem a composição dentro do cadastro, não a cobertura; o ajuste pelo Censo corrige só a parte que vem de onde as pessoas moram.
- No painel "Quem usa o Cestinha", só "Onde moram" compara com o Censo de verdade. Idade, renda e zona do lado do RS vêm do modelo da demo.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind 4, d3-geo e topojson-client para o mapa em canvas, Recharts no histograma do laboratório, Vitest nos testes. Não há backend: os números das páginas são calculados no build (`src/lib/analysis.ts`) e os mapas geram a base no navegador.
