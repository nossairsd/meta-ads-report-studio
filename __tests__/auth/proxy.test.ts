import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function request(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(new URL(`https://example.com${path}`), { headers });
}

/** 3xx means the proxy diverted the request; anything else means it let it
 *  through to next-intl. */
function isRedirect(response: Response): boolean {
  return response.status >= 300 && response.status < 400;
}

function location(response: Response): URL {
  const header = response.headers.get("location");
  if (!header) throw new Error("expected a redirect, but there was no Location header");
  return new URL(header);
}

/** True when the proxy sent the request to the sign-in prompt. A pass-through
 *  carries no Location header at all, so the presence of the marker has to be
 *  checked before reading it. */
function bouncedToSignIn(response: Response): boolean {
  const header = response.headers.get("location");
  if (!header || !isRedirect(response)) return false;
  return new URL(header).searchParams.has("signin");
}

describe("route protection", () => {
  it("turns an anonymous visitor away from the dashboard", () => {
    const response = proxy(request("/en/dashboard"));
    expect(isRedirect(response)).toBe(true);
    expect(location(response).pathname).toBe("/en");
  });

  it("returns the visitor to the language they were already in", () => {
    // Sending them to "/" would cost a second redirect into the default
    // locale, and briefly show the wrong language.
    expect(location(proxy(request("/fr/dashboard"))).pathname).toBe("/fr");
  });

  it("protects every locale, not only the default one", () => {
    expect(isRedirect(proxy(request("/fr/dashboard")))).toBe(true);
  });

  it("protects pages nested under the dashboard", () => {
    expect(isRedirect(proxy(request("/en/dashboard/settings")))).toBe(true);
  });

  it("remembers where the visitor was going, so sign-in can return them", () => {
    const target = location(proxy(request("/fr/dashboard")));
    expect(target.searchParams.get("next")).toBe("/fr/dashboard");
    expect(target.searchParams.get("signin")).toBe("required");
  });

  it("lets a request carrying a session cookie continue", () => {
    expect(bouncedToSignIn(proxy(request("/en/dashboard", "authjs.session-token=abc")))).toBe(
      false
    );
  });

  it("recognises the __Secure- prefixed cookie browsers require over HTTPS", () => {
    const response = proxy(request("/en/dashboard", "__Secure-authjs.session-token=abc"));
    expect(bouncedToSignIn(response)).toBe(false);
  });

  it("leaves the demo open — it is the whole point of the demo", () => {
    expect(bouncedToSignIn(proxy(request("/en/demo")))).toBe(false);
  });

  it("leaves the landing page and the legal pages open", () => {
    for (const path of ["/en", "/fr", "/en/privacy", "/en/data-deletion"]) {
      expect(bouncedToSignIn(proxy(request(path))), `${path} should be public`).toBe(false);
    }
  });

  it("does not mistake a path that merely starts with the same letters", () => {
    // "/dashboards-public" shares a prefix with "/dashboard" but is not under it.
    expect(bouncedToSignIn(proxy(request("/en/dashboards-public")))).toBe(false);
  });

  it("still guards the dashboard when no locale prefix is present", () => {
    expect(isRedirect(proxy(request("/dashboard")))).toBe(true);
  });
});

describe("matcher", () => {
  it("runs on ordinary pages, not only the root", async () => {
    // `"\."` collapses to `"."` in a JavaScript string, which would turn the
    // exclusion into `.*..*` and match every non-empty path — leaving the
    // proxy running on "/" alone. That regression shipped once; this pins it.
    const { config } = await import("@/proxy");
    const matcher = new RegExp(`^${config.matcher[0]}$`);

    for (const path of ["/", "/demo", "/en", "/en/demo", "/fr/dashboard"]) {
      expect(matcher.test(path), `${path} should be handled`).toBe(true);
    }
  });

  it("stays out of API routes, build assets and files", () => {
    // Rewriting these would break the OAuth callback and every static asset.
    const matcher = new RegExp(`^/((?!api|_next|_vercel|.*\..*).*)$`);

    for (const path of ["/api/auth/callback/facebook", "/_next/static/x.js", "/logo.png"]) {
      expect(matcher.test(path), `${path} should be skipped`).toBe(false);
    }
  });
});
