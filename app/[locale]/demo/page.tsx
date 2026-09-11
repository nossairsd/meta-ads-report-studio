import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AgencyOverview } from "@/components/agency/agency-overview";
import { getDemoAgency } from "@/lib/agency/demo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return {
    title: `${t("demoBadge")} — Meta Ads Report Studio`,
    // Sample data on a public URL: useful to a visitor, not to a search index.
    robots: { index: false, follow: true },
  };
}

/** The demo is anchored on today; prerendering would freeze it on build day. */
export const dynamic = "force-dynamic";

export default function DemoPage() {
  // Generated once on the server and handed to the client component, so both
  // renders derive the same period windows.
  return <AgencyOverview data={getDemoAgency()} basePath="/demo" isDemo />;
}
