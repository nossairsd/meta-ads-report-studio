import {
  Document,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  Line as SvgLine,
} from "@react-pdf/renderer";
import { buildDonut, buildLineChart } from "./geometry";
import {
  formatCompact,
  formatCurrencyCents,
  formatDateRange,
  formatDayShort,
  formatDelta,
  formatNumber,
  formatShare,
} from "@/lib/metrics/format";
import type { DashboardData } from "@/lib/metrics/schema";

/** Report copy, kept beside the document so the PDF never depends on the
 *  React context that powers the on-screen UI. */
export type ReportStrings = {
  reportTitle: string;
  preparedFor: string;
  generatedOn: string;
  page: string;
  summaryTitle: string;
  summaryIntro: string;
  trendTitle: string;
  trendIntro: string;
  breakdownTitle: string;
  breakdownIntro: string;
  comparison: string;
  noBaseline: string;
  metrics: { spendCents: string; impressions: string; clicks: string; conversions: string };
  tableCampaign: string;
  tableSpend: string;
  tableImpressions: string;
  tableClicks: string;
  tableConversions: string;
  tableShare: string;
};

const COLORS = {
  ink: "#1F2937",
  muted: "#6B7280",
  faint: "#9CA3AF",
  border: "#E5E7EB",
  primary: "#2563EB",
  positive: "#16A34A",
  negative: "#DC2626",
  surface: "#F8FAFC",
};

const SLICE_COLORS = ["#2563EB", "#16A34A", "#F59E0B", "#8B5CF6", "#0EA5E9"];

// Helvetica is built into every PDF reader, so nothing has to be embedded or
// fetched at render time — which also keeps the serverless bundle small.
const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.ink,
  },
  coverPage: {
    padding: 56,
    fontFamily: "Helvetica",
    color: COLORS.ink,
    justifyContent: "space-between",
  },
  logoMark: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary },
  coverTitle: { fontSize: 34, fontFamily: "Helvetica-Bold", lineHeight: 1.15 },
  coverAccount: { fontSize: 16, color: COLORS.muted, marginTop: 14 },
  coverPeriod: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  coverFooter: { fontSize: 9, color: COLORS.faint },

  sectionTitle: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  sectionIntro: { fontSize: 10, color: COLORS.muted, marginTop: 6, lineHeight: 1.5 },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 26, gap: 12 },
  kpiCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 16,
  },
  kpiLabel: { fontSize: 8, color: COLORS.faint, letterSpacing: 0.8 },
  kpiValue: { fontSize: 24, fontFamily: "Helvetica-Bold", marginTop: 8 },
  kpiDelta: { fontSize: 9, marginTop: 8 },

  chartFrame: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 18,
  },
  axisLabel: { fontSize: 7, color: COLORS.faint },

  legendRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendName: { flex: 1, fontSize: 10 },
  legendValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },

  table: { marginTop: 22, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  th: { fontSize: 8, color: COLORS.faint, letterSpacing: 0.5 },
  td: { fontSize: 9 },

  footer: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLORS.faint,
  },
});

function PageFooter({ label, page }: { label: string; page: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{label}</Text>
      <Text>{page}</Text>
    </View>
  );
}

function DeltaText({
  delta,
  locale,
  comparison,
  noBaseline,
  neutral,
}: {
  delta: number | null;
  locale: string;
  comparison: string;
  noBaseline: string;
  neutral: boolean;
}) {
  if (delta === null || !Number.isFinite(delta)) {
    return <Text style={[styles.kpiDelta, { color: COLORS.faint }]}>{noBaseline}</Text>;
  }
  // Spend stays neutral for the same reason as on screen: more spend is not
  // inherently good news, and a green figure would imply otherwise.
  const color = neutral ? COLORS.muted : delta >= 0 ? COLORS.positive : COLORS.negative;
  return (
    <Text style={[styles.kpiDelta, { color }]}>
      {formatDelta(delta, locale)} {comparison}
    </Text>
  );
}

export function ReportDocument({
  data,
  locale,
  strings,
  generatedAt,
}: {
  data: DashboardData;
  locale: string;
  strings: ReportStrings;
  generatedAt: Date;
}) {
  const { account, totals, deltas, daily, campaigns } = data;
  const currency = account.currency;
  const rangeLabel = formatDateRange(data.rangeStart, data.rangeEnd, locale);
  const footerLabel = `${account.name} — ${rangeLabel}`;

  const axisWidth = 54;
  const chartWidth = 406;
  const chartHeight = 170;
  const line = buildLineChart({
    values: daily.map((point) => point.spendCents),
    width: chartWidth,
    height: chartHeight,
  });

  const donut = buildDonut({
    values: campaigns.map((campaign) => campaign.spendCents),
    cx: 90,
    cy: 90,
    outerRadius: 84,
    innerRadius: 52,
  });

  const kpis = [
    {
      key: "spendCents" as const,
      label: strings.metrics.spendCents,
      value: formatCurrencyCents(totals.spendCents, locale, currency),
      neutral: true,
    },
    {
      key: "impressions" as const,
      label: strings.metrics.impressions,
      value: formatCompact(totals.impressions, locale),
      neutral: false,
    },
    {
      key: "clicks" as const,
      label: strings.metrics.clicks,
      value: formatCompact(totals.clicks, locale),
      neutral: false,
    },
    {
      key: "conversions" as const,
      label: strings.metrics.conversions,
      value: formatNumber(totals.conversions, locale),
      neutral: false,
    },
  ];

  // Only a handful of ticks, otherwise 90 dates overlap into a smear.
  const tickStep = Math.max(1, Math.ceil(daily.length / 6));
  const ticks = daily.filter((_, i) => i % tickStep === 0);

  return (
    <Document
      title={`${strings.reportTitle} — ${account.name}`}
      author="Meta Ads Report Studio"
      language={locale}
    >
      {/* 1 — Cover */}
      <Page size="A4" style={styles.coverPage}>
        <View>
          <View style={styles.logoMark} />
          <Text style={[styles.coverFooter, { marginTop: 14 }]}>
            Meta Ads Report Studio
          </Text>
        </View>

        <View>
          <Text style={styles.coverTitle}>{strings.reportTitle}</Text>
          <Text style={styles.coverAccount}>
            {strings.preparedFor} {account.name}
          </Text>
          <Text style={styles.coverPeriod}>{rangeLabel}</Text>
        </View>

        <Text style={styles.coverFooter}>
          {strings.generatedOn}{" "}
          {new Intl.DateTimeFormat(locale, {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(generatedAt)}
        </Text>
      </Page>

      {/* 2 — Summary */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{strings.summaryTitle}</Text>
        <Text style={styles.sectionIntro}>{strings.summaryIntro}</Text>

        <View style={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <View key={kpi.key} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{kpi.label.toUpperCase()}</Text>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <DeltaText
                delta={deltas[kpi.key]}
                locale={locale}
                comparison={strings.comparison}
                noBaseline={strings.noBaseline}
                neutral={kpi.neutral}
              />
            </View>
          ))}
        </View>

        <PageFooter label={footerLabel} page={`${strings.page} 2`} />
      </Page>

      {/* 3 — Trend */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{strings.trendTitle}</Text>
        <Text style={styles.sectionIntro}>{strings.trendIntro}</Text>

        <View style={styles.chartFrame}>
          <View style={{ flexDirection: "row" }}>
            {/* Scale sits on the left axis, aligned to each gridline. Put below
                the plot it reads as an x-axis and misleads the reader. */}
            <View style={{ width: axisWidth, height: chartHeight, position: "relative" }}>
              {line.gridLines.map((grid, i) => (
                <Text
                  key={i}
                  style={[
                    styles.axisLabel,
                    { position: "absolute", top: grid.y - 4, right: 8 },
                  ]}
                >
                  {formatCurrencyCents(Math.round(grid.value), locale, currency)}
                </Text>
              ))}
            </View>

            <Svg
              width={chartWidth}
              height={chartHeight}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            >
              {line.gridLines.map((grid, i) => (
                <SvgLine
                  key={i}
                  x1={0}
                  y1={grid.y}
                  x2={chartWidth}
                  y2={grid.y}
                  strokeWidth={1}
                  stroke={COLORS.border}
                />
              ))}
              <Path d={line.areaPath} fill={COLORS.primary} fillOpacity={0.12} />
              <Path
                d={line.linePath}
                stroke={COLORS.primary}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 8,
              marginLeft: axisWidth,
            }}
          >
            {ticks.map((point) => (
              <Text key={point.date} style={styles.axisLabel}>
                {formatDayShort(point.date, locale)}
              </Text>
            ))}
          </View>
        </View>

        <PageFooter label={footerLabel} page={`${strings.page} 3`} />
      </Page>

      {/* 4 — Breakdown */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>{strings.breakdownTitle}</Text>
        <Text style={styles.sectionIntro}>{strings.breakdownIntro}</Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 24, gap: 28 }}>
          <Svg width={180} height={180} viewBox="0 0 180 180">
            {donut.map((segment, i) => (
              <Path key={i} d={segment.path} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
            ))}
          </Svg>

          <View style={{ flex: 1 }}>
            {campaigns.map((campaign, i) => (
              <View key={campaign.campaignId} style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] },
                  ]}
                />
                <Text style={styles.legendName}>{campaign.campaignName}</Text>
                <Text style={styles.legendValue}>
                  {formatCurrencyCents(campaign.spendCents, locale, currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2.6 }]}>{strings.tableCampaign.toUpperCase()}</Text>
            <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>
              {strings.tableSpend.toUpperCase()}
            </Text>
            <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>
              {strings.tableImpressions.toUpperCase()}
            </Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>
              {strings.tableClicks.toUpperCase()}
            </Text>
            <Text style={[styles.th, { flex: 1.6, textAlign: "right" }]}>
              {strings.tableConversions.toUpperCase()}
            </Text>
            <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>
              {strings.tableShare.toUpperCase()}
            </Text>
          </View>

          {campaigns.map((campaign) => (
            <View key={campaign.campaignId} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2.6 }]}>{campaign.campaignName}</Text>
              <Text style={[styles.td, { flex: 1.4, textAlign: "right" }]}>
                {formatCurrencyCents(campaign.spendCents, locale, currency)}
              </Text>
              <Text style={[styles.td, { flex: 1.4, textAlign: "right" }]}>
                {formatCompact(campaign.impressions, locale)}
              </Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>
                {formatCompact(campaign.clicks, locale)}
              </Text>
              <Text style={[styles.td, { flex: 1.6, textAlign: "right" }]}>
                {formatNumber(campaign.conversions, locale)}
              </Text>
              <Text style={[styles.td, { flex: 0.9, textAlign: "right" }]}>
                {formatShare(campaign.share, locale)}
              </Text>
            </View>
          ))}
        </View>

        <PageFooter label={footerLabel} page={`${strings.page} 4`} />
      </Page>
    </Document>
  );
}
