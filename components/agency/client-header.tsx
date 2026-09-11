import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AgencyAccount } from "@/lib/agency/types";

/**
 * Where the user is, and which of the client's accounts they are looking at.
 *
 * Accounts are switched, never summed: a client billed in euros and in dollars
 * has two sets of figures, and adding them would produce a number that is in
 * no currency at all. Each tab says its currency so the switch is obvious.
 */
export function ClientHeader({
  basePath,
  clientId,
  clientName,
  accounts,
  selectedId,
  labels,
}: {
  basePath: string;
  clientId: string;
  clientName: string;
  accounts: AgencyAccount[];
  selectedId: string;
  labels: { breadcrumb: string; accounts: string; status: Record<string, string> };
}) {
  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-foreground/55">
        <Link href={basePath} className="inline-flex min-h-11 items-center hover:text-black lg:min-h-0">
          {labels.breadcrumb}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="truncate font-medium text-black" aria-current="page">
          {clientName}
        </span>
      </nav>

      {accounts.length > 1 && (
        <div role="tablist" aria-label={labels.accounts} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {accounts.map((account) => {
            const active = account.id === selectedId;
            const flagged = account.status !== "active";
            return (
              <Link
                key={account.id}
                role="tab"
                aria-selected={active}
                href={`${basePath}/clients/${clientId}?account=${encodeURIComponent(account.id)}`}
                scroll={false}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm transition-colors lg:min-h-10 ${
                  active
                    ? "border-primary/40 bg-white font-semibold text-black shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                    : "border-black/[0.08] bg-white/60 text-foreground/65 hover:bg-white hover:text-black"
                }`}
              >
                <span className="max-w-[14rem] truncate">{account.name}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                    active ? "bg-primary/10 text-primary" : "bg-black/[0.05] text-foreground/55"
                  }`}
                >
                  {account.currency}
                </span>
                {flagged && (
                  <span
                    className="h-2 w-2 rounded-full bg-[#F59E0B]"
                    title={labels.status[account.status]}
                    aria-label={labels.status[account.status]}
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
