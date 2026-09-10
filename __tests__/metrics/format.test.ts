import { describe, it, expect } from "vitest";
import {
  formatCompact,
  formatCurrencyCents,
  formatDateRange,
  formatDayShort,
  formatDelta,
  formatRate,
  formatShare,
  normalizeSpaces,
} from "@/lib/metrics/format";

/**
 * Any Unicode space other than U+00A0 means the string can differ between
 * Node's ICU and a browser's, which is exactly what broke hydration once.
 */
const NON_CANONICAL_SPACES = /[    ]/;

const ALL_FORMATTED = (locale: string) => [
  formatCurrencyCents(523386, locale),
  formatCurrencyCents(400000, locale),
  formatCompact(1_723_400, locale),
  formatCompact(2170, locale),
  formatDelta(2.4, locale),
  formatDelta(-0.3, locale),
  formatShare(0.585, locale),
  formatDayShort("2026-08-07", locale),
  formatDateRange("2026-08-07", "2026-09-05", locale),
  formatDateRange("2025-12-28", "2026-01-05", locale),
];

describe("normalizeSpaces", () => {
  it("collapses every space variant Intl may emit to a single canonical one", () => {
    const mixed = "1 2 3 4 5";
    expect(normalizeSpaces(mixed)).toBe("1 2 3 4 5");
  });
});

describe.each(["fr", "en"])("formatters (%s)", (locale) => {
  it("never emit a space variant that differs between ICU builds", () => {
    for (const value of ALL_FORMATTED(locale)) {
      expect(value, `"${value}" contains a non-canonical space`).not.toMatch(
        NON_CANONICAL_SPACES
      );
    }
  });
});

describe("formatCurrencyCents", () => {
  it("drops the decimals on whole amounts", () => {
    expect(formatCurrencyCents(400000, "fr")).toContain("4");
    expect(formatCurrencyCents(400000, "fr")).not.toContain(",00");
  });

  it("keeps the decimals when there are cents", () => {
    expect(formatCurrencyCents(523386, "fr")).toContain(",86");
  });

  it("honours the account currency", () => {
    expect(formatCurrencyCents(1000, "en", "USD")).toContain("$");
  });
});

describe("formatDelta", () => {
  it("always shows the sign, so a rise is unmistakable", () => {
    expect(formatDelta(2.4, "en")).toMatch(/^\+/);
    expect(formatDelta(-0.3, "en")).toMatch(/^-|^−/);
  });
});

describe("formatDateRange", () => {
  it("drops the year from the first date when both share it", () => {
    const range = formatDateRange("2026-08-07", "2026-09-05", "fr");
    expect(range).toContain("2026");
    // The year should appear once, on the end date only
    expect(range.match(/2026/g)).toHaveLength(1);
  });

  it("keeps both years when the range crosses into a new one", () => {
    const range = formatDateRange("2025-12-28", "2026-01-05", "fr");
    expect(range).toContain("2025");
    expect(range).toContain("2026");
  });

  it("reads the dates in UTC, so a timezone cannot shift the boundary", () => {
    // 2026-08-07 must stay the 7th regardless of where it is rendered
    expect(formatDayShort("2026-08-07", "en")).toContain("7");
  });
});

describe("formatRate", () => {
  it("keeps two decimals, where a CTR lives", () => {
    // 2.1% and 2.14% are meaningfully different campaigns; one decimal hides it.
    expect(formatRate(0.0214, "en")).toContain("2.14");
  });

  it("follows the locale's decimal separator", () => {
    expect(formatRate(0.0214, "fr")).toContain("2,14");
  });

  it("renders an exact zero rate rather than blanking it", () => {
    expect(formatRate(0, "en")).toContain("0.00");
  });

  it("emits no space a build could disagree about", () => {
    // Node and Chrome ship different ICU data; a raw space here caused a
    // hydration mismatch before.
    expect(formatRate(0.0214, "fr")).not.toMatch(/[\u0020\u2009\u202F]/);
  });
});
