import { addDays, toIsoDate } from "./aggregate";
import type { AdAccount, InsightRow } from "./schema";

export const DEMO_ACCOUNT: AdAccount = {
  id: "demo-act-1",
  name: "Dupont & Co",
  currency: "EUR",
};

/**
 * Deterministic PRNG (mulberry32). Seeded so the demo shows the same figures
 * on every visit and every render — a dashboard whose numbers shift between
 * server and client render would hydrate inconsistently, and tests could not
 * assert on it.
 */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type CampaignProfile = {
  id: string;
  name: string;
  /** Average daily spend in cents. */
  dailySpendCents: number;
  /** Impressions bought per currency unit — cheap awareness vs expensive retargeting. */
  impressionsPerEuro: number;
  clickRate: number;
  conversionRate: number;
  /** Multiplies spend across the window: >1 ramps up, <1 winds down. */
  trend: number;
  /** Days before the end date that delivery began; absent means before the window. */
  startsDaysAgo?: number;
  /** Days before the end date that delivery stopped; absent means still running. */
  endsDaysAgo?: number;
  /** Multiplies spend over the most recent days — a budget raised last week. */
  recent?: { days: number; spend: number; conversions: number };
};

/**
 * Three campaigns with genuinely different economics, so the breakdown chart
 * and the per-campaign table have something meaningful to show rather than
 * three near-identical slices.
 */
export const CAMPAIGN_PROFILES: CampaignProfile[] = [
  {
    id: "demo-camp-1",
    name: "Soldes d'hiver — Retargeting",
    dailySpendCents: 8_200,
    impressionsPerEuro: 240,
    clickRate: 0.031,
    conversionRate: 0.086,
    trend: 1.35,
  },
  {
    id: "demo-camp-2",
    name: "Acquisition — Audience large",
    dailySpendCents: 5_400,
    impressionsPerEuro: 410,
    clickRate: 0.014,
    conversionRate: 0.021,
    trend: 1.05,
  },
  {
    id: "demo-camp-3",
    name: "Notoriété locale — Vidéo",
    dailySpendCents: 2_600,
    impressionsPerEuro: 520,
    clickRate: 0.009,
    conversionRate: 0.011,
    trend: 0.82,
  },
];

/** Ad spend and engagement drop at weekends; flat data looks synthetic. */
function weekdayFactor(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();
  if (day === 0) return 0.72; // Sunday
  if (day === 6) return 0.78; // Saturday
  if (day === 1) return 1.08; // Monday peak
  return 1;
}

/**
 * Generates `days` days of history ending on `endDate` (inclusive).
 *
 * We generate more history than the longest selectable period so the 90-day
 * view still has a previous 90 days to compare against — otherwise the trend
 * indicators would have no baseline and read as null.
 */
export function generateDemoRows({
  endDate,
  days = 190,
  seed = 20260101,
  profiles = CAMPAIGN_PROFILES,
}: {
  endDate: string;
  days?: number;
  seed?: number;
  profiles?: CampaignProfile[];
}): InsightRow[] {
  const random = mulberry32(seed);
  const rows: InsightRow[] = [];

  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addDays(endDate, -offset);
    // 0 at the oldest day, 1 at the most recent
    const progress = (days - 1 - offset) / Math.max(days - 1, 1);
    const weekday = weekdayFactor(date);

    for (const profile of profiles) {
      // Draw the noise before deciding to skip, so every campaign consumes the
      // same random sequence whatever its schedule — adding an end date to one
      // profile must not reshuffle the figures of all the others.
      const noise = 0.82 + random() * 0.36;
      const impressionNoise = 0.9 + random() * 0.2;
      const clickNoise = 0.85 + random() * 0.3;
      const conversionNoise = 0.7 + random() * 0.6;

      if (profile.startsDaysAgo !== undefined && offset > profile.startsDaysAgo) continue;
      if (profile.endsDaysAgo !== undefined && offset < profile.endsDaysAgo) continue;

      const isRecent = profile.recent !== undefined && offset < profile.recent.days;
      const trend = 1 + (profile.trend - 1) * progress;
      const boost = isRecent ? profile.recent!.spend : 1;

      const spendCents = Math.round(profile.dailySpendCents * trend * weekday * noise * boost);
      const impressions = Math.round(
        (spendCents / 100) * profile.impressionsPerEuro * impressionNoise
      );
      const clicks = Math.round(impressions * profile.clickRate * clickNoise);
      const conversionRate =
        profile.conversionRate * (isRecent ? profile.recent!.conversions : 1);
      const conversions = Math.round(clicks * conversionRate * conversionNoise);

      rows.push({
        date,
        campaignId: profile.id,
        campaignName: profile.name,
        spendCents,
        impressions,
        clicks,
        conversions,
      });
    }
  }

  return rows;
}

/** Demo history anchored on today, in UTC. */
export function getDemoRows(today: Date = new Date()): InsightRow[] {
  return generateDemoRows({ endDate: toIsoDate(today) });
}
