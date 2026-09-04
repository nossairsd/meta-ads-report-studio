"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlignJustify, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/landing/logo";
import { MotionButton } from "@/components/landing/motion-button";
import { useScrollDirection } from "@/lib/use-scroll-direction";

const linkVariants = {
  hidden: { opacity: 0, y: -8 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Landing.nav");
  const pathname = usePathname();
  const router = useRouter();
  const { hidden, scrolled } = useScrollDirection();

  function switchLocale(locale: "en" | "fr") {
    const segments = pathname.split("/");
    segments[1] = locale;
    router.push(segments.join("/"));
  }

  const navLinks = [
    { name: t("features"), href: "#features" },
    { name: t("howItWorks"), href: "#how-it-works" },
  ];

  return (
    <motion.nav
      animate={{ y: hidden ? "-110%" : "0%" }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-50 flex h-fit w-full items-center justify-between rounded-2xl px-4 py-3 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled
          ? "border border-black/5 bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-lg"
          : "border border-transparent bg-transparent"
      }`}
    >
      <motion.div
        custom={0}
        variants={linkVariants}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <Link href="/" title="Home">
          <Logo />
        </Link>
      </motion.div>

      <div className="hidden items-center justify-center gap-6 md:flex">
        <ul className="flex items-center justify-center gap-6 text-sm font-medium text-black/80">
          {navLinks.map((link, i) => (
            <motion.li
              key={link.name}
              custom={i + 1}
              variants={linkVariants}
              initial="hidden"
              animate="show"
            >
              <Link href={link.href} className="transition-opacity hover:opacity-70">
                {link.name}
              </Link>
            </motion.li>
          ))}
        </ul>

        <motion.div
          custom={navLinks.length + 1}
          variants={linkVariants}
          initial="hidden"
          animate="show"
          className="flex items-center gap-1 text-sm font-medium text-black/50"
        >
          <button
            onClick={() => switchLocale("fr")}
            className="rounded-md px-2 py-1 transition-colors hover:bg-black/5 hover:text-black"
          >
            FR
          </button>
          <span>|</span>
          <button
            onClick={() => switchLocale("en")}
            className="rounded-md px-2 py-1 transition-colors hover:bg-black/5 hover:text-black"
          >
            EN
          </button>
        </motion.div>

        <motion.div
          custom={navLinks.length + 2}
          variants={linkVariants}
          initial="hidden"
          animate="show"
        >
          <Link href="#hero">
            <MotionButton size="lg">{t("cta")}</MotionButton>
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
            className="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-2xl border border-black/5 bg-white shadow-lg md:hidden"
          >
            <div className="flex flex-col gap-4 p-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="py-2 text-base font-medium"
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex items-center gap-2 text-sm font-medium text-black/50">
                <button onClick={() => switchLocale("fr")}>FR</button>
                <span>|</span>
                <button onClick={() => switchLocale("en")}>EN</button>
              </div>
              <Link href="#hero" onClick={() => setIsOpen(false)}>
                <MotionButton size="lg" className="w-full justify-center">
                  {t("cta")}
                </MotionButton>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
