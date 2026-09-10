"use client";

import { useTranslations } from "next-intl";
import { computeDerived } from "@/lib/metrics/derived";
import { formatCurrencyCents, formatRate } from "@/lib/metrics/format";
import type { Totals } from "@/lib/metrics/schema";

/**
 * The ratios, under the four totals.
 *
 * Spend, impressions, clicks and conversions say how much happened. Whether it
 * went well is judged on what they divide into: a media buyer looks at the
 * click-through rate and the cost per conversion before anything else.
 *
 * Presented as one tinted strip rather than four more cards, because these are
 * read together and a second row of bordered boxes would compete with the KPIs
 * above rather than supporting them.
 */
export function RatioStrip({
  totals,
  currency,
  locale,
}: {
  totals: Totals;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("Dashboard");
  const derived = computeDerived(totals);
  const dash = "—";

  const cells = [
    {
      label: t("derived.ctr"),
      value: derived.ctr === null ? dash : formatRate(derived.ctr, locale),
      hint: t("derived.ctrHint"),
    },
    {
      label: t("derived.cpc"),
      value:
        derived.cpcCents === null
          ? dash
          : formatCurrencyCents(derived.cpcCents, locale, currency),
      hint: t("derived.cpcHint"),
    },
    {
      label: t("derived.cpm"),
      value:
        derived.cpmCents === null
          ? dash
          : formatCurrencyCents(derived.cpmCents, locale, currency),
      hint: t("derived.cpmHint"),
    },
    {
      label: t("derived.cpa"),
      value:
        derived.cpaCents === null
          ? dash
          : formatCurrencyCents(derived.cpaCents, locale, currency),
      hint: t("derived.cpaHint"),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl border border-black/[0.05] bg-muted/45 px-6 py-5 sm:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="min-w-0">
          <dt
            className="truncate text-[11px] font-semibold tracking-[0.08em] text-foreground/45 uppercase"
            title={cell.hint}
          >
            {cell.label}
          </dt>
          <dd className="mt-1.5 text-xl font-semibold tabular-nums text-black">
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
