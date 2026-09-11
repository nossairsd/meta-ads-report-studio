/**
 * A daily series as a single line, small enough to sit in a table row or under
 * a KPI.
 *
 * It answers one question — rising, falling, or stopped? — so it has no axis
 * and no labels; the exact figures are beside it. The scale starts at zero,
 * like every chart here, so a flat line never looks like a collapse.
 */
export function Sparkline({
  values,
  width = 104,
  height = 30,
  responsive = false,
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  /** Stretch to the container's width instead of a fixed one. */
  responsive?: boolean;
  className?: string;
}) {
  const max = Math.max(...values, 0);
  const pad = 2;
  const empty = values.length < 2 || max === 0;

  const step = empty ? 0 : width / (values.length - 1);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const points = empty ? [] : values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`);

  return (
    <svg
      width={responsive ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      // Stretched horizontally when responsive; the stroke keeps its width.
      preserveAspectRatio={responsive ? "none" : undefined}
      className={className}
      aria-hidden
    >
      {empty ? (
        <line
          x1={0}
          x2={width}
          y1={height - pad}
          y2={height - pad}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <>
          <polygon
            points={`0,${height} ${points.join(" ")} ${width},${height}`}
            fill="currentColor"
            fillOpacity={0.08}
          />
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  );
}
