"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { CampaignBreakdown } from "@/components/dashboard/campaign-breakdown";
import { DashboardEmptyState } from "@/components/dashboard/states";
import { buildDashboardData } from "@/lib/metrics/aggregate";
import {
  formatCompact,
  formatCurrencyCents,
  formatDateRange,
} from "@/lib/metrics/format";
import type { InsightRow, MetricKey, Period } from "@/lib/metrics/schema";
import type { AdAccount } from "@/lib/metrics/schema";

const METRICS: MetricKey[] = ["spendCents", "impressions", "clicks", "conversions"];

export function DashboardView({
  account,
  rows,
  endDate,
  isDemo = false,
}: {
  account: AdAccount;
  rows: InsightRow[];
  /** Anchor date for the period windows, passed in from the server so the
   *  server and client renders agree. */
  endDate: string;
  isDemo?: boolean;
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [period, setPeriod] = useState<Period>(30);
  const [isDownloading, startDownload] = useTransition();

  // Recomputed synchronously from rows already in memory: switching period is
  // instant, with no refetch and no loading flash.
  const data = buildDashboardData({ account, rows, period, endDate });

  const kpiValue = (metric: MetricKey) =>
    metric === "spendCents"
      ? formatCurrencyCents(data.totals.spendCents, locale, account.currency)
      : formatCompact(data.totals[metric], locale);

  function handleDownload() {
    startDownload(async () => {
      // Wired to /api/report in the next step; the pending state is already
      // driven by useTransition so the button cannot be double-clicked.
      await new Promise((resolve) => setTimeout(resolve, 1200));
    });
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {isDemo && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {t("demoBadge")}
            </span>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-black md:text-3xl">
            {account.name}
          </h1>
          <p className="mt-1.5 text-sm text-foreground/55">
            {formatDateRange(data.rangeStart, data.rangeEnd, locale)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            labels={{
              7: t("period7"),
              30: t("period30"),
              90: t("period90"),
            }}
          />
          <Button
            size="lg"
            className="gap-2"
            onClick={handleDownload}
            disabled={isDownloading || data.isEmpty}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("downloadPending")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t("download")}
              </>
            )}
          </Button>
        </div>
      </header>

      {data.isEmpty ? (
        <DashboardEmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          actionLabel={period !== 90 ? t("emptyAction") : undefined}
          onAction={period !== 90 ? () => setPeriod(90) : undefined}
        />
      ) : (
        <motion.div
          key={period}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric) => (
              <KpiCard
                key={metric}
                metric={metric}
                label={t(`metric.${metric}`)}
                value={kpiValue(metric)}
                delta={data.deltas[metric]}
                comparisonLabel={t("comparison", { days: period })}
                locale={locale}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <section className="rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-3">
              <h2 className="text-sm font-semibold text-black">{t("trendTitle")}</h2>
              <p className="mt-1 text-xs text-foreground/50">{t("trendSubtitle")}</p>
              <div className="mt-5">
                <TrendChart
                  data={data.daily}
                  locale={locale}
                  currency={account.currency}
                  label={t("metric.spendCents")}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
              <h2 className="text-sm font-semibold text-black">{t("breakdownTitle")}</h2>
              <p className="mt-1 text-xs text-foreground/50">{t("breakdownSubtitle")}</p>
              <div className="mt-5">
                <CampaignBreakdown
                  campaigns={data.campaigns}
                  locale={locale}
                  currency={account.currency}
                  spendLabel={t("metric.spendCents")}
                />
              </div>
            </section>
          </div>
        </motion.div>
      )}
    </div>
  );
}
