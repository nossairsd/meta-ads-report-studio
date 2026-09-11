import { describe, it, expect, vi } from "vitest";
import { createTtlCache } from "@/lib/cache/ttl-cache";

describe("createTtlCache", () => {
  it("serves a cached value within its lifetime", async () => {
    let time = 0;
    const cache = createTtlCache<number>({ ttlMs: 1_000, now: () => time });
    const load = vi.fn(async () => 42);

    await cache.getOrLoad("k", load);
    time = 999;
    await cache.getOrLoad("k", load);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reloads once the entry has expired", async () => {
    let time = 0;
    const cache = createTtlCache<number>({ ttlMs: 1_000, now: () => time });
    const load = vi.fn(async () => 42);

    await cache.getOrLoad("k", load);
    time = 1_000;
    await cache.getOrLoad("k", load);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one call between concurrent requests for the same key", async () => {
    const cache = createTtlCache<number>({ ttlMs: 1_000 });
    let resolve!: (v: number) => void;
    const load = vi.fn(() => new Promise<number>((r) => (resolve = r)));

    const first = cache.getOrLoad("k", load);
    const second = cache.getOrLoad("k", load);
    resolve(7);

    await expect(Promise.all([first, second])).resolves.toEqual([7, 7]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not keep a failure, so the next request tries again", async () => {
    const cache = createTtlCache<number>({ ttlMs: 60_000 });
    const failing = vi.fn(async () => {
      throw new Error("Meta is down");
    });

    await expect(cache.getOrLoad("k", failing)).rejects.toThrow("Meta is down");
    // Let the rejection handler run.
    await Promise.resolve();

    const load = vi.fn(async () => 1);
    await expect(cache.getOrLoad("k", load)).resolves.toBe(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("evicts the least recently used entry beyond its size", async () => {
    const cache = createTtlCache<string>({ ttlMs: 60_000, maxEntries: 2 });
    await cache.getOrLoad("a", async () => "a");
    await cache.getOrLoad("b", async () => "b");
    // Touch "a" so "b" becomes the least recently used.
    await cache.getOrLoad("a", async () => "never");
    await cache.getOrLoad("c", async () => "c");

    expect(cache.size).toBe(2);
    const reloadB = vi.fn(async () => "b2");
    await cache.getOrLoad("b", reloadB);
    expect(reloadB).toHaveBeenCalledTimes(1);
  });
});
