import { describe, it, expect, vi } from "vitest";
import {
  appSecretProof,
  exchangeForLongLivedToken,
  fetchGrantedScopes,
} from "@/lib/meta/token";
import { MetaApiError } from "@/lib/meta/errors";

/** A fresh Response per call: a body can only be read once, so a single shared
 *  instance would make the second assertion in a test fail for the wrong
 *  reason. */
function respondWith(body: unknown, init: ResponseInit = {}) {
  // The parameters are declared even though they go unused: without them the
  // mock's call tuple is typed empty and the URL assertions below cannot
  // reach their argument.
  return vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status: 200, ...init })
  );
}

const BASE = {
  shortLivedToken: "short-lived",
  appId: "app-id",
  appSecret: "app-secret",
  now: () => 1_700_000_000_000,
};

describe("exchangeForLongLivedToken", () => {
  it("returns the long-lived token and an absolute expiry", async () => {
    const result = await exchangeForLongLivedToken({
      ...BASE,
      fetchImpl: respondWith({ access_token: "long-lived", expires_in: 5_184_000 }),
    });

    expect(result.accessToken).toBe("long-lived");
    // 1_700_000_000 seconds + 60 days
    expect(result.expiresAt).toBe(1_700_000_000 + 5_184_000);
  });

  it("asks Meta for the exchange grant, with the short-lived token", async () => {
    const fetchImpl = respondWith({ access_token: "long-lived", expires_in: 100 });
    await exchangeForLongLivedToken({ ...BASE, fetchImpl });

    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.searchParams.get("grant_type")).toBe("fb_exchange_token");
    expect(url.searchParams.get("fb_exchange_token")).toBe("short-lived");
    expect(url.searchParams.get("client_id")).toBe("app-id");
  });

  it("pins the same Graph version the data client uses", async () => {
    const fetchImpl = respondWith({ access_token: "t", expires_in: 1 });
    await exchangeForLongLivedToken({ ...BASE, fetchImpl });

    const { API_VERSION } = await import("@/lib/meta/client");
    expect(String(fetchImpl.mock.calls[0][0])).toContain(`/${API_VERSION}/`);
  });

  it("reports a null expiry when Meta omits one, rather than inventing a date", async () => {
    const result = await exchangeForLongLivedToken({
      ...BASE,
      fetchImpl: respondWith({ access_token: "long-lived" }),
    });

    expect(result.expiresAt).toBeNull();
  });

  it("classifies an expired-token rejection as an auth failure", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: "Session expired", code: 190 } }), {
          status: 400,
        })
    );

    await expect(exchangeForLongLivedToken({ ...BASE, fetchImpl })).rejects.toMatchObject({
      kind: "auth",
    });
  });

  it("treats a Meta outage as a server error", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 503 }));
    await expect(exchangeForLongLivedToken({ ...BASE, fetchImpl })).rejects.toMatchObject({
      kind: "server",
    });
  });

  it("refuses a 200 whose shape is not a token response", async () => {
    await expect(
      exchangeForLongLivedToken({ ...BASE, fetchImpl: respondWith({ nothing: "useful" }) })
    ).rejects.toBeInstanceOf(MetaApiError);
  });

  it("refuses a non-JSON body", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>502</html>", { status: 200 }));
    await expect(exchangeForLongLivedToken({ ...BASE, fetchImpl })).rejects.toMatchObject({
      kind: "server",
    });
  });

  it("reports a network failure rather than hanging", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(exchangeForLongLivedToken({ ...BASE, fetchImpl })).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("gives up on a request that never answers", async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        })
    ) as unknown as typeof fetch;

    await expect(
      exchangeForLongLivedToken({ ...BASE, fetchImpl, timeoutMs: 10 })
    ).rejects.toMatchObject({ kind: "network" });
  });
});

describe("appSecretProof", () => {
  it("is a stable HMAC of the token under the app secret", () => {
    // Fixed vector, so the value cannot drift: Meta rejects a proof computed
    // any other way, and a change here would break every signed call.
    expect(appSecretProof("token", "secret")).toBe(
      "e941110e3d2bfe82621f0e3e1434730d7305d106c5f68c87165d0b27a4611a4a"
    );
  });

  it("keys by the secret and messages the token, not the reverse", () => {
    // The fixed vector alone cannot catch a swap, since it comes from the same
    // implementation. This does: HMAC is not symmetric in its two arguments.
    expect(appSecretProof("token", "secret")).not.toBe(appSecretProof("secret", "token"));
  });

  it("changes when the secret changes", () => {
    expect(appSecretProof("token", "secret")).not.toBe(appSecretProof("token", "other"));
  });
});

describe("fetchGrantedScopes", () => {
  const permissions = (entries: Array<[string, string]>) =>
    respondWith({ data: entries.map(([permission, status]) => ({ permission, status })) });

  it("returns only the permissions Meta actually granted", async () => {
    const scopes = await fetchGrantedScopes({
      accessToken: "t",
      fetchImpl: permissions([
        ["public_profile", "granted"],
        ["ads_read", "granted"],
        ["email", "declined"],
      ]),
    });

    expect(scopes).toBe("ads_read,public_profile");
  });

  it("reports a declined ads permission by leaving it out", () => {
    // The consent screen lets someone sign in having switched ads_read off.
    // Recording what we asked for rather than what was granted would hide it.
    return fetchGrantedScopes({
      accessToken: "t",
      fetchImpl: permissions([
        ["public_profile", "granted"],
        ["ads_read", "declined"],
      ]),
    }).then((scopes) => expect(scopes).toBe("public_profile"));
  });

  it("sends the token as a header, never in the URL", async () => {
    const fetchImpl = permissions([["public_profile", "granted"]]);
    await fetchGrantedScopes({ accessToken: "secret-token", fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).not.toContain("secret-token");
    expect((init?.headers as Record<string, string>).Authorization).toContain("secret-token");
  });

  it("returns null rather than failing the sign-in when Meta refuses", async () => {
    // Recording the scope is a nicety; it must never cost a working connection.
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 403 }));
    await expect(fetchGrantedScopes({ accessToken: "t", fetchImpl })).resolves.toBeNull();
  });

  it("returns null when the request fails outright", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(fetchGrantedScopes({ accessToken: "t", fetchImpl })).resolves.toBeNull();
  });

  it("returns null when nothing was granted", async () => {
    await expect(
      fetchGrantedScopes({ accessToken: "t", fetchImpl: permissions([["ads_read", "declined"]]) })
    ).resolves.toBeNull();
  });
});
