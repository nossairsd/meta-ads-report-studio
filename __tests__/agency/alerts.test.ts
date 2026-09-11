import { describe, it, expect } from "vitest";
import { accountStatusAlert, performanceAlerts } from "@/lib/agency/alerts";
import type { Totals } from "@/lib/metrics/schema";

const t = (over: Partial<Totals> = {}): Totals => ({
  spendCents: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
  ...over,
});

const kinds = (alerts: { kind: string }[]) => alerts.map((a) => a.kind);

describe("performanceAlerts", () => {
  it("flags a spend rise of 40% or more", () => {
    const alerts = performanceAlerts({
      current: t({ spendCents: 14_000, conversions: 10 }),
      previous: t({ spendCents: 10_000, conversions: 10 }),
      lastWeek: t({ spendCents: 3_000, conversions: 2 }),
    });
    expect(alerts.find((a) => a.kind === "spend_up")?.change).toBeCloseTo(40);
  });

  it("stays quiet on an ordinary budget change", () => {
    const alerts = performanceAlerts({
      current: t({ spendCents: 13_900, conversions: 10 }),
      previous: t({ spendCents: 10_000, conversions: 10 }),
      lastWeek: t({ spendCents: 3_000, conversions: 2 }),
    });
    expect(kinds(alerts)).not.toContain("spend_up");
  });

  it("raises no spend alert without a baseline", () => {
    // A new client's first month is not a +∞% spike.
    const alerts = performanceAlerts({
      current: t({ spendCents: 50_000 }),
      previous: t(),
      lastWeek: t({ spendCents: 10_000 }),
    });
    expect(kinds(alerts)).not.toContain("spend_up");
  });

  it("flags a sharp drop only while the client is still spending", () => {
    const stillSpending = performanceAlerts({
      current: t({ spendCents: 5_000, conversions: 5 }),
      previous: t({ spendCents: 10_000, conversions: 5 }),
      lastWeek: t({ spendCents: 1_000, conversions: 1 }),
    });
    expect(kinds(stillSpending)).toContain("spend_down");

    // Stopped entirely: shown as paused elsewhere; alerting too says it twice.
    const stopped = performanceAlerts({
      current: t(),
      previous: t({ spendCents: 10_000 }),
      lastWeek: t(),
    });
    expect(kinds(stopped)).not.toContain("spend_down");
  });

  it("flags a week of spend with no conversions on an account that normally converts", () => {
    const alerts = performanceAlerts({
      current: t({ spendCents: 10_000, conversions: 8 }),
      previous: t({ spendCents: 10_000, conversions: 12 }),
      lastWeek: t({ spendCents: 2_500, conversions: 0 }),
    });
    expect(kinds(alerts)).toContain("no_conversions");
  });

  it("does not nag an awareness account that never converts", () => {
    const alerts = performanceAlerts({
      current: t({ spendCents: 10_000 }),
      previous: t({ spendCents: 10_000 }),
      lastWeek: t({ spendCents: 2_500 }),
    });
    expect(kinds(alerts)).not.toContain("no_conversions");
  });

  it("flags a cost per conversion up 30% or more", () => {
    // Before: 100.00 for 10 conversions = 10.00 each. Now: 100.00 for 7 ≈ 14.29.
    const alerts = performanceAlerts({
      current: t({ spendCents: 10_000, conversions: 7 }),
      previous: t({ spendCents: 10_000, conversions: 10 }),
      lastWeek: t({ spendCents: 2_500, conversions: 2 }),
    });
    expect(alerts.find((a) => a.kind === "cpa_up")?.change).toBeGreaterThanOrEqual(30);
  });

  it("raises nothing for a steady account", () => {
    const steady = t({ spendCents: 10_000, clicks: 400, conversions: 10 });
    expect(
      performanceAlerts({ current: steady, previous: steady, lastWeek: t({ spendCents: 2_300, conversions: 2 }) })
    ).toEqual([]);
  });
});

describe("accountStatusAlert", () => {
  it("reports the most severe blocking status", () => {
    expect(accountStatusAlert(["active", "under_review", "disabled"])).toEqual({
      kind: "account_status",
      accountStatus: "disabled",
    });
    expect(accountStatusAlert(["active", "payment_issue"])?.accountStatus).toBe("payment_issue");
  });

  it("does not alert on a closed account, which is history", () => {
    expect(accountStatusAlert(["active", "closed"])).toBeNull();
  });

  it("does not alert on an unknown status", () => {
    expect(accountStatusAlert(["unknown"])).toBeNull();
  });
});
