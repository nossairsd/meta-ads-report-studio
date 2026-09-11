import { auth } from "@/lib/auth/config";
import { isAuthConfigured } from "@/lib/env";
import { isAdmin } from "@/lib/admin/access";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/admin/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every early-access request as a CSV file, for admins.
 *
 * Anyone else gets a 404, not a 403: a 403 would confirm that an export of
 * contact details exists at this address.
 */
export async function GET() {
  if (!isAuthConfigured()) return new Response(null, { status: 404 });

  const session = await auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return new Response(null, { status: 404 });
  }

  const requests = await prisma.earlyAccessRequest.findMany({ orderBy: { createdAt: "desc" } });

  const csv = toCsv([
    ["created_at", "name", "email", "agency", "clients", "status", "locale", "message"],
    ...requests.map((r) => [
      r.createdAt.toISOString(),
      r.name,
      r.email,
      r.agency,
      r.clientCount,
      r.status,
      r.locale,
      r.message ?? "",
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="early-access-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
