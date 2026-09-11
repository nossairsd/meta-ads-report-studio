import { addDays } from "@/lib/metrics/aggregate";
import { CAMPAIGN_PROFILES, generateDemoRows, type CampaignProfile } from "@/lib/metrics/demo-data";
import type { InsightRow } from "@/lib/metrics/schema";
import { toCampaignStatus } from "./status";
import { todayInTimeZone } from "./timezone";
import type {
  AgencyAccount,
  AgencyData,
  CampaignMeta,
  ClientDetail,
  LoadedAccount,
} from "./types";

/**
 * A fictitious agency and its clients, for the public demo.
 *
 * Built to show every situation the real view has to handle, not just the
 * flattering ones: a client billed in two currencies, one in dirhams, a
 * campaign that has ended, a client that paused, a spend spike with a rising
 * cost per conversion, and an account blocked by a payment problem.
 *
 * Deterministic — seeded per account — so the figures are the same on every
 * visit, and the server and browser renders agree.
 */

export const DEMO_AGENCY_NAME = "Atelier Nova";

type DemoCampaign = CampaignProfile & {
  objective: string;
  /** Meta's delivery switch; the schedule is applied on top, as it is live. */
  effectiveStatus?: string;
};

type DemoAccount = {
  account: AgencyAccount;
  seed: number;
  campaigns: DemoCampaign[];
};

type DemoClient = { id: string; name: string; accounts: DemoAccount[] };

const OBJECTIVES = ["OUTCOME_SALES", "OUTCOME_TRAFFIC", "OUTCOME_AWARENESS"];

const DEMO_CLIENTS: DemoClient[] = [
  {
    id: "dupont",
    name: "Dupont & Co",
    accounts: [
      {
        // The same account the single-account demo always showed.
        account: {
          id: "demo-act-1",
          name: "Dupont & Co",
          currency: "EUR",
          timezone: "Europe/Paris",
          status: "active",
        },
        seed: 20260101,
        campaigns: CAMPAIGN_PROFILES.map((profile, i) => ({
          ...profile,
          objective: OBJECTIVES[i],
        })),
      },
    ],
  },
  {
    id: "lumiere",
    name: "Maison Lumière",
    accounts: [
      {
        account: {
          id: "demo-act-lumiere-fr",
          name: "Maison Lumière — France",
          currency: "EUR",
          timezone: "Europe/Paris",
          status: "active",
        },
        seed: 3101,
        campaigns: [
          {
            id: "lum-1",
            name: "Collection automne — Catalogue",
            objective: "OUTCOME_SALES",
            dailySpendCents: 12_500,
            impressionsPerEuro: 260,
            clickRate: 0.024,
            conversionRate: 0.052,
            trend: 1.2,
          },
          {
            id: "lum-2",
            name: "Retargeting — Paniers abandonnés",
            objective: "OUTCOME_SALES",
            dailySpendCents: 4_800,
            impressionsPerEuro: 190,
            clickRate: 0.038,
            conversionRate: 0.094,
            trend: 1.05,
          },
        ],
      },
      {
        account: {
          id: "demo-act-lumiere-us",
          name: "Maison Lumière — US",
          currency: "USD",
          timezone: "America/New_York",
          status: "active",
        },
        seed: 3102,
        campaigns: [
          {
            id: "lum-us-1",
            name: "US Launch — Prospecting",
            objective: "OUTCOME_TRAFFIC",
            dailySpendCents: 7_000,
            impressionsPerEuro: 300,
            clickRate: 0.017,
            conversionRate: 0.02,
            trend: 1.3,
            startsDaysAgo: 120,
          },
        ],
      },
    ],
  },
  {
    id: "atlas",
    name: "Café Atlas",
    accounts: [
      {
        account: {
          id: "demo-act-atlas",
          name: "Café Atlas",
          currency: "MAD",
          timezone: "Africa/Casablanca",
          status: "active",
        },
        seed: 4201,
        campaigns: [
          {
            id: "atlas-1",
            name: "Livraison à domicile — Casablanca",
            objective: "OUTCOME_SALES",
            dailySpendCents: 42_000,
            impressionsPerEuro: 38,
            clickRate: 0.021,
            conversionRate: 0.06,
            trend: 1.1,
          },
          {
            // Ended three weeks ago, while Meta would still say ACTIVE.
            id: "atlas-2",
            name: "Offre d'été — Terrasses",
            objective: "OUTCOME_AWARENESS",
            dailySpendCents: 30_000,
            impressionsPerEuro: 55,
            clickRate: 0.008,
            conversionRate: 0.01,
            trend: 1,
            startsDaysAgo: 80,
            endsDaysAgo: 21,
          },
          {
            id: "atlas-3",
            name: "Carte fidélité — Inscriptions",
            objective: "OUTCOME_LEADS",
            dailySpendCents: 15_000,
            impressionsPerEuro: 45,
            clickRate: 0.018,
            conversionRate: 0.11,
            trend: 1.15,
            startsDaysAgo: 45,
          },
        ],
      },
    ],
  },
  {
    id: "kora",
    name: "Kora Fitness",
    accounts: [
      {
        account: {
          id: "demo-act-kora",
          name: "Kora Fitness",
          currency: "EUR",
          timezone: "Europe/Paris",
          status: "active",
        },
        seed: 5301,
        campaigns: [
          {
            // Budget almost doubled three weeks ago, and conversions did not
            // follow: the case the alerts exist for.
            id: "kora-1",
            name: "Abonnement rentrée — Leads",
            objective: "OUTCOME_LEADS",
            dailySpendCents: 6_500,
            impressionsPerEuro: 330,
            clickRate: 0.019,
            conversionRate: 0.07,
            trend: 1,
            recent: { days: 21, spend: 1.9, conversions: 0.5 },
          },
          {
            id: "kora-2",
            name: "Coachs — Vidéo",
            objective: "OUTCOME_AWARENESS",
            dailySpendCents: 2_200,
            impressionsPerEuro: 520,
            clickRate: 0.008,
            conversionRate: 0.01,
            trend: 0.9,
          },
        ],
      },
    ],
  },
  {
    id: "verde",
    name: "Verde Paysage",
    accounts: [
      {
        account: {
          id: "demo-act-verde",
          name: "Verde Paysage",
          currency: "EUR",
          timezone: "Europe/Paris",
          status: "active",
        },
        seed: 6401,
        campaigns: [
          {
            // Paused twelve days ago — end of season.
            id: "verde-1",
            name: "Entretien jardins — Devis",
            objective: "OUTCOME_LEADS",
            dailySpendCents: 3_800,
            impressionsPerEuro: 280,
            clickRate: 0.022,
            conversionRate: 0.05,
            trend: 0.9,
            endsDaysAgo: 12,
            effectiveStatus: "PAUSED",
          },
        ],
      },
    ],
  },
  {
    id: "nomade",
    name: "Nomade Voyages",
    accounts: [
      {
        account: {
          id: "demo-act-nomade",
          name: "Nomade Voyages",
          currency: "USD",
          timezone: "Europe/Paris",
          // The card on file failed: delivery is about to stop.
          status: "payment_issue",
        },
        seed: 7501,
        campaigns: [
          {
            id: "nomade-1",
            name: "Circuits Maroc — Réservations",
            objective: "OUTCOME_SALES",
            dailySpendCents: 9_000,
            impressionsPerEuro: 240,
            clickRate: 0.02,
            conversionRate: 0.03,
            trend: 1.05,
          },
        ],
      },
    ],
  },
];

const HISTORY_DAYS = 180;

/** One row per day for the whole account — what the overview reads live. */
function collapseToAccount(rows: InsightRow[], account: AgencyAccount): InsightRow[] {
  const byDate = new Map<string, InsightRow>();
  for (const row of rows) {
    const day = byDate.get(row.date) ?? {
      date: row.date,
      campaignId: account.id,
      campaignName: account.name,
      spendCents: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    };
    day.spendCents += row.spendCents;
    day.impressions += row.impressions;
    day.clicks += row.clicks;
    day.conversions += row.conversions;
    byDate.set(row.date, day);
  }
  return [...byDate.values()];
}

function loadDemoAccount(def: DemoAccount, now: Date, level: "account" | "campaign"): LoadedAccount {
  const endDate = todayInTimeZone(def.account.timezone, now);
  const rows = generateDemoRows({
    endDate,
    days: HISTORY_DAYS,
    seed: def.seed,
    profiles: def.campaigns,
  });
  return {
    account: def.account,
    rows: level === "account" ? collapseToAccount(rows, def.account) : rows,
    endDate,
  };
}

function demoCampaigns(def: DemoAccount, today: string): CampaignMeta[] {
  return def.campaigns.map((campaign) => {
    const endDate =
      campaign.endsDaysAgo !== undefined ? addDays(today, -campaign.endsDaysAgo) : null;
    return {
      id: campaign.id,
      name: campaign.name,
      objective: campaign.objective,
      status: toCampaignStatus(campaign.effectiveStatus ?? "ACTIVE", endDate, today),
      // A round figure near the average, as a person would set it.
      dailyBudgetCents: Math.round(campaign.dailySpendCents / 500) * 500,
      lifetimeBudgetCents: null,
      startDate: addDays(today, -(campaign.startsDaysAgo ?? 200)),
      endDate,
    };
  });
}

export function listDemoClients(): { id: string; name: string }[] {
  return DEMO_CLIENTS.map(({ id, name }) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function getDemoAgency(now: Date = new Date()): AgencyData {
  return {
    agencyName: DEMO_AGENCY_NAME,
    clients: DEMO_CLIENTS.map((client) => ({
      id: client.id,
      name: client.name,
      accounts: client.accounts.map((def) => loadDemoAccount(def, now, "account")),
    })).sort((a, b) => a.name.localeCompare(b.name)),
    unassigned: [],
  };
}

export function getDemoClient(
  clientId: string,
  accountId?: string,
  now: Date = new Date()
): ClientDetail | null {
  const client = DEMO_CLIENTS.find((c) => c.id === clientId);
  if (!client) return null;

  const def = client.accounts.find((a) => a.account.id === accountId) ?? client.accounts[0];
  const selected = loadDemoAccount(def, now, "campaign");

  return {
    agencyName: DEMO_AGENCY_NAME,
    client: { id: client.id, name: client.name },
    accounts: client.accounts.map((a) => a.account),
    selected,
    campaigns: demoCampaigns(def, selected.endDate),
  };
}
