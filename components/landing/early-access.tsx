"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { CheckCircle2, Gift, Handshake, Loader2, MessagesSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requestEarlyAccess } from "@/lib/early-access/actions";
import { CLIENT_RANGES } from "@/lib/early-access/schema";

type Field = "name" | "email" | "agency" | "clientCount" | "message";
const PERK_ICONS = [Gift, Handshake, MessagesSquare];

const inputClass = (invalid: boolean) =>
  `h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-black outline-none transition-shadow placeholder:text-foreground/35 focus-visible:ring-2 ${
    invalid
      ? "border-destructive/60 focus-visible:ring-destructive/25"
      : "border-black/[0.1] focus-visible:ring-primary/35"
  }`;

/**
 * The early-access form: the product's way of finding its first agencies
 * while Meta's app review keeps it closed to the public.
 */
export default function EarlyAccess() {
  const t = useTranslations("Landing.earlyAccess");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<Field[]>([]);
  const [sent, setSent] = useState<{ name: string; email: string } | null>(null);

  const perks = t.raw("perks") as { title: string; body: string }[];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setError(null);
    setInvalid([]);

    startTransition(async () => {
      const result = await requestEarlyAccess({
        ...data,
        message: data.message?.trim() ? data.message : undefined,
        locale,
      });
      if (result.ok) {
        setSent({ name: data.name.trim(), email: data.email.trim() });
        return;
      }
      if (result.error === "invalid") setInvalid((result.fields ?? []) as Field[]);
      setError(t(`errors.${result.error}`));
    });
  }

  const fieldError = (field: Field) =>
    invalid.includes(field) ? (
      <p id={`ea-${field}-error`} className="mt-1.5 text-xs text-destructive">
        {t(`fieldErrors.${field}`)}
      </p>
    ) : null;

  const describedBy = (field: Field) => (invalid.includes(field) ? `ea-${field}-error` : undefined);

  return (
    <section id="early-access" className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
      <div>
        <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">{t("eyebrow")}</p>
        <h2 className="mt-3 text-3xl font-medium tracking-tight text-black md:text-5xl">{t("title")}</h2>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-foreground/60">{t("subtitle")}</p>

        <ul className="mt-8 space-y-5">
          {perks.map((perk, i) => {
            const Icon = PERK_ICONS[i % PERK_ICONS.length];
            return (
              <li key={perk.title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-black">{perk.title}</p>
                  <p className="mt-0.5 text-sm text-foreground/60">{perk.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card-surface relative p-6 sm:p-8">
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="flex flex-col items-center py-10 text-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16A34A]/10 text-[#16A34A]">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </span>
            <h3 className="mt-5 text-xl font-semibold text-black">{t("success.title")}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-foreground/60">
              {t("success.body", sent)}
            </p>
            <button
              type="button"
              onClick={() => setSent(null)}
              className="mt-6 min-h-11 cursor-pointer text-sm font-medium text-primary hover:underline"
            >
              {t("success.again")}
            </button>
          </motion.div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <h3 className="text-lg font-semibold text-black">{t("form.title")}</h3>

            {/* Invisible to people, irresistible to bots: see requestEarlyAccess. */}
            <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="ea-website">Website</label>
              <input id="ea-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ea-name" className="mb-1.5 block text-sm font-medium text-black">
                  {t("form.name")}
                </label>
                <input
                  id="ea-name"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  aria-invalid={invalid.includes("name")}
                  aria-describedby={describedBy("name")}
                  className={inputClass(invalid.includes("name"))}
                />
                {fieldError("name")}
              </div>
              <div>
                <label htmlFor="ea-email" className="mb-1.5 block text-sm font-medium text-black">
                  {t("form.email")}
                </label>
                <input
                  id="ea-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={160}
                  aria-invalid={invalid.includes("email")}
                  aria-describedby={describedBy("email")}
                  className={inputClass(invalid.includes("email"))}
                />
                {fieldError("email")}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ea-agency" className="mb-1.5 block text-sm font-medium text-black">
                  {t("form.agency")}
                </label>
                <input
                  id="ea-agency"
                  name="agency"
                  autoComplete="organization"
                  required
                  maxLength={120}
                  aria-invalid={invalid.includes("agency")}
                  aria-describedby={describedBy("agency")}
                  className={inputClass(invalid.includes("agency"))}
                />
                {fieldError("agency")}
              </div>
              <div>
                <label htmlFor="ea-clients" className="mb-1.5 block text-sm font-medium text-black">
                  {t("form.clientCount")}
                </label>
                <select
                  id="ea-clients"
                  name="clientCount"
                  required
                  defaultValue=""
                  aria-invalid={invalid.includes("clientCount")}
                  aria-describedby={describedBy("clientCount")}
                  className={`${inputClass(invalid.includes("clientCount"))} cursor-pointer`}
                >
                  <option value="" disabled>
                    {t("form.clientCountPlaceholder")}
                  </option>
                  {CLIENT_RANGES.map((range) => (
                    <option key={range} value={range}>
                      {t(`form.ranges.${range}`)}
                    </option>
                  ))}
                </select>
                {fieldError("clientCount")}
              </div>
            </div>

            <div>
              <label htmlFor="ea-message" className="mb-1.5 block text-sm font-medium text-black">
                {t("form.message")}{" "}
                <span className="font-normal text-foreground/45">({t("form.optional")})</span>
              </label>
              <textarea
                id="ea-message"
                name="message"
                rows={3}
                maxLength={1000}
                placeholder={t("form.messagePlaceholder")}
                aria-invalid={invalid.includes("message")}
                aria-describedby={describedBy("message")}
                className={`${inputClass(invalid.includes("message"))} h-auto resize-none py-2.5`}
              />
              {fieldError("message")}
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-destructive/[0.06] px-3.5 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.7)] transition-colors hover:bg-primary/90 disabled:opacity-70"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isPending ? t("form.submitting") : t("form.submit")}
            </button>

            <p className="text-center text-xs leading-relaxed text-foreground/50">
              {t.rich("form.consent", {
                link: (chunks) => (
                  <Link href="/privacy" className="font-medium text-primary underline-offset-2 hover:underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
