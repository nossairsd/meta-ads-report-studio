import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatDelta } from "@/lib/metrics/format";

/**
 * A change against the previous period, coloured by what it means.
 *
 * "Up" is not automatically good: more clicks is, a higher cost per click is
 * not, and more spend is neither without knowing the return — so spend stays
 * grey. No baseline shows a dash, never a misleading 0 % or +100 %.
 */
export function DeltaPill({
  value,
  tone,
  locale,
}: {
  value: number | null;
  tone: "neutral" | "up-is-good" | "up-is-bad";
  locale: string;
}) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <span className="inline-flex rounded-full bg-black/[0.05] px-2 py-0.5 text-xs font-medium text-foreground/45">
        —
      </span>
    );
  }

  const flat = Math.round(value * 10) === 0;
  const up = value > 0;
  const good = tone === "up-is-good" ? up : !up;
  const colour =
    tone === "neutral" || flat
      ? "bg-black/[0.05] text-foreground/60"
      : good
        ? "bg-[#16A34A]/10 text-[#15803D]"
        : "bg-destructive/10 text-destructive";
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${colour}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {formatDelta(value, locale)}
    </span>
  );
}
