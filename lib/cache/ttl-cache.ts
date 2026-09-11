/**
 * A small time-bounded cache of promises.
 *
 * An agency overview reads every client's accounts. Without a cache, opening a
 * client and coming back re-reads all of them against a rate-limited API — so
 * a busy agency could exhaust its Meta quota just by clicking around.
 *
 * Three properties matter more than the caching itself:
 *
 * - Concurrent requests for the same key share one call. Two components asking
 *   for the same account in one render must not double the traffic.
 * - Failures are not cached. A transient Meta error must not stick for the
 *   whole lifetime of an entry.
 * - Size is bounded, oldest out first, so memory cannot grow with the number of
 *   accounts ever viewed.
 *
 * Per server instance, and deliberately so: nothing leaves the process, so a
 * cached figure can never be served to anyone but the request that keyed it.
 */
export function createTtlCache<T>({
  ttlMs,
  maxEntries = 500,
  now = Date.now,
}: {
  ttlMs: number;
  maxEntries?: number;
  /** Injectable so tests control time. */
  now?: () => number;
}) {
  const store = new Map<string, { value: Promise<T>; expires: number }>();

  return {
    getOrLoad(key: string, load: () => Promise<T>): Promise<T> {
      const hit = store.get(key);
      if (hit && hit.expires > now()) {
        // Re-insert so iteration order tracks recency: eviction takes the
        // least recently used entry, not merely the oldest written.
        store.delete(key);
        store.set(key, hit);
        return hit.value;
      }

      const value = load();
      store.set(key, { value, expires: now() + ttlMs });

      value.catch(() => {
        // Only remove the entry if it is still this attempt — a newer load may
        // already have replaced it.
        if (store.get(key)?.value === value) store.delete(key);
      });

      while (store.size > maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest === undefined) break;
        store.delete(oldest);
      }

      return value;
    },

    delete(key: string) {
      store.delete(key);
    },

    clear() {
      store.clear();
    },

    get size() {
      return store.size;
    },
  };
}
