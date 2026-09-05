import { describe, it, expect, beforeAll, vi } from "vitest";
import { randomBytes } from "node:crypto";
import type { Adapter, AdapterAccount } from "@auth/core/adapters";
import { decryptToken } from "@/lib/auth/crypto";
import { withTokenEncryption } from "@/lib/auth/encrypted-adapter";

beforeAll(() => {
  // The wrapper reads the key from the environment at call time.
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

const ACCOUNT: AdapterAccount = {
  userId: "user_1",
  type: "oauth",
  provider: "facebook",
  providerAccountId: "fb_42",
  access_token: "EAAB-long-lived-token",
  refresh_token: "refresh-me",
  id_token: "id-token",
  expires_at: 1_800_000_000,
  scope: "public_profile,ads_read",
};

function fakeAdapter(overrides: Partial<Adapter> = {}): Adapter {
  return {
    linkAccount: vi.fn(async (account: AdapterAccount) => account),
    getAccount: vi.fn(async () => null),
    ...overrides,
  } as Adapter;
}

describe("withTokenEncryption", () => {
  it("encrypts every credential field before the adapter can store it", async () => {
    const inner = fakeAdapter();
    await withTokenEncryption(inner).linkAccount?.(ACCOUNT);

    const stored = vi.mocked(inner.linkAccount!).mock.calls[0][0] as AdapterAccount;

    expect(stored.access_token).not.toBe(ACCOUNT.access_token);
    expect(stored.refresh_token).not.toBe(ACCOUNT.refresh_token);
    expect(stored.id_token).not.toBe(ACCOUNT.id_token);
    // And each one is genuinely recoverable, not merely mangled.
    expect(decryptToken(stored.access_token as string)).toBe(ACCOUNT.access_token);
    expect(decryptToken(stored.refresh_token as string)).toBe(ACCOUNT.refresh_token);
  });

  it("leaves the non-secret fields readable, so they stay queryable", async () => {
    const inner = fakeAdapter();
    await withTokenEncryption(inner).linkAccount?.(ACCOUNT);

    const stored = vi.mocked(inner.linkAccount!).mock.calls[0][0] as AdapterAccount;

    expect(stored.expires_at).toBe(ACCOUNT.expires_at);
    expect(stored.scope).toBe(ACCOUNT.scope);
    expect(stored.providerAccountId).toBe(ACCOUNT.providerAccountId);
  });

  it("never lets the plaintext token appear anywhere in what is stored", async () => {
    const inner = fakeAdapter();
    await withTokenEncryption(inner).linkAccount?.(ACCOUNT);

    const stored = vi.mocked(inner.linkAccount!).mock.calls[0][0];
    expect(JSON.stringify(stored)).not.toContain("EAAB-long-lived-token");
  });

  it("does not mutate the account object it was handed", async () => {
    const inner = fakeAdapter();
    await withTokenEncryption(inner).linkAccount?.(ACCOUNT);

    expect(ACCOUNT.access_token).toBe("EAAB-long-lived-token");
  });

  it("hands the caller back the readable account, not the ciphertext", async () => {
    const result = await withTokenEncryption(fakeAdapter()).linkAccount?.(ACCOUNT);
    expect((result as AdapterAccount).access_token).toBe(ACCOUNT.access_token);
  });

  it("decrypts on the way out of getAccount", async () => {
    const inner = fakeAdapter();
    const wrapper = withTokenEncryption(inner);
    const encrypted = vi.mocked(inner.linkAccount!);

    await wrapper.linkAccount?.(ACCOUNT);
    const stored = encrypted.mock.calls[0][0] as AdapterAccount;

    const reading = withTokenEncryption(
      fakeAdapter({ getAccount: vi.fn(async () => stored) })
    );
    const account = await reading.getAccount?.("fb_42", "facebook");

    expect(account?.access_token).toBe(ACCOUNT.access_token);
  });

  it("returns null from getAccount when there is no account, rather than throwing", async () => {
    const wrapper = withTokenEncryption(fakeAdapter());
    await expect(wrapper.getAccount?.("nobody", "facebook")).resolves.toBeNull();
  });

  it("passes through an account with no tokens at all", async () => {
    const inner = fakeAdapter();
    const bare: AdapterAccount = {
      userId: "u",
      type: "oauth",
      provider: "facebook",
      providerAccountId: "fb_1",
    };

    await expect(withTokenEncryption(inner).linkAccount?.(bare)).resolves.toBeTruthy();
  });

  it("keeps the rest of the adapter's methods intact", () => {
    const createUser = vi.fn();
    const wrapped = withTokenEncryption(fakeAdapter({ createUser }));
    expect(wrapped.createUser).toBe(createUser);
  });
});
