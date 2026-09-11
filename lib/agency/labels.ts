/**
 * Meta's objective codes, reduced to the six an agency names to a client.
 *
 * Campaigns created before 2022 still carry the legacy codes (CONVERSIONS,
 * LINK_CLICKS…), and an agency's account history is full of them, so both
 * generations map onto the same labels.
 */
const OBJECTIVES: Record<string, ObjectiveKey> = {
  OUTCOME_SALES: "sales",
  CONVERSIONS: "sales",
  PRODUCT_CATALOG_SALES: "sales",
  OUTCOME_LEADS: "leads",
  LEAD_GENERATION: "leads",
  OUTCOME_TRAFFIC: "traffic",
  LINK_CLICKS: "traffic",
  OUTCOME_AWARENESS: "awareness",
  BRAND_AWARENESS: "awareness",
  REACH: "awareness",
  VIDEO_VIEWS: "awareness",
  OUTCOME_ENGAGEMENT: "engagement",
  POST_ENGAGEMENT: "engagement",
  PAGE_LIKES: "engagement",
  MESSAGES: "engagement",
  EVENT_RESPONSES: "engagement",
  OUTCOME_APP_PROMOTION: "app",
  APP_INSTALLS: "app",
};

export type ObjectiveKey =
  | "sales"
  | "leads"
  | "traffic"
  | "awareness"
  | "engagement"
  | "app"
  | "other";

export function objectiveKey(objective: string | null): ObjectiveKey | null {
  if (!objective) return null;
  return OBJECTIVES[objective.toUpperCase()] ?? "other";
}
