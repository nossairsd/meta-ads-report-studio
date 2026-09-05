/**
 * Error taxonomy for the Meta Marketing API.
 *
 * The API answers with HTTP 400 for almost everything and puts the real
 * meaning in a numeric code, so the status alone cannot tell an expired token
 * from a rate limit from a genuine bug. Classifying here means the UI can act
 * on the kind — reconnect, retry, or report — instead of showing one generic
 * failure for every case.
 */

export type MetaErrorKind =
  /** Token expired or revoked: the user has to reconnect. */
  | "auth"
  /** Throttled: the same request may succeed later. */
  | "rate_limit"
  /** The token is valid but lacks the permission (ads_read). */
  | "permission"
  /** We sent something wrong — a bug on our side, not the user's. */
  | "bad_request"
  /** Meta is down or answered with something unusable. */
  | "server"
  /** Network failure or timeout before any answer arrived. */
  | "network";

/** Codes are documented per-endpoint by Meta; these are the ones the insights
 *  endpoint actually returns in practice. */
const AUTH_CODES = new Set([102, 190, 463, 467]);
const RATE_LIMIT_CODES = new Set([4, 17, 32, 341, 613]);
const PERMISSION_CODES = new Set([10, 200, 272, 294]);

export class MetaApiError extends Error {
  readonly kind: MetaErrorKind;
  readonly status: number | null;
  readonly code: number | null;
  readonly subcode: number | null;
  /** Meta's request identifier — the one detail their support asks for. */
  readonly traceId: string | null;

  constructor(
    message: string,
    options: {
      kind: MetaErrorKind;
      status?: number | null;
      code?: number | null;
      subcode?: number | null;
      traceId?: string | null;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = "MetaApiError";
    this.kind = options.kind;
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.subcode = options.subcode ?? null;
    this.traceId = options.traceId ?? null;
  }

  /** Whether retrying the identical request could plausibly succeed. */
  get isRetryable(): boolean {
    return this.kind === "rate_limit" || this.kind === "server" || this.kind === "network";
  }

  /** Whether the user has to go through the OAuth flow again. */
  get requiresReconnect(): boolean {
    return this.kind === "auth" || this.kind === "permission";
  }
}

export function classifyMetaError({
  status,
  code,
  subcode,
}: {
  status: number | null;
  code: number | null;
  subcode: number | null;
}): MetaErrorKind {
  // Subcode 463 is "session expired" and arrives under the generic code 190.
  if (code !== null && AUTH_CODES.has(code)) return "auth";
  if (subcode !== null && AUTH_CODES.has(subcode)) return "auth";
  if (code !== null && RATE_LIMIT_CODES.has(code)) return "rate_limit";
  if (code !== null && PERMISSION_CODES.has(code)) return "permission";

  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status !== null && status >= 500) return "server";
  if (status !== null && status >= 400) return "bad_request";

  return "server";
}

/**
 * The user has a session but no usable Meta connection — a different problem
 * from an API failure, and it needs a different answer in the UI.
 *
 * Defined here rather than beside the service that raises it so that mapping
 * errors to UI states does not have to import a server-only module.
 */
export class NotConnectedError extends Error {
  constructor(message = "No Meta connection for this user") {
    super(message);
    this.name = "NotConnectedError";
  }
}
