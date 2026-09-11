import { z } from "zod";
import { routing } from "@/i18n/routing";

/** Ranges rather than a number: an agency knows roughly how many clients it
 *  has, and a range is all the triage needs. */
export const CLIENT_RANGES = ["1-5", "6-20", "21-50", "50+"] as const;
export type ClientRange = (typeof CLIENT_RANGES)[number];

/**
 * An early-access request, as the server accepts it.
 *
 * Every field is bounded: the form is public, and nothing it sends may make a
 * row arbitrarily large. Email is trimmed and lower-cased before it is
 * checked, so "Anna@Agency.com " and "anna@agency.com" are one request.
 */
export const earlyAccessSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(160)),
  agency: z.string().trim().min(2).max(120),
  clientCount: z.enum(CLIENT_RANGES),
  message: z.string().trim().max(1000).optional(),
  locale: z.enum(routing.locales),
});

export type EarlyAccessInput = z.infer<typeof earlyAccessSchema>;
