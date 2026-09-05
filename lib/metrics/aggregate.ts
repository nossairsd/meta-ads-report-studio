import type {
  AdAccount,
  CampaignSlice,
  DailyPoint,
  DashboardData,
  Deltas,
  InsightRow,
  MetricKey,
  Period,
  Totals,
} from "./schema";

const METRIC_KEYS: MetricKey[] = ["spendCents", "impressions", "clicks", "conversions"];

const EMPTY_TOTALS: Totals = {
  spendCents: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
};

/** YYYY-MM-DD in UTC. Dates are handled as plain strings everywhere else so
 *  that a viewer's timezone can never shift a row into another day. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

/**
 * Window of `period` days ending on `endDate` inclusive — so a 7-day period
 * covers endDate and the six days before it, not eight days.
 */
export function periodRange(endDate: string, period: Period) {
  return { start: addDays(endDate, -(period - 1)), end: endDate };
}

export function rowsInRange(rows: InsightRow[], start: string, end: string): InsightRow[] {
  return rows.filter((row) => row.date >= start && row.date <= end);
}

export function sumTotals(rows: InsightRow[]): Totals {
  return rows.reduce<Totals>(
    (acc, row) => ({
      spendCents: acc.spendCents + row.spendCents,
      impressions: acc.impressions + row.impressions,
      clicks: acc.clicks + row.clicks,
      conversions: acc.conversions + row.conversions,
    }),
    { ...EMPTY_TOTALS }
  );
}

/**
 * Percentage change against the previous period.
 *
 * Returns null rather than 0 or Infinity when the previous period had no
 * activity: "no baseline" is not the same as "no change", and the UI needs to
 * be able to tell the difference and show nothing instead of a bogus +100%.
 */
export function computeDeltas(current: Totals, previous: Totals): Deltas {
  const deltas = {} as Deltas;
  for (const key of METRIC_KEYS) {
    const before = previous[key];
    deltas[key] = before === 0 ? null : ((current[key] - before) / before) * 100;
  }
  return deltas;
}

/** One point per day in the range, including days with no rows (gaps would
 *  otherwise make the trend line lie about its shape). */
export function buildDailySeries(rows: InsightRow[], start: string, end: string): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>();
  for (let date = start; date <= end; date = addDays(date, 1)) {
    byDate.set(date, { date, spendCents: 0, clicks: 0 });
  }
  for (const row of rows) {
    const point = byDate.get(row.date);
    if (!point) continue;
    point.spendCents += row.spendCents;
    point.clicks += row.clicks;
  }
  return [...byDate.values()];
}

/** Campaign breakdown, largest spender first. */
export function buildCampaignBreakdown(rows: InsightRow[]): CampaignSlice[] {
  const byCampaign = new Map<string, CampaignSlice>();

  for (const row of rows) {
    const existing = byCampaign.get(row.campaignId);
    if (existing) {
      existing.spendCents += row.spendCents;
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.conversions += row.conversions;
    } else {
      byCampaign.set(row.campaignId, {
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        spendCents: row.spendCents,
        impressions: row.impressions,
        clicks: row.clicks,
        conversions: row.conversions,
        share: 0,
      });
    }
  }

  const slices = [...byCampaign.values()].sort((a, b) => b.spendCents - a.spendCents);
  const totalSpend = slices.reduce((sum, slice) => sum + slice.spendCents, 0);
  for (const slice of slices) {
    slice.share = totalSpend === 0 ? 0 : slice.spendCents / totalSpend;
  }
  return slices;
}

/**
 * Single entry point used by the dashboard, the demo and the PDF, so all three
 * always agree on the numbers.
 */
export function buildDashboardData({
  account,
  rows,
  period,
  endDate,
}: {
  account: AdAccount;
  rows: InsightRow[];
  period: Period;
  endDate: string;
}): DashboardData {
  const { start, end } = periodRange(endDate, period);
  const current = rowsInRange(rows, start, end);

  const previousRange = periodRange(addDays(start, -1), period);
  const previous = rowsInRange(rows, previousRange.start, previousRange.end);

  const totals = sumTotals(current);

  return {
    account,
    period,
    rangeStart: start,
    rangeEnd: end,
    totals,
    deltas: computeDeltas(totals, sumTotals(previous)),
    daily: buildDailySeries(current, start, end),
    campaigns: buildCampaignBreakdown(current),
    // Spend alone is not enough: a campaign can serve impressions with no
    // spend recorded yet, and that is still data worth charting.
    isEmpty: current.length === 0 || totals.impressions === 0,
  };
}
