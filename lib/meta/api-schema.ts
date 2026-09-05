import { z } from "zod";

/**
 * Meta's raw wire format — described exactly as it arrives, not as we wish it
 * were. Everything numeric comes back as a string, conversions are buried in a
 * loosely-typed `actions` array, and most fields are optional because the API
 * omits them rather than sending zero.
 *
 * Parsing here means a change on Meta's side surfaces as a validation error
 * naming the offending field, instead of silently becoming NaN in a report a
 * client has already been sent.
 */

/** A number Meta sent as a string: "1234", "12.34". */
const numericString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "expected a numeric string");

export const metaActionSchema = z.object({
  action_type: z.string(),
  value: numericString,
});

export const metaInsightSchema = z.object({
  date_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_stop: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  campaign_id: z.string().min(1),
  campaign_name: z.string().optional(),
  // Omitted entirely on days with no delivery, rather than sent as "0".
  spend: numericString.optional(),
  impressions: numericString.optional(),
  clicks: numericString.optional(),
  actions: z.array(metaActionSchema).optional(),
});
export type MetaInsight = z.infer<typeof metaInsightSchema>;

export const metaPagingSchema = z.object({
  cursors: z.object({ before: z.string().optional(), after: z.string().optional() }).optional(),
  next: z.string().url().optional(),
});

export const metaInsightsResponseSchema = z.object({
  data: z.array(metaInsightSchema),
  paging: metaPagingSchema.optional(),
});

export const metaAdAccountSchema = z.object({
  // Meta returns "act_123456"; the numeric id alone is not usable in paths.
  id: z.string().min(1),
  name: z.string().optional(),
  currency: z.string().optional(),
});

export const metaAdAccountsResponseSchema = z.object({
  data: z.array(metaAdAccountSchema),
  paging: metaPagingSchema.optional(),
});

/** Meta's error envelope, returned with HTTP 400 for most failures. */
export const metaErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
    code: z.number().optional(),
    error_subcode: z.number().optional(),
    fbtrace_id: z.string().optional(),
  }),
});
