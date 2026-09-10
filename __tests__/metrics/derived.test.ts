import { describe, it, expect } from "vitest";
import { computeDerived } from "@/lib/metrics/derived";
import type { Totals } from "@/lib/metrics/schema";

const totals = (over: Partial<Totals> = {}): Totals => ({
  spendCents: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
  ...over,
});

describe("computeDerived", () => {
  it("computes the click-through rate as a fraction", () => {
    const { ctr } = computeDerived(totals({ impressions: 10_000, clicks: 210 }));
    expect(ctr).toBeCloseTo(0.021, 6);
  });

  it("computes cost per click in cents", () => {
    // 12.00 spent over 8 clicks is 1.50 a click.
    expect(computeDerived(totals({ spendCents: 1200, clicks: 8 })).cpcCents).toBe(150);
  });

  it("prices CPM per thousand impressions", () => {
    // 5.00 over 2,000 impressions is 2.50 per thousand.
    expect(computeDerived(totals({ spendCents: 500, impressions: 2000 })).cpmCents).toBe(250);
  });

  it("scales before dividing, so CPM does not compound its rounding", () => {
    // Dividing first would give 0 cents per impression, then 0 for the CPM.
    const { cpmCents } = computeDerived(totals({ spendCents: 300, impressions: 100_000 }));
    expect(cpmCents).toBe(3);
  });

  it("computes cost per conversion", () => {
    expect(computeDerived(totals({ spendCents: 9000, conversions: 4 })).cpaCents).toBe(2250);
  });

  it("computes the conversion rate against clicks, not impressions", () => {
    const { conversionRate } = computeDerived(
      totals({ impressions: 10_000, clicks: 200, conversions: 10 })
    );
    expect(conversionRate).toBeCloseTo(0.05, 6);
  });

  it("returns null rather than a number when there is nothing to divide by", () => {
    // An account with no clicks has no cost per click. Zero would read as
    // "free", and Infinity would render as garbage.
    const all = computeDerived(totals({ spendCents: 5000 }));
    expect(all).toEqual({
      ctr: null,
      cpcCents: null,
      cpmCents: null,
      cpaCents: null,
      conversionRate: null,
    });
  });

  it("distinguishes a rate of zero from a ratio that is undefined", () => {
    // Clicks but no conversions. The conversion rate is genuinely 0 — traffic
    // arrived and none of it converted, which is a finding. The cost per
    // conversion is undefined: there is no conversion to divide the spend by.
    const result = computeDerived(totals({ spendCents: 1000, impressions: 5000, clicks: 50 }));

    expect(result.cpcCents).toBe(20);
    expect(result.conversionRate).toBe(0);
    expect(result.cpaCents).toBeNull();
  });

  it("keeps every money figure an integer number of cents", () => {
    const result = computeDerived(
      totals({ spendCents: 1000, impressions: 3000, clicks: 3, conversions: 7 })
    );
    for (const value of [result.cpcCents, result.cpmCents, result.cpaCents]) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
