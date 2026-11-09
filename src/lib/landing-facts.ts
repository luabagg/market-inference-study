import { motorReferencia } from "@/estatistica/referencia";
import { MUNICIPALITIES } from "@/data/geography";
import { getPopulation } from "@/data/population";
import { STORE_TYPES, type StoreType } from "@/data/stores";
import { STUDY } from "@/data/study-plan";
import { runStudy } from "@/sampling/study";

/** Store-listing download tiers. The listing shows the largest tier that installs (active or not) have passed. */
const DOWNLOAD_TIERS = [10_000, 50_000, 100_000, 500_000, 1_000_000];
/** Assumed installs per active user (people who installed and stopped using it). */
const INSTALLS_PER_ACTIVE = 1.8;

/**
 * Numbers quoted on the landing page, computed at build time from the same
 * synthetic base and study the demo uses, so the pitch and the demo agree.
 * Always uses the reference engine so the public page builds while the
 * student engine is still incomplete.
 */
export const getLandingFacts = () => {
  const users = getPopulation();
  const study = runStudy(motorReferencia, users, STUDY);
  const rows = (groups: ReturnType<typeof study.estimate>["byFirst"]) =>
    groups.map((g) => ({ label: g.label, value: g.estimate.estimativa, margin: g.estimate.margem }));

  const premiumCoffee = study.estimate("premium:cafe");
  const installs = users.length * INSTALLS_PER_ACTIVE;
  return {
    users: users.length,
    downloads: DOWNLOAD_TIERS.findLast((tier) => tier <= installs) ?? DOWNLOAD_TIERS[0],
    lists: users.reduce((acc, c) => acc + c.lists, 0),
    cities: new Set(users.map((c) => c.municipality)).size,
    stateCities: MUNICIPALITIES.length,
    sampleSize: study.m,
    premiumByIncome: rows(premiumCoffee.bySecond),
    typicalMargin: premiumCoffee.overall.estimate.margem,
    stores: (Object.keys(STORE_TYPES) as StoreType[]).map((type) => {
      const e = study.estimate(`store:${type}`).overall.estimate;
      return { label: STORE_TYPES[type], value: e.estimativa, margin: e.margem };
    }),
    ticket: study.estimate("ticket").overall.estimate,
    monthly: study.estimate("monthly").overall.estimate,
  };
};
