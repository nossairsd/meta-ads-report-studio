"use client";

import { useTranslations } from "next-intl";
import { Panel } from "@/components/dashboard/panel";
import { DeltaPill } from "@/components/dashboard/delta-pill";
import { computeDerived } from "@/lib/metrics/derived";
import { formatCurrencyCents, formatRate } from "@/lib/metrics/format";
import type { Totals } from "@/lib/metrics/schema";

function change(now: number | null, before: number | null): number | null {
  if (now === null || before === null || before === 0) return null;
  return ((now - before) / before) * 100;
}

/**
 * The ratios, each against the previous period.
 *
 * Totals say how much happened; these say whether it went well — a media
 * buyer reads the click-through rate and the cost per conversion before
 * anything else. A cost going down is the good news here, so the colours are
 * the reverse of the totals above.
 */
export function PerformancePanel({
  totals,
  previous,
  currency,
  locale,
}: {
  totals: Totals;
  previous: Totals;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("Dashboard");
  const now = computeDerived(totals);
  const before = computeDerived(previous);
  const money = (cents: number | null) =>
    cents === null ? "—" : formatCurrencyCents(cents, locale, currency);

  const cells = [
    {
      key: "ctr",
      label: t("derived.ctr"),
      value: now.ctr === null ? "—" : formatRate(now.ctr, locale),
      delta: change(now.ctr, before.ctr),
      tone: "up-is-good" as const,
      hint: t("derived.ctrHint"),
    },
    {
      key: "cpc",
      label: t("derived.cpc"),
      value: money(now.cpcCents),
      delta: change(now.cpcCents, before.cpcCents),
      tone: "up-is-bad" as const,
      hint: t("derived.cpcHint"),
    },
    {
      key: "cpm",
      label: t("derived.cpm"),
      value: money(now.cpmCents),
      delta: change(now.cpmCents, before.cpmCents),
      tone: "up-is-bad" as const,
      hint: t("derived.cpmHint"),
    },
    {
      key: "cpa",
      label: t("derived.cpa"),
      value: money(now.cpaCents),
      delta: change(now.cpaCents, before.cpaCents),
      tone: "up-is-bad" as const,
      hint: t("derived.cpaHint"),
    },
  ];

  return (
    <Panel title={t("performanceTitle")} subtitle={t("performanceSubtitle")}>
      <dl className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.key} className="min-w-0 rounded-xl bg-[#F6F7F9] p-3.5 sm:p-4">
            <dt className="truncate text-[11px] font-semibold tracking-[0.08em] text-foreground/45 uppercase">
              {cell.label}
            </dt>
            <dd className="mt-1.5 truncate text-lg font-semibold text-black tabular-nums sm:text-xl">
              {cell.value}
            </dd>
            <div className="mt-2">
              <DeltaPill value={cell.delta} tone={cell.tone} locale={locale} />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-foreground/45">{cell.hint}</p>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
