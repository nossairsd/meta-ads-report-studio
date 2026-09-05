import type { MetaInsight } from "./api-schema";
import type { InsightRow } from "@/lib/metrics/schema";

/**
 * Action types Meta may use for what an agency calls a conversion.
 *
 * There is no single "conversions" field: the same purchase surfaces under a
 * different action_type depending on whether it was tracked by the Pixel, the
 * Conversions API or an app event. Counting every one of them would multiply
 * a single sale by three, so we take the most specific available and stop.
 *
 * Ordered by precedence.
 */
export const CONVERSION_ACTION_TYPES = [
  "offsite_conversion.fb_pixel_purchase",
  "omni_purchase",
  "purchase",
  "offsite_conversion.fb_pixel_lead",
  "lead",
  "complete_registration",
] as const;

/**
 * Decimal string to integer cents, without going through a float.
 *
 * Number("1.005") * 100 is 100.49999999999999, which truncates to the wrong
 * cent. Working on the digits keeps every amount exact — and these amounts end
 * up in an invoice-adjacent report, so "close enough" is not good enough.
 */
export function decimalStringToCents(value: string): number {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;

  const [whole = "0", fraction = ""] = unsigned.split(".");
  const wholeCents = Number(whole) * 100;

  // Two digits of cents, rounding half-up on the third.
  const centDigits = fraction.slice(0, 2).padEnd(2, "0");
  const thirdDigit = Number(fraction[2] ?? "0");
  const cents = Number(centDigits) + (thirdDigit >= 5 ? 1 : 0);

  const total = wholeCents + cents;
  return negative ? -total : total;
}

/** Missing counters mean "no delivery", which is zero — not an error. */
function toInt(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export function extractConversions(actions: MetaInsight["actions"]): number {
  if (!actions || actions.length === 0) return 0;

  for (const actionType of CONVERSION_ACTION_TYPES) {
    const match = actions.find((action) => action.action_type === actionType);
    if (match) return toInt(match.value);
  }
  return 0;
}

/**
 * Maps one raw insight onto the domain model.
 *
 * `date_start` is used as the row's date: with a daily breakdown Meta sets
 * start and stop to the same day, and taking the start keeps the row in the
 * period the caller actually asked for.
 */
export function mapInsightToRow(insight: MetaInsight): InsightRow {
  return {
    date: insight.date_start,
    campaignId: insight.campaign_id,
    // An unnamed campaign still has to be identifiable in the report.
    campaignName: insight.campaign_name?.trim() || `#${insight.campaign_id}`,
    spendCents: insight.spend ? decimalStringToCents(insight.spend) : 0,
    impressions: toInt(insight.impressions),
    clicks: toInt(insight.clicks),
    conversions: extractConversions(insight.actions),
  };
}

export function mapInsightsToRows(insights: MetaInsight[]): InsightRow[] {
  return insights.map(mapInsightToRow);
}

/** "act_123456" is what the API returns and what its paths expect; the bare
 *  number is what people paste. Accept either. */
export function normalizeAdAccountId(id: string): string {
  const trimmed = id.trim();
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}
