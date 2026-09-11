"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ChevronRight, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { ActivityBadge } from "@/components/agency/status-badge";
import { AlertChip } from "@/components/agency/alert-chip";
import { Sparkline } from "@/components/agency/sparkline";
import { buildAgencySummary, type ClientSummary } from "@/lib/agency/overview";
import { normalizeName } from "@/lib/agency/grouping";
import { computeDerived } from "@/lib/metrics/derived";
import {
  formatCurrencyCents,
  formatDateRange,
  formatDelta,
  formatNumber,
} from "@/lib/metrics/format";
import type { AgencyData } from "@/lib/agency/types";
import type { Period } from "@/lib/metrics/schema";

type Filter = "all" | "watch" | "active" | "paused";
type Sort = "priority" | "name" | "change" | "conversions";

const FILTERS: Filter[] = ["all", "watch", "active", "paused"];
const SORTS: Sort[] = ["priority", "name", "change", "conversions"];

function percentChange(now: number, before: number): number | null {
  return before === 0 ? null : ((now - before) / before) * 100;
}

/** Everything a row shows, derived once per client. */
function rowFigures(client: ClientSummary) {
  const conversions = client.currencies.reduce((sum, c) => sum + c.totals.conversions, 0);
  const previousConversions = client.currencies.reduce(
    (sum, c) => sum + c.previous.conversions,
    0
  );
  const primary = client.primary;
  const cpa = primary ? computeDerived(primary.totals).cpaCents : null;
  const previousCpa = primary ? computeDerived(primary.previous).cpaCents : null;

  return {
    conversions,
    conversionsDelta: percentChange(conversions, previousConversions),
    spendDelta: primary?.deltas.spendCents ?? null,
    cpa,
    cpaDelta: cpa !== null && previousCpa !== null ? percentChange(cpa, previousCpa) : null,
  };
}

const watch = (client: ClientSummary) => client.alerts.length > 0 || client.failedAccounts > 0;

/** Clients needing attention first, blocked accounts before everything; then
 *  whoever is spending; then alphabetical, so the order is stable. */
function priorityScore(client: ClientSummary): number {
  const blocked = client.alerts.some((a) => a.kind === "account_status") ? 100 : 0;
  const activity = client.activity === "active" ? 2 : client.activity === "paused" ? 1 : 0;
  return blocked + (client.failedAccounts > 0 ? 50 : 0) + client.alerts.length * 10 + activity;
}

/**
 * The agency's first screen: every client on one page, with what needs looking
 * at on top.
 *
 * It answers, before any click, the three questions an account manager opens
 * it with: how much went out, which clients are running, and which ones need
 * me today. Everything else is one click away on the client's own page.
 */
export function AgencyOverview({
  data,
  basePath,
  isDemo = false,
}: {
  data: AgencyData;
  basePath: "/dashboard" | "/demo";
  isDemo?: boolean;
}) {
  const t = useTranslations("Agency");
  const tDashboard = useTranslations("Dashboard");
  const locale = useLocale();

  const [period, setPeriod] = useState<Period>(30);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("priority");

  const summary = useMemo(() => buildAgencySummary(data, period), [data, period]);

  const totalConversions = summary.clients.reduce((s, c) => s + rowFigures(c).conversions, 0);
  const previousConversions = summary.clients.reduce(
    (s, c) => s + c.currencies.reduce((sum, cur) => sum + cur.previous.conversions, 0),
    0
  );

  const visible = useMemo(() => {
    const needle = normalizeName(query);
    const list = summary.clients.filter((client) => {
      if (needle && !normalizeName(client.name).includes(needle)) return false;
      if (filter === "watch") return watch(client);
      if (filter === "active") return client.activity === "active";
      if (filter === "paused") return client.activity !== "active";
      return true;
    });

    const byName = (a: ClientSummary, b: ClientSummary) => a.name.localeCompare(b.name, locale);
    return list.sort((a, b) => {
      switch (sort) {
        case "name":
          return byName(a, b);
        case "change":
          // Percentages compare across currencies; amounts would not.
          return (
            (rowFigures(b).spendDelta ?? -Infinity) - (rowFigures(a).spendDelta ?? -Infinity) ||
            byName(a, b)
          );
        case "conversions":
          return rowFigures(b).conversions - rowFigures(a).conversions || byName(a, b);
        default:
          return priorityScore(b) - priorityScore(a) || byName(a, b);
      }
    });
  }, [summary, query, filter, sort, locale]);

  const range = summary.clients.find((c) => c.primary)?.primary;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        {isDemo && (
          <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {tDashboard("demoBadge")}
          </span>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-black md:text-3xl">
          {t("overview.title")}
        </h1>
        <p className="text-sm text-foreground/55">
          {t("overview.subtitle", {
            count: summary.counts.clients,
            range: range ? formatDateRange(range.rangeStart, range.rangeEnd, locale) : "—",
          })}
        </p>
      </header>

      {!isDemo && data.unassigned.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-black">
            {t("overview.unassigned", { count: data.unassigned.length })}
          </p>
          <Link
            href={`${basePath}/setup`}
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full bg-primary px-4 text-sm font-semibold text-white sm:min-h-9 sm:self-auto"
          >
            {t("overview.unassignedAction")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* The four answers, before any list. */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label={t("overview.totalSpend")}>
          {summary.currencyTotals.length === 0 && <BigValue>—</BigValue>}
          {summary.currencyTotals.map((total) => (
            <div key={total.currency} className="flex flex-wrap items-baseline gap-x-2">
              <BigValue small={summary.currencyTotals.length > 1}>
                {formatCurrencyCents(total.spendCents, locale, total.currency)}
              </BigValue>
              <Delta value={total.delta} tone="neutral" locale={locale} />
            </div>
          ))}
        </SummaryCard>

        <SummaryCard label={t("overview.conversions")}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <BigValue>{formatNumber(totalConversions, locale)}</BigValue>
            <Delta
              value={percentChange(totalConversions, previousConversions)}
              tone="up-is-good"
              locale={locale}
            />
          </div>
        </SummaryCard>

        <SummaryCard label={t("overview.activeClients")}>
          <div className="flex items-baseline gap-2">
            <BigValue>{summary.counts.active}</BigValue>
            <span className="text-sm text-foreground/50">
              {t("overview.activeOf", { total: summary.counts.clients })}
            </span>
          </div>
        </SummaryCard>

        <button
          type="button"
          onClick={() => setFilter(filter === "watch" ? "all" : "watch")}
          aria-pressed={filter === "watch"}
          className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors sm:p-5 ${
            summary.counts.toWatch > 0
              ? "border-[#F59E0B]/40 bg-[#F59E0B]/[0.07] hover:bg-[#F59E0B]/[0.12]"
              : "border-black/[0.07] bg-white"
          } ${filter === "watch" ? "ring-2 ring-[#F59E0B]/50" : ""}`}
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] text-foreground/45 uppercase">
            {t("overview.toWatch")}
          </p>
          <BigValue>{summary.counts.toWatch}</BigValue>
          {summary.counts.toWatch > 0 && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#B45309]">
              {t("overview.toWatchHint")}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </section>

      {/* Controls stay in reach while scrolling a long client list. */}
      <div className="z-20 -mx-4 flex flex-col gap-3 bg-[#F6F7F9]/92 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:sticky lg:top-0 lg:-mx-8 lg:flex-row lg:flex-wrap lg:items-center lg:px-8">
        <div className="overflow-x-auto">
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            labels={{
              7: tDashboard("period7"),
              30: tDashboard("period30"),
              90: tDashboard("period90"),
            }}
          />
        </div>

        <label className="relative w-full lg:w-60 lg:flex-none">
          <span className="sr-only">{t("overview.search")}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("overview.search")}
            className="h-11 w-full rounded-full border border-black/[0.09] bg-white pr-4 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:h-9"
          />
        </label>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`min-h-11 shrink-0 cursor-pointer rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors lg:min-h-9 ${
                filter === value
                  ? "bg-black text-white"
                  : "border border-black/[0.09] bg-white text-foreground/70 hover:text-black"
              }`}
            >
              {t(`overview.filter.${value}`)}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground/55 lg:ml-auto">
          {t("overview.sortLabel")}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-11 cursor-pointer rounded-full border border-black/[0.09] bg-white px-3 text-sm text-black outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:h-9"
          >
            {SORTS.map((value) => (
              <option key={value} value={value}>
                {t(`overview.sort.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section aria-label={t("nav.clients")}>
        {/* Wide screens: a table, compared down the columns. */}
        <div className="hidden overflow-hidden rounded-2xl border border-black/[0.07] bg-white xl:block">
          <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)_112px_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1.7fr)_20px] gap-4 border-b border-black/[0.07] bg-black/[0.02] px-5 py-3 text-[11px] font-semibold tracking-[0.1em] text-foreground/45 uppercase">
            <span>{t("overview.columns.client")}</span>
            <span>{t("overview.columns.spend")}</span>
            <span>{t("overview.columns.trend")}</span>
            <span>{t("overview.columns.conversions")}</span>
            <span>{t("overview.columns.cpa")}</span>
            <span>{t("overview.columns.alerts")}</span>
            <span />
          </div>
          <ul>
            {visible.map((client) => (
              <li key={client.id} className="border-b border-black/[0.05] last:border-0">
                <ClientRow client={client} basePath={basePath} locale={locale} />
              </li>
            ))}
          </ul>
        </div>

        {/* Narrower screens: one card per client, the same facts stacked. */}
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
          {visible.map((client) => (
            <li key={client.id}>
              <ClientCard client={client} basePath={basePath} locale={locale} />
            </li>
          ))}
        </ul>

        {visible.length === 0 && (
          <p className="rounded-2xl border border-dashed border-black/[0.12] bg-white px-5 py-10 text-center text-sm text-foreground/55">
            {t("overview.noMatch")}
          </p>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-foreground/45 uppercase">
        {label}
      </p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function BigValue({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return (
    <span
      className={`block font-semibold tracking-tight text-black tabular-nums ${
        small ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * A change, coloured by what it means. Spend is neutral — spending more is
 * neither good nor bad without the return — and a cost going up is bad.
 */
function Delta({
  value,
  tone,
  locale,
}: {
  value: number | null;
  tone: "neutral" | "up-is-good" | "up-is-bad";
  locale: string;
}) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-xs text-foreground/40">—</span>;
  }
  const flat = Math.round(value * 10) === 0;
  const good = tone === "up-is-good" ? value > 0 : value < 0;
  const color =
    tone === "neutral" || flat ? "text-foreground/55" : good ? "text-[#15803D]" : "text-destructive";
  return <span className={`text-xs font-semibold tabular-nums ${color}`}>{formatDelta(value, locale)}</span>;
}

function SpendCell({ client, locale }: { client: ClientSummary; locale: string }) {
  const t = useTranslations("Agency.overview");
  const [primary, ...others] = client.currencies;
  if (!primary || primary.totals.spendCents === 0) {
    return <span className="text-sm text-foreground/45">{t("noData")}</span>;
  }
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-black tabular-nums">
          {formatCurrencyCents(primary.totals.spendCents, locale, primary.currency)}
        </span>
        <Delta value={primary.deltas.spendCents} tone="neutral" locale={locale} />
      </div>
      {/* Other currencies are listed, never converted and added. */}
      {others
        .filter((c) => c.totals.spendCents > 0)
        .map((c) => (
          <p key={c.currency} className="text-xs text-foreground/55 tabular-nums">
            + {formatCurrencyCents(c.totals.spendCents, locale, c.currency)}
          </p>
        ))}
    </div>
  );
}

function Alerts({ client, locale }: { client: ClientSummary; locale: string }) {
  const t = useTranslations("Agency.overview");
  if (client.alerts.length === 0 && client.failedAccounts === 0) {
    return <span className="text-xs text-foreground/40">{t("noAlerts")}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {client.failedAccounts > 0 && (
        <span className="inline-flex items-center rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
          {t("failedAccounts", { count: client.failedAccounts })}
        </span>
      )}
      {client.alerts.map((alert) => (
        <AlertChip key={alert.kind} alert={alert} locale={locale} />
      ))}
    </div>
  );
}

function ClientIdentity({ client }: { client: ClientSummary }) {
  const t = useTranslations("Agency");
  const currencies = client.currencies.map((c) => c.currency);
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-black">{client.name}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/50">
        <ActivityBadge status={client.activity} label={t(`activity.${client.activity}`)} />
        <span>{t("overview.accounts", { count: client.accountCount })}</span>
        {currencies.length > 0 && <span>· {currencies.join(" · ")}</span>}
      </div>
    </div>
  );
}

function ClientRow({
  client,
  basePath,
  locale,
}: {
  client: ClientSummary;
  basePath: string;
  locale: string;
}) {
  const figures = rowFigures(client);
  return (
    <Link
      href={`${basePath}/clients/${client.id}`}
      className="group grid grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)_112px_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1.7fr)_20px] items-center gap-4 px-5 py-4 transition-colors hover:bg-primary/[0.03]"
    >
      <ClientIdentity client={client} />
      <SpendCell client={client} locale={locale} />
      <Sparkline
        values={client.primary?.daily.map((d) => d.spendCents) ?? []}
        className="text-primary"
      />
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-black tabular-nums">
          {formatNumber(figures.conversions, locale)}
        </span>
        <Delta value={figures.conversionsDelta} tone="up-is-good" locale={locale} />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-black tabular-nums">
          {figures.cpa === null || !client.primary
            ? "—"
            : formatCurrencyCents(figures.cpa, locale, client.primary.currency)}
        </span>
        <Delta value={figures.cpaDelta} tone="up-is-bad" locale={locale} />
      </div>
      <Alerts client={client} locale={locale} />
      <ChevronRight className="h-4 w-4 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function ClientCard({
  client,
  basePath,
  locale,
}: {
  client: ClientSummary;
  basePath: string;
  locale: string;
}) {
  const t = useTranslations("Agency.overview.columns");
  const figures = rowFigures(client);
  return (
    <Link
      href={`${basePath}/clients/${client.id}`}
      className={`flex h-full flex-col gap-3 rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-primary/30 ${
        watch(client) ? "border-[#F59E0B]/40" : "border-black/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <ClientIdentity client={client} />
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-foreground/30" />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-foreground/45 uppercase">
            {t("spend")}
          </p>
          <SpendCell client={client} locale={locale} />
        </div>
        <Sparkline
          values={client.primary?.daily.map((d) => d.spendCents) ?? []}
          className="shrink-0 text-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-black/[0.06] pt-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.1em] text-foreground/45 uppercase">
            {t("conversions")}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-black tabular-nums">
              {formatNumber(figures.conversions, locale)}
            </span>
            <Delta value={figures.conversionsDelta} tone="up-is-good" locale={locale} />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.1em] text-foreground/45 uppercase">
            {t("cpa")}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold text-black tabular-nums">
              {figures.cpa === null || !client.primary
                ? "—"
                : formatCurrencyCents(figures.cpa, locale, client.primary.currency)}
            </span>
            <Delta value={figures.cpaDelta} tone="up-is-bad" locale={locale} />
          </div>
        </div>
      </div>

      <Alerts client={client} locale={locale} />
    </Link>
  );
}
