import { describe, it, expect } from "vitest";
import { buildAgencySummary, summarizeClient } from "@/lib/agency/overview";
import { addDays } from "@/lib/metrics/aggregate";
import type { AgencyAccount, LoadedAccount, LoadedClient } from "@/lib/agency/types";
import type { InsightRow } from "@/lib/metrics/schema";

const END = "2026-09-10";

function account(id: string, currency: string, status: AgencyAccount["status"] = "active"): AgencyAccount {
  return { id, name: id, currency, timezone: "UTC", status };
}

/** `days` days of identical delivery ending on END. */
function rows(days: number, { spend = 1_000, conversions = 1, offset = 0 } = {}): InsightRow[] {
  return Array.from({ length: days }, (_, i) => ({
    date: addDays(END, -(i + offset)),
    campaignId: "c1",
    campaignName: "Campaign",
    spendCents: spend,
    impressions: spend * 10,
    clicks: spend / 10,
    conversions,
  }));
}

const loaded = (acc: AgencyAccount, r: InsightRow[], failure?: LoadedAccount["failure"]): LoadedAccount => ({
  account: acc,
  rows: r,
  endDate: END,
  failure,
});

describe("summarizeClient", () => {
  it("never adds two currencies together", () => {
    const client: LoadedClient = {
      id: "c",
      name: "Aureya Chic",
      accounts: [loaded(account("act_eur", "EUR"), rows(60)), loaded(account("act_usd", "USD"), rows(60, { spend: 3_000 }))],
    };

    const summary = summarizeClient(client, 30);

    expect(summary.currencies.map((c) => c.currency)).toEqual(["USD", "EUR"]);
    expect(summary.currencies[0].totals.spendCents).toBe(90_000);
    expect(summary.currencies[1].totals.spendCents).toBe(30_000);
  });

  it("headlines the currency where most of the money went", () => {
    const client: LoadedClient = {
      id: "c",
      name: "X",
      accounts: [loaded(account("a", "EUR"), rows(30, { spend: 100 })), loaded(account("b", "MAD"), rows(30, { spend: 9_000 }))],
    };
    expect(summarizeClient(client, 30).primary?.currency).toBe("MAD");
  });

  it("sums accounts that share a currency", () => {
    const client: LoadedClient = {
      id: "c",
      name: "Maison Dupont",
      accounts: [loaded(account("fr", "EUR"), rows(30)), loaded(account("be", "EUR"), rows(30))],
    };
    const summary = summarizeClient(client, 30);
    expect(summary.currencies).toHaveLength(1);
    expect(summary.currencies[0].totals.spendCents).toBe(60_000);
  });

  it("gives the sparkline one point per day of the window", () => {
    const client: LoadedClient = { id: "c", name: "X", accounts: [loaded(account("a", "EUR"), rows(60))] };
    expect(summarizeClient(client, 7).primary?.daily).toHaveLength(7);
  });

  it("keeps rendering from the readable accounts when one fails", () => {
    const client: LoadedClient = {
      id: "c",
      name: "X",
      accounts: [loaded(account("ok", "EUR"), rows(30)), loaded(account("expired", "EUR"), [], "auth")],
    };
    const summary = summarizeClient(client, 30);
    expect(summary.failedAccounts).toBe(1);
    expect(summary.primary?.totals.spendCents).toBe(30_000);
  });

  it("reports the most recent activity across accounts", () => {
    const client: LoadedClient = {
      id: "c",
      name: "X",
      accounts: [
        loaded(account("old", "EUR"), rows(5, { offset: 60 })),
        loaded(account("live", "EUR"), rows(3)),
      ],
    };
    expect(summarizeClient(client, 30).activity).toBe("active");
  });

  it("raises an account-status alert even for an account it could not read", () => {
    const client: LoadedClient = {
      id: "c",
      name: "X",
      accounts: [loaded(account("blocked", "EUR", "payment_issue"), [], "permission")],
    };
    expect(summarizeClient(client, 30).alerts[0]).toMatchObject({
      kind: "account_status",
      accountStatus: "payment_issue",
    });
  });

  it("lists one alert per kind, most urgent first", () => {
    const client: LoadedClient = {
      id: "c",
      name: "X",
      accounts: [
        loaded(account("a", "EUR", "under_review"), [...rows(30, { spend: 2_000 }), ...rows(30, { spend: 1_000, offset: 30 })]),
        loaded(account("b", "USD"), [...rows(30, { spend: 5_000 }), ...rows(30, { spend: 1_000, offset: 30 })]),
      ],
    };
    const alertKinds = summarizeClient(client, 30).alerts.map((a) => a.kind);
    expect(alertKinds[0]).toBe("account_status");
    expect(alertKinds.filter((k) => k === "spend_up")).toHaveLength(1);
  });
});

describe("buildAgencySummary", () => {
  it("totals the agency per currency and counts clients to watch", () => {
    const summary = buildAgencySummary(
      {
        agencyName: "Studio Nova",
        unassigned: [],
        clients: [
          { id: "1", name: "Steady", accounts: [loaded(account("a", "EUR"), rows(60))] },
          {
            id: "2",
            name: "Spiking",
            accounts: [loaded(account("b", "EUR"), [...rows(30, { spend: 3_000 }), ...rows(30, { offset: 30 })])],
          },
          { id: "3", name: "Dollars", accounts: [loaded(account("c", "USD"), rows(60))] },
        ],
      },
      30
    );

    expect(summary.currencyTotals.map((c) => c.currency)).toEqual(["EUR", "USD"]);
    expect(summary.currencyTotals[0].spendCents).toBe(30_000 + 90_000);
    expect(summary.counts).toEqual({ clients: 3, active: 3, toWatch: 1 });
  });
});
