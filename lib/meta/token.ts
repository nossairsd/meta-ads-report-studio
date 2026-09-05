import { z } from "zod";
import { createHmac } from "node:crypto";
import { GRAPH_BASE_URL } from "./client";
import { metaErrorResponseSchema } from "./api-schema";
import { classifyMetaError, MetaApiError } from "./errors";

/**
 * Turning the sign-in token into one that outlives the session.
 *
 * The token Meta returns from the OAuth code exchange is short-lived — a
 * couple of hours. A reporting tool whose connection dies the same afternoon is
 * useless, so it is immediately traded for a long-lived token (about 60 days).
 * Doing this at sign-in, rather than on first failure, means the user never
 * meets the short window at all.
 */

const REQUEST_TIMEOUT_MS = 10_000;

const longLivedTokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  /** Seconds. Absent for some token types, so downstream code must cope. */
  expires_in: z.number().int().positive().optional(),
});

export type LongLivedToken = {
  accessToken: string;
  /** Unix seconds, or null when Meta did not say. Matches the shape Auth.js
   *  stores in `Account.expires_at`. */
  expiresAt: number | null;
};

export type ExchangeOptions = {
  shortLivedToken: string;
  appId: string;
  appSecret: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Injectable so tests can assert the computed expiry deterministically. */
  now?: () => number;
};

export async function exchangeForLongLivedToken({
  shortLivedToken,
  appId,
  appSecret,
  fetchImpl = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
  now = Date.now,
}: ExchangeOptions): Promise<LongLivedToken> {
  // Meta requires the app secret as a query parameter on this endpoint; there
  // is no header form. It is a server-to-server call over TLS, so the secret
  // never touches a browser, but this URL must never be logged.
  const url = new URL(`${GRAPH_BASE_URL}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === "AbortError";
    throw new MetaApiError(
      aborted ? "Token exchange timed out" : "Could not reach Meta to exchange the token",
      { kind: "network", cause }
    );
  } finally {
    clearTimeout(timeout);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new MetaApiError("Token exchange returned a non-JSON response", {
      kind: "server",
      status: response.status,
      cause,
    });
  }

  if (!response.ok) {
    const error = metaErrorResponseSchema.safeParse(payload).data?.error ?? null;
    const code = error?.code ?? null;
    const subcode = error?.error_subcode ?? null;

    throw new MetaApiError(error?.message ?? `Token exchange failed (${response.status})`, {
      kind: classifyMetaError({ status: response.status, code, subcode }),
      status: response.status,
      code,
      subcode,
      traceId: error?.fbtrace_id ?? null,
    });
  }

  const parsed = longLivedTokenSchema.safeParse(payload);
  if (!parsed.success) {
    // A 200 whose shape we do not recognise is not something to guess at: the
    // token is the one thing that must not be half-right.
    throw new MetaApiError("Meta returned an unrecognised token response", {
      kind: "server",
      status: response.status,
      cause: parsed.error,
    });
  }

  const { access_token, expires_in } = parsed.data;
  return {
    accessToken: access_token,
    expiresAt: expires_in ? Math.floor(now() / 1000) + expires_in : null,
  };
}

/**
 * The `appsecret_proof` Meta accepts alongside a token.
 *
 * It is an HMAC of the access token keyed by the app secret, proving the call
 * comes from the app that owns the token. With "Require app secret proof" on,
 * a token stolen from our database is useless without the secret as well.
 */
export function appSecretProof(accessToken: string, appSecret: string): string {
  return createHmac("sha256", appSecret).update(accessToken).digest("hex");
}
