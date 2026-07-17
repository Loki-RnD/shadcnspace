"use client";

import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { NativeSelect } from "@/components/ui/native-select";
import type {
  BreakdownSlice,
  ModuleUsage,
  PeriodKey,
  SeriesPoint,
} from "@/lib/l10/analytics";

const ORANGE = "#f05100";
const AMBER = "#fbbf24";

export function PeriodFilter({
  periods,
  value,
  basePath = "/l10/analytics",
}: {
  periods: { key: string; label: string }[];
  value: PeriodKey;
  basePath?: string;
}) {
  const router = useRouter();
  return (
    <NativeSelect
      aria-label="Period"
      value={value}
      className="w-40"
      onChange={(e) => router.replace(`${basePath}?period=${e.target.value}`)}
    >
      {periods.map((p) => (
        <option key={p.key} value={p.key}>
          {p.label}
        </option>
      ))}
    </NativeSelect>
  );
}

const usageConfig = {
  pageviews: { label: "Page Views", color: ORANGE },
  visitors: { label: "Visitors", color: AMBER },
} satisfies ChartConfig;

export function UsageAreaChart({ data }: { data: SeriesPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-xs">
        No activity in this period yet.
      </p>
    );
  }
  return (
    <ChartContainer config={usageConfig} className="h-64 w-full aspect-auto">
      <AreaChart data={data} margin={{ left: -14, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillPageviews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ORANGE} stopOpacity={0.5} />
            <stop offset="95%" stopColor={ORANGE} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={AMBER} stopOpacity={0.5} />
            <stop offset="95%" stopColor={AMBER} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Area
          dataKey="pageviews"
          type="monotone"
          fill="url(#fillPageviews)"
          stroke={ORANGE}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
        />
        <Area
          dataKey="visitors"
          type="monotone"
          fill="url(#fillVisitors)"
          stroke={AMBER}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}

const sliceConfig = {
  count: { label: "Sessions", color: ORANGE },
} satisfies ChartConfig;

export function BreakdownRadarChart({ data }: { data: BreakdownSlice[] }) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-xs">
        No data yet.
      </p>
    );
  }
  return (
    <ChartContainer config={sliceConfig} className="mx-auto h-48 w-full aspect-auto">
      <RadarChart data={data}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <PolarGrid />
        <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
        <Radar
          dataKey="count"
          fill={ORANGE}
          fillOpacity={0.35}
          stroke={ORANGE}
          strokeWidth={2}
          dot={{ r: 3, fillOpacity: 1 }}
        />
      </RadarChart>
    </ChartContainer>
  );
}

const moduleConfig = {
  current: { label: "This month", color: ORANGE },
  previous: { label: "Last month", color: AMBER },
} satisfies ChartConfig;

export function ModuleUsageRadarChart({ data }: { data: ModuleUsage[] }) {
  if (data.length < 3) {
    return (
      <p className="text-muted-foreground py-10 text-center text-xs">
        Needs activity across at least 3 modules to draw.
      </p>
    );
  }
  return (
    <ChartContainer config={moduleConfig} className="mx-auto h-56 w-full aspect-auto">
      <RadarChart data={data}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarGrid />
        <PolarAngleAxis dataKey="module" tick={{ fontSize: 11 }} />
        <Radar
          dataKey="previous"
          fill={AMBER}
          fillOpacity={0.2}
          stroke={AMBER}
          strokeWidth={1.5}
        />
        <Radar
          dataKey="current"
          fill={ORANGE}
          fillOpacity={0.35}
          stroke={ORANGE}
          strokeWidth={2}
          dot={{ r: 3, fillOpacity: 1 }}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </RadarChart>
    </ChartContainer>
  );
}
