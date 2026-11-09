# market-inference-study

Protótipo de pitch para STC 1079 (Técnicas de Amostragem, UFSM). A **Fração** é uma empresa fictícia de pesquisa de mercado que estima consumo a partir de listas de compras feitas no app Cestinha. O produto vendido são estimativas com margem de erro, nunca dados individuais.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # gabarito das apostilas + propriedades do simulador
```

| Rota | O que tem |
| --- | --- |
| `/` | Landing page. Os números citados são calculados no build a partir da mesma base e dos mesmos estudos da demo. |
| `/app` | Painel do estudo do cliente selecionado (sem login; troca de cliente na barra lateral). |
| `/app/mapa` | Simulador: escolha variável, plano, estratos, n e confiança; veja a amostra no mapa, os pesos HT e a distribuição em 500 repetições. |

## Posicionamento frente a concorrentes reais

Pesquisa rápida feita em nov/2026, só para orientar o pitch:

- **Kantar Worldpanel:** painel fixo de domicílios que registram compras com leitura de código de barras. A própria Kantar anunciou expansão de 11,3 mil para 26,3 mil lares até 2026 ([kantar.com](https://www.kantar.com/brazil/campaigns/wp/2024/kantar-se-expande)).
- **Scanntech:** dados de venda capturados no caixa (ticket do PDV) de supermercados conectados ([Exame](https://exame.com/exame-in/a-startup-de-30-anos-que-esta-transformando-o-uso-de-dados-no-varejo)).
- **Horus (Neogrid):** leitura de notas fiscais de compras no varejo ([Startupi](https://startupi.com.br/neogrid-investe-r-7-milhoes-em-startup-de-inteligencia-de-mercado-com-foco-em-dados/)).

Todos medem a compra feita. A Fração mede a intenção, antes da compra, e por isso entra como complemento: a mesma pergunta respondida uma etapa antes. A diferença de método também conta: a Kantar usa um painel desenhado para representar a população, enquanto a base do Cestinha é um cadastro de quem instalou o app. A demo mostra como a amostragem probabilística funciona dentro desse cadastro, sem corrigir quem ficou fora dele.

## Unidades da pesquisa (Parte I, §1.2)

- **Unidade de referência:** o lar (a compra é da casa).
- **Unidade de amostragem:** a conta no app Cestinha, chamada de "consumidor" no código.
- **Unidade informante:** quem monta a lista.

O "ticket médio do consumidor" é a média, entre consumidores, do valor médio que cada um planeja por lista. Ele é maior que o ticket médio por lista, porque quem faz compra do mês cria menos listas, e listas maiores.

## Onde fica a estatística

Toda a teoria de amostragem está em `src/estatistica/`, sem React e sem conhecer consumidores ou perfis.

```
src/estatistica/
  tipos.ts        contrato MotorAmostragem (AAS, AES, AS, HT), na notação das apostilas
  referencia.ts   implementação pronta, com a seção da apostila em cada fórmula
  aluno.ts        o mesmo contrato com stubs, para você escrever
  index.ts        escolhe qual motor o app usa
  motor.test.ts   exemplos resolvidos das Partes I a IV como gabarito
```

O resto do app só monta entradas e lê saídas. `src/sampling/` recebe o motor como parâmetro (injeção simples, sem container):

- `simulation.ts`: transforma a base em `Nh`, valores `y` e índices; pede ao motor sorteio, alocação e estimativa; compara com o parâmetro real.
- `study.ts`: um estudo entregue a um cliente. Uma amostra AES com estratos = cruzamento de duas variáveis, reaproveitada para todas as variáveis.
- `variables.ts`: o que se mede em um consumidor (y) e como formar estratos.

### Usar o seu motor

```bash
MOTOR=aluno pnpm test               # roda o gabarito contra src/estatistica/aluno.ts
NEXT_PUBLIC_MOTOR=aluno pnpm dev    # app inteiro usando o seu motor
```

A barra lateral do app mostra qual motor está ativo. Com o motor do aluno, o painel e o mapa param na primeira função que ainda não existe e mostram a seção da apostila correspondente. A landing page usa sempre `referencia.ts`, para o pitch continuar no ar enquanto o seu motor está incompleto. Os testes de `motor.test.ts` vêm direto dos exemplos das apostilas (IC [8,432; 11,568], n = 697, Var = 0,3724, alocações 60/40, 55/45 e 71/29, m = 71, V̂₁ = 2,5 e V̂₂ = 0,75).

## Dados

| Camada | Origem | Arquivo |
| --- | --- | --- |
| Municípios, UF, região, capital, centroide | IBGE (malha municipal e localidades) | `src/data/ibge/municipalities.json` |
| População 2022 | Censo, SIDRA tabela 4709 | idem |
| PIB per capita 2023 | PIB dos Municípios, SIDRA tabela 5938 | idem |
| Malha para o mapa | IBGE, TopoJSON qualidade intermediária | `public/geo/br-municipios.topo.json` |
| Bairros sintéticos (até 24 pontos por município, dentro do contorno) | sorteados no build | `src/data/ibge/municipalities.json` |
| Grade de pontos da landing | derivada da malha | `src/data/ibge/brazil-dots.json` |
| 60.000 consumidores | sintético, semente fixa | `src/gerador/` (registrado em `src/data/population.ts`) |

`pnpm data:ibge` baixa tudo de novo; `pnpm data:dots` refaz a grade.

### Quem é quem

- **População (cadastro / marco amostral):** os 60.000 consumidores ativos do app. Não é a população brasileira: o app tem mais usuários nas capitais e no Sul e Sudeste (pesos de adoção em `population.ts`).
- **População-alvo de um estudo:** subconjunto do cadastro definido pelo perfil (o atacarejo, por exemplo, olha só quem mora fora das capitais).
- **Amostra:** os consumidores sorteados pelo plano. Cada um tem π e w = 1/π.
- **Listas:** observações de cada consumidor (434 mil no trimestre). A unidade amostral é o consumidor, não a lista.
- **Clientes B2B:** três perfis fictícios em `src/data/profiles.ts`.

### Como os consumidores são gerados (`src/gerador/`)

O gerador é o segundo "motor" do projeto: separado do resto, para dar para apresentar como a base foi feita.

```ts
new GeradorDePopulacao({ semente: 20_260_901, tamanho: 60_000 })
  .adicionarComportamento(familiaRural)
  .adicionarComportamento(jovemDeCapital)
  // ...
  .gerar();
```

Um comportamento (`src/gerador/tipos.ts`) é um tipo de consumidor com:

- `peso(contexto)`: chance relativa de aparecer, dado município, zona urbana/rural e renda da cidade;
- uma função por atributo, chamadas nesta ordem: `moradores`, `salario`, `escolaridade`, `idade`, `frequencia`, `tamanhoDaCompra`. Cada uma recebe um objeto de sorteio (`logNormal`, `poisson`, `categorica`...) e os atributos já sorteados, então o ticket pode depender do tamanho da família, por exemplo;
- `afinidadePremium` e `afinidadePopular`: desvio na chance de listar cada linha de marca.

Para cada consumidor, o gerador sorteia, em ordem:

1. Município, com chance proporcional a população × adoção do app (região e porte).
2. Zona rural, com chance 2% nas capitais, 7% no interior grande e 38% nas cidades pequenas (suposição; a base fica com cerca de 13% rural).
3. Comportamento, com chance proporcional a `peso(contexto)` de cada comportamento registrado.
4. Os atributos, chamando as funções do comportamento.
5. Listas no trimestre (Poisson pela frequência), marcas (afinidade do comportamento + efeito da renda + bônus de capital) e posição: em torno de um bairro sintético dentro do município, com renda alta mais perto do centro e zona rural nos bairros de fora.

A faixa de renda (alta 25%, média 35%, baixa 40%) sai dos quantis da renda domiciliar na base. Os seis comportamentos estão em `src/gerador/comportamentos.ts`; o painel mostra quanto cada um pesa na população-alvo e compara com a estimativa da amostra.

## Hipóteses e limites

- Os estimadores, variâncias e ICs seguem as apostilas: z = 1,645 / 1,96 / 2,576, correção finita, proporção na AAS com (N−n)/(N−1) · p̂(1−p̂)/(n−1).
- Na AES, cada estrato precisa de mₕ ≥ 2 para calcular s²ₕ. A alocação garante isso e arredonda pelos maiores restos.
- Neyman usa Sₕ calculado na base inteira. Num estudo real viria de uma onda anterior ou de um piloto.
- No painel, quebras por uma variável usam a união dos estratos daquele grupo, então continuam sendo estimativas AES exatas (não há estimação por domínio).
- Na sistemática, a lista é ordenada de norte a sul. Se N não é múltiplo de n, as últimas N − nk unidades ficam fora para valer N = nk, como na apostila.
- Lista é intenção de compra, não compra realizada. Quem não usa o app está fora do cadastro; estratificação e pesos corrigem a composição dentro do cadastro, não a cobertura.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind 4, d3-geo e topojson-client para o mapa em canvas, Recharts no histograma, Vitest nos testes. Tudo roda no cliente; não há backend.
