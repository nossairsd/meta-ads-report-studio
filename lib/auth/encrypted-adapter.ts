import type { Adapter, AdapterAccount } from "@auth/core/adapters";
import { decryptToken, encryptToken } from "@/lib/auth/crypto";

/**
 * Wraps an Auth.js adapter so provider tokens are encrypted at rest.
 *
 * The Prisma adapter writes the provider's token response to the Account row
 * verbatim, which would leave a live, read-capable Meta credential sitting in
 * plaintext in the database and in every backup of it. Rather than encrypt
 * after the fact — which leaves a window where the plaintext is already
 * committed — this intercepts the write, so the unencrypted value never
 * reaches the database at all.
 *
 * Wrapping the adapter rather than replacing it keeps the upstream
 * implementation, and its future fixes, in play.
 */

/** The Account fields that carry a credential. `expires_at` and `scope` are
 *  deliberately left readable: they are needed for queries and are not secret. */
const ENCRYPTED_FIELDS = ["access_token", "refresh_token", "id_token"] as const;

type EncryptedField = (typeof ENCRYPTED_FIELDS)[number];

function mapTokenFields(
  account: AdapterAccount,
  transform: (value: string) => string
): AdapterAccount {
  const result = { ...account };

  for (const field of ENCRYPTED_FIELDS) {
    const value = result[field as EncryptedField];
    if (typeof value === "string" && value.length > 0) {
      result[field as EncryptedField] = transform(value);
    }
  }

  return result;
}

export function encryptAccountTokens(account: AdapterAccount): AdapterAccount {
  return mapTokenFields(account, (value) => encryptToken(value));
}

export function decryptAccountTokens(account: AdapterAccount): AdapterAccount {
  return mapTokenFields(account, (value) => decryptToken(value));
}

export function withTokenEncryption(adapter: Adapter): Adapter {
  return {
    ...adapter,

    async linkAccount(account) {
      const linked = await adapter.linkAccount?.(encryptAccountTokens(account));
      // The return value flows back into the sign-in callback, which should see
      // the account as it was handed to us, not the ciphertext.
      // `undefined` rather than the falsy value itself: the upstream signature
      // permits void, and returning null would not satisfy it.
      return linked ? decryptAccountTokens(linked as AdapterAccount) : undefined;
    },

    async getAccount(providerAccountId, provider) {
      const account = await adapter.getAccount?.(providerAccountId, provider);
      return account ? decryptAccountTokens(account) : null;
    },
  };
}
