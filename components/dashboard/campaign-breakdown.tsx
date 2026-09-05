"use client";

import { Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrencyCents, formatShare } from "@/lib/metrics/format";
import type { CampaignSlice } from "@/lib/metrics/schema";

// Four distinct hues from the design system, in the order the palette
// defines them, so a campaign keeps its colour between the donut and the list.
const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CampaignBreakdown({
  campaigns,
  locale,
  currency,
  spendLabel,
}: {
  campaigns: CampaignSlice[];
  locale: string;
  currency: string;
  spendLabel: string;
}) {
  const config = { spend: { label: spendLabel } } satisfies ChartConfig;

  const slices = campaigns.map((campaign, i) => ({
    name: campaign.campaignName,
    spend: campaign.spendCents / 100,
    share: campaign.share,
    fill: SLICE_COLORS[i % SLICE_COLORS.length],
  }));

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <ChartContainer config={config} className="mx-auto h-[190px] w-[190px] shrink-0">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrencyCents(Math.round(Number(value) * 100), locale, currency)}
                    </span>
                  </span>
                )}
              />
            }
          />
          {/* Radii must be percentages, not pixels. With pixel radii Recharts 3
              sizes the sectors against the container's first measurement —
              zero inside ResponsiveContainer — and never recomputes, emitting
              sector groups containing no path at all. Colour comes from each
              datum's own `fill`. */}
          <Pie
            data={slices}
            dataKey="spend"
            nameKey="name"
            innerRadius="58%"
            outerRadius="92%"
            paddingAngle={2}
            strokeWidth={0}
          />
        </PieChart>
      </ChartContainer>

      {/* The legend doubles as the per-campaign table: on a report, knowing
          which campaign burned the budget matters more than the ring itself. */}
      <ul className="flex-1 space-y-3">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.fill }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground/75">
              {slice.name}
            </span>
            <span className="text-sm font-medium tabular-nums text-black">
              {formatCurrencyCents(Math.round(slice.spend * 100), locale, currency)}
            </span>
            <span className="w-12 text-right text-xs tabular-nums text-foreground/45">
              {formatShare(slice.share, locale)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
