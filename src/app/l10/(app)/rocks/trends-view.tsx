"use client";

import { useMemo } from "react";
import { CircleAlert, CircleCheck, TrendingUp } from "lucide-react";
import {
  Line,
  LineChart,
  ReferenceLine,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import type {
  QuarterPeriod,
  RockStatusEvent,
  RockTrendRow,
} from "@/lib/l10/rock-trends";

const ORANGE = "#f05100";
const EMERALD = "#10b981";
const RED = "#ef4444";
const SKY = "#0ea5e9";

const chartConfig = {
  pct: { label: "Completed", color: ORANGE },
} satisfies ChartConfig;

const intraConfig = {
  on: { label: "On-track", color: EMERALD },
  off: { label: "Off-track", color: RED },
  done: { label: "Done", color: SKY },
} satisfies ChartConfig;

const QUARTER_RE = /^Q([1-4])-(\d{4})$/;

/** Chronological sort key for 'Qn-YYYY'. */
function quarterKey(q: string): number {
  const m = q.match(QUARTER_RE);
  return m ? Number(m[2]) * 10 + Number(m[1]) : 0;
}

/** Quarter window from the editable l10.quarter_periods table, falling back
 *  to the calendar quarter when a key hasn't been configured yet. */
function quarterWindow(
  quarter: string,
  periods: QuarterPeriod[],
): { start: Date; end: Date } | null {
  const row = periods.find((p) => p.quarter === quarter);
  if (row) return { start: new Date(row.start_date), end: new Date(row.end_date) };
  const m = quarter.match(QUARTER_RE);
  if (!m) return null;
  const q = Number(m[1]);
  const y = Number(m[2]);
  return {
    start: new Date(Date.UTC(y, (q - 1) * 3, 1)),
    end: new Date(Date.UTC(y, q * 3, 0)),
  };
}

/** Weeks from the rock's period start to completion — quarter-locked rocks
 *  measure from the quarter window, elastic rocks from their own start_date.
 *  Returns null for completions outside the window (+2wks grace): the 0011
 *  workbook backfill stamped past quarters at import time, so those can't be
 *  trusted for timing. */
function weeksToComplete(
  rock: RockTrendRow,
  periods: QuarterPeriod[],
): number | null {
  if (rock.status !== "done" || !rock.completed_at) return null;
  // Annual (FY-*) rocks aren't quarterly commitments — measuring them from
  // Jan 1 would swamp the average.
  if (!QUARTER_RE.test(rock.quarter)) return null;
  const win = quarterWindow(rock.quarter, periods);
  if (!win) return null;
  const start =
    rock.period_mode === "elastic" && rock.start_date
      ? new Date(rock.start_date)
      : win.start;
  const end =
    rock.period_mode === "elastic" && rock.due_date
      ? new Date(rock.due_date)
      : win.end;
  const done = new Date(rock.completed_at);
  const grace = 14 * 86400e3;
  if (done.getTime() < start.getTime() || done.getTime() > end.getTime() + grace)
    return null;
  return (done.getTime() - start.getTime()) / (7 * 86400e3);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Weekly point-in-time status mix for the current quarter, reconstructed
 *  from the status-change log: at each sample point a rock's status is its
 *  latest event at or before that moment. The series starts at the first
 *  event (the 0013 baseline seed) — earlier weeks are genuinely unknown —
 *  and grows as the quarter progresses. */
function intraQuarterSeries(
  rocks: RockTrendRow[],
  events: RockStatusEvent[],
  win: { start: Date; end: Date } | null,
) {
  if (!win) return [];
  const rockIds = new Set(rocks.map((r) => r.id));
  const byRock = new Map<string, { t: number; status: string }[]>();
  for (const e of events) {
    if (!rockIds.has(e.rock_id)) continue;
    const arr = byRock.get(e.rock_id) ?? [];
    arr.push({ t: new Date(e.changed_at).getTime(), status: e.status });
    byRock.set(e.rock_id, arr);
  }
  if (byRock.size === 0) return [];
  const firstEvent = Math.min(
    ...[...byRock.values()].map((a) => a[0].t),
  );
  const now = Date.now();
  const endMs = Math.min(now, win.end.getTime() + 86400e3);

  const points: { t: number; label: string }[] = [];
  const d = new Date(win.start);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday ≤ start
  for (; d.getTime() <= endMs; d.setUTCDate(d.getUTCDate() + 7)) {
    if (d.getTime() < firstEvent) continue;
    points.push({
      t: d.getTime(),
      label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`,
    });
  }
  if (
    points.length === 0 ||
    now - points[points.length - 1].t > 12 * 3600e3
  )
    points.push({ t: now, label: "Now" });

  return points
    .map((p) => {
      let on = 0;
      let off = 0;
      let done = 0;
      for (const arr of byRock.values()) {
        let latest: string | null = null;
        for (const e of arr) {
          if (e.t <= p.t) latest = e.status;
          else break;
        }
        if (!latest) continue; // rock not yet tracked at this point
        if (latest === "on_track") on++;
        else if (latest === "off_track") off++;
        else done++;
      }
      const total = on + off + done;
      const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
      return {
        label: p.label,
        total,
        onN: on,
        offN: off,
        doneN: done,
        on: pct(on),
        off: pct(off),
        done: pct(done),
      };
    })
    .filter((p) => p.total > 0);
}

interface OwnerGroup {
  key: string;
  label: string;
  rocks: RockTrendRow[];
}

function StatusChips({ rocks }: { rocks: RockTrendRow[] }) {
  const done = rocks.filter((r) => r.status === "done").length;
  const on = rocks.filter((r) => r.status === "on_track").length;
  const off = rocks.filter((r) => r.status === "off_track").length;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="text-muted-foreground">{rocks.length} rocks</span>
      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
        {on} on-track
      </span>
      <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-medium text-red-700 dark:text-red-400">
        {off} off-track
      </span>
      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-medium text-sky-700 dark:text-sky-400">
        {done} done
      </span>
    </span>
  );
}

function CompletionChart({
  series,
}: {
  series: { quarter: string; pct: number; done: number; total: number }[];
}) {
  return (
    <ChartContainer config={chartConfig} className="h-40 w-full aspect-auto">
      <LineChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
        <XAxis dataKey="quarter" tick={{ fontSize: 9 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={(v) => `${v}%`} />
        <RechartsTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0]?.payload as (typeof series)[number];
            return (
              <div className="bg-popover rounded-md border p-2 text-[11px] shadow-md">
                <p className="font-medium">{label}</p>
                <p>
                  {p.done}/{p.total} rocks completed ({Math.round(p.pct)}%)
                </p>
              </div>
            );
          }}
        />
        {/* EOS convention: a good quarter lands 80%+ of its rocks */}
        <ReferenceLine y={80} stroke={ORANGE} strokeDasharray="4 2" />
        <Line dataKey="pct" stroke={ORANGE} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function RockTrendsView({
  rocks,
  periods,
  events,
  currentQuarter,
}: {
  rocks: RockTrendRow[];
  periods: QuarterPeriod[];
  events: RockStatusEvent[];
  currentQuarter: string;
}) {
  const quarters = useMemo(
    () =>
      [...new Set(rocks.map((r) => r.quarter))]
        .filter((q) => QUARTER_RE.test(q))
        .sort((a, b) => quarterKey(a) - quarterKey(b)),
    [rocks],
  );

  const seriesFor = (rows: RockTrendRow[]) =>
    quarters
      .map((q) => {
        const inQ = rows.filter((r) => r.quarter === q);
        const done = inQ.filter((r) => r.status === "done").length;
        return {
          quarter: q,
          total: inQ.length,
          done,
          pct: inQ.length === 0 ? null : (done / inQ.length) * 100,
        };
      })
      .filter((p): p is typeof p & { pct: number } => p.pct !== null);

  const avgWeeksFor = (rows: RockTrendRow[]) => {
    const tracked = rows
      .map((r) => weeksToComplete(r, periods))
      .filter((w): w is number => w !== null);
    if (tracked.length === 0) return null;
    return {
      weeks: tracked.reduce((a, b) => a + b, 0) / tracked.length,
      n: tracked.length,
    };
  };

  const teamSeries = useMemo(() => seriesFor(rocks), [rocks, quarters]);
  const teamAvg = useMemo(() => avgWeeksFor(rocks), [rocks, periods]);

  const current = rocks.filter((r) => r.quarter === currentQuarter);
  const intraSeries = useMemo(
    () =>
      intraQuarterSeries(
        current,
        events,
        quarterWindow(currentQuarter, periods),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rocks, events, periods, currentQuarter],
  );
  const counts = {
    on: current.filter((r) => r.status === "on_track").length,
    off: current.filter((r) => r.status === "off_track").length,
    done: current.filter((r) => r.status === "done").length,
  };
  const pct = (n: number) =>
    current.length === 0 ? 0 : Math.round((n / current.length) * 100);

  const owners = useMemo<OwnerGroup[]>(() => {
    const map = new Map<string, OwnerGroup>();
    for (const r of rocks) {
      const key = r.owner_id ?? (r.is_company ? "company" : "unassigned");
      const label =
        r.owner_name ?? (r.is_company ? "Company rocks" : "Unassigned");
      const g = map.get(key) ?? { key, label, rocks: [] };
      g.rocks.push(r);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => {
      if (a.key === "company") return -1;
      if (b.key === "company") return 1;
      return a.label.localeCompare(b.label);
    });
  }, [rocks]);

  const banner = [
    {
      label: "Off-track",
      n: counts.off,
      icon: CircleAlert,
      cls: "bg-red-500/15 text-red-600 dark:text-red-400",
    },
    {
      label: "On-track",
      n: counts.on,
      icon: TrendingUp,
      cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Done",
      n: counts.done,
      icon: CircleCheck,
      cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
  ];

  return (
    <>
      {/* Current-quarter status summary, same shape as Scorecard Trends */}
      <Card className="mx-auto mb-6 max-w-2xl">
        <CardContent className="py-4">
          <p className="text-lg font-semibold">{currentQuarter} Rocks</p>
          <p className="text-muted-foreground mb-4 text-xs">
            {current.length} rocks this quarter
            {teamAvg
              ? ` · avg ${teamAvg.weeks.toFixed(1)} wks to complete (${teamAvg.n} tracked)`
              : ""}
            {" · "}
            <a
              href="/l10/admin"
              className="underline underline-offset-2 hover:text-[#f05100]"
            >
              edit quarter periods
            </a>
          </p>
          <div className="grid grid-cols-3 divide-x">
            {banner.map(({ label, n, icon: Icon, cls }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-3 px-2 py-1"
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full",
                    cls,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="text-muted-foreground block text-[11px]">
                    {label}
                  </span>
                  <span className="text-xl font-bold">{pct(n)}%</span>
                  <span className="text-muted-foreground block text-[10px]">
                    {n} Rock{n === 1 ? "" : "s"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team completion trend across quarters */}
      <div className="bg-card mb-6 rounded-xl border p-4">
        <p className="mb-1 text-sm font-semibold">Team rock completion</p>
        <p className="text-muted-foreground mb-2 text-xs">
          % of rocks completed per quarter — dashed line is the 80% EOS target.
        </p>
        {teamSeries.length > 0 ? (
          <CompletionChart series={teamSeries} />
        ) : (
          <p className="text-muted-foreground py-10 text-center text-xs">
            No quarterly rocks yet.
          </p>
        )}
      </div>

      {/* Intra-quarter status trend — grows weekly from the status log */}
      {intraSeries.length > 0 ? (
        <div className="bg-card mb-6 rounded-xl border p-4">
          <p className="mb-1 text-sm font-semibold">
            {currentQuarter} status over time
          </p>
          <p className="text-muted-foreground mb-2 text-xs">
            Weekly point-in-time status mix, reconstructed from the rock
            status-change log. Tracking began {intraSeries[0].label} — the line
            fills in as the quarter progresses.
          </p>
          <ChartContainer config={intraConfig} className="h-44 w-full aspect-auto">
            <LineChart
              data={intraSeries}
              margin={{ top: 6, right: 8, bottom: 0, left: -22 }}
            >
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9 }}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0]?.payload as (typeof intraSeries)[number];
                  return (
                    <div className="bg-popover rounded-md border p-2 text-[11px] shadow-md">
                      <p className="font-medium">{label}</p>
                      <p>
                        {p.onN} on-track · {p.offN} off-track · {p.doneN} done
                        ({p.total} rocks)
                      </p>
                    </div>
                  );
                }}
              />
              <Line dataKey="on" stroke={EMERALD} strokeWidth={2} dot={{ r: 2.5 }} />
              <Line dataKey="off" stroke={RED} strokeWidth={2} dot={{ r: 2.5 }} />
              <Line dataKey="done" stroke={SKY} strokeWidth={2} dot={{ r: 2.5 }} />
            </LineChart>
          </ChartContainer>
          <div className="text-muted-foreground mt-2 flex items-center justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-[#10b981]" />
              On-track
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-[#ef4444]" />
              Off-track
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-[#0ea5e9]" />
              Done
            </span>
          </div>
        </div>
      ) : null}

      {/* One card per HOD */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {owners.map((g) => {
          const series = seriesFor(g.rocks);
          const avg = avgWeeksFor(g.rocks);
          const inCurrent = g.rocks.filter((r) => r.quarter === currentQuarter);
          return (
            <div key={g.key} className="bg-card rounded-xl border p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{g.label}</p>
                <span className="flex size-7 items-center justify-center rounded-full bg-[#f05100]/15 text-[10px] font-semibold text-[#f05100]">
                  {initials(g.label)}
                </span>
              </div>
              <p className="text-muted-foreground mb-2 text-[11px]">
                {avg
                  ? `Avg ${avg.weeks.toFixed(1)} wks to complete a rock (${avg.n} tracked)`
                  : "No tracked completions yet"}
              </p>
              <div className="mb-2">
                {inCurrent.length > 0 ? (
                  <StatusChips rocks={inCurrent} />
                ) : (
                  <span className="text-muted-foreground text-[11px]">
                    No rocks in {currentQuarter}
                  </span>
                )}
              </div>
              {series.length > 0 ? (
                <CompletionChart series={series} />
              ) : (
                <p className="text-muted-foreground flex h-40 items-center justify-center text-xs">
                  No quarterly rocks
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
