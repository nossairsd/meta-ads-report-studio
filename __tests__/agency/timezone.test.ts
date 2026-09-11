import { describe, it, expect } from "vitest";
import { todayInTimeZone } from "@/lib/agency/timezone";

describe("todayInTimeZone", () => {
  it("is already tomorrow in Casablanca late on a UTC evening", () => {
    // 23:30 UTC on 10 September is 00:30 on the 11th in Casablanca (UTC+1).
    const now = new Date("2026-09-10T23:30:00Z");
    expect(todayInTimeZone("Africa/Casablanca", now)).toBe("2026-09-11");
    expect(todayInTimeZone("UTC", now)).toBe("2026-09-10");
  });

  it("is still yesterday on the US west coast early on a UTC morning", () => {
    const now = new Date("2026-09-11T05:00:00Z");
    expect(todayInTimeZone("America/Los_Angeles", now)).toBe("2026-09-10");
  });

  it("falls back to UTC for a timezone it does not know, instead of throwing", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    expect(todayInTimeZone("Mars/Olympus_Mons", now)).toBe("2026-09-10");
  });
});
