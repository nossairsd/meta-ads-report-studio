/**
 * A sliding-window rate limiter, in memory.
 *
 * Built for the report endpoint: each PDF costs a render and, for a live
 * report, calls against Meta's rate-limited API. The endpoint is public for
 * the demo, so without a ceiling one script could keep the server busy and
 * burn the app's Meta quota for every other agency.
 *
 * Per server instance. On a platform running several instances the effective
 * limit is the per-instance limit times the instance count — still a ceiling,
 * which is the point; an exact global limit would need a shared store such as
 * Redis, and is not worth one more service at this size.
 */
export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  /** Bounds memory against a flood of distinct keys (spoofed addresses). */
  maxKeys?: number;
  /** Injectable so tests control time. */
  now?: () => number;
}) {
  const hits = new Map<string, number[]>();

  return {
    /**
     * Records an attempt and says whether it is allowed. A refused attempt is
     * not recorded, so a client that backs off regains access on schedule
     * instead of extending its own penalty.
     */
    check(key: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
      const current = now();
      const recent = (hits.get(key) ?? []).filter((t) => t > current - windowMs);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - current) / 1000)),
        };
      }

      recent.push(current);
      // Re-inserted so the oldest keys are the first evicted.
      hits.delete(key);
      hits.set(key, recent);

      while (hits.size > maxKeys) {
        const oldest = hits.keys().next().value;
        if (oldest === undefined) break;
        hits.delete(oldest);
      }

      return { allowed: true };
    },
  };
}

/**
 * The caller's address, from the proxy header the hosting platform sets.
 * The first entry is the client; later ones are proxies. Falls back to a
 * shared bucket rather than no limit at all.
 */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
