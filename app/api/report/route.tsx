import { renderToBuffer } from "@react-pdf/renderer";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ReportDocument, type ReportStrings } from "@/lib/report/report-document";
import { buildDashboardData, toIsoDate } from "@/lib/metrics/aggregate";
import { DEMO_ACCOUNT, getDemoRows } from "@/lib/metrics/demo-data";
import { auth } from "@/lib/auth/config";
import { isAuthConfigured } from "@/lib/env";
import { loadLiveDashboard } from "@/lib/meta/service";
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

  const { source, period, locale } = parsed.data;

  // The client says which dataset it wants, never what is in it. A live report
  // is rebuilt here from the user's own connection, so the figures in the PDF
  // cannot be anything the browser chose to send.
  let account;
  let rows;
  let endDate;

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

    try {
      const live = await loadLiveDashboard(session.user.id);
      account = live.account;
      rows = live.rows;
      endDate = live.endDate;
    } catch {
      // The dashboard already explains a failed connection in context; here the
      // only useful answer is that the report could not be built. The reason is
      // deliberately not echoed back — it can carry account identifiers.
      return Response.json({ error: "report_unavailable" }, { status: 502 });
    }
  } else {
    account = DEMO_ACCOUNT;
    rows = getDemoRows();
    endDate = toIsoDate(new Date());
  }

  const data = buildDashboardData({ account, rows, period, endDate });

  const t = await getTranslations({ locale, namespace: "Report" });
  const tDashboard = await getTranslations({ locale, namespace: "Dashboard" });

  const strings: ReportStrings = {
    reportTitle: t("title"),
    preparedFor: t("preparedFor"),
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
  };

  const buffer = await renderToBuffer(
    <ReportDocument
      data={data}
      locale={locale}
      strings={strings}
      generatedAt={new Date()}
    />
  );

  const filename = `${account.name} — ${data.rangeStart} → ${data.rangeEnd}.pdf`;

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
