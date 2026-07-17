import {
  Bug,
  ChartColumn,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getBreakdowns,
  getErrorGroups,
  getModuleUsage,
  getRatings,
  getSeries,
  getSummary,
  getTopActions,
  getTopPages,
  getUserActivity,
  PERIODS,
  resolvePeriod,
} from "@/lib/l10/analytics";
import { getSessionUser } from "@/lib/l10/auth/session";
import { cn } from "@/lib/utils";
import {
  BreakdownRadarChart,
  ModuleUsageRadarChart,
  PeriodFilter,
  UsageAreaChart,
} from "./analytics-charts";

export const dynamic = "force-dynamic";

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return null;
  const up = pct > 0;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500",
      )}
    >
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

function Stat({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex min-w-28 flex-col gap-0.5 border-border px-4 first:pl-0 not-first:border-s">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-card-foreground text-2xl font-semibold">{value}</span>
        {delta}
      </span>
      {hint ? <span className="text-muted-foreground text-[11px]">{hint}</span> : null}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("col-span-12", className)}>
      <CardContent className="flex h-full flex-col gap-3">
        <div>
          <p className="text-card-foreground text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

const EMPTY = (
  <p className="text-muted-foreground py-6 text-center text-xs">
    No data in this period yet.
  </p>
);

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (user?.systemRole !== "super_admin") {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 text-sm">
          <ShieldAlert className="size-6" />
          Analytics is restricted to super admins.
        </CardContent>
      </Card>
    );
  }

  const { period } = await searchParams;
  const active = resolvePeriod(period);
  const h = active.hours;

  const [summary, series, breakdowns, modules, pages, actions, errors, users, ratings] =
    await Promise.all([
      getSummary(h),
      getSeries(h),
      getBreakdowns(h),
      getModuleUsage(),
      getTopPages(h),
      getTopActions(h),
      getErrorGroups(h),
      getUserActivity(h),
      getRatings(h),
    ]);

  const totalRatings = ratings.distribution.reduce((s, r) => s + r.count, 0);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Header + master period filter */}
      <Card className="col-span-12">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-card-foreground flex items-center gap-2 text-lg font-medium">
              <ChartColumn className="size-5" />
              App Analytics
            </p>
            <p className="text-muted-foreground text-xs">
              In-app usage, errors and feedback ({active.label.toLowerCase()}).
              Web Vitals live in Vercel Speed Insights.
            </p>
          </div>
          <PeriodFilter periods={[...PERIODS]} value={active.key} />
        </CardContent>
      </Card>

      {/* Overview: summary strip + interactive area chart */}
      <Card className="col-span-12">
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-y-3">
            <Stat
              label="Active Users"
              value={summary.visitors}
              delta={<Delta current={summary.visitors} previous={summary.visitors_prev} />}
              hint="vs previous period"
            />
            <Stat
              label="Page Views"
              value={summary.pageviews}
              delta={<Delta current={summary.pageviews} previous={summary.pageviews_prev} />}
              hint="vs previous period"
            />
            <Stat
              label="Bounce Rate"
              value={summary.bounce_rate ? `${summary.bounce_rate}%` : "—"}
              hint="single-page sessions"
            />
            <Stat label="Clicks" value={summary.actions} hint="buttons & links" />
            <Stat label="Errors" value={summary.errors} hint="client-side" />
            <Stat
              label="Avg Rating"
              value={summary.avg_rating ?? "—"}
              hint={`${summary.ratings_count} ratings`}
            />
          </div>
          <UsageAreaChart data={series} />
        </CardContent>
      </Card>

      {/* Radar row: devices / browsers / OS + module comparison */}
      <SectionCard
        title="Devices"
        subtitle="Sessions by device type"
        className="md:col-span-6 xl:col-span-3"
      >
        <BreakdownRadarChart data={breakdowns.devices} />
      </SectionCard>
      <SectionCard
        title="Browsers"
        subtitle="Sessions by browser"
        className="md:col-span-6 xl:col-span-3"
      >
        <BreakdownRadarChart data={breakdowns.browsers} />
      </SectionCard>
      <SectionCard
        title="Operating Systems"
        subtitle="Sessions by OS"
        className="md:col-span-6 xl:col-span-3"
      >
        <BreakdownRadarChart data={breakdowns.systems} />
      </SectionCard>
      <SectionCard
        title="Module Utility"
        subtitle="Page views by module — this month vs last"
        className="md:col-span-6 xl:col-span-3"
      >
        <ModuleUsageRadarChart data={modules} />
      </SectionCard>

      <SectionCard
        title="Most used pages"
        subtitle="Where the team spends time"
        className="xl:col-span-6"
      >
        {pages.length === 0 ? (
          EMPTY
        ) : (
          <ul className="flex flex-col gap-2">
            {pages.map((p) => (
              <li key={p.path} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{p.path}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {p.views} views · {p.users} users
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Most clicked controls"
        subtitle="Buttons and links by label (feature usage)"
        className="xl:col-span-6"
      >
        {actions.length === 0 ? (
          EMPTY
        ) : (
          <ul className="flex flex-col gap-2">
            {actions.map((a) => (
              <li key={a.target} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{a.target}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {a.clicks} clicks · {a.users} users · {a.top_path}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Client errors"
        subtitle="Uncaught errors grouped by message and page"
        className="xl:col-span-6"
      >
        {errors.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">
            No client errors recorded in this period. 🎉
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {errors.map((e, i) => (
              <li key={i} className="flex flex-col gap-0.5 text-sm">
                <div className="flex items-center gap-2">
                  <Bug className="size-3.5 shrink-0 text-red-500" />
                  <span className="truncate font-medium">{e.message}</span>
                </div>
                <span className="text-muted-foreground pl-5.5 text-xs">
                  {e.path}
                  {e.source ? ` · ${e.source}` : ""} · {e.occurrences}× ·{" "}
                  {e.affected_users} user(s) · last {e.last_seen}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="UX ratings"
        subtitle="Optional in-app feedback (prompted at most monthly)"
        className="xl:col-span-6"
      >
        {totalRatings === 0 ? (
          EMPTY
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              {[5, 4, 3, 2, 1].map((score) => {
                const count =
                  ratings.distribution.find((r) => r.score === score)?.count ?? 0;
                return (
                  <div key={score} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-6">{score}★</span>
                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded">
                      <div
                        className="h-full bg-[#f05100]"
                        style={{ width: `${(count / totalRatings) * 100}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            <ul className="flex flex-col gap-2">
              {ratings.recent
                .filter((r) => r.comment)
                .slice(0, 5)
                .map((r, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{r.full_name}</span>{" "}
                    <span className="text-muted-foreground text-xs">
                      {r.score}★ · {r.created_at}
                    </span>
                    <p className="text-muted-foreground text-xs">{r.comment}</p>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Team activity"
        subtitle="Who is using the app, and how recently"
      >
        {users.length === 0 ? (
          EMPTY
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-left text-xs">
                  <th className="py-2 pr-2 font-medium">User</th>
                  <th className="py-2 pr-2 font-medium">Role</th>
                  <th className="py-2 pr-2 text-right font-medium">Views</th>
                  <th className="py-2 pr-2 text-right font-medium">Clicks</th>
                  <th className="py-2 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email} className="border-border border-b last:border-0">
                    <td className="py-2 pr-2">
                      <span className="font-medium">{u.full_name}</span>{" "}
                      <span className="text-muted-foreground text-xs">{u.email}</span>
                    </td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {u.system_role.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-2 pr-2 text-right">{u.pageviews}</td>
                    <td className="py-2 pr-2 text-right">{u.actions}</td>
                    <td className="text-muted-foreground py-2 text-xs">
                      {u.last_seen ?? "never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
