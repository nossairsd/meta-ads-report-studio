import { describe, it, expect } from "vitest";
import { getDemoAgency, getDemoClient } from "@/lib/agency/demo";
import { buildAgencySummary } from "@/lib/agency/overview";

/**
 * The demo exists to show every situation the real view handles. These pin
 * that each scenario actually appears, so a change to the generator cannot
 * quietly turn the demo into six identical healthy clients.
 */
const NOW = new Date("2026-09-10T12:00:00Z");
const summary = buildAgencySummary(getDemoAgency(NOW), 30);
const byName = (name: string) => summary.clients.find((c) => c.name === name)!;

describe("demo agency", () => {
  it("is the same on every render", () => {
    expect(getDemoAgency(NOW)).toEqual(getDemoAgency(NOW));
  });

  it("bills one client in two currencies, never summed", () => {
    expect(byName("Maison Lumière").currencies.map((c) => c.currency).sort()).toEqual(["EUR", "USD"]);
  });

  it("includes a client billed in dirhams", () => {
    expect(byName("Café Atlas").primary?.currency).toBe("MAD");
  });

  it("flags a spend spike with a rising cost per conversion", () => {
    const kinds = byName("Kora Fitness").alerts.map((a) => a.kind);
    expect(kinds).toContain("spend_up");
    expect(kinds).toContain("cpa_up");
  });

  it("shows a paused client and a blocked account", () => {
    expect(byName("Verde Paysage").activity).toBe("paused");
    expect(byName("Nomade Voyages").alerts[0]).toMatchObject({
      kind: "account_status",
      accountStatus: "payment_issue",
    });
  });

  it("leaves a steady client with nothing to report", () => {
    expect(byName("Dupont & Co").alerts).toEqual([]);
  });

  it("marks a campaign past its end date as ended", () => {
    const atlas = getDemoClient("atlas", undefined, NOW)!;
    expect(atlas.campaigns.find((c) => c.id === "atlas-2")?.status).toBe("ended");
  });

  it("switches between a client's accounts", () => {
    expect(getDemoClient("lumiere", "demo-act-lumiere-us", NOW)?.selected.account.currency).toBe("USD");
    expect(getDemoClient("unknown", undefined, NOW)).toBeNull();
  });
});
