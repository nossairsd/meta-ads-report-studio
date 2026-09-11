import { Eye, MousePointerClick, Target, Wallet, type LucideIcon } from "lucide-react";
import { DeltaPill } from "@/components/dashboard/delta-pill";
import { Sparkline } from "@/components/agency/sparkline";
import type { MetricKey } from "@/lib/metrics/schema";

/**
 * Whether a rise in this metric is good news.
 *
 * Spend is deliberately neutral: spending more is neither a win nor a
 * problem without knowing the return, and colouring it green would quietly
 * tell agency owners the wrong story about their own budget.
 */
const DIRECTION: Record<MetricKey, "up-is-good" | "neutral"> = {
  spendCents: "neutral",
  impressions: "up-is-good",
  clicks: "up-is-good",
  conversions: "up-is-good",
};

/** Each metric keeps one colour everywhere: its card, its mini curve, and its
 *  line on the trend chart. */
export const METRIC_STYLE: Record<MetricKey, { icon: LucideIcon; text: string; tint: string; hex: string }> = {
  spendCents: { icon: Wallet, text: "text-[#2563EB]", tint: "bg-[#2563EB]/10", hex: "#2563EB" },
  impressions: { icon: Eye, text: "text-[#0EA5E9]", tint: "bg-[#0EA5E9]/10", hex: "#0EA5E9" },
  clicks: { icon: MousePointerClick, text: "text-[#8B5CF6]", tint: "bg-[#8B5CF6]/10", hex: "#8B5CF6" },
  conversions: { icon: Target, text: "text-[#16A34A]", tint: "bg-[#16A34A]/10", hex: "#16A34A" },
};

export function KpiCard({
  metric,
  label,
  value,
  delta,
  comparisonLabel,
  locale,
  series,
}: {
  metric: MetricKey;
  label: string;
  value: string;
  /** Percentage change, or null when the previous period had no activity. */
  delta: number | null;
  comparisonLabel: string;
  locale: string;
  /** The metric day by day over the period, drawn under the figure. */
  series?: number[];
}) {
  const { icon: Icon, text, tint } = METRIC_STYLE[metric];

  return (
    <div className="card-surface flex min-w-0 flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="pt-1 text-[11px] font-semibold tracking-[0.12em] text-foreground/45 uppercase">
          {label}
        </p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tint} ${text}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>

      {/* Two cards per row on a phone: the value steps down a size so an
          amount like "12 345,67 €" still fits on one line. */}
      <p className="mt-2 truncate text-xl font-semibold tracking-tight text-black tabular-nums sm:text-[28px] sm:leading-9">
        {value}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <DeltaPill value={delta} tone={DIRECTION[metric]} locale={locale} />
        <span className="text-xs text-foreground/45">{comparisonLabel}</span>
      </div>

      {series && <Sparkline values={series} responsive height={34} className={`mt-4 ${text}`} />}
    </div>
  );
}
