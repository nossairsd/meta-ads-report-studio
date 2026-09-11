import {
  metaAdAccountsResponseSchema,
  metaCampaignsResponseSchema,
  metaErrorResponseSchema,
  metaInsightsResponseSchema,
} from "./api-schema";
import { classifyMetaError, MetaApiError } from "./errors";
import { mapCampaign, mapInsightsToRows, normalizeAdAccountId } from "./map";
import { toAccountStatus } from "@/lib/agency/status";
import type { AgencyAccount, CampaignMeta } from "@/lib/agency/types";
import type { InsightRow } from "@/lib/metrics/schema";

/** Exported so the OAuth flow pins the same version. A provider talking to one
 *  Graph version while the data client talks to another is a bug that only
 *  surfaces when Meta changes a field between the two. */
export const API_VERSION = "v21.0";
export const GRAPH_BASE_URL = `https://graph.facebook.com/${API_VERSION}`;
const BASE_URL = GRAPH_BASE_URL;

/** Meta paginates insights; without a ceiling a misconfigured account could
 *  loop until the function times out. 90 days x a few campaigns fits well
 *  inside this. */
const MAX_PAGES = 20;
const REQUEST_TIMEOUT_MS = 12_000;

export type MetaClientOptions = {
  accessToken: string;
  /** Injectable so tests never touch the network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

async function requestJson(
  url: string,
  { accessToken, fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS }: MetaClientOptions
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        // Bearer keeps the token out of the URL, so it cannot leak into
        // server access logs or a Referer header the way ?access_token= does.
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === "AbortError";
    throw new MetaApiError(
      aborted ? "Meta API request timed out" : "Could not reach the Meta API",
      { kind: "network", cause }
    );
  } finally {
    clearTimeout(timeout);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new MetaApiError("Meta API returned a non-JSON response", {
      kind: "server",
      status: response.status,
      cause,
    });
  }

  if (!response.ok) {
    const parsed = metaErrorResponseSchema.safeParse(payload);
    const error = parsed.success ? parsed.data.error : null;
    const code = error?.code ?? null;
    const subcode = error?.error_subcode ?? null;

    throw new MetaApiError(error?.message ?? `Meta API error ${response.status}`, {
      kind: classifyMetaError({ status: response.status, code, subcode }),
      status: response.status,
      code,
      subcode,
      traceId: error?.fbtrace_id ?? null,
    });
  }

  return payload;
}

/** Walks `paging.next` until Meta stops offering one. */
async function fetchAllPages<T>(
  firstUrl: string,
  options: MetaClientOptions,
  parsePage: (payload: unknown) => { items: T[]; next?: string }
): Promise<T[]> {
  const items: T[] = [];
  let url: string | undefined = firstUrl;
  let page = 0;

  while (url && page < MAX_PAGES) {
    const payload: unknown = await requestJson(url, options);
    const { items: pageItems, next } = parsePage(payload);
    items.push(...pageItems);
    url = next;
    page++;
  }

  return items;
}

function parseOrThrow<T>(
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: unknown } },
  payload: unknown,
  context: string
): T {
  const result = schema.safeParse(payload);
  if (!result.success || result.data === undefined) {
    // A shape change on Meta's side is a server-side problem from our
    // perspective, and worth surfacing as such rather than as a crash.
    throw new MetaApiError(`Unexpected ${context} shape from the Meta API`, {
      kind: "server",
      cause: result.error,
    });
  }
  return result.data;
}

/**
 * Ad accounts the connected user can read, with what an agency needs to know
 * about each: its status with Meta and the timezone its days are cut in.
 *
 * Both fields are readable with `ads_read` alone. Which business owns the
 * account would need `business_management`, which this app does not request.
 */
export async function fetchAdAccounts(options: MetaClientOptions): Promise<AgencyAccount[]> {
  const fields = "name,currency,account_status,timezone_name";
  const url = `${BASE_URL}/me/adaccounts?fields=${encodeURIComponent(fields)}&limit=50`;

  const accounts = await fetchAllPages(url, options, (payload) => {
    const parsed = parseOrThrow(metaAdAccountsResponseSchema, payload, "ad accounts");
    return { items: parsed.data, next: parsed.paging?.next };
  });

  return accounts.map((account) => ({
    id: account.id,
    name: account.name?.trim() || account.id,
    currency: account.currency ?? "EUR",
    timezone: account.timezone_name ?? "UTC",
    status: toAccountStatus(account.account_status),
  }));
}

/**
 * Daily insights between two dates, inclusive, in the account's timezone.
 *
 * Asks for a daily breakdown rather than one aggregate row, because every
 * derived view — the trend line, the previous-period comparison — needs the
 * per-day detail, and re-requesting it per period would multiply calls
 * against a rate-limited API.
 *
 * `level: "account"` returns one row per day instead of one per campaign per
 * day: all the agency overview needs, and a fraction of the pages to fetch
 * when it covers every client at once.
 */
export async function fetchInsights(
  {
    adAccountId,
    since,
    until,
    level = "campaign",
  }: {
    adAccountId: string;
    since: string;
    until: string;
    level?: "campaign" | "account";
  },
  options: MetaClientOptions
): Promise<InsightRow[]> {
  const accountPath = normalizeAdAccountId(adAccountId);
  const params = new URLSearchParams({
    level,
    time_increment: "1",
    // An explicit range rather than a preset: the previous-period comparison
    // needs twice the longest period, and no preset spans exactly that.
    time_range: JSON.stringify({ since, until }),
    fields:
      level === "campaign"
        ? "campaign_id,campaign_name,spend,impressions,clicks,actions"
        : "account_id,spend,impressions,clicks,actions",
    limit: "500",
  });

  const rows = await fetchAllPages(
    `${BASE_URL}/${accountPath}/insights?${params.toString()}`,
    options,
    (payload) => {
      const parsed = parseOrThrow(metaInsightsResponseSchema, payload, "insights");
      return { items: parsed.data, next: parsed.paging?.next };
    }
  );

  return mapInsightsToRows(rows);
}

/**
 * The campaigns of one ad account, with what the rows of insights cannot say:
 * objective, budget, schedule and real status.
 *
 * `today` is the account's own date, needed to tell an ended campaign from a
 * running one — see toCampaignStatus.
 */
export async function fetchCampaigns(
  { adAccountId, today }: { adAccountId: string; today: string },
  options: MetaClientOptions
): Promise<CampaignMeta[]> {
  const accountPath = normalizeAdAccountId(adAccountId);
  const params = new URLSearchParams({
    fields:
      "name,objective,effective_status,daily_budget,lifetime_budget,start_time,stop_time",
    limit: "200",
  });

  const campaigns = await fetchAllPages(
    `${BASE_URL}/${accountPath}/campaigns?${params.toString()}`,
    options,
    (payload) => {
      const parsed = parseOrThrow(metaCampaignsResponseSchema, payload, "campaigns");
      return { items: parsed.data, next: parsed.paging?.next };
    }
  );

  return campaigns.map((campaign) => mapCampaign(campaign, today));
}
