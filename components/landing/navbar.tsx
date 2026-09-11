"use client";

import { Link } from "@/i18n/navigation";
import { AnchorLink } from "@/components/landing/anchor-link";
import { AlignJustify, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/landing/logo";
import LocaleToggle from "@/components/landing/locale-toggle";
import { MotionButton } from "@/components/landing/motion-button";
import { ConnectButton } from "@/components/landing/connect-button";
import { useScrolled } from "@/lib/use-scrolled";

const itemVariants = {
  hidden: { opacity: 0, y: -8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.07, duration: 0.45, ease: "easeOut" as const },
  }),
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const t = useTranslations("Landing.nav");
  const scrolled = useScrolled();

  const navLinks = [
    { name: t("features"), href: "#features" },
    { name: t("howItWorks"), href: "#how-it-works" },
    { name: t("pricing"), href: "#pricing" },
    { name: t("earlyAccess"), href: "#early-access" },
  ];

  return (
    <div className="fixed top-0 right-0 left-0 z-50 px-6 pt-3 pb-1">
      <motion.nav
        initial={false}
        animate={scrolled ? "scrolled" : "top"}
        variants={{
          // Both states use px so motion can interpolate; 1152px matches the
          // page's max-w-6xl container, and `w-full` keeps it responsive below.
          top: {
            maxWidth: 1152,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0)",
            borderColor: "rgba(0,0,0,0)",
            boxShadow: "0 0 0 rgba(0,0,0,0)",
            paddingLeft: 8,
            paddingRight: 8,
          },
          scrolled: {
            maxWidth: 920,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.75)",
            borderColor: "rgba(0,0,0,0.06)",
            boxShadow: "0 10px 34px rgba(15,23,42,0.10)",
            paddingLeft: 16,
            paddingRight: 10,
          },
        }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className={`mx-auto flex h-fit w-full items-center justify-between border py-2 ${
          scrolled ? "backdrop-blur-xl" : ""
        }`}
      >
        <motion.div custom={0} variants={itemVariants} initial="hidden" animate="show" className="shrink-0">
          <Link href="/" title="Home">
            <Logo />
          </Link>
        </motion.div>

        <div className="hidden items-center justify-center gap-2 md:flex">
          <ul
            className="flex items-center justify-center gap-1 text-sm font-medium text-black/70"
            onMouseLeave={() => setHovered(null)}
          >
            {navLinks.map((link, i) => (
              <motion.li
                key={link.name}
                custom={i + 1}
                variants={itemVariants}
                initial="hidden"
                animate="show"
                onMouseEnter={() => setHovered(link.name)}
                className="relative"
              >
                {hovered === link.name && (
                  <motion.span
                    layoutId="nav-hover-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-black/[0.06]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <AnchorLink
                  href={link.href}
                  className="block rounded-full px-3.5 py-2 transition-colors hover:text-black"
                >
                  {link.name}
                </AnchorLink>
              </motion.li>
            ))}
          </ul>

          <motion.div
            custom={navLinks.length + 1}
            variants={itemVariants}
            initial="hidden"
            animate="show"
            className="mx-1 flex items-center gap-1"
          >
            {/* Quiet on purpose: during the beta, signing in is for the
                agencies already invited. */}
            <ConnectButton
              variant="ghost"
              label={t("signIn")}
              pendingLabel={t("signInPending")}
            />
            <LocaleToggle layoutId="locale-pill-desktop" />
          </motion.div>

          <motion.div custom={navLinks.length + 2} variants={itemVariants} initial="hidden" animate="show">
            <Link href="/demo">
              <MotionButton size="lg" className="rounded-full px-5">
                {t("cta")}
              </MotionButton>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ scale: 1 }}
          whileTap={{ scale: 0.85 }}
          transition={{ duration: 0.2 }}
          className="flex cursor-pointer text-black md:hidden"
          onClick={() => setIsOpen((v) => !v)}
        >
          {isOpen ? <X size={22} /> : <AlignJustify size={22} />}
        </motion.div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-2xl border border-black/5 bg-white/95 shadow-xl backdrop-blur-xl md:hidden"
            >
              <div className="flex flex-col gap-4 p-6">
                {navLinks.map((link) => (
                  <AnchorLink
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="py-2 text-base font-medium"
                  >
                    {link.name}
                  </AnchorLink>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <LocaleToggle layoutId="locale-pill-mobile" />
                  <ConnectButton
                    variant="ghost"
                    label={t("signIn")}
                    pendingLabel={t("signInPending")}
                    onNavigate={() => setIsOpen(false)}
                  />
                </div>
                <Link href="/demo" onClick={() => setIsOpen(false)}>
                  <MotionButton size="lg" className="w-full justify-center rounded-full">
                    {t("cta")}
                  </MotionButton>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
