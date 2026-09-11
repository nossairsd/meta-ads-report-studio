import { computeDerived } from "@/lib/metrics/derived";
import type { Totals } from "@/lib/metrics/schema";
import type { AccountStatus, Alert } from "./types";

/**
 * What an account manager should look at first.
 *
 * Deliberately few and conservative. An alert that fires on half the clients
 * every week stops being read, and then the one that mattered is missed too.
 * Each rule below has a reason not to fire as well as a reason to.
 */

/** Percentage change in spend worth a look. Budgets move by 10-20% routinely. */
export const SPEND_CHANGE_THRESHOLD = 40;

/** Percentage rise in cost per conversion worth a look. */
export const CPA_CHANGE_THRESHOLD = 30;

function percentChange(now: number, before: number): number {
  return ((now - before) / before) * 100;
}

export function performanceAlerts({
  current,
  previous,
  lastWeek,
}: {
  /** The displayed period. */
  current: Totals;
  /** The period immediately before it, same length. */
  previous: Totals;
  /** The last seven days, which the current period ends with. */
  lastWeek: Totals;
}): Alert[] {
  const alerts: Alert[] = [];

  // Without a baseline there is nothing to compare, so no spend alert at all —
  // a new client's first month is not a "+∞%" spike.
  if (previous.spendCents > 0) {
    const change = percentChange(current.spendCents, previous.spendCents);
    if (change >= SPEND_CHANGE_THRESHOLD) {
      alerts.push({ kind: "spend_up", change });
    } else if (change <= -SPEND_CHANGE_THRESHOLD && current.spendCents > 0) {
      // Only while still spending: a client who stopped entirely is shown as
      // paused, and alerting on it as well would say the same thing twice.
      alerts.push({ kind: "spend_down", change });
    }
  }

  // Money going out this week with nothing coming back — but only for an
  // account that normally converts. An awareness campaign never records a
  // conversion, and flagging it every week would be pure noise.
  const normallyConverts = previous.conversions > 0 || current.conversions > 0;
  if (lastWeek.spendCents > 0 && lastWeek.conversions === 0 && normallyConverts) {
    alerts.push({ kind: "no_conversions" });
  }

  const cpaNow = computeDerived(current).cpaCents;
  const cpaBefore = computeDerived(previous).cpaCents;
  if (cpaNow !== null && cpaBefore !== null && cpaBefore > 0) {
    const change = percentChange(cpaNow, cpaBefore);
    if (change >= CPA_CHANGE_THRESHOLD) alerts.push({ kind: "cpa_up", change });
  }

  return alerts;
}

/** Most severe first: a disabled account stops delivery outright; a payment
 *  problem will; a review might. A closed account is history, not an alert. */
const BLOCKING: AccountStatus[] = ["disabled", "payment_issue", "under_review"];

export function accountStatusAlert(statuses: AccountStatus[]): Alert | null {
  const worst = BLOCKING.find((status) => statuses.includes(status));
  return worst ? { kind: "account_status", accountStatus: worst } : null;
}
