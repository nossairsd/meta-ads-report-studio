import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth/config";
import { loadClient } from "@/lib/agency/service";
import { toDashboardFailure } from "@/lib/meta/error-state";
import { isAuthConfigured } from "@/lib/env";
import { ClientView } from "@/components/agency/client-view";
import { DashboardFailureView } from "@/components/dashboard/failure-view";
import { DashboardSkeleton } from "@/components/dashboard/states";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Agency.nav");
  return {
    title: `${t("clients")} — Meta Ads Report Studio`,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; clientId: string }>;
  searchParams: Promise<{ account?: string | string[] }>;
}) {
  const [{ locale, clientId }, { account }] = await Promise.all([params, searchParams]);
  const accountId = typeof account === "string" ? account : undefined;

  if (!isAuthConfigured()) redirect(`/${locale}/dashboard`);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}?signin=required&next=/${locale}/dashboard/clients/${clientId}`);
  }

  return (
    // Keyed so switching account shows the skeleton instead of stale figures.
    <Suspense key={`${clientId}:${accountId ?? ""}`} fallback={<DashboardSkeleton />}>
      <ClientDetail userId={session.user.id} clientId={clientId} accountId={accountId} />
    </Suspense>
  );
}

async function ClientDetail({
  userId,
  clientId,
  accountId,
}: {
  userId: string;
  clientId: string;
  accountId?: string;
}) {
  let detail: Awaited<ReturnType<typeof loadClient>> = null;
  let failure: ReturnType<typeof toDashboardFailure> | null = null;
  try {
    detail = await loadClient(userId, clientId, accountId);
  } catch (error) {
    failure = toDashboardFailure(error);
  }

  if (failure) return <DashboardFailureView failure={failure} />;
  // Unknown, or another agency's: the same answer either way.
  if (!detail) notFound();

  return <ClientView detail={detail} basePath="/dashboard" source="live" />;
}
