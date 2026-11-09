# Follow-up

## 1. Recommendation rule after the census tracts

With real Census 2022 tracts, systematic sampling (list sorted north to south) has the lowest average EPA:

| Design | Average EPA before (synthetic bairros) | Average EPA now (census tracts) |
|---|---|---|
| Proportional stratified (study design) | 0.905 | 0.904 |
| Neyman | 0.925 | 0.923 |
| Systematic | 1.337 | 0.790 |

Per question, systematic vs proportional: Café Reserva 0.83 vs 0.81, ticket 0.64 vs 0.98, monthly 0.90 vs 0.92.

Why: households of the same tract are now neighbours in the sorted list, so the evenly spaced draw acts like a fine geographic stratification.

Problem: one systematic sample has no unbiased variance estimator. The SRS formula is used instead and overstates the error here (all 200 intervals on ticket contained the true value, target 95%).

Proposed: recommend only designs whose margin can be estimated from the sample itself, so proportional stratified stays the study design. Systematic stays in the comparison, with "more precise here, but one sample can't tell you by how much" as its con. Update the README line saying proportional wins at about 0.89 of AAS.

Decision pending.

## 2. Two failing tests (caused by item 1)

- `src/sampling/coverage.test.ts`: "the recommended method is the one the study is configured to use". Passes again once item 1 is decided.
- `src/sampling/simulation.test.ts`: "as: the variance across repeated samples matches the exact one". The ratio was 0.74, the limit is 0.75. With only about 41 distinct systematic samples (k = N/n), the 400-repetition check is noisier. Loosen the limit for systematic only.

## 3. Move the remaining calculations into the engine

The app runs on `src/estatistica/referencia.ts` unless `MOTOR=aluno` or `NEXT_PUBLIC_MOTOR=aluno` is set. These calculations still sit outside the engine contract, so they would come from app code even with the student engine on:

- Exact design variance, which drives the EPA and the recommendation:
  - SRS: `src/sampling/simulation.ts:248`
  - stratified: `src/sampling/simulation.ts:199`
  - systematic: `src/sampling/simulation.ts:223`
- Census post-stratified (Hájek) mean in `src/sampling/coverage.ts:71`, which uses `motor.ht.total` but does the ratio and the cell combination outside the engine.

Plan: add `aas.varianciaExata`, `aes.varianciaExata`, `as.varianciaExata` and a post-stratified mean to `src/estatistica/tipos.ts`. Implement them in `referencia.ts`, stub them in `aluno.ts` with the apostila sections, and add worked examples to `motor.test.ts`.
