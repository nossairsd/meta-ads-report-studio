import type { AgencyAccount } from "./types";

/** Case, accents, punctuation and spacing are not part of a brand's identity. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    // Strip the combining marks NFD split off: "é" → "e".
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type ClientSuggestion = {
  name: string;
  accountIds: string[];
};

/**
 * A first proposal of clients, built from account names — for the agency to
 * confirm, never applied silently.
 *
 * Accounts are grouped only when their names normalise identically: two
 * accounts called "Aureya Chic", one billed in euros and one in dollars, become
 * one client. Nothing cleverer. Fuzzy matching would merge two different
 * brands that happen to look alike, and blending two clients' figures into one
 * report is far worse than asking the agency to merge two rows by hand.
 */
export function suggestClients(accounts: AgencyAccount[]): ClientSuggestion[] {
  const groups = new Map<string, ClientSuggestion>();

  for (const account of accounts) {
    // An unnamed account is shown by its id; it must not collapse into another
    // unnamed one.
    const key = normalizeName(account.name) || account.id;
    const group = groups.get(key);
    if (group) {
      group.accountIds.push(account.id);
    } else {
      groups.set(key, { name: account.name.trim() || account.id, accountIds: [account.id] });
    }
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
