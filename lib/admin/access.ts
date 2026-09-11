import "server-only";

import { prisma } from "@/lib/db";

/**
 * Who may review early-access requests.
 *
 * Configured, not stored: the list of admins is a deployment decision, and
 * keeping it out of the database means no request — and no bug in a form —
 * can ever grant it. Identified by Meta user id, the one identifier every
 * signed-in user has (Meta gives this app no email address).
 */
function adminMetaIds(): string[] {
  return (process.env.ADMIN_META_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function isAdmin(userId: string): Promise<boolean> {
  const ids = adminMetaIds();
  if (ids.length === 0) return false;

  const account = await prisma.account.findFirst({
    where: { userId, provider: "facebook", providerAccountId: { in: ids } },
    select: { id: true },
  });
  return account !== null;
}
