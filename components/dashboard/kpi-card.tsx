import { TrendingDown, TrendingUp } from "lucide-react";
import { formatDelta } from "@/lib/metrics/format";
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

export function KpiCard({
  metric,
  label,
  value,
  delta,
  comparisonLabel,
  locale,
}: {
  metric: MetricKey;
  label: string;
  value: string;
  /** Percentage change, or null when the previous period had no activity. */
  delta: number | null;
  comparisonLabel: string;
  locale: string;
}) {
  const hasDelta = delta !== null && Number.isFinite(delta);
  const isUp = hasDelta && delta > 0;
  const isFlat = hasDelta && Math.round(delta * 10) === 0;
  const neutral = DIRECTION[metric] === "neutral" || isFlat;

  const tone = neutral
    ? "text-foreground/60 bg-muted"
    : isUp
      ? "text-[#16A34A] bg-[#16A34A]/10"
      : "text-destructive bg-destructive/10";

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-foreground/45 uppercase">
        {label}
      </p>

      {/* Two cards per row on a phone: the value steps down a size so an
          amount like "12 345,67 €" still fits on one line. */}
      <p className="mt-2 text-xl font-semibold tracking-tight text-black tabular-nums sm:mt-2.5 sm:text-3xl">
        {value}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        {hasDelta ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}
          >
            {!isFlat &&
              (isUp ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              ))}
            {formatDelta(delta, locale)}
          </span>
        ) : (
          // No baseline is not the same as no change — say so rather than
          // rendering a misleading 0%.
          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/45">
            —
          </span>
        )}
        <span className="text-xs text-foreground/45">{comparisonLabel}</span>
      </div>
    </div>
  );
}
