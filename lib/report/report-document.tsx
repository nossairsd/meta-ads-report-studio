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
import { computeDerived } from "@/lib/metrics/derived";
import {
  formatCompact,
  formatCurrencyCents,
  formatDateRange,
  formatDayShort,
  formatDelta,
  formatNumber,
  formatRate,
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
  tableCtr: string;
  tableCpc: string;
  /** Ratios a media buyer reads before the raw totals. */
  derived: { ctr: string; cpc: string; cpm: string; cpa: string };
  /** Shown where a ratio has no denominator — no clicks yet, no conversions. */
  notAvailable: string;
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
    paddingTop: 38,
    paddingBottom: 46,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.ink,
  },
  /** A band, not a page. The report opened on a cover carrying a title and
   *  four lines of text, leaving the rest of an A4 sheet blank — and the three
   *  pages after it were each about a third full. Folding the cover into a
   *  header is most of what takes this report from four thin pages to two
   *  dense ones. */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.ink,
    paddingBottom: 14,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { width: 18, height: 18, borderRadius: 5, backgroundColor: COLORS.primary },
  brandName: { fontSize: 8, color: COLORS.faint, letterSpacing: 0.6 },
  reportTitle: { fontSize: 21, fontFamily: "Helvetica-Bold", marginTop: 10, lineHeight: 1.15 },
  headerMeta: { alignItems: "flex-end", gap: 3 },
  headerAccount: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  headerPeriod: { fontSize: 9, color: COLORS.muted },
  headerGenerated: { fontSize: 8, color: COLORS.faint },

  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  sectionIntro: { fontSize: 9, color: COLORS.muted, marginTop: 4, lineHeight: 1.45 },
  sectionLabel: {
    fontSize: 8,
    color: COLORS.faint,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 7,
  },

  /** Four across rather than two by two: the same information in half the
   *  vertical space, which is what freed room for the ratios below it. */
  kpiGrid: { flexDirection: "row", gap: 10 },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 9,
  },
  kpiLabel: { fontSize: 7, color: COLORS.faint, letterSpacing: 0.7 },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 6 },
  kpiDelta: { fontSize: 7.5, marginTop: 6 },

  /** The ratios sit on a tinted strip rather than in cards: they are read
   *  together, and four more bordered boxes would compete with the KPIs. */
  ratioStrip: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  ratioCell: { flex: 1 },
  ratioLabel: { fontSize: 7, color: COLORS.faint, letterSpacing: 0.7 },
  ratioValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 4 },

  chartFrame: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  axisLabel: { fontSize: 7, color: COLORS.faint },

  legendRow: { flexDirection: "row", alignItems: "center", marginTop: 7 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 7 },
  legendName: { flex: 1, fontSize: 9 },
  legendValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  th: { fontSize: 7, color: COLORS.faint, letterSpacing: 0.4 },
  td: { fontSize: 8 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
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
  const chartHeight = 132;
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

  const derived = computeDerived(totals);
  const dash = strings.notAvailable;

  const ratios = [
    {
      label: strings.derived.ctr,
      value: derived.ctr === null ? dash : formatRate(derived.ctr, locale),
    },
    {
      label: strings.derived.cpc,
      value:
        derived.cpcCents === null
          ? dash
          : formatCurrencyCents(derived.cpcCents, locale, currency),
    },
    {
      label: strings.derived.cpm,
      value:
        derived.cpmCents === null
          ? dash
          : formatCurrencyCents(derived.cpmCents, locale, currency),
    },
    {
      label: strings.derived.cpa,
      value:
        derived.cpaCents === null
          ? dash
          : formatCurrencyCents(derived.cpaCents, locale, currency),
    },
  ];

  return (
    <Document
      title={`${strings.reportTitle} — ${account.name}`}
      author="Meta Ads Report Studio"
      language={locale}
    >
      {/* 1 — Everything a client reads: the figures and the trend. */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <View style={styles.logoMark} />
              <Text style={styles.brandName}>META ADS REPORT STUDIO</Text>
            </View>
            <Text style={styles.reportTitle}>{strings.reportTitle}</Text>
          </View>

          <View style={styles.headerMeta}>
            <Text style={styles.headerAccount}>{account.name}</Text>
            <Text style={styles.headerPeriod}>{rangeLabel}</Text>
            <Text style={styles.headerGenerated}>
              {strings.generatedOn}{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "long",
                timeZone: "UTC",
              }).format(generatedAt)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{strings.summaryTitle.toUpperCase()}</Text>

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

        <View style={{ marginTop: 10 }}>
          <View style={styles.ratioStrip}>
            {ratios.map((ratio) => (
              <View key={ratio.label} style={styles.ratioCell}>
                <Text style={styles.ratioLabel}>{ratio.label.toUpperCase()}</Text>
                <Text style={styles.ratioValue}>{ratio.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>{strings.trendTitle.toUpperCase()}</Text>
        <Text style={[styles.sectionIntro, { marginTop: -6, marginBottom: 10 }]}>
          {strings.trendIntro}
        </Text>

        <View style={styles.chartFrame}>
          <View style={{ flexDirection: "row" }}>
            {/* Scale sits on the left axis, aligned to each gridline. Put below
                the plot it reads as an x-axis and misleads the reader. */}
            <View style={{ width: axisWidth, height: chartHeight, position: "relative" }}>
              {line.gridLines.map((grid, i) => (
                <Text
                  key={i}
                  style={[styles.axisLabel, { position: "absolute", top: grid.y - 4, right: 8 }]}
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

        <Text style={styles.sectionLabel}>{strings.breakdownTitle.toUpperCase()}</Text>
        <Text style={styles.sectionIntro}>{strings.breakdownIntro}</Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 26 }} wrap={false}>
          <Svg width={120} height={120} viewBox="0 0 180 180">
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

        <Text style={styles.sectionLabel}>{strings.tableCampaign.toUpperCase()}</Text>

        <View style={styles.table}>
          {/* fixed so the header repeats if many campaigns push the table onto
              a further page — a headerless continuation is unreadable. */}
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.th, { flex: 2.4 }]}>{strings.tableCampaign.toUpperCase()}</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>
              {strings.tableSpend.toUpperCase()}
            </Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>
              {strings.tableImpressions.toUpperCase()}
            </Text>
            <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>
              {strings.tableClicks.toUpperCase()}
            </Text>
            <Text style={[styles.th, { flex: 0.9, textAlign: "right" }]}>
              {strings.tableCtr.toUpperCase()}
            </Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>
              {strings.tableCpc.toUpperCase()}
            </Text>
            <Text style={[styles.th, { flex: 1.3, textAlign: "right" }]}>
              {strings.tableConversions.toUpperCase()}
            </Text>
            <Text style={[styles.th, { flex: 0.8, textAlign: "right" }]}>
              {strings.tableShare.toUpperCase()}
            </Text>
          </View>

          {campaigns.map((campaign) => {
            const perCampaign = computeDerived(campaign);
            return (
              <View key={campaign.campaignId} style={styles.tableRow} wrap={false}>
                <Text style={[styles.td, { flex: 2.4 }]}>{campaign.campaignName}</Text>
                <Text style={[styles.td, { flex: 1.2, textAlign: "right" }]}>
                  {formatCurrencyCents(campaign.spendCents, locale, currency)}
                </Text>
                <Text style={[styles.td, { flex: 1.2, textAlign: "right" }]}>
                  {formatCompact(campaign.impressions, locale)}
                </Text>
                <Text style={[styles.td, { flex: 0.9, textAlign: "right" }]}>
                  {formatCompact(campaign.clicks, locale)}
                </Text>
                <Text style={[styles.td, { flex: 0.9, textAlign: "right" }]}>
                  {perCampaign.ctr === null ? dash : formatRate(perCampaign.ctr, locale)}
                </Text>
                <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>
                  {perCampaign.cpcCents === null
                    ? dash
                    : formatCurrencyCents(perCampaign.cpcCents, locale, currency)}
                </Text>
                <Text style={[styles.td, { flex: 1.3, textAlign: "right" }]}>
                  {formatNumber(campaign.conversions, locale)}
                </Text>
                <Text style={[styles.td, { flex: 0.8, textAlign: "right" }]}>
                  {formatShare(campaign.share, locale)}
                </Text>
              </View>
            );
          })}
        </View>

        <PageFooter label={footerLabel} page={strings.page} />
      </Page>
    </Document>
  );
}
