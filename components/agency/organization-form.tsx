"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeName } from "@/lib/agency/grouping";
import { saveOrganization } from "@/lib/agency/actions";
import type { AgencyAccount } from "@/lib/agency/types";

type Row = {
  account: AgencyAccount;
  clientName: string;
  hidden: boolean;
  suggested: boolean;
};

/**
 * Accounts assigned to clients by name.
 *
 * One text field per account rather than drag-and-drop: it works the same with
 * a thumb on a phone as with a mouse, it scales to fifty accounts, and merging
 * two groups is just typing the same name — the list of existing names is
 * offered as the user types.
 */
export function OrganizationForm({
  agencyName: initialAgencyName,
  rows: initialRows,
}: {
  agencyName: string | null;
  rows: Row[];
}) {
  const t = useTranslations("Agency");
  const locale = useLocale();
  const [agencyName, setAgencyName] = useState(initialAgencyName ?? "");
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const names = useMemo(
    () => [...new Set(rows.map((r) => r.clientName.trim()).filter(Boolean))].sort(),
    [rows]
  );
  const clientCount = new Set(
    rows.filter((r) => !r.hidden && r.clientName.trim()).map((r) => normalizeName(r.clientName) || r.clientName)
  ).size;

  function update(id: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.account.id === id ? { ...row, ...patch, suggested: false } : row))
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startSaving(async () => {
      const result = await saveOrganization({
        locale,
        agencyName,
        assignments: rows.map((row) => ({
          metaId: row.account.id,
          clientName: row.clientName,
          hidden: row.hidden,
        })),
      });
      // On success the action redirects, so a result only ever means failure.
      if (result?.error) setError(t("setup.error"));
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-2xl border border-black/[0.07] bg-white p-4 sm:p-6">
        <label htmlFor="agency-name" className="text-sm font-semibold text-black">
          {t("setup.agencyLabel")}
        </label>
        <p className="mt-1 text-xs text-foreground/50">{t("setup.agencyHint")}</p>
        <input
          id="agency-name"
          value={agencyName}
          maxLength={80}
          onChange={(e) => setAgencyName(e.target.value)}
          placeholder={t("setup.agencyPlaceholder")}
          className="mt-3 h-11 w-full max-w-md rounded-xl border border-black/[0.1] px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </section>

      <section className="rounded-2xl border border-black/[0.07] bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-4 sm:px-6">
          <h2 className="text-sm font-semibold text-black">{t("setup.accountsTitle")}</h2>
          <p className="text-xs text-foreground/55">{t("setup.preview", { count: clientCount })}</p>
        </div>

        <datalist id="client-names">
          {names.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <ul className="divide-y divide-black/[0.06] border-t border-black/[0.07]">
          {rows.map((row) => (
            <li
              key={row.account.id}
              className={`grid gap-3 px-4 py-4 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center ${
                row.hidden ? "bg-black/[0.02]" : ""
              }`}
            >
              <div className={`min-w-0 ${row.hidden ? "opacity-50" : ""}`}>
                <p className="truncate font-medium text-black">{row.account.name}</p>
                <p className="mt-0.5 truncate text-xs text-foreground/50">
                  {row.account.id} · {row.account.currency} · {row.account.timezone}
                  {row.account.status !== "active" && ` · ${t(`accountStatus.${row.account.status}`)}`}
                </p>
              </div>

              <label className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-2 text-xs text-foreground/55">
                  {t("setup.clientLabel")}
                  {row.suggested && !row.hidden && (
                    <span className="rounded bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                      {t("setup.suggested")}
                    </span>
                  )}
                </span>
                <input
                  list="client-names"
                  value={row.clientName}
                  maxLength={80}
                  disabled={row.hidden}
                  onChange={(e) => update(row.account.id, { clientName: e.target.value })}
                  className="h-11 w-full rounded-xl border border-black/[0.1] px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:bg-black/[0.03] disabled:text-foreground/40"
                />
              </label>

              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground/70 md:justify-end">
                <input
                  type="checkbox"
                  checked={row.hidden}
                  onChange={(e) => update(row.account.id, { hidden: e.target.checked })}
                  className="h-5 w-5 cursor-pointer accent-primary"
                />
                {t("setup.hide")}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={isSaving} className="min-h-11 gap-2">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? t("setup.saving") : t("setup.save")}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
