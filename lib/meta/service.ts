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
 * One Facebook login can expose several. The user's remembered choice wins;
 * otherwise the first account Meta returns is adopted and recorded, so the
 * dashboard does not silently switch accounts between visits.
 */
async function resolveAdAccount(userId: string, accessToken: string): Promise<AdAccount> {
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

  return chosen;
}

export type LiveDashboard = {
  account: AdAccount;
  rows: InsightRow[];
  /** Anchor for the period windows, resolved on the server so that the server
   *  and client renders agree. */
  endDate: string;
};

export async function loadLiveDashboard(userId: string): Promise<LiveDashboard> {
  const accessToken = await getAccessToken(userId);
  const account = await resolveAdAccount(userId, accessToken);

  const rows = await fetchInsights(
    { adAccountId: account.id, period: FETCH_PERIOD },
    { accessToken }
  );

  return { account, rows, endDate: toIsoDate(new Date()) };
}
