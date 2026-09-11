import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsert, headerStore } = vi.hoisted(() => ({
  upsert: vi.fn(),
  headerStore: { ip: "203.0.113.1" },
}));

vi.mock("@/lib/db", () => ({ prisma: { earlyAccessRequest: { upsert } } }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": headerStore.ip }),
}));

import { requestEarlyAccess } from "@/lib/early-access/actions";

const valid = {
  name: "Anna Martin",
  email: "  Anna@Studio-Nova.com ",
  agency: "Studio Nova",
  clientCount: "6-20",
  message: "Monthly reports for 8 clients",
  locale: "fr",
};

let ip = 0;
beforeEach(() => {
  vi.clearAllMocks();
  upsert.mockResolvedValue({});
  // A fresh address per test, so the module-level rate limiter never carries
  // one test's requests into the next.
  headerStore.ip = `203.0.113.${++ip}`;
});

describe("requestEarlyAccess", () => {
  it("records one request per email address, normalised", async () => {
    await expect(requestEarlyAccess(valid)).resolves.toEqual({ ok: true });

    const call = upsert.mock.calls[0][0];
    expect(call.where).toEqual({ email: "anna@studio-nova.com" });
    expect(call.create).toMatchObject({ name: "Anna Martin", clientCount: "6-20", locale: "fr" });
    // Asking again must not reset a decision already taken.
    expect(call.update).not.toHaveProperty("status");
  });

  it("names the fields that are wrong", async () => {
    const result = await requestEarlyAccess({ ...valid, email: "not-an-email", clientCount: "1000" });
    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(result.ok === false && result.fields?.sort()).toEqual(["clientCount", "email"]);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("bounds what the public form can store", async () => {
    const result = await requestEarlyAccess({ ...valid, message: "x".repeat(1001) });
    expect(result).toMatchObject({ ok: false, fields: ["message"] });
  });

  it("drops a request whose hidden field a bot filled in, while claiming success", async () => {
    await expect(requestEarlyAccess({ ...valid, website: "http://spam.example" })).resolves.toEqual({
      ok: true,
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("limits how many requests one address can send", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(requestEarlyAccess(valid)).resolves.toEqual({ ok: true });
    }
    await expect(requestEarlyAccess(valid)).resolves.toEqual({ ok: false, error: "rate_limited" });
  });

  it("reports a storage failure without leaking it", async () => {
    upsert.mockRejectedValue(new Error("connection string with password"));
    await expect(requestEarlyAccess(valid)).resolves.toEqual({ ok: false, error: "failed" });
  });
});
