import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth/config";
import { loadSetup } from "@/lib/agency/service";
import { toDashboardFailure } from "@/lib/meta/error-state";
import { isAuthConfigured } from "@/lib/env";
import { OrganizationForm } from "@/components/agency/organization-form";
import { DashboardFailureView } from "@/components/dashboard/failure-view";
import { DashboardSkeleton } from "@/components/dashboard/states";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Agency.setup");
  return {
    title: `${t("title")} — Meta Ads Report Studio`,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function SetupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isAuthConfigured()) redirect(`/${locale}/dashboard`);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}?signin=required&next=/${locale}/dashboard/setup`);
  }

  const t = await getTranslations("Agency.setup");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-black md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-foreground/55">{t("intro")}</p>
      </header>

      <Suspense fallback={<DashboardSkeleton />}>
        <Setup userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function Setup({ userId }: { userId: string }) {
  let setup: Awaited<ReturnType<typeof loadSetup>> | null = null;
  let failure: ReturnType<typeof toDashboardFailure> | null = null;
  try {
    setup = await loadSetup(userId);
  } catch (error) {
    failure = toDashboardFailure(error);
  }

  if (!setup) return failure ? <DashboardFailureView failure={failure} /> : null;

  return <OrganizationForm agencyName={setup.agencyName} rows={setup.rows} />;
}
