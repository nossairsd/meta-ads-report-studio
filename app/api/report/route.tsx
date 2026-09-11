import { renderToBuffer } from "@react-pdf/renderer";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ReportDocument, type ReportStrings } from "@/lib/report/report-document";
import { buildDashboardData } from "@/lib/metrics/aggregate";
import { getDemoClient } from "@/lib/agency/demo";
import { auth } from "@/lib/auth/config";
import { isAuthConfigured } from "@/lib/env";
import { loadClient } from "@/lib/agency/service";
import type { ClientDetail } from "@/lib/agency/types";
import { periodSchema } from "@/lib/metrics/schema";
import { routing } from "@/i18n/routing";

// @react-pdf/renderer needs Node APIs; it cannot run on the Edge runtime.
export const runtime = "nodejs";

/**
 * Request contract.
 *
 * Everything that reaches the generator is enumerated rather than free-form:
 * `period` is one of three values and `source` one of two, so a caller cannot
 * widen the date range or point the report at arbitrary data to make the
 * server do unbounded work. This endpoint is public (demo mode needs no
 * account), which makes that bound the main safeguard.
 */
const requestSchema = z.object({
  source: z.enum(["demo", "live"]),
  period: periodSchema,
  locale: z.enum(routing.locales),
  // Identifiers only. A live client is looked up within the signed-in user's
  // own data, so another agency's id resolves to nothing.
  clientId: z.string().min(1).max(64).optional(),
  accountId: z.string().min(1).max(64).optional(),
});

/** ASCII-safe filename, plus RFC 5987 form for the real one. Campaign and
 *  account names can contain accents or quotes, which would otherwise break
 *  the Content-Disposition header. */
function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "-").replace(/["\\]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { source, period, locale, clientId, accountId } = parsed.data;

  // The client says which dataset it wants, never what is in it. A live report
  // is rebuilt here from the user's own connection, so the figures in the PDF
  // cannot be anything the browser chose to send.
  let detail: ClientDetail | null;

  if (source === "live") {
    // Without credentials auth() throws; a 503 says "this deployment cannot do
    // that" rather than "something broke".
    if (!isAuthConfigured()) {
      return Response.json({ error: "not_configured" }, { status: 503 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!clientId) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }

    try {
      detail = await loadClient(session.user.id, clientId, accountId);
    } catch {
      // The dashboard already explains a failed connection in context; here the
      // only useful answer is that the report could not be built. The reason is
      // deliberately not echoed back — it can carry account identifiers.
      return Response.json({ error: "report_unavailable" }, { status: 502 });
    }
  } else {
    // The original single-account demo stays the default.
    detail = getDemoClient(clientId ?? "dupont", accountId);
  }

  if (!detail) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (detail.selected.failure) {
    return Response.json({ error: "report_unavailable" }, { status: 502 });
  }

  const { account, rows, endDate } = detail.selected;
  const clientName = detail.client.name;
  const data = buildDashboardData({ account, rows, period, endDate });

  const t = await getTranslations({ locale, namespace: "Report" });
  const tDashboard = await getTranslations({ locale, namespace: "Dashboard" });

  const strings: ReportStrings = {
    reportTitle: t("title"),
    preparedFor: t("preparedFor"),
    preparedBy: t("preparedBy"),
    generatedOn: t("generatedOn"),
    page: t("page"),
    summaryTitle: t("summaryTitle"),
    summaryIntro: t("summaryIntro"),
    trendTitle: t("trendTitle"),
    trendIntro: t("trendIntro"),
    breakdownTitle: t("breakdownTitle"),
    breakdownIntro: t("breakdownIntro"),
    comparison: t("comparison", { days: period }),
    noBaseline: t("noBaseline"),
    metrics: {
      spendCents: tDashboard("metric.spendCents"),
      impressions: tDashboard("metric.impressions"),
      clicks: tDashboard("metric.clicks"),
      conversions: tDashboard("metric.conversions"),
    },
    tableCampaign: t("tableCampaign"),
    tableSpend: t("tableSpend"),
    tableImpressions: t("tableImpressions"),
    tableClicks: t("tableClicks"),
    tableConversions: t("tableConversions"),
    tableShare: t("tableShare"),
    tableCtr: t("tableCtr"),
    tableCpc: t("tableCpc"),
    derived: {
      ctr: t("derivedCtr"),
      cpc: t("derivedCpc"),
      cpm: t("derivedCpm"),
      cpa: t("derivedCpa"),
    },
    notAvailable: t("notAvailable"),
  };

  const buffer = await renderToBuffer(
    <ReportDocument
      data={data}
      clientName={clientName}
      agencyName={detail.agencyName}
      locale={locale}
      strings={strings}
      generatedAt={new Date()}
    />
  );

  const filename = `${clientName} — ${data.rangeStart} → ${data.rangeEnd}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(filename),
      "Content-Length": String(buffer.length),
      // The figures move daily and the file is cheap to rebuild; a stale
      // report in a proxy cache would be worse than regenerating it.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
