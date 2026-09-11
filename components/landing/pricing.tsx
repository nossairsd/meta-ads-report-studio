"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { AnchorLink } from "@/components/landing/anchor-link";

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
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">{t("eyebrow")}</p>
        <h2 className="mt-3 text-3xl font-medium tracking-tight text-black md:text-5xl">{t("title")}</h2>
        <p className="mt-4 text-base leading-relaxed text-foreground/60">{t("subtitle")}</p>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.07] px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          {t("betaBanner")}
        </p>
      </div>

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
