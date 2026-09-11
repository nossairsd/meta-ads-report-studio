import { getTranslations } from "next-intl/server";
import { ClientHeader } from "@/components/agency/client-header";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardFailureView } from "@/components/dashboard/failure-view";
import { failureFromKind } from "@/lib/meta/error-state";
import type { AccountStatus, ClientDetail } from "@/lib/agency/types";

const ACCOUNT_STATUSES: AccountStatus[] = [
  "active",
  "disabled",
  "payment_issue",
  "under_review",
  "closed",
  "unknown",
];

/** One client's page, identical for the live app and the demo. */
export async function ClientView({
  detail,
  basePath,
  source,
}: {
  detail: ClientDetail;
  basePath: "/dashboard" | "/demo";
  source: "demo" | "live";
}) {
  const t = await getTranslations("Agency");
  const { client, accounts, selected, campaigns } = detail;

  return (
    <div className="space-y-6">
      <ClientHeader
        basePath={basePath}
        clientId={client.id}
        clientName={client.name}
        accounts={accounts}
        selectedId={selected.account.id}
        labels={{
          breadcrumb: t("client.breadcrumb"),
          accounts: t("client.accounts"),
          status: Object.fromEntries(ACCOUNT_STATUSES.map((s) => [s, t(`accountStatus.${s}`)])),
        }}
      />

      {selected.failure ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-black md:text-3xl">
            {client.name}
          </h1>
          <DashboardFailureView failure={failureFromKind(selected.failure)} />
        </>
      ) : (
        <DashboardView
          account={selected.account}
          rows={selected.rows}
          endDate={selected.endDate}
          source={source}
          title={client.name}
          campaignMeta={campaigns}
          reportTarget={{ clientId: client.id, accountId: selected.account.id }}
        />
      )}
    </div>
  );
}
