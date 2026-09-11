"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ArrowRight, ArrowUp } from "lucide-react";
import { useLenis } from "lenis/react";
import { AnchorLink } from "@/components/landing/anchor-link";
import LocaleToggle from "@/components/landing/locale-toggle";

const EASE = [0.16, 1, 0.3, 1] as const;

const column = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.65, ease: EASE },
  }),
};

/** Link whose label lifts slightly while an underline sweeps in.
 *
 *  The list mixes in-page anchors with real routes, and the two need different
 *  components: the locale-aware Link turns a bare hash into a same-route
 *  navigation that never scrolls. */
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const Wrapper = href.startsWith("#") ? AnchorLink : Link;

  return (
    <Wrapper
      href={href}
      className="group relative inline-block text-sm text-foreground/60 transition-colors duration-200 hover:text-black"
    >
      <span className="inline-block transition-transform duration-300 ease-out group-hover:-translate-y-px">
        {children}
      </span>
      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-primary to-sky-400 transition-transform duration-300 ease-out group-hover:scale-x-100" />
    </Wrapper>
  );
}

/**
 * A light footer after the dark closing band.
 *
 * Both used to share the same near-black ground, so the page ended on one
 * undivided block and the footer read as more of the call to action. A
 * different ground marks where the pitch ends and the reference links begin.
 * Only live links: a social icon pointing at "#" tells a visitor the product
 * is unfinished.
 */
export default function Footer() {
  const t = useTranslations("Landing.footer");
  const tNav = useTranslations("Landing.nav");
  const lenis = useLenis();

  function scrollTop() {
    // Lenis owns the scroll position; window.scrollTo would fight it.
    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const product = [
    { href: "#features", label: t("features") },
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#pricing", label: t("pricing") },
    { href: "/demo", label: t("demo") },
  ];
  const legal = [
    { href: "/privacy", label: t("privacy") },
    { href: "/data-deletion", label: t("dataDeletion") },
  ];

  return (
    <footer className="relative isolate overflow-hidden border-t border-black/[0.06] bg-[#F7F9FC] pt-20 pb-8">
      {/* A faint brand glow and a masked grid: enough texture to feel
          finished, light enough to stay behind the links. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          animate={{ x: ["-6%", "6%", "-6%"], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 left-[10%] h-[420px] w-[420px] rounded-full bg-[#2563EB]/10 blur-[120px]"
        />
        <motion.div
          animate={{ x: ["5%", "-5%", "5%"], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute right-[6%] -bottom-48 h-[460px] w-[460px] rounded-full bg-[#0EA5E9]/10 blur-[130px]"
        />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 10%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 10%, transparent 75%)",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-12">
          <motion.div
            custom={0}
            variants={column}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-6 sm:col-span-2 lg:col-span-6"
          >
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Meta Ads Report Studio"
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 object-contain"
              />
              <span className="text-lg font-semibold tracking-tight whitespace-nowrap text-black">
                Meta Ads Report Studio
              </span>
            </div>

            <p className="max-w-sm text-sm leading-relaxed text-foreground/60">{t("tagline")}</p>

            <AnchorLink
              href="#early-access"
              className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0B1220] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(11,18,32,0.7)] transition-colors hover:bg-primary"
            >
              {tNav("earlyAccess")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </AnchorLink>
          </motion.div>

          {[
            { title: t("product"), links: product },
            { title: t("legal"), links: legal },
          ].map((group, i) => (
            <motion.div
              key={group.title}
              custom={i + 1}
              variants={column}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="space-y-4 lg:col-span-3"
            >
              <h3 className="text-[11px] font-semibold tracking-[0.16em] text-foreground/40 uppercase">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-5 border-t border-black/[0.07] pt-7 sm:flex-row">
          <p className="text-sm text-foreground/45">{t("rights")}</p>

          <div className="flex items-center gap-3">
            <LocaleToggle layoutId="locale-pill-footer" />
            <motion.button
              type="button"
              onClick={scrollTop}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
              className="group inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-sm font-medium text-foreground/65 shadow-sm transition-colors hover:border-primary/40 hover:text-black"
            >
              {t("backToTop")}
              <ArrowUp className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Oversized wordmark with a light sweeping across it. clamp keeps the
          whole name inside the container on every screen size. */}
      <div aria-hidden className="pointer-events-none mt-14 -mb-4 px-6 select-none">
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: EASE }}
          className="mx-auto max-w-6xl text-center text-[clamp(1.5rem,7vw,6.6rem)] leading-[0.85] font-semibold tracking-tighter whitespace-nowrap"
        >
          <motion.span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(100deg, rgba(15,23,42,0.06) 35%, rgba(37,99,235,0.28) 50%, rgba(15,23,42,0.06) 65%)",
              backgroundSize: "260% 100%",
            }}
            animate={{ backgroundPosition: ["180% 0%", "-80% 0%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
          >
            Meta Ads Report Studio
          </motion.span>
        </motion.p>
      </div>
    </footer>
  );
}
