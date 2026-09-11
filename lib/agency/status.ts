import { addDays } from "@/lib/metrics/aggregate";
import type { InsightRow } from "@/lib/metrics/schema";
import type { AccountStatus, ActivityStatus, CampaignStatus } from "./types";

/**
 * Meta's numeric `account_status` codes, reduced to the distinctions an agency
 * acts on: spending normally, blocked by a payment problem, blocked by Meta, or
 * gone. The raw codes mean nothing to a client.
 */
const ACCOUNT_STATUS: Record<number, AccountStatus> = {
  1: "active",
  2: "disabled",
  3: "payment_issue", // UNSETTLED
  7: "under_review", // PENDING_RISK_REVIEW
  8: "payment_issue", // PENDING_SETTLEMENT
  9: "payment_issue", // IN_GRACE_PERIOD
  100: "closed", // PENDING_CLOSURE
  101: "closed",
  201: "active", // ANY_ACTIVE
  202: "closed", // ANY_CLOSED
};

export function toAccountStatus(code: number | null | undefined): AccountStatus {
  if (code === null || code === undefined) return "unknown";
  return ACCOUNT_STATUS[code] ?? "unknown";
}

/**
 * A campaign's status as an agency means it.
 *
 * `effective_status` describes Meta's delivery switch, not the schedule: a
 * campaign whose end date has passed can still read ACTIVE. That was observed
 * on a real account — a campaign that ended on 26 August still ACTIVE in
 * September. Shown as "Active", it would tell a client their budget is still
 * running. So the end date wins, except for campaigns already archived or
 * deleted, which say something more specific.
 *
 * `endDate` is the last day of delivery, inclusive, in the account's timezone.
 */
export function toCampaignStatus(
  effectiveStatus: string | null | undefined,
  endDate: string | null,
  today: string
): CampaignStatus {
  const status = (effectiveStatus ?? "").toUpperCase();

  if (status === "ARCHIVED" || status === "DELETED") return "archived";
  if (endDate && endDate < today) return "ended";

  switch (status) {
    case "ACTIVE":
      return "active";
    case "IN_PROCESS":
    case "PENDING_REVIEW":
    case "PREAPPROVED":
      return "in_review";
    case "DISAPPROVED":
      return "rejected";
    case "WITH_ISSUES":
    case "PENDING_BILLING_INFO":
      return "with_issues";
    default:
      // PAUSED, CAMPAIGN_PAUSED, ADSET_PAUSED — and anything Meta adds later:
      // not delivering as far as we can tell, which is what "paused" says.
      return "paused";
  }
}

/**
 * Whether a client is spending right now.
 *
 * Judged on spend, not on campaign statuses: a campaign can be ACTIVE and
 * deliver nothing because its budget ran out or its audience is empty. What a
 * client cares about is whether money is going out.
 */
export function toActivityStatus(rows: InsightRow[], endDate: string): ActivityStatus {
  const spentWithin = (days: number) => {
    const start = addDays(endDate, -(days - 1));
    return rows.some((row) => row.date >= start && row.date <= endDate && row.spendCents > 0);
  };

  if (spentWithin(7)) return "active";
  if (spentWithin(30)) return "paused";
  return "inactive";
}
