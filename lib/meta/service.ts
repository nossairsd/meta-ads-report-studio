import "server-only";

import { prisma } from "@/lib/db";
import { decryptToken } from "@/lib/auth/crypto";
import { fetchAdAccounts, fetchInsights } from "@/lib/meta/client";
import { MetaApiError, NotConnectedError } from "@/lib/meta/errors";
import { toIsoDate } from "@/lib/metrics/aggregate";
import type { AdAccount, InsightRow } from "@/lib/metrics/schema";

/**
 * The server-side path from a signed-in user to their live figures.
 *
 * Shared by the dashboard page and the PDF endpoint so both render from
 * identical numbers. If each fetched independently, a report downloaded from a
 * dashboard could disagree with the dashboard it was downloaded from — the one
 * discrepancy a reporting tool cannot afford.
 *
 * `server-only` makes importing this from a client component a build error
 * rather than a runtime leak: this module decrypts an access token.
 */

/** Always fetch the longest window, whatever period is being displayed.
 *
 *  The client recomputes 7 and 30 days from rows already in memory, so period
 *  switching stays instant and, more importantly, costs no extra calls against
 *  a rate-limited API. */
const FETCH_PERIOD = 90;

async function getAccessToken(userId: string): Promise<string> {
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

  try {
    return decryptToken(account.access_token);
  } catch (cause) {
    // Almost always a rotated TOKEN_ENCRYPTION_KEY. The stored value can never
    // be recovered, so the honest outcome is to ask the user to reconnect.
    throw new MetaApiError("The stored Meta token could not be read", {
      kind: "auth",
      cause,
    });
  }
}

/**
 * Which ad account to report on.
 *
 * One Facebook login can expose several — an agency typically has one per
 * client, and they can share a name. The user's remembered choice wins; only
 * when there is none does the first account Meta returns get adopted, and it
 * is recorded so the dashboard does not silently switch between visits.
 *
 * Returns the full list as well, because the user has to be able to change it:
 * picking for them by arrival order is a default, not a decision.
 */
async function resolveAdAccount(
  userId: string,
  accessToken: string
): Promise<{ chosen: AdAccount; available: AdAccount[] }> {
  const remembered = await prisma.adAccount.findFirst({
    where: { userId, isDefault: true },
  });

  const available = await fetchAdAccounts({ accessToken });

  if (available.length === 0) {
    throw new NotConnectedError("This Meta user has no ad account to report on");
  }

  // Only honour the remembered choice if it is still visible to this token:
  // access can be withdrawn on Meta's side without us being told.
  const chosen =
    available.find((account) => account.id === remembered?.metaId) ?? available[0];

  if (chosen.id !== remembered?.metaId) {
    await prisma.$transaction([
      prisma.adAccount.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.adAccount.upsert({
        where: { userId_metaId: { userId, metaId: chosen.id } },
        create: {
          userId,
          metaId: chosen.id,
          name: chosen.name,
          currency: chosen.currency,
          timezone: "UTC",
          isDefault: true,
        },
        update: { name: chosen.name, currency: chosen.currency, isDefault: true },
      }),
    ]);
  }

  return { chosen, available };
}

export type LiveDashboard = {
  account: AdAccount;
  /** Every ad account this token can read, so the UI can offer a choice. */
  available: AdAccount[];
  rows: InsightRow[];
  /** Anchor for the period windows, resolved on the server so that the server
   *  and client renders agree. */
  endDate: string;
};

export async function loadLiveDashboard(userId: string): Promise<LiveDashboard> {
  const accessToken = await getAccessToken(userId);
  const { chosen, available } = await resolveAdAccount(userId, accessToken);

  const rows = await fetchInsights(
    { adAccountId: chosen.id, period: FETCH_PERIOD },
    { accessToken }
  );

  return { account: chosen, available, rows, endDate: toIsoDate(new Date()) };
}

/**
 * Records which ad account the user wants reported on.
 *
 * The requested id is checked against what this user's own token can actually
 * read, rather than trusted from the request. Without that check, anyone could
 * post an arbitrary `act_…` and have the dashboard try to read a stranger's
 * account — Meta would refuse, but the attempt should never be made in our
 * name, and the row would be written regardless.
 */
export async function selectAdAccount(userId: string, metaId: string): Promise<void> {
  const accessToken = await getAccessToken(userId);
  const available = await fetchAdAccounts({ accessToken });

  const chosen = available.find((account) => account.id === metaId);
  if (!chosen) {
    throw new NotConnectedError("That ad account is not readable with this connection");
  }

  await prisma.$transaction([
    prisma.adAccount.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.adAccount.upsert({
      where: { userId_metaId: { userId, metaId: chosen.id } },
      create: {
        userId,
        metaId: chosen.id,
        name: chosen.name,
        currency: chosen.currency,
        timezone: "UTC",
        isDefault: true,
      },
      update: { name: chosen.name, currency: chosen.currency, isDefault: true },
    }),
  ]);
}
