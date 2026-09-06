import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";

// server-only throws on import outside a server component; it has nothing to
// contribute to a unit test.
vi.mock("server-only", () => ({}));

// vi.mock is hoisted above every const in this file, so the spies it refers to
// have to be created in a hoisted block of their own.
const { account, adAccount, $transaction, fetchAdAccounts, fetchInsights } = vi.hoisted(() => ({
  account: { findFirst: vi.fn() },
  adAccount: { findFirst: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
  $transaction: vi.fn(async (operations: unknown[]) => operations),
  fetchAdAccounts: vi.fn(),
  fetchInsights: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { account, adAccount, $transaction } }));

vi.mock("@/lib/meta/client", () => ({
  fetchAdAccounts,
  fetchInsights,
  API_VERSION: "v21.0",
  GRAPH_BASE_URL: "https://graph.facebook.com/v21.0",
}));

import { encryptToken } from "@/lib/auth/crypto";
import { MetaApiError, NotConnectedError } from "@/lib/meta/errors";
import { loadLiveDashboard } from "@/lib/meta/service";

const KEY = randomBytes(32).toString("base64");
const TOKEN = "EAAB-a-real-looking-token";

const ACCOUNTS = [
  { id: "act_111", name: "Aureya Chic", currency: "EUR" },
  { id: "act_222", name: "Second account", currency: "USD" },
];

/** An hour from now, in the Unix seconds the Account row stores. */
const NOT_EXPIRED = Math.floor(Date.now() / 1000) + 3600;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TOKEN_ENCRYPTION_KEY = KEY;

  account.findFirst.mockResolvedValue({
    access_token: encryptToken(TOKEN),
    expires_at: NOT_EXPIRED,
  });
  adAccount.findFirst.mockResolvedValue(null);
  fetchAdAccounts.mockResolvedValue(ACCOUNTS);
  fetchInsights.mockResolvedValue([]);
});

describe("loadLiveDashboard", () => {
  it("decrypts the stored token and never passes the ciphertext to Meta", async () => {
    await loadLiveDashboard("user_1");

    expect(fetchAdAccounts).toHaveBeenCalledWith({ accessToken: TOKEN });
    expect(fetchInsights.mock.calls[0][1]).toEqual({ accessToken: TOKEN });
  });

  it("always fetches the longest window, whatever will be displayed", () => {
    // 7 and 30 days are recomputed in the browser from these rows; refetching
    // per period would multiply calls against a rate-limited API.
    return loadLiveDashboard("user_1").then(() => {
      expect(fetchInsights.mock.calls[0][0]).toMatchObject({ period: 90 });
    });
  });

  it("reports a user with no linked account as not connected", async () => {
    account.findFirst.mockResolvedValue(null);
    await expect(loadLiveDashboard("user_1")).rejects.toBeInstanceOf(NotConnectedError);
  });

  it("reports a linked account carrying no token as not connected", async () => {
    account.findFirst.mockResolvedValue({ access_token: null, expires_at: null });
    await expect(loadLiveDashboard("user_1")).rejects.toBeInstanceOf(NotConnectedError);
  });

  it("refuses an expired token without spending a round trip on it", async () => {
    account.findFirst.mockResolvedValue({
      access_token: encryptToken(TOKEN),
      expires_at: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(loadLiveDashboard("user_1")).rejects.toMatchObject({ kind: "auth" });
    expect(fetchAdAccounts).not.toHaveBeenCalled();
  });

  it("accepts a token whose expiry Meta never supplied", async () => {
    account.findFirst.mockResolvedValue({ access_token: encryptToken(TOKEN), expires_at: null });
    await expect(loadLiveDashboard("user_1")).resolves.toBeTruthy();
  });

  it("asks the user to reconnect when the stored token cannot be decrypted", async () => {
    // The realistic cause is a rotated TOKEN_ENCRYPTION_KEY: the value can
    // never be recovered, so reconnecting is the only honest way out.
    account.findFirst.mockResolvedValue({
      access_token: encryptToken(TOKEN, Buffer.from(randomBytes(32))),
      expires_at: NOT_EXPIRED,
    });

    const error = await loadLiveDashboard("user_1").catch((e) => e);
    expect(error).toBeInstanceOf(MetaApiError);
    expect(error.kind).toBe("auth");
  });

  it("never puts the token in the message of an error it raises", async () => {
    account.findFirst.mockResolvedValue({ access_token: "not-decryptable", expires_at: null });

    const error = await loadLiveDashboard("user_1").catch((e) => e);
    expect(String(error.message)).not.toContain("not-decryptable");
  });

  it("reports a Meta user with no ad account as not connected", async () => {
    fetchAdAccounts.mockResolvedValue([]);
    await expect(loadLiveDashboard("user_1")).rejects.toBeInstanceOf(NotConnectedError);
  });

  it("honours the account the user previously settled on", async () => {
    adAccount.findFirst.mockResolvedValue({ metaId: "act_222" });

    const { account: chosen } = await loadLiveDashboard("user_1");
    expect(chosen.id).toBe("act_222");
    // Nothing changed, so nothing should be written.
    expect($transaction).not.toHaveBeenCalled();
  });

  it("falls back to the first account when the remembered one is no longer visible", async () => {
    // Access can be withdrawn on Meta's side without us being told.
    adAccount.findFirst.mockResolvedValue({ metaId: "act_gone" });

    const { account: chosen } = await loadLiveDashboard("user_1");
    expect(chosen.id).toBe("act_111");
  });

  it("records the choice, so the dashboard does not switch accounts between visits", async () => {
    await loadLiveDashboard("user_1");

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(adAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_metaId: { userId: "user_1", metaId: "act_111" } },
      })
    );
    // The previous default has to be cleared in the same transaction, or two
    // rows would claim to be the default.
    expect(adAccount.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDefault: false } })
    );
  });

  it("scopes every lookup to the signed-in user", async () => {
    await loadLiveDashboard("user_1");

    expect(account.findFirst.mock.calls[0][0].where).toMatchObject({ userId: "user_1" });
    expect(adAccount.findFirst.mock.calls[0][0].where).toMatchObject({ userId: "user_1" });
  });

  it("returns the rows and an anchor date for the period windows", async () => {
    const rows = [{ date: "2026-09-01", campaignId: "c1" }];
    fetchInsights.mockResolvedValue(rows);

    const result = await loadLiveDashboard("user_1");
    expect(result.rows).toBe(rows);
    expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("lets a Meta failure through unchanged, so the UI can classify it", async () => {
    fetchInsights.mockRejectedValue(new MetaApiError("throttled", { kind: "rate_limit" }));
    await expect(loadLiveDashboard("user_1")).rejects.toMatchObject({ kind: "rate_limit" });
  });
});
