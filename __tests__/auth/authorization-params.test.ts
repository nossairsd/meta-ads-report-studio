import { describe, it, expect } from "vitest";
import { authorizationParams } from "@/lib/auth/authorization-params";

const SCOPES = ["public_profile", "ads_read"] as const;

describe("authorizationParams", () => {
  it("sends the configuration id for a Login for Business app", () => {
    expect(authorizationParams("1234567890", SCOPES)).toMatchObject({
      config_id: "1234567890",
    });
  });

  it("sends exactly the configured read-only scopes alongside a configuration", () => {
    // Auth.js always sets a scope; left to itself it would fall back to
    // "openid profile email", which Facebook rejects on the web. Matching the
    // configuration adds no permission beyond what it already grants.
    const params = authorizationParams("1234567890", SCOPES);

    expect(params.scope).toBe("public_profile,ads_read");

    // Compared as whole entries: a substring test would flag "public_profile"
    // for containing "profile", which is exactly the mistake this line made
    // before it was written this way.
    const entries = params.scope.split(",");
    for (const openIdScope of ["openid", "profile", "email"]) {
      expect(entries).not.toContain(openIdScope);
    }
  });

  it("falls back to the classic scope list when no configuration is set", () => {
    // An app created under the older dashboard must keep working unchanged.
    expect(authorizationParams(undefined, SCOPES)).toEqual({
      scope: "public_profile,ads_read",
    });
  });

  it("treats an empty or blank value as unset", () => {
    // `META_LOGIN_CONFIG_ID=""` copied from .env.example must not produce an
    // empty `config_id=` — Meta would reject the configuration outright.
    expect(authorizationParams("", SCOPES)).not.toHaveProperty("config_id");
    expect(authorizationParams("   ", SCOPES)).not.toHaveProperty("config_id");
  });

  it("trims stray whitespace from a pasted id", () => {
    expect(authorizationParams(" 1234567890 \n", SCOPES).config_id).toBe("1234567890");
  });
});
