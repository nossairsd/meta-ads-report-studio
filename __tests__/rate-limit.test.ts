import { describe, it, expect } from "vitest";
import { clientAddress, createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit within the window, then refuses", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => 0 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("counts each key separately", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("lets attempts back in as they leave the window", () => {
    let time = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => time });
    limiter.check("a");
    time = 30_000;
    limiter.check("a");

    time = 59_999;
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 1 });

    // The first attempt has aged out; the second has not.
    time = 60_000;
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("does not extend the penalty for refused attempts", () => {
    let time = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, now: () => time });
    limiter.check("a");
    time = 5_000;
    limiter.check("a");
    limiter.check("a");
    time = 10_000;
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("keeps memory bounded however many keys arrive", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2, now: () => 0 });
    limiter.check("a");
    limiter.check("b");
    limiter.check("c");
    // "a" was evicted, so it starts afresh.
    expect(limiter.check("a").allowed).toBe(true);
  });
});

describe("clientAddress", () => {
  const request = (headers: Record<string, string>) =>
    new Request("http://localhost/api/report", { headers });

  it("takes the client, not the proxies, from x-forwarded-for", () => {
    expect(clientAddress(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to one shared bucket", () => {
    expect(clientAddress(request({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientAddress(request({}))).toBe("unknown");
  });
});
