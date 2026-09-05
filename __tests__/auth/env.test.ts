import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { getServerEnv, isAuthConfigured, MissingEnvError } from "@/lib/env";

const VALID = {
  DATABASE_URL: "postgresql://user:pass@host:5432/db",
  META_APP_ID: "1234567890",
  META_APP_SECRET: "a-secret",
  AUTH_SECRET: randomBytes(24).toString("base64"),
  TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
} as unknown as NodeJS.ProcessEnv;

describe("getServerEnv", () => {
  it("returns the parsed values when everything is set", () => {
    expect(getServerEnv(VALID).META_APP_ID).toBe("1234567890");
  });

  it("names every missing variable at once, not just the first", () => {
    try {
      getServerEnv({} as NodeJS.ProcessEnv);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingEnvError);
      expect((error as MissingEnvError).missing).toEqual(
        expect.arrayContaining([
          "DATABASE_URL",
          "META_APP_ID",
          "META_APP_SECRET",
          "AUTH_SECRET",
          "TOKEN_ENCRYPTION_KEY",
        ])
      );
    }
  });

  it("rejects a DATABASE_URL that is not PostgreSQL", () => {
    expect(() => getServerEnv({ ...VALID, DATABASE_URL: "mysql://host/db" })).toThrow(
      /PostgreSQL/
    );
  });

  it("rejects an encryption key that does not decode to 32 bytes", () => {
    const short = randomBytes(16).toString("base64");
    expect(() => getServerEnv({ ...VALID, TOKEN_ENCRYPTION_KEY: short })).toThrow(/32 bytes/);
  });

  it("rejects a short AUTH_SECRET rather than accepting a guessable one", () => {
    expect(() => getServerEnv({ ...VALID, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
  });

  it("tells the reader how to generate the key it is complaining about", () => {
    expect(() => getServerEnv({} as NodeJS.ProcessEnv)).toThrow(/openssl rand -base64 32/);
  });
});

describe("isAuthConfigured", () => {
  it("is true only when the whole set is present and valid", () => {
    expect(isAuthConfigured(VALID)).toBe(true);
  });

  it("is false — rather than throwing — when nothing is set, so the demo still renders", () => {
    expect(isAuthConfigured({} as NodeJS.ProcessEnv)).toBe(false);
  });
});
