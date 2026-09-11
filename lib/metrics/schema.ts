import { z } from "zod";

/**
 * Internal domain model for ad performance.
 *
 * Deliberately independent of Meta's API shape: the Marketing API returns
 * numbers as strings, conversions buried in an `actions` array, and field
 * names that change between versions. Provider responses are parsed and
 * mapped into these types at the boundary (lib/metrics/meta.ts), so the rest
 * of the app — dashboard, PDF, demo mode — only ever sees this contract.
 *
 * Money is stored in cents as integers. Summing floating-point euros across
 * 90 days of rows accumulates rounding error; cents stay exact and are
 * formatted only at display time.
 */

export const PERIODS = [7, 30, 90] as const;
export const periodSchema = z.union([z.literal(7), z.literal(30), z.literal(90)]);
export type Period = z.infer<typeof periodSchema>;

/** One campaign's numbers for one day — the atom everything is derived from. */
export const insightRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected an ISO date (YYYY-MM-DD)"),
  campaignId: z.string().min(1),
  campaignName: z.string().min(1),
  spendCents: z.number().int().nonnegative(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
});
export type InsightRow = z.infer<typeof insightRowSchema>;

export const insightRowsSchema = z.array(insightRowSchema);

export const adAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  currency: z.string().length(3).default("EUR"),
});
export type AdAccount = z.infer<typeof adAccountSchema>;

/** The four MVP KPIs (cahier des charges §7.1, F4). */
export const totalsSchema = z.object({
  spendCents: z.number().int().nonnegative(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
});
export type Totals = z.infer<typeof totalsSchema>;

export type MetricKey = keyof Totals;

/** Percentage change per metric against the immediately preceding period. */
export type Deltas = Record<MetricKey, number | null>;

export type DailyPoint = {
  date: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

export type CampaignSlice = {
  campaignId: string;
  campaignName: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  /** Share of total spend, 0-1. */
  share: number;
};

/** Everything the dashboard and the PDF need, derived once. */
export type DashboardData = {
  account: AdAccount;
  period: Period;
  rangeStart: string;
  rangeEnd: string;
  totals: Totals;
  /** The period immediately before, same length: what every change is
   *  measured against, and the dashed line on the trend chart. */
  previousTotals: Totals;
  deltas: Deltas;
  daily: DailyPoint[];
  previousDaily: DailyPoint[];
  campaigns: CampaignSlice[];
  isEmpty: boolean;
};
