"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ArrowUp, Mail } from "lucide-react";
import { useLenis } from "lenis/react";

// lucide-react dropped brand/logo icons in this version — inline the two we need.
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[17px] w-[17px]">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.08.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[17px] w-[17px]">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

const column = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

/** Link whose label slides up slightly while an underline sweeps in. */
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative inline-block text-sm text-white/55 transition-colors duration-200 hover:text-white"
    >
      <span className="inline-block transition-transform duration-300 ease-out group-hover:-translate-y-px">
        {children}
      </span>
      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-primary to-sky-300 transition-transform duration-300 ease-out group-hover:scale-x-100" />
    </Link>
  );
}

export default function Footer() {
  const t = useTranslations("Landing.footer");
  const lenis = useLenis();

  const socials = [
    { label: "LinkedIn", href: "#", icon: <LinkedinIcon /> },
    { label: "Email", href: "#", icon: <Mail className="h-[17px] w-[17px]" /> },
    { label: "GitHub", href: "#", icon: <GithubIcon /> },
  ];

  function scrollTop() {
    // Lenis owns the scroll position; window.scrollTo would fight it.
    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="relative isolate overflow-hidden bg-[#070C16] pt-20 pb-8">
      {/* Hairline that fades in from the edges, marking the seam with the CTA band */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      {/* Animated backdrop: drifting brand glows, a masked grid and a vignette */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          animate={{ x: ["-8%", "8%", "-8%"], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 left-[6%] h-[460px] w-[460px] rounded-full bg-[#2563EB]/25 blur-[130px]"
        />
        <motion.div
          animate={{ x: ["6%", "-6%", "6%"], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute right-[8%] -bottom-40 h-[480px] w-[480px] rounded-full bg-[#0EA5E9]/20 blur-[140px]"
        />
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)",
            backgroundSize: "58px 58px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 20%, black 5%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 20%, black 5%, transparent 75%)",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 text-left sm:grid-cols-2 lg:grid-cols-12">
          <motion.div
            custom={0}
            variants={column}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-6 lg:col-span-6"
          >
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Meta Ads Report Studio"
                width={52}
                height={52}
                className="h-13 w-13 shrink-0 object-contain"
              />
              <span className="text-xl font-semibold tracking-tight whitespace-nowrap text-white">
                Meta Ads Report Studio
              </span>
            </div>

            <p className="max-w-sm text-sm leading-relaxed text-white/50">{t("cta")}</p>

            <div className="flex items-center gap-2.5 pt-1">
              {socials.map((s) => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 420, damping: 18 }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/65 backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-white/[0.09] hover:text-white"
                >
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>

          <motion.div
            custom={1}
            variants={column}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-4 lg:col-span-3"
          >
            <h3 className="text-[11px] font-semibold tracking-[0.16em] text-white/35 uppercase">
              {t("product")}
            </h3>
            <ul className="space-y-3">
              <li>
                <FooterLink href="#features">{t("features")}</FooterLink>
              </li>
              <li>
                <FooterLink href="#how-it-works">{t("howItWorks")}</FooterLink>
              </li>
              <li>
                <FooterLink href="#hero">{t("demo")}</FooterLink>
              </li>
            </ul>
          </motion.div>

          <motion.div
            custom={2}
            variants={column}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-4 lg:col-span-3"
          >
            <h3 className="text-[11px] font-semibold tracking-[0.16em] text-white/35 uppercase">
              {t("legal")}
            </h3>
            <ul className="space-y-3">
              <li>
                <FooterLink href="#">{t("privacy")}</FooterLink>
              </li>
              <li>
                <FooterLink href="#">{t("dataDeletion")}</FooterLink>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-7 sm:flex-row">
          <p className="text-sm text-white/40">{t("credit")}</p>

          <motion.button
            type="button"
            onClick={scrollTop}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
            className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white/65 backdrop-blur-sm transition-colors hover:border-primary/50 hover:text-white"
          >
            {t("backToTop")}
            <ArrowUp className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
          </motion.button>
        </div>
      </div>

      {/* Oversized wordmark with a light sweeping across it.
          clamp keeps the whole name inside the container: vw shrinks it on
          small screens, the cap stops it outgrowing max-w-6xl on wide ones. */}
      <div aria-hidden className="pointer-events-none mt-14 -mb-4 select-none px-6">
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-6xl text-center text-[clamp(1.5rem,7vw,6.6rem)] leading-[0.85] font-semibold tracking-tighter whitespace-nowrap"
        >
          <motion.span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(100deg, rgba(255,255,255,0.05) 35%, rgba(147,197,253,0.30) 50%, rgba(255,255,255,0.05) 65%)",
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
