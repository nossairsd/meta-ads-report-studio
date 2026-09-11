import { describe, it, expect } from "vitest";
import { normalizeName, suggestClients } from "@/lib/agency/grouping";
import type { AgencyAccount } from "@/lib/agency/types";

const account = (id: string, name: string, currency = "EUR"): AgencyAccount => ({
  id,
  name,
  currency,
  timezone: "Europe/Paris",
  status: "active",
});

describe("normalizeName", () => {
  it("ignores case, accents, punctuation and spacing", () => {
    expect(normalizeName("  Café  Lumière! ")).toBe(normalizeName("cafe lumiere"));
  });
});

describe("suggestClients", () => {
  it("groups two accounts with the same name, whatever their currency", () => {
    // The real case: "Aureya Chic" billed once in euros and once in dollars.
    const suggestions = suggestClients([
      account("act_1", "Aureya Chic", "EUR"),
      account("act_2", "Aureya Chic", "USD"),
    ]);
    expect(suggestions).toEqual([{ name: "Aureya Chic", accountIds: ["act_1", "act_2"] }]);
  });

  it("keeps different brands apart, however alike they look", () => {
    // Blending two clients into one report is the error to avoid at all costs.
    const suggestions = suggestClients([
      account("act_1", "Kora Fitness"),
      account("act_2", "Kora Fitness Studio"),
    ]);
    expect(suggestions).toHaveLength(2);
  });

  it("never merges unnamed accounts with each other", () => {
    const suggestions = suggestClients([account("act_1", ""), account("act_2", "")]);
    expect(suggestions.map((s) => s.accountIds)).toEqual([["act_1"], ["act_2"]]);
  });

  it("sorts suggestions by name", () => {
    const names = suggestClients([account("a", "Zeta"), account("b", "Alpha")]).map((s) => s.name);
    expect(names).toEqual(["Alpha", "Zeta"]);
  });
});
