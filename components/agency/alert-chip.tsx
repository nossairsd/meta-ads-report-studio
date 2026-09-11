"use client";

import { AlertTriangle, CreditCard, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDelta } from "@/lib/metrics/format";
import type { Alert } from "@/lib/agency/types";

/** Red for what stops results, amber for what costs more than it should, and
 *  neutral for a change worth knowing about but not necessarily wrong. */
const TONE: Record<Alert["kind"], string> = {
  account_status: "bg-destructive/10 text-destructive",
  no_conversions: "bg-destructive/10 text-destructive",
  cpa_up: "bg-[#F59E0B]/12 text-[#B45309]",
  spend_up: "bg-[#F59E0B]/12 text-[#B45309]",
  spend_down: "bg-black/[0.05] text-foreground/65",
};

export function AlertChip({ alert, locale }: { alert: Alert; locale: string }) {
  const t = useTranslations("Agency.alert");
  const change = alert.change === undefined ? "" : formatDelta(alert.change, locale);

  const label =
    alert.kind === "account_status"
      ? t(`accountStatus.${alert.accountStatus as "disabled" | "payment_issue" | "under_review"}`)
      : t(alert.kind, { change });

  const Icon =
    alert.kind === "account_status"
      ? CreditCard
      : alert.kind === "spend_down"
        ? TrendingDown
        : alert.kind === "no_conversions"
          ? AlertTriangle
          : TrendingUp;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE[alert.kind]}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
