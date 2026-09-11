"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { AnchorLink } from "@/components/landing/anchor-link";
import { SectionHeading } from "@/components/landing/section-heading";

type PlanKey = "free" | "pro" | "agency";
const PLANS: PlanKey[] = ["free", "pro", "agency"];

/**
 * The prices the product will launch with, shown now.
 *
 * Showing them during the beta is deliberate: it tells an agency this is a
 * product with a future rather than a side project, and it qualifies the
 * requests — whoever asks for access has seen what it will cost. Every call
 * to action leads to the early-access form, since nothing can be bought yet.
 */
export default function Pricing() {
  const t = useTranslations("Landing.pricing");

  return (
    <section id="pricing" className="relative">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} description={t("subtitle")} />

      {/* The beta, said plainly in one line — the way a status is stated,
          not advertised. Each paid plan repeats it next to its price, where
          the question actually arises. */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-foreground/60"
      >
        <span className="inline-flex items-center gap-2 font-semibold text-[#15803D]">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E]/50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
          </span>
          {t("betaTitle")}
        </span>
        <span aria-hidden className="text-foreground/25">
          ·
        </span>
        <span>{t("betaBody")}</span>
      </motion.p>

      <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-stretch">
        {PLANS.map((plan, i) => {
          const featured = plan === "pro";
          const features = t.raw(`plans.${plan}.features`) as string[];

          return (
            <motion.article
              key={plan}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`relative flex flex-col rounded-3xl border p-7 sm:p-8 ${
                featured
                  ? "border-transparent bg-[#070C16] text-white shadow-[0_30px_60px_-24px_rgba(37,99,235,0.55)]"
                  : "border-black/[0.08] bg-white text-black shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              }`}
            >
              {featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  {t("recommended")}
                </span>
              )}

              <h3 className="text-lg font-semibold">{t(`plans.${plan}.name`)}</h3>
              <p className={`mt-1 text-sm ${featured ? "text-white/60" : "text-foreground/55"}`}>
                {t(`plans.${plan}.description`)}
              </p>

              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight">{t(`plans.${plan}.price`)}</span>
                <span className={`text-sm ${featured ? "text-white/55" : "text-foreground/50"}`}>
                  {t(`plans.${plan}.period`)}
                </span>
              </p>
              {plan !== "free" && (
                <p
                  className={`mt-2.5 w-fit rounded-md px-2 py-0.5 text-xs font-semibold ${
                    featured ? "bg-[#22C55E]/15 text-[#86EFAC]" : "bg-[#16A34A]/10 text-[#15803D]"
                  }`}
                >
                  {t("freeDuringBeta")}
                </p>
              )}

              <ul className={`mt-6 flex-1 space-y-3 border-t pt-6 text-sm ${featured ? "border-white/10" : "border-black/[0.06]"}`}>
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-[#93C5FD]" : "text-primary"}`}
                      aria-hidden
                    />
                    <span className={featured ? "text-white/85" : "text-foreground/75"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <AnchorLink
                href="#early-access"
                className={`mt-8 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors ${
                  featured
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "border border-black/[0.1] text-black hover:bg-black/[0.04]"
                }`}
              >
                {t("cta")}
              </AnchorLink>
            </motion.article>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-foreground/45">{t("note")}</p>
    </section>
  );
}
