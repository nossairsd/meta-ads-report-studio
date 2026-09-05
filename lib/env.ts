import { z } from "zod";

/**
 * Environment contract.
 *
 * Without this, a missing secret surfaces as an opaque failure deep inside an
 * OAuth callback or a database driver. Validating up front turns that into one
 * message naming the variable and how to produce it.
 *
 * Deliberately *not* validated at module load: the demo path, the landing page
 * and the PDF endpoint all work with no secrets at all, and a build or a demo
 * deployment should not be blocked by credentials it never uses.
 */

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
      message: "DATABASE_URL must be a PostgreSQL connection string",
    }),
  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(1)
    .refine((value) => Buffer.from(value, "base64").length === 32, {
      message: "TOKEN_ENCRYPTION_KEY must decode to 32 bytes (openssl rand -base64 32)",
    }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** How to obtain each value. A message that only says a variable is missing
 *  leaves the reader to search for what to put in it; these turn the failure
 *  into instructions. */
const HINTS: Record<string, string> = {
  DATABASE_URL: "a PostgreSQL connection string (Neon, Supabase, or a local server)",
  META_APP_ID: "the app id from developers.facebook.com/apps",
  META_APP_SECRET: "the app secret from the same page",
  AUTH_SECRET: "generate with: openssl rand -base64 32",
  TOKEN_ENCRYPTION_KEY: "generate with: openssl rand -base64 32",
};

export class MissingEnvError extends Error {
  readonly missing: string[];

  constructor(missing: string[], detail: string) {
    const instructions = missing
      .map((name) => `  ${name} — ${HINTS[name] ?? "see .env.example"}`)
      .join("\n");

    super(
      `Authentication is not configured. ${detail}\n` +
        `Set these in .env.local:\n${instructions}`
    );
    this.name = "MissingEnvError";
    this.missing = missing;
  }
}

/** Throws a message that names every offending variable at once, rather than
 *  making the reader fix them one failed boot at a time. */
export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsed = serverEnvSchema.safeParse(source);
  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues;
  const missing = [...new Set(issues.map((issue) => String(issue.path[0])))];
  const detail = issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`).join("; ");

  throw new MissingEnvError(missing, detail);
}

/** Whether the real Meta connection can be offered at all. Lets the UI hide
 *  the "Connect with Facebook" path on a demo-only deployment instead of
 *  sending people into an OAuth flow that cannot complete. */
export function isAuthConfigured(source: NodeJS.ProcessEnv = process.env): boolean {
  return serverEnvSchema.safeParse(source).success;
}
