"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DashboardErrorState } from "@/components/dashboard/states";
import { connectMeta } from "@/lib/auth/actions";
import type { DashboardFailure } from "@/lib/meta/error-state";

/**
 * The failure the server ran into, with the one action that would resolve it.
 *
 * Offering "retry" on an expired token would fail again and read as the app
 * being broken, so a failure that needs a new connection offers reconnection
 * instead.
 */
export function DashboardFailureView({ failure }: { failure: DashboardFailure }) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAction() {
    startTransition(async () => {
      if (failure.needsReconnect) {
        await connectMeta(locale);
      } else {
        // Re-runs the server component, which refetches. Cheaper and less
        // jarring than a full page reload.
        router.refresh();
      }
    });
  }

  return (
    <DashboardErrorState
      title={t(`failure.${failure.messageKey}.title`)}
      description={t(`failure.${failure.messageKey}.description`)}
      retryLabel={
        isPending
          ? t("failure.pending")
          : failure.needsReconnect
            ? t("failure.reconnect")
            : t("errorRetry")
      }
      onRetry={handleAction}
      detail={failure.detail ?? undefined}
    />
  );
}
