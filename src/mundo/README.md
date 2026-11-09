# src/mundo: o RS simulado

Tudo aqui monta a base de dados fictícia: municípios e setores do IBGE, mercados do OpenStreetMap, produtos da Serra Azul e o gerador de cadastros e listas do Cestinha.

Para trabalhar nas contas não é preciso abrir esta pasta. As fórmulas ficam em `src/estatistica/`; o plano do estudo, em `src/sampling/study-plan.ts`.

Os JSON em `ibge/` e `osm/` são gerados pelos scripts em `scripts/` (`pnpm data:ibge`, `pnpm data:setores`, `pnpm data:dots`, `pnpm data:stores`). Não edite à mão.
