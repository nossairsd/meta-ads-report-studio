import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { isAuthConfigured } from "@/lib/env";
import { loadShell } from "@/lib/agency/service";
import { AgencyShell } from "@/components/agency/agency-shell";
import { DisconnectButton } from "@/components/dashboard/disconnect-button";

/**
 * The agency frame around every signed-in page.
 *
 * Reads the database only — client names and the agency's name — so the
 * sidebar is on screen immediately, while each page streams its Meta figures
 * in behind a skeleton.
 */
export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Without credentials auth() throws; the page explains the misconfiguration.
  if (!isAuthConfigured()) return <>{children}</>;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}?signin=required&next=/${locale}/dashboard`);
  }

  const [{ agencyName, clients }, t] = await Promise.all([
    loadShell(session.user.id),
    getTranslations("Dashboard"),
  ]);

  return (
    <AgencyShell
      basePath="/dashboard"
      clients={clients}
      agencyName={agencyName}
      footer={
        <div className="space-y-2">
          {session.user.name && (
            <p className="truncate text-xs text-foreground/50">
              {t("signedInAs", { name: session.user.name })}
            </p>
          )}
          <DisconnectButton label={t("disconnect")} />
        </div>
      }
    >
      {children}
    </AgencyShell>
  );
}
