import {
  addDays,
  buildDailySeries,
  computeDeltas,
  periodRange,
  rowsInRange,
  sumTotals,
} from "@/lib/metrics/aggregate";
import type { DailyPoint, Deltas, Period, Totals } from "@/lib/metrics/schema";
import { accountStatusAlert, performanceAlerts } from "./alerts";
import { toActivityStatus } from "./status";
import type {
  ActivityStatus,
  AgencyData,
  Alert,
  AlertKind,
  LoadedAccount,
  LoadedClient,
} from "./types";

/**
 * Everything the agency overview shows, derived from raw daily rows.
 *
 * Money in different currencies is never added together. A client billed in
 * euros and in dollars gets one summary per currency, and the agency total is
 * one figure per currency: "€4,200 + $1,300" is information, "5,500" is not.
 */

export type CurrencySummary = {
  currency: string;
  totals: Totals;
  previous: Totals;
  lastWeek: Totals;
  deltas: Deltas;
  /** Daily spend across the displayed window — the row's sparkline. */
  daily: DailyPoint[];
  rangeStart: string;
  rangeEnd: string;
};

export type ClientSummary = {
  id: string;
  name: string;
  accountCount: number;
  /** Largest spender first. */
  currencies: CurrencySummary[];
  /** The currency the row headlines: where most of the money went. */
  primary: CurrencySummary | null;
  activity: ActivityStatus;
  /** Most urgent first. */
  alerts: Alert[];
  /** Accounts whose data could not be read this time. */
  failedAccounts: number;
};

export type AgencySummary = {
  clients: ClientSummary[];
  currencyTotals: {
    currency: string;
    spendCents: number;
    previousSpendCents: number;
    /** Percentage change, or null without a baseline. */
    delta: number | null;
  }[];
  counts: { clients: number; active: number; toWatch: number };
};

function latest(dates: string[]): string {
  return dates.reduce((a, b) => (b > a ? b : a));
}

/**
 * Accounts sharing a currency are summed over one window. When their timezones
 * differ, the window ends on the latest of their "todays" — within a single
 * client they almost always share a timezone, and a one-day edge is the lesser
 * evil next to summing across currencies.
 */
function summarizeCurrency(
  currency: string,
  accounts: LoadedAccount[],
  period: Period
): CurrencySummary {
  const rows = accounts.flatMap((account) => account.rows);
  const end = latest(accounts.map((account) => account.endDate));
  const { start } = periodRange(end, period);
  const before = periodRange(addDays(start, -1), period);
  const week = periodRange(end, 7);

  const current = rowsInRange(rows, start, end);
  const totals = sumTotals(current);
  const previous = sumTotals(rowsInRange(rows, before.start, before.end));

  return {
    currency,
    totals,
    previous,
    lastWeek: sumTotals(rowsInRange(rows, week.start, week.end)),
    deltas: computeDeltas(totals, previous),
    daily: buildDailySeries(current, start, end),
    rangeStart: start,
    rangeEnd: end,
  };
}

/** Most actionable first: a blocked account stops all delivery. */
const ALERT_ORDER: AlertKind[] = [
  "account_status",
  "no_conversions",
  "cpa_up",
  "spend_up",
  "spend_down",
];

const magnitude = (alert: Alert) => Math.abs(alert.change ?? 0);

/** One alert per kind. Two accounts overspending is one thing to look at, and
 *  the larger change is the one worth quoting. */
function mergeAlerts(alerts: Alert[]): Alert[] {
  const byKind = new Map<AlertKind, Alert>();
  for (const alert of alerts) {
    const existing = byKind.get(alert.kind);
    if (!existing || magnitude(alert) > magnitude(existing)) byKind.set(alert.kind, alert);
  }
  return [...byKind.values()].sort(
    (a, b) => ALERT_ORDER.indexOf(a.kind) - ALERT_ORDER.indexOf(b.kind)
  );
}

const ACTIVITY_RANK: Record<ActivityStatus, number> = { inactive: 0, paused: 1, active: 2 };

export function summarizeClient(client: LoadedClient, period: Period): ClientSummary {
  const readable = client.accounts.filter((account) => !account.failure);

  const byCurrency = new Map<string, LoadedAccount[]>();
  for (const account of readable) {
    const list = byCurrency.get(account.account.currency) ?? [];
    list.push(account);
    byCurrency.set(account.account.currency, list);
  }

  const currencies = [...byCurrency.entries()]
    .map(([currency, accounts]) => summarizeCurrency(currency, accounts, period))
    .sort(
      (a, b) => b.totals.spendCents - a.totals.spendCents || a.currency.localeCompare(b.currency)
    );

  // Performance alerts are computed per currency — percentages are comparable
  // across currencies, amounts are not — then merged into one list.
  const alerts: Alert[] = currencies.flatMap((summary) =>
    performanceAlerts({
      current: summary.totals,
      previous: summary.previous,
      lastWeek: summary.lastWeek,
    })
  );
  // Account status comes from the account listing, so it is known even for an
  // account whose figures could not be read.
  const statusAlert = accountStatusAlert(client.accounts.map((a) => a.account.status));
  if (statusAlert) alerts.push(statusAlert);

  const activity = readable
    .map((account) => toActivityStatus(account.rows, account.endDate))
    .reduce<ActivityStatus>(
      (best, status) => (ACTIVITY_RANK[status] > ACTIVITY_RANK[best] ? status : best),
      "inactive"
    );

  return {
    id: client.id,
    name: client.name,
    accountCount: client.accounts.length,
    currencies,
    primary: currencies[0] ?? null,
    activity,
    alerts: mergeAlerts(alerts),
    failedAccounts: client.accounts.length - readable.length,
  };
}

export function buildAgencySummary(data: AgencyData, period: Period): AgencySummary {
  const clients = data.clients.map((client) => summarizeClient(client, period));

  const byCurrency = new Map<string, { spendCents: number; previousSpendCents: number }>();
  for (const client of clients) {
    for (const summary of client.currencies) {
      const entry = byCurrency.get(summary.currency) ?? { spendCents: 0, previousSpendCents: 0 };
      entry.spendCents += summary.totals.spendCents;
      entry.previousSpendCents += summary.previous.spendCents;
      byCurrency.set(summary.currency, entry);
    }
  }

  const currencyTotals = [...byCurrency.entries()]
    .map(([currency, entry]) => ({
      currency,
      ...entry,
      delta:
        entry.previousSpendCents === 0
          ? null
          : ((entry.spendCents - entry.previousSpendCents) / entry.previousSpendCents) * 100,
    }))
    .sort((a, b) => b.spendCents - a.spendCents || a.currency.localeCompare(b.currency));

  return {
    clients,
    currencyTotals,
    counts: {
      clients: clients.length,
      active: clients.filter((client) => client.activity === "active").length,
      toWatch: clients.filter((client) => client.alerts.length > 0 || client.failedAccounts > 0)
        .length,
    },
  };
}
