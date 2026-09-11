import { describe, it, expect, vi } from "vitest";
import { fetchAdAccounts, fetchCampaigns, fetchInsights } from "@/lib/meta/client";
import { MetaApiError } from "@/lib/meta/errors";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const RANGE = { adAccountId: "123", since: "2026-03-01", until: "2026-03-10" };

const insight = (overrides: Record<string, unknown> = {}) => ({
  date_start: "2026-03-10",
  date_stop: "2026-03-10",
  campaign_id: "c1",
  campaign_name: "Campaign",
  spend: "10.00",
  impressions: "1000",
  clicks: "50",
  actions: [{ action_type: "purchase", value: "2" }],
  ...overrides,
});

describe("fetchInsights", () => {
  it("returns domain rows, not Meta's wire format", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [insight()] }));

    const rows = await fetchInsights(
      RANGE,
      { accessToken: "token", fetchImpl }
    );

    expect(rows).toEqual([
      {
        date: "2026-03-10",
        campaignId: "c1",
        campaignName: "Campaign",
        spendCents: 1000,
        impressions: 1000,
        clicks: 50,
        conversions: 2,
      },
    ]);
  });

  it("sends the token as a Bearer header, never in the URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));

    await fetchInsights(RANGE, { accessToken: "secret", fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0];
    // A token in the query string leaks into access logs and Referer headers
    expect(String(url)).not.toContain("secret");
    expect(init.headers.Authorization).toBe("Bearer secret");
  });

  it("requests a daily breakdown at campaign level", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));

    await fetchInsights(RANGE, { accessToken: "t", fetchImpl });

    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.pathname).toContain("act_123/insights");
    expect(url.searchParams.get("time_increment")).toBe("1");
    expect(url.searchParams.get("level")).toBe("campaign");
    expect(JSON.parse(url.searchParams.get("time_range")!)).toEqual({
      since: "2026-03-01",
      until: "2026-03-10",
    });
  });

  it("maps account-level rows, which carry no campaign, onto the account", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ data: [insight({ campaign_id: undefined, campaign_name: undefined, account_id: "123" })] })
    );

    const rows = await fetchInsights({ ...RANGE, level: "account" }, { accessToken: "t", fetchImpl });

    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.searchParams.get("level")).toBe("account");
    expect(url.searchParams.get("fields")).not.toContain("campaign");
    expect(rows[0]).toMatchObject({ campaignId: "123", spendCents: 1000 });
  });

  it("follows pagination until Meta stops offering a next page", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [insight({ campaign_id: "c1" })],
          paging: { next: "https://graph.facebook.com/v21.0/next-page" },
        })
      )
      .mockResolvedValueOnce(jsonResponse({ data: [insight({ campaign_id: "c2" })] }));

    const rows = await fetchInsights(
      RANGE,
      { accessToken: "t", fetchImpl }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(rows.map((r) => r.campaignId)).toEqual(["c1", "c2"]);
  });

  it("stops paginating rather than looping forever on a self-referential next", async () => {
    // A Response body can only be read once, so each call needs a fresh one
    const fetchImpl = vi.fn().mockImplementation(async () =>
      jsonResponse({
        data: [insight()],
        paging: { next: "https://graph.facebook.com/v21.0/same-page" },
      })
    );

    await fetchInsights(RANGE, { accessToken: "t", fetchImpl });

    // Bounded by MAX_PAGES instead of hanging until the function times out
    expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(20);
    expect(fetchImpl.mock.calls.length).toBeGreaterThan(1);
  });

  it("classifies an expired token so the UI can ask for a reconnect", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            message: "Error validating access token: Session has expired",
            type: "OAuthException",
            code: 190,
            error_subcode: 463,
            fbtrace_id: "AbCdEf",
          },
        },
        400
      )
    );

    const error = await fetchInsights(
      RANGE,
      { accessToken: "t", fetchImpl }
    ).catch((e) => e);

    expect(error).toBeInstanceOf(MetaApiError);
    expect(error.kind).toBe("auth");
    expect(error.requiresReconnect).toBe(true);
    expect(error.isRetryable).toBe(false);
    expect(error.traceId).toBe("AbCdEf");
  });

  it("classifies throttling as retryable", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        { error: { message: "User request limit reached", code: 17, type: "OAuthException" } },
        400
      )
    );

    const error = await fetchInsights(
      RANGE,
      { accessToken: "t", fetchImpl }
    ).catch((e) => e);

    expect(error.kind).toBe("rate_limit");
    expect(error.isRetryable).toBe(true);
    expect(error.requiresReconnect).toBe(false);
  });

  it("classifies a missing ads_read permission as needing a reconnect", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ error: { message: "Permissions error", code: 200 } }, 400)
    );

    const error = await fetchInsights(
      RANGE,
      { accessToken: "t", fetchImpl }
    ).catch((e) => e);

    expect(error.kind).toBe("permission");
    expect(error.requiresReconnect).toBe(true);
  });

  it("reports a network failure as retryable rather than crashing", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const error = await fetchInsights(
      RANGE,
      { accessToken: "t", fetchImpl }
    ).catch((e) => e);

    expect(error).toBeInstanceOf(MetaApiError);
    expect(error.kind).toBe("network");
    expect(error.isRetryable).toBe(true);
  });

  it("aborts a request that hangs, instead of holding the function open", async () => {
    const fetchImpl = vi.fn().mockImplementation((_url, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const error = await fetchInsights(
      RANGE,
      { accessToken: "t", fetchImpl, timeoutMs: 20 }
    ).catch((e) => e);

    expect(error.kind).toBe("network");
    expect(error.message).toMatch(/timed out/i);
  });

  it("surfaces a shape change as a server error naming the payload", async () => {
    // Meta renames a field or returns a number where a string was documented
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ ...insight(), spend: 12.34 }] }));

    const error = await fetchInsights(
      RANGE,
      { accessToken: "t", fetchImpl }
    ).catch((e) => e);

    expect(error).toBeInstanceOf(MetaApiError);
    expect(error.kind).toBe("server");
    expect(error.message).toMatch(/insights/i);
  });

  it("does not choke on a non-JSON body from a gateway", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 502 }));

    const error = await fetchInsights(
      RANGE,
      { accessToken: "t", fetchImpl }
    ).catch((e) => e);

    expect(error.kind).toBe("server");
  });
});

describe("fetchAdAccounts", () => {
  it("normalises names and defaults what Meta leaves out", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: "act_1",
            name: "  Dupont & Co  ",
            currency: "EUR",
            account_status: 1,
            timezone_name: "Africa/Casablanca",
          },
          { id: "act_2" },
        ],
      })
    );

    const accounts = await fetchAdAccounts({ accessToken: "t", fetchImpl });

    expect(accounts).toEqual([
      { id: "act_1", name: "Dupont & Co", currency: "EUR", timezone: "Africa/Casablanca", status: "active" },
      { id: "act_2", name: "act_2", currency: "EUR", timezone: "UTC", status: "unknown" },
    ]);
  });

  it("asks only for fields ads_read can see", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    await fetchAdAccounts({ accessToken: "t", fetchImpl });

    const fields = new URL(String(fetchImpl.mock.calls[0][0])).searchParams.get("fields");
    // `business` would need business_management, which the app does not request.
    expect(fields).toBe("name,currency,account_status,timezone_name");
  });
});

describe("fetchCampaigns", () => {
  it("reads budgets, schedule and a status that respects the end date", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: "c1",
            name: "Rentrée",
            objective: "OUTCOME_SALES",
            effective_status: "ACTIVE",
            daily_budget: "5000",
            start_time: "2026-08-01T10:00:00+0100",
            stop_time: "2026-08-26T23:59:59+0100",
          },
          { id: "c2", effective_status: "PAUSED" },
        ],
      })
    );

    const campaigns = await fetchCampaigns(
      { adAccountId: "123", today: "2026-09-10" },
      { accessToken: "t", fetchImpl }
    );

    expect(String(fetchImpl.mock.calls[0][0])).toContain("act_123/campaigns");
    expect(campaigns).toEqual([
      {
        id: "c1",
        name: "Rentrée",
        objective: "OUTCOME_SALES",
        status: "ended",
        dailyBudgetCents: 5000,
        lifetimeBudgetCents: null,
        startDate: "2026-08-01",
        endDate: "2026-08-26",
      },
      {
        id: "c2",
        name: "#c2",
        objective: null,
        status: "paused",
        dailyBudgetCents: null,
        lifetimeBudgetCents: null,
        startDate: null,
        endDate: null,
      },
    ]);
  });
});
