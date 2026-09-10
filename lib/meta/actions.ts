"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth/config";
import { selectAdAccount } from "@/lib/meta/service";

/**
 * Server actions about the connected ad account.
 *
 * Kept apart from lib/auth/actions on purpose. That module is imported by the
 * landing page's connect button — a client component — and putting these here
 * stops it dragging the server-only Meta service, and everything that decrypts
 * a token, into the client module graph.
 */

/**
 * Switches which ad account the dashboard reports on.
 *
 * The session is read here rather than taking a user id from the caller: a
 * server action is a public HTTP endpoint, so anything it accepts as an
 * argument is attacker-controlled.
 */
export async function chooseAdAccount(metaId: string, locale: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not signed in");
  }

  await selectAdAccount(session.user.id, metaId);

  // The dashboard is force-dynamic, but the router cache would still serve the
  // previous account's figures on the way back.
  revalidatePath(`/${locale}/dashboard`);
}
