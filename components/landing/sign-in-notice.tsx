import { AlertTriangle, Info } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Explains why the visitor was sent back here.
 *
 * Auth.js redirects failures to the page named in `pages.error` with the
 * reason in a query parameter, and the proxy adds its own when it turns an
 * anonymous visitor away from the dashboard. Neither was being read, so a
 * failed sign-in dropped the user on the landing page with no explanation —
 * which is exactly how a working application looks broken.
 */

/** Auth.js error codes we can say something specific about. Anything else
 *  falls back to a generic message rather than showing the raw code. */
const KNOWN_ERRORS = ["Configuration", "AccessDenied", "Verification"] as const;

type Props = {
  signin?: string;
  error?: string;
};

/** Synchronous on purpose: an async component here would suspend the whole
 *  page tree, and next-intl's hook reads the same messages either way. */
export function SignInNotice({ signin, error }: Props) {
  const t = useTranslations("Landing.notice");

  if (!error && signin !== "required") return null;

  const isError = Boolean(error);
  const key = error
    ? (KNOWN_ERRORS as readonly string[]).includes(error)
      ? error
      : "Default"
    : "signinRequired";

  const Icon = isError ? AlertTriangle : Info;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        "mx-auto mt-24 mb-2 flex w-full max-w-3xl items-start gap-3 rounded-xl border px-4 py-3.5 text-sm " +
        (isError
          ? "border-destructive/25 bg-destructive/[0.06] text-destructive"
          : "border-primary/25 bg-primary/[0.06] text-primary")
      }
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-0.5">
        <p className="font-medium">{t(`${key}.title`)}</p>
        <p className="text-foreground/70">{t(`${key}.body`)}</p>
      </div>
    </div>
  );
}
