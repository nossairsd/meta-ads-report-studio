"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrencyCents, formatDayShort } from "@/lib/metrics/format";
import type { DailyPoint } from "@/lib/metrics/schema";

export function TrendChart({
  data,
  locale,
  currency,
  label,
}: {
  data: DailyPoint[];
  locale: string;
  currency: string;
  label: string;
}) {
  const config = {
    spend: { label, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  // Values are held in cents end-to-end and only divided at the edge, so the
  // axis, the tooltip and the KPI card can never round differently.
  const points = data.map((point) => ({
    date: point.date,
    spend: point.spendCents / 100,
  }));

  // A 90-day range would otherwise print an unreadable wall of ticks.
  const tickInterval = Math.max(0, Math.ceil(points.length / 7) - 1);

  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <AreaChart data={points} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-spend)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-spend)" stopOpacity={0} />
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
          width={52}
          tickFormatter={(value: number) =>
            formatCurrencyCents(Math.round(value * 100), locale, currency)
          }
          className="text-xs"
        />

        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatDayShort(String(value), locale)}
              formatter={(value) => formatCurrencyCents(Math.round(Number(value) * 100), locale, currency)}
            />
          }
        />

        <Area
          dataKey="spend"
          type="monotone"
          stroke="var(--color-spend)"
          strokeWidth={2.5}
          fill="url(#trend-fill)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
