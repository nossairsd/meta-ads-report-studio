"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ArrowUpRight, Mail } from "lucide-react";
import Logo from "@/components/landing/logo";
import PointGlobe from "@/components/effects/point-globe";
import SpecularButton from "@/components/landing/specular-button";

// lucide-react dropped brand/logo icons in this version — inline the two we need.
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.08.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 text-sm text-foreground/60 transition-colors hover:text-black"
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
    </Link>
  );
}

export default function Footer() {
  const t = useTranslations("Landing.footer");

  const socials = [
    { label: "LinkedIn", href: "#", icon: <LinkedinIcon /> },
    { label: "Email", href: "#", icon: <Mail className="h-[18px] w-[18px]" /> },
    { label: "GitHub", href: "#", icon: <GithubIcon /> },
  ];

  return (
    <footer className="space-y-16">
      {/* CTA band — dark card with the rotating 3D globe behind it */}
      <motion.div
        custom={0}
        variants={reveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="relative overflow-hidden rounded-[32px] bg-[#0B1220] px-8 py-16 text-center md:px-16 md:py-20"
      >
        <div className="absolute inset-y-0 right-[-14%] w-[70%] opacity-80 md:right-[-6%] md:w-[46%]">
          <PointGlobe color="#1D4ED8" accent="#93C5FD" opacity={0.95} pointSize={9} />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_20%_50%,rgba(37,99,235,0.22),transparent_70%)]"
        />

        <div className="relative z-10 mx-auto max-w-xl text-center md:mx-0 md:max-w-lg md:text-left">
          <h2 className="text-3xl leading-tight font-medium tracking-tight text-white md:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="mt-4 text-sm text-white/60 lg:text-base">{t("ctaSubtitle")}</p>
          <div className="mt-8 flex justify-center md:justify-start">
            <SpecularButton
              size="lg"
              baseColor="#2563EB"
              lineColor="#93C5FD"
              textColor="#FFFFFF"
              radius={999}
            >
              {t("ctaButton")}
            </SpecularButton>
          </div>
        </div>
      </motion.div>

      {/* Link columns */}
      <motion.div
        custom={1}
        variants={reveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="grid grid-cols-1 gap-10 text-left sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="space-y-4">
          <Logo size="lg" />
          <p className="max-w-xs text-sm text-foreground/60">{t("cta")}</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-black">{t("product")}</h3>
          <ul className="space-y-2">
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
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-black">{t("legal")}</h3>
          <ul className="space-y-2">
            <li>
              <FooterLink href="#">{t("privacy")}</FooterLink>
            </li>
            <li>
              <FooterLink href="#">{t("dataDeletion")}</FooterLink>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-black">{t("contact")}</h3>
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <motion.a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.07] bg-white text-foreground/70 shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
              >
                {s.icon}
              </motion.a>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Bottom bar */}
      <div className="border-t border-black/[0.07] pt-6">
        <p className="text-center text-sm text-foreground/50">{t("credit")}</p>
      </div>
    </footer>
  );
}
