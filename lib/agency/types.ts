import type { InsightRow } from "@/lib/metrics/schema";

/**
 * The agency's view of the world: clients, each holding one or more ad
 * accounts.
 *
 * "Client" is our concept, not Meta's. With only `ads_read`, Meta will not say
 * which business an ad account belongs to — that needs `business_management`,
 * a far broader permission this app deliberately does not request. So the
 * agency groups its accounts into clients itself, and these types describe
 * that arrangement.
 */

/** Where an ad account stands with Meta — distinct from whether it is spending. */
export type AccountStatus =
  | "active"
  | "disabled"
  | "payment_issue"
  | "under_review"
  | "closed"
  | "unknown";

/** A campaign's state as an agency describes it to a client. */
export type CampaignStatus =
  | "active"
  | "paused"
  | "ended"
  | "in_review"
  | "rejected"
  | "with_issues"
  | "archived";

/** Whether a client is currently spending, judged from recent delivery. */
export type ActivityStatus = "active" | "paused" | "inactive";

export type AgencyAccount = {
  /** Meta's identifier, "act_…". */
  id: string;
  name: string;
  currency: string;
  /** IANA timezone. Meta cuts every reporting day in it. */
  timezone: string;
  status: AccountStatus;
};

export type CampaignMeta = {
  id: string;
  name: string;
  /** Meta's objective code, e.g. OUTCOME_SALES — translated only for display. */
  objective: string | null;
  status: CampaignStatus;
  /** Budgets in the account currency's minor units, as Meta reports them. */
  dailyBudgetCents: number | null;
  lifetimeBudgetCents: number | null;
  startDate: string | null;
  endDate: string | null;
};

export type AlertKind =
  | "account_status"
  | "no_conversions"
  | "cpa_up"
  | "spend_up"
  | "spend_down";

export type Alert = {
  kind: AlertKind;
  /** Percentage change behind the alert, where there is one. */
  change?: number;
  accountStatus?: AccountStatus;
};

export type FailureKind =
  | "auth"
  | "permission"
  | "rate_limit"
  | "network"
  | "server"
  | "unexpected";

/** One account and the history every figure is derived from. */
export type LoadedAccount = {
  account: AgencyAccount;
  rows: InsightRow[];
  /** "Today" in the account's own timezone: the end of every period window. */
  endDate: string;
  /** Set when this account could not be read. The rest of the client still
   *  renders — one expired account must not blank an agency's whole view. */
  failure?: FailureKind;
};

export type LoadedClient = {
  id: string;
  name: string;
  accounts: LoadedAccount[];
};

/** One client, reported one account at a time — their currencies may differ. */
export type ClientDetail = {
  agencyName: string | null;
  client: { id: string; name: string };
  accounts: AgencyAccount[];
  selected: LoadedAccount;
  campaigns: CampaignMeta[];
};

export type AgencyData = {
  agencyName: string | null;
  clients: LoadedClient[];
  /** Accounts visible to the connection but not yet placed in a client. */
  unassigned: AgencyAccount[];
};
