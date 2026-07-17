import {
  Activity,
  Bug,
  ChartColumn,
  MousePointerClick,
  ShieldAlert,
  Star,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getDailyActivity,
  getErrorGroups,
  getRatings,
  getSummary,
  getTopActions,
  getTopPages,
  getUserActivity,
} from "@/lib/l10/analytics";
import { getSessionUser } from "@/lib/l10/auth/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof Activity;
}) {
  return (
    <Card className="col-span-6 md:col-span-3 xl:col-span-2">
      <CardContent className="flex flex-col gap-1">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Icon className="size-3.5" />
          {label}
        </div>
        <p className="text-card-foreground text-2xl font-semibold">{value}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
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
      <CardContent className="flex flex-col gap-3">
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
    No data yet — it will appear as the team uses the app.
  </p>
);

export default async function AnalyticsPage() {
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

  const [summary, daily, pages, actions, errors, users, ratings] =
    await Promise.all([
      getSummary(),
      getDailyActivity(),
      getTopPages(),
      getTopActions(),
      getErrorGroups(),
      getUserActivity(),
      getRatings(),
    ]);

  const maxDaily = Math.max(1, ...daily.map((d) => d.pageviews));
  const totalRatings = ratings.distribution.reduce((s, r) => s + r.count, 0);

  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-12">
        <CardContent className="flex flex-col gap-1">
          <p className="text-card-foreground flex items-center gap-2 text-lg font-medium">
            <ChartColumn className="size-5" />
            App Analytics
          </p>
          <p className="text-muted-foreground text-xs">
            In-app usage, errors and feedback from Neon. Traffic and Web Vitals
            also stream to Vercel Analytics / Speed Insights (Vercel
            dashboard).
          </p>
        </CardContent>
      </Card>

      <StatCard label="Active today" value={summary.dau} hint="distinct users, 24h" icon={Users} />
      <StatCard label="Active 7d" value={summary.wau} hint="distinct users" icon={Users} />
      <StatCard label="Active 30d" value={summary.mau} hint="distinct users" icon={Users} />
      <StatCard label="Page views 30d" value={summary.pageviews_30d} hint="in-app navigations" icon={Activity} />
      <StatCard label="Clicks 30d" value={summary.actions_30d} hint="buttons & links" icon={MousePointerClick} />
      <StatCard
        label="Avg rating"
        value={summary.avg_rating ?? "—"}
        hint={`${summary.ratings_count} ratings · errors 7d: ${summary.errors_7d}`}
        icon={Star}
      />

      <SectionCard
        title="Daily activity — last 14 days"
        subtitle="Page views per day (bar) and distinct active users"
        className="xl:col-span-7"
      >
        {daily.length === 0 ? (
          EMPTY
        ) : (
          <div className="flex h-36 items-end gap-1">
            {daily.map((d) => (
              <div
                key={d.day}
                className="group flex flex-1 flex-col items-center gap-1"
                title={`${d.day}: ${d.pageviews} views · ${d.actives} users`}
              >
                <span className="text-muted-foreground text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
                  {d.pageviews}
                </span>
                <div
                  className="w-full rounded-t bg-[#f05100]/80"
                  style={{ height: `${Math.max(4, (d.pageviews / maxDaily) * 100)}%` }}
                />
                <span className="text-muted-foreground text-[10px]">
                  {d.day.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Most used pages — 30 days"
        subtitle="Where the team spends time"
        className="xl:col-span-5"
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
        title="Most clicked controls — 30 days"
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
        title="Client errors — 30 days"
        subtitle="Uncaught errors grouped by message and page"
        className="xl:col-span-6"
      >
        {errors.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">
            No client errors recorded. 🎉
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
        title="Team activity — 30 days"
        subtitle="Who is using the app, and how recently"
        className="xl:col-span-7"
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

      <SectionCard
        title="UX ratings"
        subtitle="Optional in-app feedback (prompted at most monthly)"
        className="xl:col-span-5"
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
    </div>
  );
}
