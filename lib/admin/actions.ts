"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { isAdmin } from "@/lib/admin/access";
import { prisma } from "@/lib/db";
import { REQUEST_STATUSES } from "@/lib/admin/statuses";

const schema = z.object({
  id: z.string().min(1).max(64),
  status: z.enum(REQUEST_STATUSES),
});

/** Marks an early-access request invited or declined. Admins only — checked
 *  here, not just by hiding the page: an action is callable by anyone who
 *  knows it exists. */
export async function updateRequestStatus(input: unknown): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const session = await auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) return { ok: false };

  try {
    await prisma.earlyAccessRequest.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false };
  }

  revalidatePath("/[locale]/dashboard/admin", "page");
  return { ok: true };
}
