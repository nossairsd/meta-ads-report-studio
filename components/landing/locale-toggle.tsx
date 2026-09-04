"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion } from "motion/react";
import { useTransition } from "react";

const LOCALES = ["fr", "en"] as const;

export default function LocaleToggle({
  layoutId = "locale-pill",
  className = "",
}: {
  layoutId?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = useLocale();
  const [isPending, startTransition] = useTransition();

  function switchLocale(locale: string) {
    if (locale === active) return;
    const segments = pathname.split("/");
    segments[1] = locale;
    startTransition(() => router.push(segments.join("/")));
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={`relative flex items-center gap-0.5 rounded-full bg-black/[0.055] p-[3px] text-[13px] font-semibold ${
        isPending ? "opacity-70" : ""
      } ${className}`}
    >
      {LOCALES.map((locale) => {
        const isActive = locale === active;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => switchLocale(locale)}
            aria-pressed={isActive}
            className="relative cursor-pointer rounded-full px-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            <span
              className={`relative z-10 transition-colors ${
                isActive ? "text-black" : "text-black/45 hover:text-black/70"
              }`}
            >
              {locale.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
