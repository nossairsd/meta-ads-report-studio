/**
 * A client's daily spend as a single line, small enough to sit in a table row.
 *
 * It answers one question — rising, falling, or stopped? — so it has no axis
 * and no labels; the exact figures are in the neighbouring cells. The scale
 * starts at zero, like every chart here, so a flat line never looks like a
 * collapse.
 */
export function Sparkline({
  values,
  width = 104,
  height = 30,
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const max = Math.max(...values, 0);
  const pad = 2;

  if (values.length < 2 || max === 0) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line
          x1={0}
          x2={width}
          y1={height - pad}
          y2={height - pad}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const step = width / (values.length - 1);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`);
  const area = `0,${height} ${points.join(" ")} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <polygon points={area} fill="currentColor" fillOpacity={0.08} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
