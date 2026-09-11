"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { addressFromHeaders, createRateLimiter } from "@/lib/rate-limit";
import { earlyAccessSchema } from "@/lib/early-access/schema";

/** Five requests per address per ten minutes: plenty for a person correcting
 *  a typo, too few for a script filling the table. */
const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

export type EarlyAccessResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "rate_limited" | "failed"; fields?: string[] };

/**
 * Records a request to join the private beta.
 *
 * The form carries a hidden "website" field that people never see and bots
 * fill in. A request with it filled is answered as a success and dropped: a
 * bot told it failed simply retries with a different payload.
 */
export async function requestEarlyAccess(input: unknown): Promise<EarlyAccessResult> {
  if (
    typeof input === "object" &&
    input !== null &&
    "website" in input &&
    typeof input.website === "string" &&
    input.website.trim() !== ""
  ) {
    return { ok: true };
  }

  const parsed = earlyAccessSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid",
      fields: [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))],
    };
  }

  // Counted only once the input is valid, so a person fixing a mistake does
  // not spend their allowance on it.
  if (!limiter.check(addressFromHeaders(await headers())).allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const { email, name, agency, clientCount, message, locale } = parsed.data;
  try {
    // Asking twice updates the request instead of queueing a duplicate — and
    // leaves its status alone, so asking again cannot undo a decision.
    await prisma.earlyAccessRequest.upsert({
      where: { email },
      create: { email, name, agency, clientCount, message: message || null, locale },
      update: { name, agency, clientCount, message: message || null, locale },
    });
  } catch {
    return { ok: false, error: "failed" };
  }

  return { ok: true };
}
