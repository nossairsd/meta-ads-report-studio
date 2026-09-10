import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/** Routes that require a signed-in user, matched after the locale prefix is
 *  stripped. */
const PROTECTED_PATHS = ["/dashboard"];

/**
 * Auth.js names the session cookie with the `__Secure-` prefix once it is
 * issued over HTTPS. Browsers refuse to set that prefix on an insecure origin,
 * so development uses the bare name and both have to be looked for.
 */
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

function localeOf(pathname: string): string | null {
  const [, maybeLocale] = pathname.split("/");
  return (routing.locales as readonly string[]).includes(maybeLocale) ? maybeLocale : null;
}

function pathWithoutLocale(pathname: string): string {
  const [, maybeLocale, ...rest] = pathname.split("/");
  return (routing.locales as readonly string[]).includes(maybeLocale)
    ? `/${rest.join("/")}`
    : pathname;
}

export function proxy(request: NextRequest) {
  const path = pathWithoutLocale(request.nextUrl.pathname);
  const isProtected = PROTECTED_PATHS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    // Deliberately only a cookie *presence* check, and not authentication.
    //
    // Sessions live in the database, and the proxy runs on the edge runtime
    // where Prisma cannot: verifying properly here is not possible. So this is
    // a cheap gate that turns away anonymous visitors without a database round
    // trip, and the real check happens in the route's server component, which
    // is authoritative. A forged cookie gets past this line and no further.
    const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));

    if (!hasSessionCookie) {
      const url = request.nextUrl.clone();
      // Keep the language the visitor was already in; falling back to "/"
      // would bounce them through a second redirect into the default locale.
      url.pathname = `/${localeOf(request.nextUrl.pathname) ?? routing.defaultLocale}`;
      // Where the user was heading, so sign-in can return them there instead
      // of dropping them on the home page.
      url.searchParams.set("signin", "required");
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  // The backslash before the dot must survive into the string: `"\."` is just
  // `"."` in JavaScript, which turns the exclusion into `.*..*` — a pattern
  // matching every non-empty path, so the proxy would only ever run on "/".
  // A regression test in __tests__/auth/proxy.test.ts pins this.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
