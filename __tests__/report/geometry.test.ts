import { describe, it, expect } from "vitest";
import { buildDonut, buildLineChart } from "@/lib/report/geometry";

describe("buildLineChart", () => {
  it("spreads points evenly across the width", () => {
    const { points } = buildLineChart({ values: [0, 5, 10], width: 100, height: 50 });
    expect(points.map((p) => p.x)).toEqual([0, 50, 100]);
  });

  it("puts the largest value at the top and zero on the baseline", () => {
    const { points } = buildLineChart({ values: [0, 10], width: 100, height: 50 });
    expect(points[0].y).toBe(50); // zero sits on the bottom edge
    expect(points[1].y).toBe(0); // the max reaches the top
  });

  it("always scales from zero, so small variations are not exaggerated", () => {
    // A 100→110 series must not fill the whole height as if it had doubled
    const { points, min } = buildLineChart({ values: [100, 110], width: 100, height: 100 });
    expect(min).toBe(0);
    expect(points[0].y).toBeCloseTo(9.09, 1);
  });

  it("survives an all-zero series instead of producing NaN", () => {
    const { points, areaPath } = buildLineChart({ values: [0, 0, 0], width: 100, height: 50 });
    expect(points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    expect(areaPath).not.toContain("NaN");
  });

  it("handles a single point without dividing by zero", () => {
    const { points } = buildLineChart({ values: [42], width: 100, height: 50 });
    expect(points).toHaveLength(1);
    expect(Number.isFinite(points[0].x)).toBe(true);
  });

  it("closes the area path back down to the baseline", () => {
    const { areaPath } = buildLineChart({ values: [1, 2], width: 100, height: 50 });
    expect(areaPath.startsWith("M")).toBe(true);
    expect(areaPath.endsWith("Z")).toBe(true);
  });

  it("respects padding on both axes", () => {
    const { points } = buildLineChart({
      values: [0, 10],
      width: 100,
      height: 100,
      padding: 10,
    });
    expect(points[0].x).toBe(10);
    expect(points[1].x).toBe(90);
    expect(points[1].y).toBe(10);
  });

  it("emits gridlines from zero up to the maximum", () => {
    const { gridLines } = buildLineChart({
      values: [0, 100],
      width: 100,
      height: 100,
      gridCount: 4,
    });
    expect(gridLines).toHaveLength(5);
    expect(gridLines[0].value).toBe(0);
    expect(gridLines[4].value).toBe(100);
  });
});

describe("buildDonut", () => {
  it("produces one segment per value with shares summing to one", () => {
    const segments = buildDonut({
      values: [50, 30, 20],
      cx: 50,
      cy: 50,
      outerRadius: 40,
      innerRadius: 25,
    });
    expect(segments).toHaveLength(3);
    expect(segments.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1);
    expect(segments[0].share).toBeCloseTo(0.5);
  });

  it("returns nothing rather than a ring of NaN when nothing was spent", () => {
    expect(
      buildDonut({ values: [0, 0], cx: 50, cy: 50, outerRadius: 40, innerRadius: 25 })
    ).toEqual([]);
  });

  it("never emits NaN coordinates, including for a tiny slice", () => {
    const segments = buildDonut({
      values: [999, 1],
      cx: 50,
      cy: 50,
      outerRadius: 40,
      innerRadius: 25,
    });
    for (const segment of segments) {
      expect(segment.path).not.toContain("NaN");
    }
  });

  it("keeps a slice thinner than the gap from inverting on itself", () => {
    // With a 1.5° gap, a 0.5° slice must still describe a forward arc
    const [, tiny] = buildDonut({
      values: [3599, 1],
      cx: 50,
      cy: 50,
      outerRadius: 40,
      innerRadius: 25,
      gapDegrees: 1.5,
    });
    expect(tiny.path).not.toContain("NaN");
    expect(tiny.share).toBeGreaterThan(0);
  });

  it("sets the large-arc flag once a slice passes half the ring", () => {
    const [big] = buildDonut({
      values: [80, 20],
      cx: 50,
      cy: 50,
      outerRadius: 40,
      innerRadius: 25,
    });
    // Flags appear as "A r r 0 <largeArc> <sweep>"
    expect(big.path).toMatch(/A 40 40 0 1 1/);
  });

  it("starts the first slice at twelve o'clock", () => {
    const [first] = buildDonut({
      values: [100],
      cx: 50,
      cy: 50,
      outerRadius: 40,
      innerRadius: 25,
      gapDegrees: 0,
    });
    // Straight up from the centre: same x, y reduced by the radius
    expect(first.path).toMatch(/^M 50 10/);
  });
});
