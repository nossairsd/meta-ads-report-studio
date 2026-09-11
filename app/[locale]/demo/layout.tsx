import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AgencyShell } from "@/components/agency/agency-shell";
import { DEMO_AGENCY_NAME, listDemoClients } from "@/lib/agency/demo";

/** The same frame as the real app, around a fictitious agency. */
export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Agency.demo");

  return (
    <AgencyShell
      basePath="/demo"
      clients={listDemoClients()}
      agencyName={DEMO_AGENCY_NAME}
      isDemo
      banner={
        <div className="border-b border-primary/15 bg-primary/[0.06] px-4 py-2.5 text-center text-sm text-black sm:px-6">
          {t("banner")}
        </div>
      }
      footer={
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-white lg:min-h-10"
        >
          {t("connect")}
        </Link>
      }
    >
      {children}
    </AgencyShell>
  );
}
