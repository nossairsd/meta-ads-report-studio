"use client";

import { motion } from "motion/react";
import { PERIODS, type Period } from "@/lib/metrics/schema";

export function PeriodSelector({
  value,
  onChange,
  labels,
  disabled = false,
}: {
  value: Period;
  onChange: (period: Period) => void;
  /** Localised label per period, e.g. { 7: "7 jours", ... }. */
  labels: Record<Period, string>;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Period"
      className={`inline-flex items-center gap-0.5 rounded-full bg-muted p-1 ${
        disabled ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {PERIODS.map((period) => {
        const isActive = period === value;
        return (
          <button
            key={period}
            type="button"
            onClick={() => onChange(period)}
            aria-pressed={isActive}
            className="relative cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {isActive && (
              <motion.span
                layoutId="period-pill"
                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            <span
              className={`relative z-10 transition-colors ${
                isActive ? "text-black" : "text-foreground/55 hover:text-foreground/80"
              }`}
            >
              {labels[period]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
