/**
 * Chart geometry for the PDF.
 *
 * The dashboard gets its charts from Recharts, but a PDF has no DOM and no
 * layout engine — @react-pdf/renderer only draws primitives. So the shapes are
 * computed here as plain numbers and SVG path strings, which has the useful
 * side effect of making the maths unit-testable on its own.
 */

export type Point = { x: number; y: number };

export type LineChartGeometry = {
  /** Polyline through every data point. */
  points: Point[];
  /** Closed path filling the area under the line. */
  areaPath: string;
  /** Open path along the line itself. */
  linePath: string;
  /** Horizontal gridline positions with the value each represents. */
  gridLines: { y: number; value: number }[];
  min: number;
  max: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Maps a series onto a box.
 *
 * The vertical scale always starts at zero: starting it at the minimum
 * exaggerates small variations, which on a spend chart handed to a client
 * would misrepresent the week.
 */
export function buildLineChart({
  values,
  width,
  height,
  padding = 0,
  gridCount = 4,
}: {
  values: number[];
  width: number;
  height: number;
  padding?: number;
  gridCount?: number;
}): LineChartGeometry {
  const innerWidth = Math.max(width - padding * 2, 1);
  const innerHeight = Math.max(height - padding * 2, 1);

  const max = values.length ? Math.max(...values) : 0;
  // A flat all-zero series would divide by zero; give it a nominal range so it
  // renders as a line along the bottom rather than NaN coordinates.
  const scaleMax = max > 0 ? max : 1;

  const stepX = values.length > 1 ? innerWidth / (values.length - 1) : 0;

  const points: Point[] = values.map((value, i) => ({
    x: round(padding + i * stepX),
    y: round(padding + innerHeight - (value / scaleMax) * innerHeight),
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const baselineY = round(padding + innerHeight);
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
    : "";

  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const ratio = i / gridCount;
    return {
      y: round(padding + innerHeight - ratio * innerHeight),
      value: round(scaleMax * ratio),
    };
  });

  return { points, areaPath, linePath, gridLines, min: 0, max: scaleMax };
}

export type DonutSegment = {
  /** SVG path for the ring slice. */
  path: string;
  share: number;
};

function polarToCartesian(cx: number, cy: number, radius: number, angleRad: number): Point {
  return {
    x: round(cx + radius * Math.cos(angleRad)),
    y: round(cy + radius * Math.sin(angleRad)),
  };
}

/**
 * Ring slices for the campaign breakdown.
 *
 * Angles start at twelve o'clock and run clockwise, which is how a reader
 * expects to compare shares. Values summing to zero produce no segments rather
 * than a full ring of NaN.
 */
export function buildDonut({
  values,
  cx,
  cy,
  outerRadius,
  innerRadius,
  gapDegrees = 1.5,
}: {
  values: number[];
  cx: number;
  cy: number;
  outerRadius: number;
  innerRadius: number;
  gapDegrees?: number;
}): DonutSegment[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  const gap = (gapDegrees * Math.PI) / 180;
  let angle = -Math.PI / 2; // twelve o'clock

  return values.map((value) => {
    const share = value / total;
    const sweep = share * Math.PI * 2;
    // Keep a hairline gap between slices, but never let it invert a slice
    // thinner than the gap itself.
    const effectiveGap = Math.min(gap, sweep / 2);
    const start = angle + effectiveGap / 2;
    const end = angle + sweep - effectiveGap / 2;
    angle += sweep;

    const outerStart = polarToCartesian(cx, cy, outerRadius, start);
    const outerEnd = polarToCartesian(cx, cy, outerRadius, end);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, end);
    const innerStart = polarToCartesian(cx, cy, innerRadius, start);
    const largeArc = end - start > Math.PI ? 1 : 0;

    const path = [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");

    return { path, share };
  });
}
