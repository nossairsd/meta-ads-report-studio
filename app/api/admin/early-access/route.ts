import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { isAuthConfigured } from "@/lib/env";
import { isAdmin } from "@/lib/admin/access";
import { prisma } from "@/lib/db";
import { csvDelimiter, toCsv } from "@/lib/admin/csv";
import { REQUEST_STATUSES } from "@/lib/admin/statuses";
import { routing } from "@/i18n/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every early-access request as a CSV file, for admins.
 *
 * Written for the admin's spreadsheet: headers and statuses in their
 * language, readable dates, and the separator their Excel expects — so it
 * opens as a table, one field per column.
 *
 * Anyone else gets a 404, not a 403: a 403 would confirm that an export of
 * contact details exists at this address.
 */
export async function GET(request: Request) {
  if (!isAuthConfigured()) return new Response(null, { status: 404 });

  const session = await auth();
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return new Response(null, { status: 404 });
  }

  const requested = new URL(request.url).searchParams.get("locale") ?? "";
  const locale = (routing.locales as readonly string[]).includes(requested)
    ? requested
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Admin" });

  const requests = await prisma.earlyAccessRequest.findMany({ orderBy: { createdAt: "desc" } });

  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  });
  const statusLabel = (status: string) =>
    (REQUEST_STATUSES as readonly string[]).includes(status)
      ? t(`status.${status as (typeof REQUEST_STATUSES)[number]}`)
      : status;

  const csv = toCsv(
    [
      [
        t("csv.date"),
        t("csv.name"),
        t("csv.email"),
        t("csv.agency"),
        t("csv.clients"),
        t("csv.status"),
        t("csv.language"),
        t("csv.message"),
      ],
      ...requests.map((r) => [
        date.format(r.createdAt),
        r.name,
        r.email,
        r.agency,
        r.clientCount,
        statusLabel(r.status),
        r.locale.toUpperCase(),
        r.message ?? "",
      ]),
    ],
    csvDelimiter(locale)
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="early-access-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
