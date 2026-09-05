import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import {
  decryptToken,
  encryptToken,
  getEncryptionKey,
  safeEqual,
  TokenCryptoError,
} from "@/lib/auth/crypto";

const KEY = randomBytes(32);
const OTHER_KEY = randomBytes(32);
const TOKEN = "EAAB1ZBxyzExampleMetaAccessToken0123456789";

describe("encryptToken / decryptToken", () => {
  it("round-trips a token", () => {
    expect(decryptToken(encryptToken(TOKEN, KEY), KEY)).toBe(TOKEN);
  });

  it("produces a different ciphertext each time, so identical tokens are not linkable", () => {
    const first = encryptToken(TOKEN, KEY);
    const second = encryptToken(TOKEN, KEY);
    expect(first).not.toBe(second);
    // Both still decrypt to the same value
    expect(decryptToken(first, KEY)).toBe(decryptToken(second, KEY));
  });

  it("never leaves the plaintext visible in the stored value", () => {
    const encrypted = encryptToken(TOKEN, KEY);
    expect(encrypted).not.toContain(TOKEN);
    expect(encrypted).not.toContain("EAAB1ZBxyz");
  });

  it("carries a version prefix so the scheme can be rotated later", () => {
    expect(encryptToken(TOKEN, KEY).startsWith("v1.")).toBe(true);
  });

  it("rejects a ciphertext encrypted under a different key", () => {
    const encrypted = encryptToken(TOKEN, KEY);
    expect(() => decryptToken(encrypted, OTHER_KEY)).toThrow(TokenCryptoError);
  });

  it("detects tampering instead of returning altered bytes", () => {
    const [version, iv, tag, ciphertext] = encryptToken(TOKEN, KEY).split(".");
    // Flip a byte of the ciphertext
    const bytes = Buffer.from(ciphertext, "base64");
    bytes[0] ^= 0xff;
    const tampered = [version, iv, tag, bytes.toString("base64")].join(".");

    expect(() => decryptToken(tampered, KEY)).toThrow(TokenCryptoError);
  });

  it("detects a swapped authentication tag", () => {
    const [version, iv, , ciphertext] = encryptToken(TOKEN, KEY).split(".");
    const otherTag = encryptToken("something else", KEY).split(".")[2];
    const forged = [version, iv, otherTag, ciphertext].join(".");

    expect(() => decryptToken(forged, KEY)).toThrow(TokenCryptoError);
  });

  it("does not reveal whether the key or the ciphertext was wrong", () => {
    const encrypted = encryptToken(TOKEN, KEY);
    const wrongKey = (() => {
      try {
        decryptToken(encrypted, OTHER_KEY);
      } catch (e) {
        return (e as Error).message;
      }
    })();

    const [v, iv, tag, ct] = encrypted.split(".");
    const bytes = Buffer.from(ct, "base64");
    bytes[0] ^= 0xff;
    const tampered = (() => {
      try {
        decryptToken([v, iv, tag, bytes.toString("base64")].join("."), KEY);
      } catch (e) {
        return (e as Error).message;
      }
    })();

    expect(wrongKey).toBe(tampered);
  });

  it("rejects a malformed payload rather than crashing", () => {
    expect(() => decryptToken("not-a-token", KEY)).toThrow(TokenCryptoError);
    expect(() => decryptToken("v1.only.three", KEY)).toThrow(TokenCryptoError);
  });

  it("refuses an unknown scheme version", () => {
    const encrypted = encryptToken(TOKEN, KEY).replace(/^v1\./, "v9.");
    expect(() => decryptToken(encrypted, KEY)).toThrow(/version/i);
  });

  it("refuses to encrypt an empty token, which would mask a missing value", () => {
    expect(() => encryptToken("", KEY)).toThrow(TokenCryptoError);
  });
});

describe("getEncryptionKey", () => {
  it("accepts a 32-byte base64 key", () => {
    expect(getEncryptionKey(KEY.toString("base64"))).toHaveLength(32);
  });

  it("explains how to generate one when it is missing", () => {
    expect(() => getEncryptionKey(undefined)).toThrow(/openssl rand -base64 32/);
  });

  it("rejects a key of the wrong length instead of silently weakening the cipher", () => {
    expect(() => getEncryptionKey(randomBytes(16).toString("base64"))).toThrow(/32 bytes/);
  });
});

describe("safeEqual", () => {
  it("matches identical strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
  });

  it("rejects different strings", () => {
    expect(safeEqual("abc", "abd")).toBe(false);
  });

  it("returns false on a length mismatch rather than throwing", () => {
    expect(safeEqual("abc", "abcdef")).toBe(false);
  });
});
