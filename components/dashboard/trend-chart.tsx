"use client";

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { METRIC_STYLE } from "@/components/dashboard/kpi-card";
import { formatCompact, formatCurrencyCents, formatDayShort } from "@/lib/metrics/format";
import type { DailyPoint, MetricKey } from "@/lib/metrics/schema";

const METRICS: MetricKey[] = ["spendCents", "clicks", "conversions", "impressions"];

/**
 * One metric day by day, with the previous period dashed behind it.
 *
 * The dashed line is what turns a curve into an answer: "is this better than
 * last month?" is the question a client asks, and a lone line cannot say.
 * The two periods are aligned day by day from their first day.
 */
export function TrendChart({
  data,
  previous,
  locale,
  currency,
  labels,
}: {
  data: DailyPoint[];
  previous: DailyPoint[];
  locale: string;
  currency: string;
  labels: {
    metrics: Record<MetricKey, string>;
    current: string;
    previous: string;
    total: string;
    average: string;
    peak: string;
  };
}) {
  const [metric, setMetric] = useState<MetricKey>("spendCents");
  const isMoney = metric === "spendCents";

  // Money is held in cents end to end and divided only here, at the edge, so
  // the axis, the tooltip and the KPI card can never round differently.
  const toDisplay = (point: DailyPoint) => (isMoney ? point[metric] / 100 : point[metric]);
  const format = (value: number) =>
    isMoney
      ? formatCurrencyCents(Math.round(value * 100), locale, currency)
      : formatCompact(Math.round(value), locale);

  const points = data.map((point, i) => ({
    date: point.date,
    value: toDisplay(point),
    previous: previous[i] ? toDisplay(previous[i]) : null,
  }));

  const total = points.reduce((sum, p) => sum + p.value, 0);
  const average = points.length ? total / points.length : 0;
  const peak = points.reduce<(typeof points)[number] | null>(
    (best, p) => (!best || p.value > best.value ? p : best),
    null
  );

  const colour = METRIC_STYLE[metric].hex;
  const config = {
    value: { label: labels.current, color: colour },
    previous: { label: labels.previous, color: "#94A3B8" },
  } satisfies ChartConfig;

  // A 90-day range would otherwise print an unreadable wall of ticks.
  const tickInterval = Math.max(0, Math.ceil(points.length / 7) - 1);

  return (
    <div className="space-y-5">
      <div role="tablist" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {METRICS.map((key) => {
          const active = key === metric;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMetric(key)}
              className={`inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                active
                  ? "border-black bg-black text-white"
                  : "border-black/[0.08] bg-white text-foreground/65 hover:text-black"
              }`}
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: METRIC_STYLE[key].hex }}
              />
              {labels.metrics[key]}
            </button>
          );
        })}
      </div>

      <dl className="grid grid-cols-3 gap-3 border-y border-black/[0.06] py-3">
        <Stat label={labels.total} value={format(total)} />
        <Stat label={labels.average} value={format(average)} />
        <Stat
          label={labels.peak}
          value={peak && peak.value > 0 ? format(peak.value) : "—"}
          hint={peak && peak.value > 0 ? formatDayShort(peak.date, locale) : undefined}
        />
      </dl>

      <ChartContainer config={config} className="h-[220px] w-full sm:h-[250px]">
        <ComposedChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={`trend-fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.24} />
              <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />

          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval={tickInterval}
            tickFormatter={(value: string) => formatDayShort(value, locale)}
            className="text-xs"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={isMoney ? 68 : 44}
            tickFormatter={(value: number) => format(value)}
            className="text-xs"
          />

          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => formatDayShort(String(value), locale)}
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">
                      {name === "previous" ? labels.previous : labels.current}
                    </span>
                    <span className="font-medium tabular-nums">{format(Number(value))}</span>
                  </span>
                )}
              />
            }
          />

          <Line
            dataKey="previous"
            type="monotone"
            stroke="var(--color-previous)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={2.5}
            fill={`url(#trend-fill-${metric})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center gap-4 text-xs text-foreground/55">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-5 rounded-full" style={{ backgroundColor: colour }} />
          {labels.current}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="w-5 border-t-2 border-dashed border-[#94A3B8]" />
          {labels.previous}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] font-medium text-foreground/45">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-black tabular-nums sm:text-base">
        {value}
        {hint && <span className="ml-1.5 text-xs font-normal text-foreground/45">{hint}</span>}
      </dd>
    </div>
  );
}
