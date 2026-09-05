import { describe, it, expect } from "vitest";
import {
  addDays,
  buildCampaignBreakdown,
  buildDailySeries,
  buildDashboardData,
  computeDeltas,
  periodRange,
  rowsInRange,
  sumTotals,
} from "@/lib/metrics/aggregate";
import { DEMO_ACCOUNT, generateDemoRows } from "@/lib/metrics/demo-data";
import { insightRowsSchema } from "@/lib/metrics/schema";
import type { InsightRow } from "@/lib/metrics/schema";

function row(overrides: Partial<InsightRow> = {}): InsightRow {
  return {
    date: "2026-03-10",
    campaignId: "c1",
    campaignName: "Campaign 1",
    spendCents: 1000,
    impressions: 100,
    clicks: 10,
    conversions: 1,
    ...overrides,
  };
}

describe("periodRange", () => {
  it("includes the end date, so 7 days covers 7 dates and not 8", () => {
    expect(periodRange("2026-03-10", 7)).toEqual({
      start: "2026-03-04",
      end: "2026-03-10",
    });
  });

  it("crosses month boundaries", () => {
    expect(periodRange("2026-03-02", 7).start).toBe("2026-02-24");
  });
});

describe("addDays", () => {
  it("handles leap days", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("does not drift across a DST change, because dates are handled in UTC", () => {
    // Europe/Paris springs forward on 2026-03-29
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
  });
});

describe("rowsInRange", () => {
  it("includes both boundary dates", () => {
    const rows = [
      row({ date: "2026-03-03" }),
      row({ date: "2026-03-04" }),
      row({ date: "2026-03-10" }),
      row({ date: "2026-03-11" }),
    ];
    expect(rowsInRange(rows, "2026-03-04", "2026-03-10").map((r) => r.date)).toEqual([
      "2026-03-04",
      "2026-03-10",
    ]);
  });
});

describe("sumTotals", () => {
  it("sums every metric across rows", () => {
    const totals = sumTotals([
      row({ spendCents: 1050, impressions: 10, clicks: 3, conversions: 1 }),
      row({ spendCents: 2075, impressions: 20, clicks: 4, conversions: 2 }),
    ]);
    expect(totals).toEqual({
      spendCents: 3125,
      impressions: 30,
      clicks: 7,
      conversions: 3,
    });
  });

  it("keeps money exact — the reason spend is stored in cents", () => {
    // 0.10 + 0.20 in floating-point euros is 0.30000000000000004
    const totals = sumTotals([row({ spendCents: 10 }), row({ spendCents: 20 })]);
    expect(totals.spendCents).toBe(30);
  });

  it("returns zeroes for no rows", () => {
    expect(sumTotals([])).toEqual({
      spendCents: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    });
  });
});

describe("computeDeltas", () => {
  const base = { spendCents: 0, impressions: 0, clicks: 0, conversions: 0 };

  it("computes percentage change against the previous period", () => {
    const deltas = computeDeltas(
      { ...base, spendCents: 150, clicks: 50 },
      { ...base, spendCents: 100, clicks: 200 }
    );
    expect(deltas.spendCents).toBeCloseTo(50);
    expect(deltas.clicks).toBeCloseTo(-75);
  });

  it("returns null rather than a fake +100% when there is no baseline", () => {
    const deltas = computeDeltas({ ...base, spendCents: 500 }, base);
    expect(deltas.spendCents).toBeNull();
  });
});

describe("buildDailySeries", () => {
  it("emits one point per day including days with no rows", () => {
    const series = buildDailySeries(
      [row({ date: "2026-03-04", spendCents: 500, clicks: 5 })],
      "2026-03-04",
      "2026-03-06"
    );
    expect(series).toHaveLength(3);
    expect(series.map((p) => p.date)).toEqual(["2026-03-04", "2026-03-05", "2026-03-06"]);
    expect(series[1]).toEqual({ date: "2026-03-05", spendCents: 0, clicks: 0 });
  });

  it("merges several campaigns landing on the same day", () => {
    const series = buildDailySeries(
      [
        row({ date: "2026-03-04", campaignId: "c1", spendCents: 500, clicks: 5 }),
        row({ date: "2026-03-04", campaignId: "c2", spendCents: 250, clicks: 2 }),
      ],
      "2026-03-04",
      "2026-03-04"
    );
    expect(series[0]).toEqual({ date: "2026-03-04", spendCents: 750, clicks: 7 });
  });
});

describe("buildCampaignBreakdown", () => {
  it("groups by campaign, sorts by spend and computes each share", () => {
    const slices = buildCampaignBreakdown([
      row({ campaignId: "small", campaignName: "Small", spendCents: 1000 }),
      row({ campaignId: "big", campaignName: "Big", spendCents: 2000 }),
      row({ campaignId: "big", campaignName: "Big", spendCents: 1000 }),
    ]);

    expect(slices.map((s) => s.campaignId)).toEqual(["big", "small"]);
    expect(slices[0].spendCents).toBe(3000);
    expect(slices[0].share).toBeCloseTo(0.75);
    expect(slices[1].share).toBeCloseTo(0.25);
  });

  it("does not divide by zero when nothing was spent", () => {
    const slices = buildCampaignBreakdown([row({ spendCents: 0 })]);
    expect(slices[0].share).toBe(0);
  });
});

describe("buildDashboardData", () => {
  const rows = [
    // current 7-day window
    row({ date: "2026-03-10", spendCents: 2000, impressions: 200 }),
    row({ date: "2026-03-04", spendCents: 1000, impressions: 100 }),
    // previous 7-day window
    row({ date: "2026-03-03", spendCents: 1500, impressions: 150 }),
    // outside both windows
    row({ date: "2026-01-01", spendCents: 9999, impressions: 999 }),
  ];

  const data = buildDashboardData({
    account: DEMO_ACCOUNT,
    rows,
    period: 7,
    endDate: "2026-03-10",
  });

  it("only counts rows inside the selected window", () => {
    expect(data.totals.spendCents).toBe(3000);
    expect(data.rangeStart).toBe("2026-03-04");
    expect(data.rangeEnd).toBe("2026-03-10");
  });

  it("compares against the window immediately before it", () => {
    // 3000 vs 1500 = +100%
    expect(data.deltas.spendCents).toBeCloseTo(100);
  });

  it("flags an empty period instead of rendering zeroes as if they were data", () => {
    const empty = buildDashboardData({
      account: DEMO_ACCOUNT,
      rows,
      period: 7,
      endDate: "2026-06-30",
    });
    expect(empty.isEmpty).toBe(true);
    expect(empty.daily).toHaveLength(7);
  });
});

describe("demo data", () => {
  const rows = generateDemoRows({ endDate: "2026-03-10", days: 190 });

  it("satisfies the domain schema", () => {
    expect(() => insightRowsSchema.parse(rows)).not.toThrow();
  });

  it("is deterministic, so the demo shows the same figures on every render", () => {
    const again = generateDemoRows({ endDate: "2026-03-10", days: 190 });
    expect(rows).toEqual(again);
  });

  it("covers three campaigns every day", () => {
    expect(rows).toHaveLength(190 * 3);
  });

  it("provides a baseline for the 90-day view to compare against", () => {
    const data = buildDashboardData({
      account: DEMO_ACCOUNT,
      rows,
      period: 90,
      endDate: "2026-03-10",
    });
    expect(data.isEmpty).toBe(false);
    expect(data.deltas.spendCents).not.toBeNull();
    expect(data.campaigns).toHaveLength(3);
  });

  it("produces plausible figures — clicks never exceed impressions", () => {
    for (const r of rows) {
      expect(r.clicks).toBeLessThanOrEqual(r.impressions);
      expect(r.conversions).toBeLessThanOrEqual(r.clicks);
    }
  });
});
