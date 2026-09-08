"use server";

import { signIn, signOut } from "@/lib/auth/config";

/**
 * Server actions for the connection lifecycle.
 *
 * These live in a server action rather than a client-side `signIn()` call so
 * the OAuth redirect is issued by the server: the client never has to hold the
 * provider configuration, and the flow works with JavaScript disabled.
 */

export async function connectMeta(locale: string) {
  // The locale is required rather than defaulted: every page lives under a
  // /[locale] segment, and a path without one is a 404. A default here would
  // have hidden that behind a plausible-looking constant.
  await signIn("facebook", { redirectTo: `/${locale}/dashboard` });
}

export async function disconnect(locale: string) {
  // Deletes the session row, so access ends immediately rather than when a
  // token would have expired. The Account row and its encrypted token survive:
  // signing out is not the same as revoking access, and the data-deletion page
  // covers the latter.
  await signOut({ redirectTo: `/${locale}` });
}
