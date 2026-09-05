import { MetaApiError, NotConnectedError, type MetaErrorKind } from "@/lib/meta/errors";

/**
 * Turns a failure into something a user can act on.
 *
 * The distinction that matters is not the HTTP status but what the person in
 * front of the screen should do next: reconnect, wait, grant a permission, or
 * simply try again. Everything below maps to one of those.
 */

export type DashboardFailure = {
  /** Key under the `Dashboard.failure` namespace. */
  messageKey: string;
  /** Whether reconnecting to Meta is what would fix it. A retry button on an
   *  expired token just fails again, which reads as the app being broken. */
  needsReconnect: boolean;
  /** Technical detail, shown small — it is what a user quotes in a bug report. */
  detail: string | null;
};

const BY_KIND: Record<MetaErrorKind, { messageKey: string; needsReconnect: boolean }> = {
  auth: { messageKey: "expired", needsReconnect: true },
  permission: { messageKey: "permission", needsReconnect: true },
  rate_limit: { messageKey: "rateLimit", needsReconnect: false },
  network: { messageKey: "network", needsReconnect: false },
  server: { messageKey: "server", needsReconnect: false },
  bad_request: { messageKey: "unexpected", needsReconnect: false },
};

/** The deployment has no Meta credentials at all. Not a Meta failure — nothing
 *  was ever sent — and the person who can fix it is the operator, not the
 *  visitor, so it offers no reconnect button. */
export const NOT_CONFIGURED: DashboardFailure = {
  messageKey: "notConfigured",
  needsReconnect: false,
  detail: null,
};

export function toDashboardFailure(error: unknown): DashboardFailure {
  if (error instanceof NotConnectedError) {
    return { messageKey: "notConnected", needsReconnect: true, detail: null };
  }

  if (error instanceof MetaApiError) {
    const { messageKey, needsReconnect } = BY_KIND[error.kind];
    return {
      messageKey,
      needsReconnect,
      // Meta's trace id is the one detail their support asks for; without it a
      // report of "it failed" cannot be investigated.
      detail: error.traceId ? `Meta trace ${error.traceId}` : null,
    };
  }

  // Anything unrecognised is ours, not the user's. Do not surface its message:
  // an internal error string can carry a path, a query, or worse.
  return { messageKey: "unexpected", needsReconnect: false, detail: null };
}
