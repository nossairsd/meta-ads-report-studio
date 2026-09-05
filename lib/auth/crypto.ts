import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Encryption at rest for the Meta access token.
 *
 * The token grants read access to a client's ad account, so it must not sit in
 * the database in plaintext: anyone with a copy of a backup, or read access to
 * the row, would otherwise hold a usable credential. AES-256-GCM is
 * authenticated, so a tampered ciphertext fails to decrypt rather than
 * silently yielding altered bytes.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12; // 96 bits, the size GCM is specified for
const VERSION = "v1";

export class TokenCryptoError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TokenCryptoError";
  }
}

/**
 * Reads the key from a base64 env var.
 *
 * Read at call time rather than module load so importing this file never
 * crashes a build that has no secrets configured — the failure belongs at the
 * moment a token is actually handled.
 */
export function getEncryptionKey(rawKey = process.env.TOKEN_ENCRYPTION_KEY): Buffer {
  if (!rawKey) {
    throw new TokenCryptoError(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32"
    );
  }

  let key: Buffer;
  try {
    key = Buffer.from(rawKey, "base64");
  } catch (cause) {
    throw new TokenCryptoError("TOKEN_ENCRYPTION_KEY is not valid base64", { cause });
  }

  if (key.length !== KEY_BYTES) {
    throw new TokenCryptoError(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}`
    );
  }
  return key;
}

/**
 * Returns `v1.<iv>.<tag>.<ciphertext>`, all base64.
 *
 * The version prefix means the scheme can be rotated later while still
 * decrypting rows written by the old one, instead of orphaning every stored
 * token the day the algorithm changes.
 */
export function encryptToken(plaintext: string, key = getEncryptionKey()): string {
  if (plaintext.length === 0) {
    throw new TokenCryptoError("Refusing to encrypt an empty token");
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptToken(payload: string, key = getEncryptionKey()): string {
  const parts = payload.split(".");
  if (parts.length !== 4) {
    throw new TokenCryptoError("Malformed encrypted token");
  }

  const [version, ivB64, tagB64, ciphertextB64] = parts;
  if (version !== VERSION) {
    throw new TokenCryptoError(`Unsupported token encryption version: ${version}`);
  }

  try {
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (cause) {
    // A wrong key and a tampered ciphertext both land here, and the message
    // deliberately does not say which: distinguishing them would tell an
    // attacker whether they had guessed the key.
    throw new TokenCryptoError("Could not decrypt token", { cause });
  }
}

/** Constant-time comparison, for anywhere a secret is checked against input. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch, which would itself leak the
  // length through the exception; compare lengths separately and constant-time
  // compare only equal-length buffers.
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
