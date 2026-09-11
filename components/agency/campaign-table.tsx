"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp } from "lucide-react";
import { CampaignStatusBadge } from "@/components/agency/status-badge";
import { objectiveKey } from "@/lib/agency/labels";
import { computeDerived } from "@/lib/metrics/derived";
import {
  formatCurrencyCents,
  formatDayLong,
  formatNumber,
  formatRate,
  formatShare,
} from "@/lib/metrics/format";
import type { CampaignMeta, CampaignStatus } from "@/lib/agency/types";
import type { CampaignSlice } from "@/lib/metrics/schema";

type Row = {
  id: string;
  name: string;
  meta: CampaignMeta | null;
  spendCents: number;
  conversions: number;
  share: number;
  ctr: number | null;
  cpcCents: number | null;
  cpaCents: number | null;
  /** Spent in the period, or switched on and able to. */
  isLive: boolean;
};

type SortKey = "name" | "status" | "budget" | "spendCents" | "share" | "ctr" | "cpcCents" | "conversions" | "cpaCents";

/** Live first, then what needs a decision, then history. */
const STATUS_ORDER: CampaignStatus[] = [
  "active",
  "with_issues",
  "rejected",
  "in_review",
  "paused",
  "ended",
  "archived",
];

const LIVE: CampaignStatus[] = ["active", "in_review", "with_issues"];

function sortValue(row: Row, key: SortKey): number | string | null {
  switch (key) {
    case "name":
      return row.name.toLowerCase();
    case "status":
      return row.meta ? STATUS_ORDER.indexOf(row.meta.status) : STATUS_ORDER.length;
    case "budget":
      return row.meta?.dailyBudgetCents ?? row.meta?.lifetimeBudgetCents ?? null;
    default:
      return row[key];
  }
}

/**
 * Every campaign of the account, with what the figures alone cannot say: is it
 * running, what is it for, what may it spend.
 *
 * The status shown is the real one — a campaign past its end date reads
 * "Ended" even when Meta's switch still says active. Campaigns with no
 * activity in the period are folded away by default; an agency's account
 * accumulates dozens of old ones, and they would bury the four that matter.
 */
export function CampaignTable({
  slices,
  meta,
  currency,
  locale,
}: {
  /** Figures for the displayed period. */
  slices: CampaignSlice[];
  /** Status, objective and budget, when Meta provided them. */
  meta: CampaignMeta[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("Agency");
  const [sortKey, setSortKey] = useState<SortKey>("spendCents");
  const [descending, setDescending] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const metaById = new Map(meta.map((m) => [m.id, m]));
    const ids = new Set([...slices.map((s) => s.campaignId), ...meta.map((m) => m.id)]);

    return [...ids].map((id) => {
      const slice = slices.find((s) => s.campaignId === id);
      const m = metaById.get(id) ?? null;
      const totals = {
        spendCents: slice?.spendCents ?? 0,
        impressions: slice?.impressions ?? 0,
        clicks: slice?.clicks ?? 0,
        conversions: slice?.conversions ?? 0,
      };
      const derived = computeDerived(totals);
      return {
        id,
        name: m?.name ?? slice?.campaignName ?? `#${id}`,
        meta: m,
        spendCents: totals.spendCents,
        conversions: totals.conversions,
        share: slice?.share ?? 0,
        ctr: derived.ctr,
        cpcCents: derived.cpcCents,
        cpaCents: derived.cpaCents,
        isLive: totals.spendCents > 0 || (m !== null && LIVE.includes(m.status)),
      };
    });
  }, [slices, meta]);

  const sorted = useMemo(() => {
    const list = rows.filter((row) => showAll || row.isLive);
    return list.sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      // Missing values sink to the bottom whichever way the column is sorted.
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const order = va < vb ? -1 : va > vb ? 1 : 0;
      return descending ? -order : order;
    });
  }, [rows, showAll, sortKey, descending]);

  const hiddenCount = rows.filter((row) => !row.isLive).length;

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDescending((d) => !d);
    } else {
      setSortKey(key);
      // Text reads A→Z; figures read largest first.
      setDescending(key !== "name" && key !== "status");
    }
  }

  const money = (cents: number | null) =>
    cents === null ? "—" : formatCurrencyCents(cents, locale, currency);

  const budget = (m: CampaignMeta | null) => {
    if (m?.dailyBudgetCents) return money(m.dailyBudgetCents);
    if (m?.lifetimeBudgetCents)
      return t("client.lifetimeBudget", { amount: money(m.lifetimeBudgetCents) });
    return "—";
  };

  const subline = (row: Row) => {
    const parts: string[] = [];
    const objective = objectiveKey(row.meta?.objective ?? null);
    if (objective) parts.push(t(`objective.${objective}`));
    if (row.meta?.status === "ended" && row.meta.endDate) {
      parts.push(t("client.endedOn", { date: formatDayLong(row.meta.endDate, locale) }));
    } else if (row.meta?.startDate) {
      parts.push(t("client.since", { date: formatDayLong(row.meta.startDate, locale) }));
    }
    return parts.join(" · ");
  };

  const columns: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "name", label: t("client.columns.campaign"), align: "left" },
    { key: "status", label: t("client.columns.status"), align: "left" },
    { key: "budget", label: t("client.columns.budget"), align: "right" },
    { key: "spendCents", label: t("client.columns.spend"), align: "right" },
    { key: "share", label: t("client.columns.share"), align: "right" },
    { key: "ctr", label: t("client.columns.ctr"), align: "right" },
    { key: "cpcCents", label: t("client.columns.cpc"), align: "right" },
    { key: "conversions", label: t("client.columns.conversions"), align: "right" },
    { key: "cpaCents", label: t("client.columns.cpa"), align: "right" },
  ];

  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-1 p-4 sm:p-6 sm:pb-4">
        <h2 className="text-sm font-semibold text-black">{t("client.campaignsTitle")}</h2>
        <p className="text-xs text-foreground/50">{t("client.campaignsSubtitle")}</p>
      </div>

      {sorted.length === 0 ? (
        <p className="px-4 pb-6 text-sm text-foreground/55 sm:px-6">{t("client.noCampaigns")}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-y border-black/[0.07] bg-black/[0.02]">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        sortKey === column.key ? (descending ? "descending" : "ascending") : "none"
                      }
                      className={`px-3 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-foreground/45 uppercase first:pl-6 last:pr-6 ${
                        column.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        title={t("client.sortBy", { column: column.label })}
                        className={`inline-flex cursor-pointer items-center gap-1 uppercase hover:text-black ${
                          sortKey === column.key ? "text-black" : ""
                        }`}
                      >
                        {column.label}
                        {sortKey === column.key &&
                          (descending ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUp className="h-3 w-3" />
                          ))}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.id} className="border-b border-black/[0.05] last:border-0">
                    <td className="max-w-[280px] py-3 pr-3 pl-6">
                      <p className="truncate font-medium text-black" title={row.name}>
                        {row.name}
                      </p>
                      <p className="truncate text-xs text-foreground/50">{subline(row)}</p>
                    </td>
                    <td className="px-3 py-3">
                      {row.meta ? (
                        <CampaignStatusBadge
                          status={row.meta.status}
                          label={t(`campaignStatus.${row.meta.status}`)}
                        />
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-foreground/70 tabular-nums">
                      {budget(row.meta)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-black tabular-nums">
                      {money(row.spendCents)}
                    </td>
                    <td className="px-3 py-3 text-right text-foreground/70 tabular-nums">
                      {row.spendCents > 0 ? formatShare(row.share, locale) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.ctr === null ? "—" : formatRate(row.ctr, locale)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{money(row.cpcCents)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatNumber(row.conversions, locale)}
                    </td>
                    <td className="py-3 pr-6 pl-3 text-right tabular-nums">{money(row.cpaCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-black/[0.06] border-t border-black/[0.07] md:hidden">
            {sorted.map((row) => (
              <li key={row.id} className="space-y-2.5 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium break-words text-black">{row.name}</p>
                    <p className="text-xs text-foreground/50">{subline(row)}</p>
                  </div>
                  {row.meta && (
                    <CampaignStatusBadge
                      status={row.meta.status}
                      label={t(`campaignStatus.${row.meta.status}`)}
                    />
                  )}
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <Stat label={t("client.columns.spend")} value={money(row.spendCents)} strong />
                  <Stat label={t("client.columns.conversions")} value={formatNumber(row.conversions, locale)} />
                  <Stat label={t("client.columns.cpa")} value={money(row.cpaCents)} />
                  <Stat label={t("client.columns.ctr")} value={row.ctr === null ? "—" : formatRate(row.ctr, locale)} />
                  <Stat label={t("client.columns.cpc")} value={money(row.cpcCents)} />
                  <Stat label={t("client.columns.budget")} value={budget(row.meta)} />
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      {hiddenCount > 0 && (
        <div className="border-t border-black/[0.07] px-4 py-2 sm:px-6">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="min-h-11 cursor-pointer text-sm font-medium text-primary hover:underline md:min-h-9"
          >
            {showAll ? t("client.hideInactive") : t("client.showInactive", { count: hiddenCount })}
          </button>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-[0.08em] text-foreground/45 uppercase">{label}</dt>
      <dd className={`truncate tabular-nums ${strong ? "font-semibold text-black" : "text-foreground/80"}`}>
        {value}
      </dd>
    </div>
  );
}
