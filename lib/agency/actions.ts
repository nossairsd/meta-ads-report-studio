"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { saveSetup } from "@/lib/agency/service";
import { routing } from "@/i18n/routing";

/**
 * Bounded input: names are short, account ids have Meta's shape, and the list
 * cannot be made arbitrarily long. The ids are checked again against the
 * user's own token in saveSetup — this only rejects what is malformed.
 */
const schema = z.object({
  locale: z.enum(routing.locales),
  agencyName: z.string().max(80),
  assignments: z
    .array(
      z.object({
        metaId: z.string().regex(/^act_\d+$/),
        clientName: z.string().max(80),
        hidden: z.boolean(),
      })
    )
    .min(1)
    .max(500),
});

export async function saveOrganization(input: unknown): Promise<{ error: string } | void> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };

  const session = await auth();
  if (!session?.user?.id) return { error: "unauthorized" };

  const { locale, agencyName, assignments } = parsed.data;
  try {
    await saveSetup(session.user.id, { agencyName, assignments });
  } catch {
    return { error: "failed" };
  }

  // The sidebar lists the clients and lives in the layout, so the whole
  // subtree is refreshed, not just this page.
  revalidatePath(`/${locale}/dashboard`, "layout");
  redirect(`/${locale}/dashboard`);
}
