"use client";

import { useTransition, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, Loader2 } from "lucide-react";
import { chooseAdAccount } from "@/lib/meta/actions";
import type { AdAccount } from "@/lib/metrics/schema";

/**
 * Which ad account the report is about.
 *
 * An agency has one per client, and Meta lets two of them share a name — so
 * the currency and the account id are shown alongside. Without them, a user
 * with two accounts called "Aureya Chic" cannot tell which one they picked.
 */
export function AdAccountSelector({
  accounts,
  selectedId,
}: {
  accounts: AdAccount[];
  selectedId: string;
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const label = (account: AdAccount) =>
    `${account.name} · ${account.currency} · ${account.id.replace(/^act_/, "")}`;

  // A menu holding one option is noise. The account still has to be named,
  // so it is shown as text rather than removed.
  if (accounts.length <= 1) {
    const only = accounts[0];
    return (
      <p className="inline-flex items-center gap-2 text-sm text-foreground/55">
        <Building2 className="h-4 w-4 shrink-0" aria-hidden />
        {only ? label(only) : t("noAdAccount")}
      </p>
    );
  }

  function handleChange(metaId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await chooseAdAccount(metaId, locale);
      } catch {
        setError(t("switchFailed"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="inline-flex items-center gap-2">
        <label htmlFor="ad-account" className="sr-only">
          {t("adAccountLabel")}
        </label>
        <Building2 className="h-4 w-4 shrink-0 text-foreground/45" aria-hidden />
        <select
          id="ad-account"
          value={selectedId}
          disabled={isPending}
          onChange={(event) => handleChange(event.target.value)}
          className="max-w-[22rem] cursor-pointer truncate rounded-lg border border-black/[0.12] bg-white py-1.5 pr-8 pl-2.5 text-sm text-black transition-colors hover:border-black/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {label(account)}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-foreground/45" aria-hidden />
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
