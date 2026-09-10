import type { Totals } from "./schema";

/**
 * The ratios a media buyer actually reads.
 *
 * Spend, impressions, clicks and conversions are raw counts: they say how much
 * happened, not how well it went. Whether a campaign is working is judged on
 * the ratios between them, which is why a report showing only the four totals
 * reads as incomplete to anyone who buys ads for a living.
 *
 * Every one of these is a division, and every denominator can legitimately be
 * zero — an account with no clicks yet has no cost per click. They return
 * `null` rather than zero or Infinity, so the UI can say "not applicable"
 * instead of printing a confident, meaningless number.
 */
export type DerivedMetrics = {
  /** Clicks per impression, as a fraction: 0.021 is a 2.1% click-through rate. */
  ctr: number | null;
  /** Cost per click, in integer cents. */
  cpcCents: number | null;
  /** Cost per thousand impressions, in integer cents. */
  cpmCents: number | null;
  /** Cost per conversion, in integer cents — the figure a client cares about. */
  cpaCents: number | null;
  /** Conversions per click, as a fraction. */
  conversionRate: number | null;
};

/** Integer cents throughout: rounding once at the end keeps money exact, and
 *  a half-cent has no meaning on an invoice. */
function perUnitCents(spendCents: number, units: number): number | null {
  if (units <= 0) return null;
  return Math.round(spendCents / units);
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function computeDerived(totals: Totals): DerivedMetrics {
  return {
    ctr: ratio(totals.clicks, totals.impressions),
    cpcCents: perUnitCents(totals.spendCents, totals.clicks),
    // CPM is priced per thousand impressions, so the spend is scaled before
    // dividing rather than the result multiplied after — which would compound
    // the rounding by a factor of a thousand.
    cpmCents:
      totals.impressions > 0
        ? Math.round((totals.spendCents * 1000) / totals.impressions)
        : null,
    cpaCents: perUnitCents(totals.spendCents, totals.conversions),
    conversionRate: ratio(totals.conversions, totals.clicks),
  };
}
