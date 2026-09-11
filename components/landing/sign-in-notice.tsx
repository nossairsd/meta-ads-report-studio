import { useTranslations } from "next-intl";
import { NoticeToast } from "@/components/landing/notice-toast";

/**
 * Explains why the visitor was sent back here.
 *
 * Auth.js redirects failures to the page named in `pages.error` with the
 * reason in a query parameter, and the proxy adds its own when it turns an
 * anonymous visitor away from the dashboard. Neither was being read, so a
 * failed sign-in dropped the user on the landing page with no explanation —
 * which is exactly how a working application looks broken.
 *
 * Shown as a temporary toast rather than a banner in the page: it is news
 * about what just happened, not part of the page.
 */

/** Auth.js error codes we can say something specific about. Anything else
 *  falls back to a generic message rather than showing the raw code. */
const KNOWN_ERRORS = ["Configuration", "AccessDenied", "Verification"] as const;

/**
 * Codes Meta returns when it refuses the app itself rather than the user.
 *
 * While the app is in development, Meta only lets through people with a role
 * on it — so an agency that has not been invited to the beta is turned back
 * here with one of these. "Something went wrong" would be a lie: nothing is
 * broken, they are simply not on the list yet, and what they need is the
 * request form.
 */
const NOT_IN_BETA = ["OAuthSignin", "OAuthCallback", "Callback", "OAuthAccountNotLinked"];

type Props = {
  signin?: string;
  error?: string;
};

/** Synchronous on purpose: an async component here would suspend the whole
 *  page tree, and next-intl's hook reads the same messages either way. */
export function SignInNotice({ signin, error }: Props) {
  const t = useTranslations("Landing.notice");

  if (!error && signin !== "required") return null;

  const notInBeta = error !== undefined && NOT_IN_BETA.includes(error);
  const key = error
    ? notInBeta
      ? "NotInBeta"
      : (KNOWN_ERRORS as readonly string[]).includes(error)
        ? error
        : "Default"
    : "signinRequired";

  return (
    <NoticeToast
      tone={error ? "error" : "info"}
      title={t(`${key}.title`)}
      body={t(`${key}.body`)}
      dismissLabel={t("dismiss")}
      action={notInBeta ? { label: t("action"), href: "#early-access" } : undefined}
    />
  );
}
