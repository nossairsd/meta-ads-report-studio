import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth/config";
import { loadLiveDashboard } from "@/lib/meta/service";
import { NOT_CONFIGURED, toDashboardFailure } from "@/lib/meta/error-state";
import { isAuthConfigured } from "@/lib/env";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardFailureView } from "@/components/dashboard/failure-view";
import { DisconnectButton } from "@/components/dashboard/disconnect-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return {
    title: `${t("title")} — Meta Ads Report Studio`,
    // Private data behind a session; never index it.
    robots: { index: false, follow: false },
  };
}

/** Figures change daily and belong to one user: nothing here may be cached or
 *  prerendered. */
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // auth() throws outright when AUTH_SECRET is missing, which would surface as
  // a 500. Checking first turns a deployment mistake into a page that says
  // what is wrong.
  if (!isAuthConfigured()) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
        <DashboardFailureView failure={NOT_CONFIGURED} />
      </main>
    );
  }

  const session = await auth();

  // The proxy only checks that a session cookie exists — it runs on the edge,
  // where the session store is unreachable. This is the authoritative check,
  // and a forged cookie gets no further than here.
  if (!session?.user?.id) {
    redirect(`/${locale}?signin=required&next=/${locale}/dashboard`);
  }

  const t = await getTranslations("Dashboard");

  // Only the data fetch is guarded. Building the JSX inside the try would also
  // catch errors thrown while rendering, quietly turning a component bug into
  // a "Meta is unavailable" message that sends the user to reconnect for no
  // reason.
  let live: Awaited<ReturnType<typeof loadLiveDashboard>> | null = null;
  let failure: ReturnType<typeof toDashboardFailure> | null = null;

  try {
    live = await loadLiveDashboard(session.user.id);
  } catch (error) {
    failure = toDashboardFailure(error);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.07] pb-5">
        <p className="text-sm text-foreground/55">
          {session.user.name
            ? t("signedInAs", { name: session.user.name })
            : t("title")}
        </p>
        <DisconnectButton label={t("disconnect")} />
      </div>

      {live ? (
        <DashboardView
          account={live.account}
          rows={live.rows}
          endDate={live.endDate}
          source="live"
        />
      ) : (
        // DashboardView supplies the page's <h1> (the ad account name), so the
        // failure branch supplies one of its own — otherwise the page would
        // have no heading in exactly the situation where a user most needs
        // orientation. Neither branch produces two.
        <>
          <h1 className="mb-6 text-2xl font-semibold tracking-tight text-black md:text-3xl">
            {t("title")}
          </h1>
          {failure && <DashboardFailureView failure={failure} />}
        </>
      )}
    </main>
  );
}
