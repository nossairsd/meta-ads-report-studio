"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlignJustify, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as motion from "motion/react-m";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/landing/logo";
import { MotionButton } from "@/components/landing/motion-button";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Landing.nav");
  const pathname = usePathname();
  const router = useRouter();

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
    <nav className="flex h-fit w-full items-center justify-between py-4">
      <Link href="/" title="Home" className="shrink-0">
        <Logo />
      </Link>

      <div className="hidden items-center justify-center gap-6 md:flex">
        <ul className="flex items-center justify-center gap-6 text-sm font-medium text-black/80">
          {navLinks.map((link) => (
            <li key={link.name}>
              <Link href={link.href} className="transition-opacity hover:opacity-70">
                {link.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1 text-sm font-medium text-black/50">
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
        </div>

        <Link href="#hero">
          <MotionButton size="lg">{t("cta")}</MotionButton>
        </Link>
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
            className="fixed top-16 left-0 z-50 w-full overflow-hidden bg-white shadow-lg md:hidden"
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
    </nav>
  );
}
