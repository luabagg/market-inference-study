import { motorReferencia } from "@/estatistica/referencia";
import { getPopulation } from "@/data/population";
import { profileById } from "@/data/profiles";
import { runStudy } from "@/sampling/study";

/**
 * Numbers quoted on the landing page, computed at build time from the same
 * synthetic base and studies the demo uses, so the pitch and the demo agree.
 * Always uses the reference engine so the public page builds while the
 * student engine is still incomplete.
 */
export const getLandingFacts = () => {
  const population = getPopulation();
  const premium = runStudy(motorReferencia, population, profileById("premium"), 0.95);
  const popular = runStudy(motorReferencia, population, profileById("popular"), 0.95);

  const premiumCoffee = premium.estimate("premium:cafe");
  const monthly = premium.estimate("monthly");
  const ticket = popular.estimate("ticket");

  return {
    consumers: population.length,
    municipalities: new Set(population.map((c) => c.municipality)).size,
    lists: population.reduce((acc, c) => acc + c.lists, 0),
    sampleSize: premium.m,
    premiumByIncome: premiumCoffee.byFirst.map((g) => ({ label: g.label, value: g.estimate.estimativa, margin: g.estimate.margem })),
    monthlyBySize: monthly.bySecond.map((g) => ({ label: g.label, value: g.estimate.estimativa, margin: g.estimate.margem })),
    ticketByRegion: ticket.byFirst.map((g) => ({ label: g.label, value: g.estimate.estimativa, margin: g.estimate.margem })),
    typicalMargin: premiumCoffee.overall.estimate.margem,
    sizes: [0.03, 0.02, 0.01].map((D) => ({
      D,
      n: motorReferencia.aas.tamanhoParaProporcao({ N: population.length, p: 0.5, D, confianca: 0.95 }),
    })),
  };
};
