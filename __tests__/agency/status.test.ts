import { describe, it, expect } from "vitest";
import { toAccountStatus, toActivityStatus, toCampaignStatus } from "@/lib/agency/status";
import type { InsightRow } from "@/lib/metrics/schema";

describe("toAccountStatus", () => {
  it("maps Meta's codes to what an agency acts on", () => {
    expect(toAccountStatus(1)).toBe("active");
    expect(toAccountStatus(2)).toBe("disabled");
    expect(toAccountStatus(3)).toBe("payment_issue");
    expect(toAccountStatus(9)).toBe("payment_issue");
    expect(toAccountStatus(7)).toBe("under_review");
    expect(toAccountStatus(101)).toBe("closed");
  });

  it("treats a missing or unknown code as unknown rather than guessing", () => {
    expect(toAccountStatus(undefined)).toBe("unknown");
    expect(toAccountStatus(null)).toBe("unknown");
    expect(toAccountStatus(999)).toBe("unknown");
  });
});

describe("toCampaignStatus", () => {
  const today = "2026-09-10";

  it("reports a campaign past its end date as ended, even when Meta says ACTIVE", () => {
    // Observed on a real account: ended 26 August, still ACTIVE in September.
    expect(toCampaignStatus("ACTIVE", "2026-08-26", today)).toBe("ended");
  });

  it("keeps a campaign active on its last day, since the end date is inclusive", () => {
    expect(toCampaignStatus("ACTIVE", today, today)).toBe("active");
  });

  it("keeps a running campaign with no end date active", () => {
    expect(toCampaignStatus("ACTIVE", null, today)).toBe("active");
  });

  it("reads every flavour of pause as paused", () => {
    for (const status of ["PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"]) {
      expect(toCampaignStatus(status, null, today)).toBe("paused");
    }
  });

  it("distinguishes review, rejection and delivery problems", () => {
    expect(toCampaignStatus("PENDING_REVIEW", null, today)).toBe("in_review");
    expect(toCampaignStatus("DISAPPROVED", null, today)).toBe("rejected");
    expect(toCampaignStatus("WITH_ISSUES", null, today)).toBe("with_issues");
    expect(toCampaignStatus("PENDING_BILLING_INFO", null, today)).toBe("with_issues");
  });

  it("says archived rather than ended for a deleted or archived campaign", () => {
    // "Archived" is the more specific fact; "ended" would imply it ran its course.
    expect(toCampaignStatus("ARCHIVED", "2026-08-01", today)).toBe("archived");
    expect(toCampaignStatus("DELETED", "2026-08-01", today)).toBe("archived");
  });

  it("is case-insensitive and tolerates a missing status", () => {
    expect(toCampaignStatus("active", null, today)).toBe("active");
    expect(toCampaignStatus(undefined, null, today)).toBe("paused");
  });
});

describe("toActivityStatus", () => {
  const endDate = "2026-09-10";
  const row = (date: string, spendCents: number): InsightRow => ({
    date,
    campaignId: "c",
    campaignName: "C",
    spendCents,
    impressions: spendCents,
    clicks: 0,
    conversions: 0,
  });

  it("is active when money went out in the last seven days", () => {
    expect(toActivityStatus([row("2026-09-04", 100)], endDate)).toBe("active");
  });

  it("is paused when spend stopped within the last thirty days", () => {
    expect(toActivityStatus([row("2026-08-20", 100)], endDate)).toBe("paused");
  });

  it("is inactive with no spend in thirty days", () => {
    expect(toActivityStatus([row("2026-07-01", 100)], endDate)).toBe("inactive");
    expect(toActivityStatus([], endDate)).toBe("inactive");
  });

  it("ignores days with delivery but no spend", () => {
    // Judged on money going out, which is what a client pays for.
    expect(toActivityStatus([row("2026-09-09", 0)], endDate)).toBe("inactive");
  });
});
