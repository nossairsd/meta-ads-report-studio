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

// Distinct hues from the design system, in the order the palette defines
// them, so a campaign keeps its colour between the ring and the list.
const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const OTHERS_COLOR = "#CBD5E1";

/** Beyond five slices a ring stops being readable, so the tail is grouped. */
const MAX_SLICES = 5;

export function CampaignBreakdown({
  campaigns,
  locale,
  currency,
  labels,
}: {
  campaigns: CampaignSlice[];
  locale: string;
  currency: string;
  labels: { spend: string; total: string; campaigns: string; others: string };
}) {
  const config = { spend: { label: labels.spend } } satisfies ChartConfig;

  const kept = campaigns.length > MAX_SLICES ? campaigns.slice(0, MAX_SLICES - 1) : campaigns;
  const rest = campaigns.slice(kept.length);

  const slices = kept.map((campaign, i) => ({
    name: campaign.campaignName,
    spendCents: campaign.spendCents,
    spend: campaign.spendCents / 100,
    share: campaign.share,
    fill: SLICE_COLORS[i % SLICE_COLORS.length],
  }));
  if (rest.length > 0) {
    const spendCents = rest.reduce((sum, c) => sum + c.spendCents, 0);
    slices.push({
      name: `${labels.others} (${rest.length})`,
      spendCents,
      spend: spendCents / 100,
      share: rest.reduce((sum, c) => sum + c.share, 0),
      fill: OTHERS_COLOR,
    });
  }

  const totalCents = campaigns.reduce((sum, c) => sum + c.spendCents, 0);
  const money = (cents: number) => formatCurrencyCents(cents, locale, currency);

  return (
    // Laid out by the panel's width, not the screen's: side by side only when
    // the panel itself has room, stacked otherwise — so nothing spills out.
    <div className="flex flex-col items-center gap-6 @lg:flex-row @lg:items-center">
      <div className="relative h-[176px] w-[176px] shrink-0">
        <ChartContainer config={config} className="h-full w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <span className="flex w-full justify-between gap-4">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-medium tabular-nums">
                        {money(Math.round(Number(value) * 100))}
                      </span>
                    </span>
                  )}
                />
              }
            />
            {/* Radii must be percentages, not pixels. With pixel radii
                Recharts 3 sizes the sectors against the container's first
                measurement — zero inside ResponsiveContainer — and never
                recomputes. Colour comes from each datum's own `fill`. */}
            <Pie
              data={slices}
              dataKey="spend"
              nameKey="name"
              innerRadius="66%"
              outerRadius="96%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              strokeWidth={0}
            />
          </PieChart>
        </ChartContainer>

        {/* The total in the hole: the one number the ring is a share of. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="text-[10px] font-semibold tracking-[0.12em] text-foreground/45 uppercase">
            {labels.total}
          </span>
          <span className="mt-0.5 max-w-full truncate text-base font-semibold text-black tabular-nums">
            {money(totalCents)}
          </span>
          <span className="text-[11px] text-foreground/45">{labels.campaigns}</span>
        </div>
      </div>

      {/* The legend doubles as a ranking: on a report, knowing which campaign
          burned the budget matters more than the ring itself. */}
      <ul className="w-full min-w-0 flex-1 space-y-3.5">
        {slices.map((slice) => (
          <li key={slice.name} className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.fill }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground/80" title={slice.name}>
                {slice.name}
              </span>
              <span className="shrink-0 text-sm font-semibold text-black tabular-nums">
                {money(slice.spendCents)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2.5 pl-5">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.05]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(slice.share * 100, 1)}%`, backgroundColor: slice.fill }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs text-foreground/50 tabular-nums">
                {formatShare(slice.share, locale)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
