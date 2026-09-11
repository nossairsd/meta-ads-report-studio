import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/auth/crypto";
import { fetchAdAccounts, fetchCampaigns, fetchInsights } from "@/lib/meta/client";
import { MetaApiError, NotConnectedError } from "@/lib/meta/errors";
import { createTtlCache } from "@/lib/cache/ttl-cache";
import { addDays } from "@/lib/metrics/aggregate";
import type { InsightRow } from "@/lib/metrics/schema";
import { normalizeName, suggestClients } from "./grouping";
import { todayInTimeZone } from "./timezone";
import type {
  AgencyAccount,
  AgencyData,
  CampaignMeta,
  ClientDetail,
  FailureKind,
  LoadedAccount,
} from "./types";

/**
 * The server-side path from a signed-in agency to its clients' live figures.
 *
 * Shared by the pages and the PDF endpoint so both render from identical
 * numbers: a report downloaded from a dashboard must never disagree with the
 * dashboard it was downloaded from.
 *
 * `server-only` makes importing this from a client component a build error
 * rather than a runtime leak: this module decrypts an access token.
 */

/** The longest period plus the one before it, so every comparison has a
 *  baseline. Periods are recomputed from these rows in the browser, so
 *  switching between them costs no call against a rate-limited API. */
export const HISTORY_DAYS = 180;

/** Accounts read at once. An agency with thirty accounts must not fire thirty
 *  simultaneous calls and trip Meta's per-app throttling on its own. */
const CONCURRENCY = 4;

const accountsCache = createTtlCache<AgencyAccount[]>({ ttlMs: 5 * 60_000 });
const insightsCache = createTtlCache<InsightRow[]>({ ttlMs: 10 * 60_000 });
const campaignsCache = createTtlCache<CampaignMeta[]>({ ttlMs: 10 * 60_000 });

type Connection = { accessToken: string; cacheKey: string };

async function getConnection(userId: string): Promise<Connection> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "facebook" },
    select: { access_token: true, expires_at: true },
  });

  if (!account?.access_token) {
    throw new NotConnectedError();
  }

  // A token past its expiry will be refused by Meta anyway; failing here saves
  // the round trip and gives the UI a precise reason to show.
  if (account.expires_at !== null && account.expires_at * 1000 < Date.now()) {
    throw new MetaApiError("The Meta connection has expired", { kind: "auth" });
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(account.access_token);
  } catch (cause) {
    // Almost always a rotated TOKEN_ENCRYPTION_KEY. The stored value can never
    // be recovered, so the honest outcome is to ask the user to reconnect.
    throw new MetaApiError("The stored Meta token could not be read", { kind: "auth", cause });
  }

  // Cache entries are keyed by the token itself, hashed. Whatever a token can
  // read is exactly what its cached results may show: a reconnect with fewer
  // accounts starts from a clean slate, and no entry can answer for anyone
  // else. The hash keeps the token out of memory dumps of the cache.
  const cacheKey = createHash("sha256").update(accessToken).digest("base64url").slice(0, 22);
  return { accessToken, cacheKey };
}

function listAccounts({ accessToken, cacheKey }: Connection) {
  return accountsCache.getOrLoad(cacheKey, () => fetchAdAccounts({ accessToken }));
}

function toFailureKind(error: unknown): FailureKind {
  if (error instanceof MetaApiError) {
    return error.kind === "bad_request" ? "unexpected" : error.kind;
  }
  return "unexpected";
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * One account's history. Never throws: a failure is recorded on the result so
 * one expired or throttled account cannot blank an agency's whole view.
 */
async function loadAccount(
  connection: Connection,
  account: AgencyAccount,
  level: "account" | "campaign"
): Promise<LoadedAccount> {
  const endDate = todayInTimeZone(account.timezone);
  const since = addDays(endDate, -(HISTORY_DAYS - 1));
  // The date is part of the key, so the window moves at the account's own
  // midnight rather than whenever the entry happens to expire.
  const key = `${connection.cacheKey}:${account.id}:${level}:${endDate}`;

  try {
    const rows = await insightsCache.getOrLoad(key, () =>
      fetchInsights(
        { adAccountId: account.id, since, until: endDate, level },
        { accessToken: connection.accessToken }
      )
    );
    return { account, rows, endDate };
  } catch (error) {
    return { account, rows: [], endDate, failure: toFailureKind(error) };
  }
}

type StoredAccount = {
  metaId: string;
  name: string;
  currency: string;
  timezone: string;
};

/** An account the agency placed in a client but this connection can no longer
 *  read — access withdrawn on Meta's side. Shown as a failure, not dropped: a
 *  client silently losing an account would under-report its spend. */
function unreachable(row: StoredAccount): LoadedAccount {
  return {
    account: {
      id: row.metaId,
      name: row.name,
      currency: row.currency,
      timezone: row.timezone,
      status: "unknown",
    },
    rows: [],
    endDate: todayInTimeZone(row.timezone),
    failure: "permission",
  };
}

/** Everything the agency overview needs: every client, every account, one
 *  row per account per day. */
export async function loadAgency(userId: string): Promise<AgencyData> {
  const connection = await getConnection(userId);

  const [visible, user, clients, stored] = await Promise.all([
    listAccounts(connection),
    prisma.user.findUnique({ where: { id: userId }, select: { agencyName: true } }),
    prisma.client.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        adAccounts: {
          where: { hidden: false },
          orderBy: { name: "asc" },
          select: { metaId: true, name: true, currency: true, timezone: true },
        },
      },
    }),
    prisma.adAccount.findMany({
      where: { userId },
      select: { metaId: true, clientId: true, hidden: true },
    }),
  ]);

  const byId = new Map(visible.map((account) => [account.id, account]));

  // Every account to read, across all clients, through one bounded queue.
  const wanted = clients.flatMap((client) => client.adAccounts);
  const loaded = await mapWithConcurrency(wanted, CONCURRENCY, (row) => {
    const live = byId.get(row.metaId);
    return live ? loadAccount(connection, live, "account") : Promise.resolve(unreachable(row));
  });
  const loadedById = new Map(loaded.map((entry) => [entry.account.id, entry]));

  // New accounts appear on Meta's side without us being told; they are listed
  // so the agency can place them, never silently added to a client.
  const placed = new Set(
    stored.filter((row) => row.clientId !== null || row.hidden).map((row) => row.metaId)
  );

  return {
    agencyName: user?.agencyName ?? null,
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      accounts: client.adAccounts.map((row) => loadedById.get(row.metaId)!),
    })),
    unassigned: visible.filter((account) => !placed.has(account.id)),
  };
}

/**
 * One client, reported account by account.
 *
 * Returns null for a client that does not exist or belongs to someone else —
 * the query is scoped to the user, so another agency's client id is simply not
 * found, and the page answers 404 rather than confirming it exists.
 */
export async function loadClient(
  userId: string,
  clientId: string,
  accountId?: string
): Promise<ClientDetail | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: {
      id: true,
      name: true,
      user: { select: { agencyName: true } },
      adAccounts: {
        where: { hidden: false },
        orderBy: { name: "asc" },
        select: { metaId: true, name: true, currency: true, timezone: true },
      },
    },
  });
  if (!client || client.adAccounts.length === 0) return null;

  const connection = await getConnection(userId);
  const visible = new Map((await listAccounts(connection)).map((a) => [a.id, a]));

  const accounts = client.adAccounts.map(
    (row) => visible.get(row.metaId) ?? unreachable(row).account
  );
  const chosen = accounts.find((account) => account.id === accountId) ?? accounts[0];
  const live = visible.get(chosen.id);

  if (!live) {
    return {
      agencyName: client.user.agencyName,
      client: { id: client.id, name: client.name },
      accounts,
      selected: unreachable(client.adAccounts.find((row) => row.metaId === chosen.id)!),
      campaigns: [],
    };
  }

  const [selected, campaigns] = await Promise.all([
    loadAccount(connection, live, "campaign"),
    campaignsCache
      .getOrLoad(`${connection.cacheKey}:${live.id}:campaigns:${todayInTimeZone(live.timezone)}`, () =>
        fetchCampaigns(
          { adAccountId: live.id, today: todayInTimeZone(live.timezone) },
          { accessToken: connection.accessToken }
        )
      )
      // Campaign metadata enriches the table; without it the figures still
      // stand, so its failure is not the page's failure.
      .catch(() => [] as CampaignMeta[]),
  ]);

  return {
    agencyName: client.user.agencyName,
    client: { id: client.id, name: client.name },
    accounts,
    selected,
    campaigns,
  };
}

/** What the sidebar shows: from the database only, so the frame renders at
 *  once without waiting on Meta. */
export async function loadShell(userId: string) {
  const [user, clients] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { agencyName: true } }),
    prisma.client.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { agencyName: user?.agencyName ?? null, clients };
}

export type SetupRow = {
  account: AgencyAccount;
  clientName: string;
  hidden: boolean;
  /** True when the name is a proposal the agency has not confirmed yet. */
  suggested: boolean;
};

/**
 * What the organisation screen shows: every readable account, with the client
 * it belongs to — or, for a new one, a proposed client name.
 *
 * Also records each account's current name, currency and timezone, which Meta
 * may have changed since it was first seen.
 */
export async function loadSetup(userId: string): Promise<{
  agencyName: string | null;
  rows: SetupRow[];
}> {
  const connection = await getConnection(userId);
  const visible = await listAccounts(connection);

  if (visible.length === 0) {
    throw new NotConnectedError("This Meta user has no ad account to report on");
  }

  await prisma.$transaction(
    visible.map((account) =>
      prisma.adAccount.upsert({
        where: { userId_metaId: { userId, metaId: account.id } },
        create: {
          userId,
          metaId: account.id,
          name: account.name,
          currency: account.currency,
          timezone: account.timezone,
        },
        update: { name: account.name, currency: account.currency, timezone: account.timezone },
      })
    )
  );

  const [user, stored] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { agencyName: true } }),
    prisma.adAccount.findMany({
      where: { userId },
      select: { metaId: true, hidden: true, client: { select: { name: true } } },
    }),
  ]);
  const storedById = new Map(stored.map((row) => [row.metaId, row]));

  // Proposals for accounts not yet placed. A proposal that matches an existing
  // client joins it, so a brand's new account lands with its siblings.
  const existing = new Map(
    stored.flatMap((row) => (row.client ? [[normalizeName(row.client.name), row.client.name]] : []))
  );
  const proposal = new Map<string, string>();
  for (const group of suggestClients(visible.filter((a) => !storedById.get(a.id)?.client))) {
    const name = existing.get(normalizeName(group.name)) ?? group.name;
    for (const id of group.accountIds) proposal.set(id, name);
  }

  return {
    agencyName: user?.agencyName ?? null,
    rows: visible.map((account) => {
      const row = storedById.get(account.id);
      return {
        account,
        clientName: row?.client?.name ?? proposal.get(account.id) ?? account.name,
        hidden: row?.hidden ?? false,
        suggested: !row?.client,
      };
    }),
  };
}

export type Assignment = { metaId: string; clientName: string; hidden: boolean };

/**
 * Saves the agency's arrangement of accounts into clients.
 *
 * Accounts are assigned by client name, grouped the way names are compared
 * everywhere else — so typing an existing client's name, in any case, is how
 * two groups are merged, and a client left with no account disappears.
 *
 * Every account id is checked against what this user's own token can read.
 * Otherwise a crafted request could file an arbitrary `act_…` under a client,
 * and the next overview would try to read a stranger's account in our name.
 */
export async function saveSetup(
  userId: string,
  { agencyName, assignments }: { agencyName: string; assignments: Assignment[] }
): Promise<void> {
  const connection = await getConnection(userId);
  const visible = new Map((await listAccounts(connection)).map((a) => [a.id, a]));

  const accepted = assignments.filter((a) => visible.has(a.metaId));
  if (accepted.length !== assignments.length) {
    throw new NotConnectedError("An ad account is not readable with this connection");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { agencyName: agencyName.trim() || null },
    });

    const current = await tx.client.findMany({ where: { userId }, select: { id: true, name: true } });
    const idByKey = new Map(current.map((client) => [normalizeName(client.name), client.id]));

    for (const assignment of accepted) {
      const account = visible.get(assignment.metaId)!;
      const name = assignment.clientName.trim();
      let clientId: string | null = null;

      if (name && !assignment.hidden) {
        const key = normalizeName(name) || name;
        clientId = idByKey.get(key) ?? null;
        if (clientId) {
          // The spelling typed last wins: renaming "aureya chic" to
          // "Aureya Chic" is a correction, not a new client.
          await tx.client.update({ where: { id: clientId }, data: { name } });
        } else {
          clientId = (await tx.client.create({ data: { userId, name }, select: { id: true } })).id;
          idByKey.set(key, clientId);
        }
      }

      await tx.adAccount.upsert({
        where: { userId_metaId: { userId, metaId: account.id } },
        create: {
          userId,
          metaId: account.id,
          name: account.name,
          currency: account.currency,
          timezone: account.timezone,
          clientId,
          hidden: assignment.hidden,
        },
        update: { clientId, hidden: assignment.hidden },
      });
    }

    await tx.client.deleteMany({ where: { userId, adAccounts: { none: {} } } });
  });
}
