"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Building2, CalendarDays, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { CampaignBreakdown } from "@/components/dashboard/campaign-breakdown";
import { DashboardEmptyState } from "@/components/dashboard/states";
import { PerformancePanel } from "@/components/dashboard/performance-panel";
import { Panel } from "@/components/dashboard/panel";
import { Monogram } from "@/components/agency/monogram";
import { CampaignTable } from "@/components/agency/campaign-table";
import { buildDashboardData } from "@/lib/metrics/aggregate";
import { formatCompact, formatCurrencyCents, formatDateRange } from "@/lib/metrics/format";
import type { AdAccount, InsightRow, MetricKey, Period } from "@/lib/metrics/schema";
import type { CampaignMeta } from "@/lib/agency/types";

const METRICS: MetricKey[] = ["spendCents", "impressions", "clicks", "conversions"];

export function DashboardView({
  account,
  rows,
  endDate,
  source = "demo",
  title,
  campaignMeta,
  reportTarget,
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
  /** The page heading — the client's name; defaults to the account's. */
  title?: string;
  /** Status, objective and budget per campaign, for the campaign table. */
  campaignMeta?: CampaignMeta[];
  /** Which client and account the report is for. Identifiers only: the
   *  server checks them against the user's own data before reading anything. */
  reportTarget?: { clientId: string; accountId: string };
}) {
  const isDemo = source === "demo";
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [period, setPeriod] = useState<Period>(30);
  const [isDownloading, startDownload] = useTransition();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Recomputed synchronously from rows already in memory: switching period is
  // instant, with no refetch and no loading flash.
  const data = buildDashboardData({ account, rows, period, endDate });
  const heading = title ?? account.name;

  const kpiValue = (metric: MetricKey) =>
    metric === "spendCents"
      ? formatCurrencyCents(data.totals.spendCents, locale, account.currency)
      : formatCompact(data.totals[metric], locale);

  const metricLabels = Object.fromEntries(
    METRICS.map((metric) => [metric, t(`metric.${metric}`)])
  ) as Record<MetricKey, string>;

  function handleDownload() {
    setDownloadError(null);
    startDownload(async () => {
      try {
        const response = await fetch("/api/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, period, locale, ...reportTarget }),
        });
        if (response.status === 429) {
          const seconds = Number(response.headers.get("Retry-After")) || 60;
          setDownloadError(t("downloadRateLimited", { seconds }));
          return;
        }
        if (!response.ok) throw new Error(`report failed: ${response.status}`);

        const blob = await response.blob();
        // The server sets the real filename on Content-Disposition, but a
        // blob: URL has no name of its own, so mirror it onto the anchor.
        const disposition = response.headers.get("Content-Disposition") ?? "";
        const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
        const filename = encoded ? decodeURIComponent(encoded) : `${heading}.pdf`;

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
    <div className="space-y-5">
      {/* Who, when, which account — then the two things a user does here. */}
      <header className="card-surface flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Monogram name={heading} size="lg" />
          <div className="min-w-0">
            {isDemo && (
              <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t("demoBadge")}
              </span>
            )}
            <h1 className="truncate text-xl font-semibold tracking-tight text-black sm:text-2xl">
              {heading}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/55">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {formatDateRange(data.rangeStart, data.rangeEnd, locale)}
              </span>
              {title && title !== account.name && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{account.name}</span>
                </span>
              )}
              <span className="rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[11px] font-semibold text-foreground/65">
                {account.currency}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            className="min-h-11 w-full gap-2 sm:w-auto"
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
          <section aria-label={t("kpiTitle")} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {METRICS.map((metric) => (
              <KpiCard
                key={metric}
                metric={metric}
                label={t(`metric.${metric}`)}
                value={kpiValue(metric)}
                delta={data.deltas[metric]}
                comparisonLabel={t("comparison", { days: period })}
                locale={locale}
                series={data.daily.map((point) => point[metric])}
              />
            ))}
          </section>

          <PerformancePanel
            totals={data.totals}
            previous={data.previousTotals}
            currency={account.currency}
            locale={locale}
          />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <Panel
              className="xl:col-span-3"
              title={t("trendTitle")}
              subtitle={t("trendSubtitle")}
            >
              <TrendChart
                data={data.daily}
                previous={data.previousDaily}
                locale={locale}
                currency={account.currency}
                labels={{
                  metrics: metricLabels,
                  current: t("trendCurrent"),
                  previous: t("trendPrevious"),
                  total: t("trendTotal"),
                  average: t("trendAverage"),
                  peak: t("trendPeak"),
                }}
              />
            </Panel>

            <Panel
              className="xl:col-span-2"
              title={t("breakdownTitle")}
              subtitle={t("breakdownSubtitle")}
            >
              <CampaignBreakdown
                campaigns={data.campaigns}
                locale={locale}
                currency={account.currency}
                labels={{
                  spend: t("metric.spendCents"),
                  total: t("breakdownTotal"),
                  campaigns: t("breakdownCampaigns", { count: data.campaigns.length }),
                  others: t("breakdownOthers"),
                }}
              />
            </Panel>
          </div>

          {campaignMeta && (
            <CampaignTable
              slices={data.campaigns}
              meta={campaignMeta}
              currency={account.currency}
              locale={locale}
            />
          )}
        </motion.div>
      )}
    </div>
  );
}
