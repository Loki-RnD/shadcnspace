import type { MetricRow, PeriodWindow } from "./scorecard";

// Ninety's Trends status model: a measurable is judged on its 3 most
// recently populated scores — all hit → on-track, all miss → off-track,
// mixed → at-risk, nothing to judge → no recent data. Pure helpers only
// (no server imports) so the client trends view can share them.

export type TrendStatus = "on" | "at-risk" | "off" | "no-data";

export interface TrendPoint {
  label: string;
  start: string;
  value: number | null;
  rag: "on" | "off" | null;
}

/** Chronological chart points for a metric over the given periods. */
export function trendPoints(
  metric: MetricRow,
  periods: PeriodWindow[],
): TrendPoint[] {
  return periods.map((p) => {
    const cell = metric.values[p.start];
    return {
      label: p.label,
      start: p.start,
      value: cell?.value ?? null,
      rag: cell?.rag ?? null,
    };
  });
}

/** Does a value hit the metric's goal? Mirrors saveCellValue's rag logic. */
export function hitsGoal(metric: MetricRow, value: number): boolean | null {
  if (metric.goal_op === ">=" && metric.goal_value !== null)
    return value >= metric.goal_value;
  if (metric.goal_op === "<=" && metric.goal_value !== null)
    return value <= metric.goal_value;
  if (metric.goal_op === "band" && metric.goal_min !== null && metric.goal_max !== null)
    return value >= metric.goal_min && value <= metric.goal_max;
  return null;
}

/** The last `count` populated periods for a metric, chronological. Pass
 *  `before` (ISO date) to skip periods still in progress — a half-elapsed
 *  month or quarter compared against its full-period goal is a guaranteed
 *  miss and would poison the status. */
export function populatedPeriods(
  metric: MetricRow,
  periods: PeriodWindow[],
  count = 3,
  before?: string,
): PeriodWindow[] {
  return periods
    .filter(
      (p) =>
        metric.values[p.start] !== undefined && (!before || p.end < before),
    )
    .slice(-count);
}

export function metricStatus(
  metric: MetricRow,
  periods: PeriodWindow[],
  before?: string,
): TrendStatus {
  const judged = populatedPeriods(metric, periods, 3, before)
    .map((p) => {
      const cell = metric.values[p.start];
      if (cell.rag) return cell.rag === "on";
      return hitsGoal(metric, cell.value);
    })
    .filter((h): h is boolean => h !== null);
  if (judged.length === 0) return "no-data";
  if (judged.every(Boolean)) return "on";
  if (judged.every((h) => !h)) return "off";
  return "at-risk";
}

/** Signed average variance from goal across the 3 most recent populated
 *  scores (Ninety's "Average variance" card). Null when there is no scalar
 *  goal or no data. */
export function averageVariance(
  metric: MetricRow,
  periods: PeriodWindow[],
  before?: string,
): number | null {
  if (metric.goal_value === null) return null;
  const deltas = populatedPeriods(metric, periods, 3, before).map(
    (p) => metric.values[p.start].value - (metric.goal_value as number),
  );
  if (deltas.length === 0) return null;
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

/** Delta of a value vs the scalar goal, absolute and as a percentage of the
 *  goal (Ninety tooltip: "5% above Goal ↑ $5,200"). */
export function goalDelta(
  metric: MetricRow,
  value: number,
): { abs: number; pct: number | null } | null {
  if (metric.goal_value === null) return null;
  const abs = value - metric.goal_value;
  const pct =
    metric.goal_value === 0 ? null : (abs / Math.abs(metric.goal_value)) * 100;
  return { abs, pct };
}
