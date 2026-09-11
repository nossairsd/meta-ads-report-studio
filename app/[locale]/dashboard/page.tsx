import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth/config";
import { loadAgency, loadShell } from "@/lib/agency/service";
import { NOT_CONFIGURED, toDashboardFailure } from "@/lib/meta/error-state";
import { isAuthConfigured } from "@/lib/env";
import { AgencyOverview } from "@/components/agency/agency-overview";
import { DashboardFailureView } from "@/components/dashboard/failure-view";
import { DashboardSkeleton } from "@/components/dashboard/states";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Agency.overview");
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
      <main className="mx-auto w-full max-w-6xl px-6 pt-16 pb-20">
        <DashboardFailureView failure={NOT_CONFIGURED} />
      </main>
    );
  }

  // The proxy only checks that a session cookie exists — it runs on the edge,
  // where the session store is unreachable. This is the authoritative check,
  // and a forged cookie gets no further than here.
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}?signin=required&next=/${locale}/dashboard`);
  }

  // A first visit has no clients yet: the overview would be empty, so the
  // agency is taken straight to arranging its accounts.
  const { clients } = await loadShell(session.user.id);
  if (clients.length === 0) {
    redirect(`/${locale}/dashboard/setup`);
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Overview userId={session.user.id} />
    </Suspense>
  );
}

/** Split out so the frame renders before Meta has answered. */
async function Overview({ userId }: { userId: string }) {
  const t = await getTranslations("Agency.overview");

  // Only the data fetch is guarded: a rendering bug must not masquerade as
  // "Meta is unavailable" and send the user to reconnect for nothing.
  let data: Awaited<ReturnType<typeof loadAgency>> | null = null;
  let failure: ReturnType<typeof toDashboardFailure> | null = null;
  try {
    data = await loadAgency(userId);
  } catch (error) {
    failure = toDashboardFailure(error);
  }

  if (!data) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-black md:text-3xl">
          {t("title")}
        </h1>
        {failure && <DashboardFailureView failure={failure} />}
      </>
    );
  }

  return <AgencyOverview data={data} basePath="/dashboard" />;
}
