"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CircleAlert,
  Search,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import {
  Line,
  LineChart,
  ReferenceLine,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { todayNairobiIso } from "@/lib/l10/time";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Cadence, MetricRow, PeriodWindow } from "@/lib/l10/scorecard";
import {
  goalDelta,
  metricStatus,
  trendPoints,
  type TrendStatus,
} from "@/lib/l10/trends";

const ORANGE = "#f05100";
const AVERAGE_GRAY = "#9ca3af";
const nf = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 });

// ChartContainer (not raw ResponsiveContainer) — it seeds an initial
// dimension, without which recharts measures -1×-1 during hydration and
// never draws.
const trendConfig = {
  value: { label: "Actual", color: ORANGE },
} satisfies ChartConfig;

const STATUS_META: Record<
  TrendStatus,
  { label: string; chip: string; dot: string }
> = {
  off: {
    label: "Off-track",
    chip: "bg-red-500/15 text-red-700 dark:text-red-400",
    dot: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
  "at-risk": {
    label: "At-risk",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  on: {
    label: "On-track",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  "no-data": {
    label: "No recent data",
    chip: "bg-muted text-muted-foreground",
    dot: "bg-muted text-muted-foreground",
  },
};

const SORTS = [
  { key: "off-first", label: "Status (Off-track first)" },
  { key: "on-first", label: "Status (On-track first)" },
  { key: "az", label: "A-Z" },
  { key: "za", label: "Z-A" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

const OFF_FIRST: Record<TrendStatus, number> = {
  off: 0,
  "at-risk": 1,
  on: 2,
  "no-data": 3,
};
const ON_FIRST: Record<TrendStatus, number> = {
  on: 0,
  "at-risk": 1,
  off: 2,
  "no-data": 3,
};

function fmtVal(metric: MetricRow, v: number): string {
  const unit = metric.unit?.trim();
  if (unit === "%") return `${nf.format(v)}%`;
  return unit ? `${unit} ${nf.format(v)}` : nf.format(v);
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

function StatusChip({ status }: { status: TrendStatus }) {
  const meta = STATUS_META[status];
  const Icon =
    status === "on" ? TrendingUp : status === "off" ? CircleAlert : TriangleAlert;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        meta.chip,
      )}
    >
      {status !== "no-data" ? <Icon className="size-3" /> : null}
      {meta.label}
    </span>
  );
}

function TrendCard({
  metric,
  periods,
  status,
}: {
  metric: MetricRow;
  periods: PeriodWindow[];
  status: TrendStatus;
}) {
  const data = trendPoints(metric, periods);
  const populated = data.filter((d) => d.value !== null) as Array<
    (typeof data)[number] & { value: number }
  >;
  const average =
    populated.length > 0
      ? populated.reduce((a, d) => a + d.value, 0) / populated.length
      : null;

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <StatusChip status={status} />
        {metric.owner_name ? (
          <span
            title={metric.owner_name}
            className="flex size-7 items-center justify-center rounded-full bg-[#f05100]/15 text-[10px] font-semibold text-[#f05100]"
          >
            {initials(metric.owner_name)}
          </span>
        ) : null}
      </div>
      <p className="mb-2 text-sm font-semibold">{metric.title}</p>

      {populated.length > 0 ? (
        <ChartContainer config={trendConfig} className="h-44 w-full aspect-auto">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 8 }}
              interval="preserveStartEnd"
              tickFormatter={(l: string) => l.split(" - ")[0]}
            />
            <YAxis tick={{ fontSize: 9 }} width={56} />
            <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const v = payload[0]?.value;
                  if (typeof v !== "number") return null;
                  const delta = goalDelta(metric, v);
                  return (
                    <div className="bg-popover rounded-md border p-2 text-[11px] shadow-md">
                      <p className="font-medium">{label}</p>
                      {delta ? (
                        <p className="text-muted-foreground flex items-center gap-1">
                          {delta.pct !== null
                            ? `${nf.format(Math.abs(delta.pct))}% ${delta.abs >= 0 ? "above" : "below"} Goal:`
                            : `${delta.abs >= 0 ? "Above" : "Below"} Goal:`}
                          {delta.abs >= 0 ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )}
                          {fmtVal(metric, Math.abs(delta.abs))}
                        </p>
                      ) : null}
                      <p>Actual: {fmtVal(metric, v)}</p>
                      {metric.goal_text ? <p>Goal: {metric.goal_text}</p> : null}
                    </div>
                  );
                }}
              />
              {metric.goal_value !== null ? (
                <ReferenceLine
                  y={metric.goal_value}
                  stroke={ORANGE}
                  strokeDasharray="4 2"
                />
              ) : null}
              {average !== null ? (
                <ReferenceLine y={average} stroke={AVERAGE_GRAY} />
              ) : null}
              <Line
                dataKey="value"
                stroke={ORANGE}
                strokeWidth={2}
                dot={{ r: 2.5 }}
                connectNulls
              />
          </LineChart>
        </ChartContainer>
      ) : (
        <p className="text-muted-foreground flex h-44 items-center justify-center text-xs">
          No data to display
        </p>
      )}

      <div className="text-muted-foreground mt-2 flex items-center justify-center gap-4 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t border-dashed border-[#f05100]" />
          Goal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-1.5 rounded-full bg-[#f05100]" />
          Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t border-[#9ca3af]" />
          Average
        </span>
      </div>
    </div>
  );
}

export function TrendsView({
  metrics,
  periods,
}: {
  metrics: MetricRow[];
  periods: PeriodWindow[];
  cadence: Cadence;
}) {
  const [statusFilter, setStatusFilter] = useState<TrendStatus | null>(null);
  const [sort, setSort] = useState<SortKey>("off-first");
  const [query, setQuery] = useState("");

  // Judge only completed periods — the in-progress week/month/quarter is a
  // partial value against a full-period goal and would read as a miss.
  const todayIso = todayNairobiIso();
  const withStatus = useMemo(
    () =>
      metrics.map((m) => ({
        metric: m,
        status: metricStatus(m, periods, todayIso),
      })),
    [metrics, periods, todayIso],
  );

  const counts = useMemo(() => {
    const c: Record<TrendStatus, number> = {
      off: 0,
      "at-risk": 0,
      on: 0,
      "no-data": 0,
    };
    for (const { status } of withStatus) c[status]++;
    return c;
  }, [withStatus]);
  const total = withStatus.length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = withStatus.filter(
      ({ metric, status }) =>
        (statusFilter === null || status === statusFilter) &&
        (q === "" || metric.title.toLowerCase().includes(q)),
    );
    const order = sort === "on-first" ? ON_FIRST : OFF_FIRST;
    return [...filtered].sort((a, b) => {
      if (sort === "az") return a.metric.title.localeCompare(b.metric.title);
      if (sort === "za") return b.metric.title.localeCompare(a.metric.title);
      return (
        order[a.status] - order[b.status] ||
        a.metric.title.localeCompare(b.metric.title)
      );
    });
  }, [withStatus, statusFilter, sort, query]);

  const rangeLabel =
    periods.length > 0
      ? `${periods[0].label} — ${periods[periods.length - 1].label}`
      : "";

  const banner: { key: TrendStatus; icon: typeof CircleAlert }[] = [
    { key: "off", icon: CircleAlert },
    { key: "at-risk", icon: TriangleAlert },
    { key: "on", icon: TrendingUp },
  ];

  return (
    <>
      {/* Trends toolbar — status filter, sort, search */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-muted/50 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium">
              {statusFilter ? STATUS_META[statusFilter].label : "All"}
            </span>
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>
              All
            </DropdownMenuItem>
            {(Object.keys(STATUS_META) as TrendStatus[]).map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                {STATUS_META[s].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-muted/50 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">Sort:</span>
            <span className="font-medium">
              {SORTS.find((s) => s.key === sort)?.label}
            </span>
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SORTS.map((s) => (
              <DropdownMenuItem key={s.key} onClick={() => setSort(s.key)}>
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Measurables..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Status summary — Ninety's stats bar over the 3 most recent scores */}
      <Card className="mx-auto mb-6 max-w-2xl">
        <CardContent className="py-4">
          <p className="text-lg font-semibold">{rangeLabel}</p>
          <p className="text-muted-foreground mb-4 text-xs">
            Statuses are based off the 3 most recently populated scores.
          </p>
          <div className="grid grid-cols-3 divide-x">
            {banner.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setStatusFilter(statusFilter === key ? null : key)
                }
                className={cn(
                  "flex items-center justify-center gap-3 px-2 py-1 text-left",
                  statusFilter === key && "opacity-70",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full",
                    STATUS_META[key].dot,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="text-muted-foreground block text-[11px]">
                    {STATUS_META[key].label}
                  </span>
                  <span className="text-xl font-bold">{pct(counts[key])}%</span>
                  <span className="text-muted-foreground block text-[10px]">
                    {counts[key]} Measurable{counts[key] === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {cards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ metric, status }) => (
            <TrendCard
              key={metric.id}
              metric={metric}
              periods={periods}
              status={status}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-16 text-center text-sm">
          No measurables match the current filters.
        </p>
      )}
    </>
  );
}
