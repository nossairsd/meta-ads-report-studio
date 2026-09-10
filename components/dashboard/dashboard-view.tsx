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
import { RatioStrip } from "@/components/dashboard/ratio-strip";
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
  source = "demo",
}: {
  account: AdAccount;
  rows: InsightRow[];
  /** Anchor date for the period windows, passed in from the server so the
   *  server and client renders agree. */
  endDate: string;
  /** Which dataset the report endpoint should rebuild from. The figures shown
   *  here came from the server, but the PDF is generated server-side from the
   *  source of truth rather than from anything this component could post — a
   *  client that could supply its own rows could put any numbers in a report. */
  source?: "demo" | "live";
}) {
  const isDemo = source === "demo";
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

  const [downloadError, setDownloadError] = useState<string | null>(null);

  function handleDownload() {
    setDownloadError(null);
    startDownload(async () => {
      try {
        const response = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, period, locale }),
        });
        if (!response.ok) throw new Error(`report failed: ${response.status}`);

        const blob = await response.blob();
        // The server sets the real filename on Content-Disposition, but a
        // blob: URL has no name of its own, so mirror it onto the anchor.
        const disposition = response.headers.get("Content-Disposition") ?? "";
        const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
        const filename = encoded
          ? decodeURIComponent(encoded)
          : `${account.name}.pdf`;

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } catch {
        setDownloadError(t("downloadError"));
      }
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

      {downloadError && (
        <p role="alert" className="text-sm text-destructive">
          {downloadError}
        </p>
      )}

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

          <RatioStrip totals={data.totals} currency={account.currency} locale={locale} />

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
