import { describe, it, expect } from "vitest";
import {
  decimalStringToCents,
  extractConversions,
  mapInsightToRow,
  normalizeAdAccountId,
} from "@/lib/meta/map";
import { metaInsightSchema } from "@/lib/meta/api-schema";

describe("decimalStringToCents", () => {
  it("converts a plain amount", () => {
    expect(decimalStringToCents("12.34")).toBe(1234);
    expect(decimalStringToCents("0.05")).toBe(5);
    expect(decimalStringToCents("100")).toBe(10000);
  });

  it("stays exact where a float would not", () => {
    // Number("1.005") * 100 === 100.49999999999999
    expect(decimalStringToCents("1.005")).toBe(101);
    expect(decimalStringToCents("8.115")).toBe(812);
  });

  it("rounds half-up on the third decimal", () => {
    expect(decimalStringToCents("1.004")).toBe(100);
    expect(decimalStringToCents("1.006")).toBe(101);
  });

  it("pads a single decimal digit", () => {
    expect(decimalStringToCents("2.5")).toBe(250);
  });

  it("handles negatives, which Meta uses for refunds and adjustments", () => {
    expect(decimalStringToCents("-3.20")).toBe(-320);
  });

  it("tolerates surrounding whitespace", () => {
    expect(decimalStringToCents(" 7.10 ")).toBe(710);
  });

  it("keeps large amounts exact", () => {
    expect(decimalStringToCents("999999.99")).toBe(99999999);
  });
});

describe("extractConversions", () => {
  it("returns zero when the actions array is missing entirely", () => {
    expect(extractConversions(undefined)).toBe(0);
    expect(extractConversions([])).toBe(0);
  });

  it("reads the purchase action", () => {
    expect(
      extractConversions([
        { action_type: "link_click", value: "120" },
        { action_type: "purchase", value: "8" },
      ])
    ).toBe(8);
  });

  it("counts a purchase once when the same sale is reported by several trackers", () => {
    // Pixel, omni and generic entries all describe the same 8 purchases
    const conversions = extractConversions([
      { action_type: "offsite_conversion.fb_pixel_purchase", value: "8" },
      { action_type: "omni_purchase", value: "8" },
      { action_type: "purchase", value: "8" },
    ]);
    expect(conversions).toBe(8);
  });

  it("prefers the most specific action type available", () => {
    const conversions = extractConversions([
      { action_type: "lead", value: "3" },
      { action_type: "offsite_conversion.fb_pixel_purchase", value: "9" },
    ]);
    expect(conversions).toBe(9);
  });

  it("falls back to a lead when there is no purchase", () => {
    expect(extractConversions([{ action_type: "lead", value: "4" }])).toBe(4);
  });

  it("ignores action types that are not conversions", () => {
    expect(
      extractConversions([
        { action_type: "post_engagement", value: "500" },
        { action_type: "video_view", value: "300" },
      ])
    ).toBe(0);
  });
});

describe("mapInsightToRow", () => {
  const base = {
    date_start: "2026-03-10",
    date_stop: "2026-03-10",
    campaign_id: "23851234567890123",
    campaign_name: "Soldes d'hiver",
    spend: "84.27",
    impressions: "19342",
    clicks: "612",
    actions: [{ action_type: "purchase", value: "17" }],
  };

  it("maps a complete insight", () => {
    expect(mapInsightToRow(metaInsightSchema.parse(base))).toEqual({
      date: "2026-03-10",
      campaignId: "23851234567890123",
      campaignName: "Soldes d'hiver",
      spendCents: 8427,
      impressions: 19342,
      clicks: 612,
      conversions: 17,
    });
  });

  it("treats omitted counters as zero — Meta drops them on days with no delivery", () => {
    const sparse = metaInsightSchema.parse({
      date_start: "2026-03-11",
      date_stop: "2026-03-11",
      campaign_id: "1",
      campaign_name: "Paused campaign",
    });
    const row = mapInsightToRow(sparse);
    expect(row.spendCents).toBe(0);
    expect(row.impressions).toBe(0);
    expect(row.clicks).toBe(0);
    expect(row.conversions).toBe(0);
  });

  it("keeps an unnamed campaign identifiable rather than blank", () => {
    const row = mapInsightToRow(
      metaInsightSchema.parse({ ...base, campaign_name: undefined })
    );
    expect(row.campaignName).toBe("#23851234567890123");
  });

  it("does not let a whitespace-only name through", () => {
    const row = mapInsightToRow(metaInsightSchema.parse({ ...base, campaign_name: "   " }));
    expect(row.campaignName).toBe("#23851234567890123");
  });

  it("dates the row by date_start, keeping it inside the requested window", () => {
    const row = mapInsightToRow(
      metaInsightSchema.parse({ ...base, date_start: "2026-03-01", date_stop: "2026-03-07" })
    );
    expect(row.date).toBe("2026-03-01");
  });
});

describe("api schema", () => {
  it("rejects a numeric field that is not numeric, instead of yielding NaN", () => {
    const result = metaInsightSchema.safeParse({
      date_start: "2026-03-10",
      date_stop: "2026-03-10",
      campaign_id: "1",
      spend: "not-a-number",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = metaInsightSchema.safeParse({
      date_start: "10/03/2026",
      date_stop: "2026-03-10",
      campaign_id: "1",
    });
    expect(result.success).toBe(false);
  });
});

describe("normalizeAdAccountId", () => {
  it("adds the act_ prefix the API paths require", () => {
    expect(normalizeAdAccountId("123456")).toBe("act_123456");
  });

  it("leaves an already-prefixed id alone", () => {
    expect(normalizeAdAccountId("act_123456")).toBe("act_123456");
  });
});
