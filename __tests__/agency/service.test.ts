import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";

// server-only throws on import outside a server component; it has nothing to
// contribute to a unit test.
vi.mock("server-only", () => ({}));

// vi.mock is hoisted above every const in this file, so the spies it refers to
// have to be created in a hoisted block of their own.
const { prisma, meta } = vi.hoisted(() => {
  const prisma = {
    account: { findFirst: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    client: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    adAccount: { findMany: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
  };
  const meta = { fetchAdAccounts: vi.fn(), fetchInsights: vi.fn(), fetchCampaigns: vi.fn() };
  return { prisma, meta };
});

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/meta/client", () => ({
  ...meta,
  API_VERSION: "v21.0",
  GRAPH_BASE_URL: "https://graph.facebook.com/v21.0",
}));

import { encryptToken } from "@/lib/auth/crypto";
import { addDays } from "@/lib/metrics/aggregate";

const KEY = randomBytes(32).toString("base64");
const TOKEN = "EAAB-a-real-looking-token";

const account = (id: string, name: string, currency = "EUR") => ({
  id,
  name,
  currency,
  timezone: "Africa/Casablanca",
  status: "active" as const,
});

const VISIBLE = [
  account("act_1", "Aureya Chic", "EUR"),
  account("act_2", "Aureya Chic", "USD"),
  account("act_3", "Kora Fitness"),
];

const stored = (metaId: string, name = metaId) => ({
  metaId,
  name,
  currency: "EUR",
  timezone: "Europe/Paris",
});

/**
 * The service caches per module; each test starts from a fresh one. The error
 * classes come from the same fresh module graph — after a reset, the copy
 * imported at the top of this file is a different class, and instanceof
 * checks against it would fail.
 */
async function service() {
  vi.resetModules();
  const errors = await import("@/lib/meta/errors");
  return { ...(await import("@/lib/agency/service")), errors };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TOKEN_ENCRYPTION_KEY = KEY;

  prisma.account.findFirst.mockResolvedValue({
    access_token: encryptToken(TOKEN),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  });
  prisma.user.findUnique.mockResolvedValue({ agencyName: "Atelier Nova" });
  prisma.client.findMany.mockResolvedValue([
    { id: "c1", name: "Aureya Chic", adAccounts: [stored("act_1"), stored("act_2")] },
  ]);
  prisma.adAccount.findMany.mockResolvedValue([
    { metaId: "act_1", clientId: "c1", hidden: false },
    { metaId: "act_2", clientId: "c1", hidden: false },
  ]);
  // Interactive transactions get the same mocks as their client; batched ones
  // just run.
  prisma.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === "function" ? arg(prisma) : Promise.all(arg as Promise<unknown>[])
  );

  meta.fetchAdAccounts.mockResolvedValue(VISIBLE);
  meta.fetchInsights.mockResolvedValue([]);
  meta.fetchCampaigns.mockResolvedValue([]);
});

describe("loadAgency", () => {
  it("decrypts the stored token and never passes the ciphertext to Meta", async () => {
    const { loadAgency } = await service();
    await loadAgency("user_1");
    expect(meta.fetchAdAccounts).toHaveBeenCalledWith({ accessToken: TOKEN });
    expect(meta.fetchInsights.mock.calls[0][1]).toEqual({ accessToken: TOKEN });
  });

  it("reads one row per day per account, over twice the longest period, in the account's timezone", async () => {
    const { loadAgency, HISTORY_DAYS } = await service();
    await loadAgency("user_1");

    const [request] = meta.fetchInsights.mock.calls[0];
    expect(request.level).toBe("account");
    expect(addDays(request.until, -(HISTORY_DAYS - 1))).toBe(request.since);
    expect(HISTORY_DAYS).toBe(180);
  });

  it("keeps the rest of a client when one account fails", async () => {
    const { loadAgency, errors } = await service();
    meta.fetchInsights.mockImplementation(async ({ adAccountId }: { adAccountId: string }) => {
      if (adAccountId === "act_2") throw new errors.MetaApiError("throttled", { kind: "rate_limit" });
      return [];
    });

    const data = await loadAgency("user_1");

    const [eur, usd] = data.clients[0].accounts;
    expect(eur.failure).toBeUndefined();
    expect(usd.failure).toBe("rate_limit");
  });

  it("reports an account the connection can no longer read, instead of dropping it", async () => {
    meta.fetchAdAccounts.mockResolvedValue([VISIBLE[0]]);
    const { loadAgency } = await service();

    const data = await loadAgency("user_1");

    expect(data.clients[0].accounts[1]).toMatchObject({
      account: { id: "act_2" },
      failure: "permission",
    });
    // Never asked about: reading it would be attempted in our name.
    expect(meta.fetchInsights).toHaveBeenCalledTimes(1);
  });

  it("lists accounts not yet placed in a client, but not hidden ones", async () => {
    prisma.adAccount.findMany.mockResolvedValue([
      { metaId: "act_1", clientId: "c1", hidden: false },
      { metaId: "act_2", clientId: "c1", hidden: false },
    ]);
    meta.fetchAdAccounts.mockResolvedValue([...VISIBLE, account("act_4", "Personal")]);
    prisma.adAccount.findMany.mockResolvedValueOnce([
      { metaId: "act_1", clientId: "c1", hidden: false },
      { metaId: "act_2", clientId: "c1", hidden: false },
      { metaId: "act_4", clientId: null, hidden: true },
    ]);
    const { loadAgency } = await service();

    const data = await loadAgency("user_1");

    expect(data.unassigned.map((a) => a.id)).toEqual(["act_3"]);
  });

  it("stops before calling Meta when the stored token has expired", async () => {
    prisma.account.findFirst.mockResolvedValue({
      access_token: encryptToken(TOKEN),
      expires_at: Math.floor(Date.now() / 1000) - 60,
    });
    const { loadAgency } = await service();

    await expect(loadAgency("user_1")).rejects.toMatchObject({ kind: "auth" });
    expect(meta.fetchAdAccounts).not.toHaveBeenCalled();
  });

  it("asks Meta for the account list once while it is cached", async () => {
    const { loadAgency } = await service();
    await loadAgency("user_1");
    await loadAgency("user_1");
    expect(meta.fetchAdAccounts).toHaveBeenCalledTimes(1);
  });
});

describe("loadClient", () => {
  it("answers null for a client that is not this user's, without touching Meta", async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    const { loadClient } = await service();

    await expect(loadClient("user_1", "someone-elses")).resolves.toBeNull();
    expect(prisma.client.findFirst.mock.calls[0][0].where).toEqual({
      id: "someone-elses",
      userId: "user_1",
    });
    expect(meta.fetchAdAccounts).not.toHaveBeenCalled();
  });

  it("reports on the requested account, with its campaigns", async () => {
    prisma.client.findFirst.mockResolvedValue({
      id: "c1",
      name: "Aureya Chic",
      user: { agencyName: null },
      adAccounts: [stored("act_1"), stored("act_2")],
    });
    const { loadClient } = await service();

    const detail = await loadClient("user_1", "c1", "act_2");

    expect(detail?.selected.account.id).toBe("act_2");
    expect(meta.fetchInsights.mock.calls[0][0]).toMatchObject({ adAccountId: "act_2", level: "campaign" });
    expect(meta.fetchCampaigns).toHaveBeenCalledTimes(1);
  });
});

describe("saveSetup", () => {
  beforeEach(() => {
    prisma.client.findMany.mockResolvedValue([{ id: "c1", name: "aureya chic" }]);
    prisma.client.create.mockResolvedValue({ id: "c2" });
  });

  it("refuses an account this connection cannot read, and writes nothing", async () => {
    const { saveSetup, errors } = await service();

    await expect(
      saveSetup("user_1", {
        agencyName: "",
        assignments: [{ metaId: "act_999", clientName: "Stranger", hidden: false }],
      })
    ).rejects.toBeInstanceOf(errors.NotConnectedError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("merges by name whatever the spelling, and keeps the last spelling typed", async () => {
    const { saveSetup } = await service();

    await saveSetup("user_1", {
      agencyName: "  Atelier Nova ",
      assignments: [
        { metaId: "act_1", clientName: "Aureya Chic", hidden: false },
        { metaId: "act_2", clientName: "AUREYA  chic", hidden: false },
        { metaId: "act_3", clientName: "Kora Fitness", hidden: false },
      ],
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { agencyName: "Atelier Nova" },
    });
    // One existing client reused for both spellings, one new one created.
    expect(prisma.client.create).toHaveBeenCalledTimes(1);
    expect(prisma.client.create.mock.calls[0][0].data).toEqual({ userId: "user_1", name: "Kora Fitness" });
    const clientIds = prisma.adAccount.upsert.mock.calls.map((call) => call[0].update.clientId);
    expect(clientIds).toEqual(["c1", "c1", "c2"]);
  });

  it("detaches a hidden account from any client and removes emptied clients", async () => {
    const { saveSetup } = await service();

    await saveSetup("user_1", {
      agencyName: "",
      assignments: [{ metaId: "act_1", clientName: "Aureya Chic", hidden: true }],
    });

    expect(prisma.adAccount.upsert.mock.calls[0][0].update).toEqual({ clientId: null, hidden: true });
    expect(prisma.client.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1", adAccounts: { none: {} } },
    });
  });
});
