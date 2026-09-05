import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DEMO_ACCOUNT, getDemoRows } from "@/lib/metrics/demo-data";
import { toIsoDate } from "@/lib/metrics/aggregate";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return {
    title: `${t("demoBadge")} — Meta Ads Report Studio`,
    // Sample data on a public URL: useful to a visitor, not to a search index.
    robots: { index: false, follow: true },
  };
}

export default function DemoPage() {
  // The anchor date is resolved once on the server and handed to the client
  // component, so both renders derive the same period windows. Deriving it
  // from `new Date()` on the client would hydrate inconsistently around
  // midnight UTC.
  const endDate = toIsoDate(new Date());

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-28 pb-20">
      <DashboardView
        account={DEMO_ACCOUNT}
        rows={getDemoRows()}
        endDate={endDate}
        source="demo"
      />
    </main>
  );
}
