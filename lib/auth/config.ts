import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Facebook from "next-auth/providers/facebook";
import type { FacebookProfile } from "next-auth/providers/facebook";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/auth/crypto";
import { withTokenEncryption } from "@/lib/auth/encrypted-adapter";
import { exchangeForLongLivedToken } from "@/lib/meta/token";
import { API_VERSION } from "@/lib/meta/client";

/**
 * Authentication.
 *
 * One provider, Facebook, requesting exactly one meaningful permission:
 * `ads_read`. Meta's review process — and any user reading the consent screen —
 * treats every extra scope as something to justify, and this app genuinely
 * never writes to a campaign, so asking for more would be both harder to get
 * approved and dishonest about what the tool does.
 */

/** Read-only access to ad statistics. `public_profile` needs no review and is
 *  what gives us a name to put on the report. */
const META_SCOPES = ["public_profile", "ads_read"].join(",");

/** The adapter's published signature names a Prisma 6/7 `PrismaClient` type
 *  that the v7 `prisma-client` generator no longer exports under that path.
 *  Taking the parameter type from the function itself keeps this honest: if
 *  the adapter's expectations change, this stops compiling. */
type AdapterPrismaClient = Parameters<typeof PrismaAdapter>[0];

export const authConfig: NextAuthConfig = {
  // Wrapped so provider tokens are encrypted before they reach the database.
  // See lib/auth/encrypted-adapter.ts.
  adapter: withTokenEncryption(PrismaAdapter(prisma as unknown as AdapterPrismaClient)),

  session: {
    // Database sessions, not JWT. A JWT stays valid until it expires, so
    // "disconnect" could not take effect immediately; a session row can be
    // deleted the moment the user asks, which is what the data-deletion page
    // promises them.
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    // Rewrite the expiry at most once a day rather than on every request.
    updateAge: 24 * 60 * 60,
  },

  providers: [
    Facebook({
      clientId: process.env.META_APP_ID,
      clientSecret: process.env.META_APP_SECRET,
      authorization: {
        // Pinned to the same Graph version the data client uses; the built-in
        // provider defaults to an older one.
        url: `https://www.facebook.com/${API_VERSION}/dialog/oauth`,
        params: { scope: META_SCOPES },
      },
      token: `https://graph.facebook.com/${API_VERSION}/oauth/access_token`,
      userinfo: {
        // No `email` field: we never request the scope that would return it.
        url: `https://graph.facebook.com/${API_VERSION}/me?fields=id,name,picture`,
      },
      profile(profile: FacebookProfile) {
        return {
          id: profile.id,
          name: typeof profile.name === "string" ? profile.name : null,
          // Without the `email` scope there is no address to store. The column
          // stays null rather than holding a placeholder that would later read
          // as real contact data.
          email: null,
          image: profile.picture?.data?.url ?? null,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * Trades the short-lived sign-in token for a long-lived one, so the stored
     * credential lasts about 60 days rather than a couple of hours.
     *
     * Done here rather than in the adapter because it has to cover both cases:
     * a first-time user, whose token is about to be written by `linkAccount`,
     * and a returning user, whose Account row already exists and would
     * otherwise keep its original token until it expired.
     */
    async signIn({ account }) {
      if (account?.provider !== "facebook" || !account.access_token) return true;

      const appId = process.env.META_APP_ID;
      const appSecret = process.env.META_APP_SECRET;
      if (!appId || !appSecret) return true;

      try {
        const longLived = await exchangeForLongLivedToken({
          shortLivedToken: account.access_token,
          appId,
          appSecret,
        });

        // Auth.js types `account` as read-only, but this object is what the
        // adapter goes on to persist for a first-time user, and amending it
        // here is the documented way to change what gets stored.
        const pending = account as { access_token?: string; expires_at?: number };
        pending.access_token = longLived.accessToken;
        if (longLived.expiresAt !== null) pending.expires_at = longLived.expiresAt;

        // For a returning user `linkAccount` is never called, so the row has to
        // be updated directly — encrypted here, since it bypasses the wrapper.
        await prisma.account.updateMany({
          where: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
          data: {
            access_token: encryptToken(longLived.accessToken),
            expires_at: longLived.expiresAt,
            scope: account.scope ?? undefined,
          },
        });
      } catch {
        // The short-lived token still works, and the dashboard already handles
        // an expired one by asking the user to reconnect. Failing the sign-in
        // here would turn a degraded connection into no connection at all.
      }

      return true;
    },

    async session({ session, user }) {
      // The database strategy hands us the user row; exposing its id lets
      // server code scope every query to the signed-in user without a second
      // lookup.
      if (session.user) session.user.id = user.id;
      return session;
    },
  },

  pages: {
    // Send failures to our own localised page rather than the unstyled
    // Auth.js default.
    error: "/",
  },

  // Trust the host header behind the deployment's proxy: on Vercel and similar
  // the request Next sees is not the public URL.
  trustHost: true,
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
