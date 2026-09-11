import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClientView } from "@/components/agency/client-view";
import { getDemoClient } from "@/lib/agency/demo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return {
    title: `${t("demoBadge")} — Meta Ads Report Studio`,
    robots: { index: false, follow: true },
  };
}

export const dynamic = "force-dynamic";

export default async function DemoClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ account?: string | string[] }>;
}) {
  const [{ clientId }, { account }] = await Promise.all([params, searchParams]);
  const detail = getDemoClient(clientId, typeof account === "string" ? account : undefined);
  if (!detail) notFound();

  return <ClientView detail={detail} basePath="/demo" source="demo" />;
}
