import Link from "next/link";
import { ArrowLeft, MousePointerClick, ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  ACTION_CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  groupActions,
  type ActionCategory,
} from "@/lib/l10/action-groups";
import { getTopActions, PERIODS, resolvePeriod } from "@/lib/l10/analytics";
import { getSessionUser } from "@/lib/l10/auth/session";
import { cn } from "@/lib/utils";
import { PeriodFilter } from "../analytics-charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; cat?: string }>;
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

  const { period, cat } = await searchParams;
  const active = resolvePeriod(period);
  const groups = groupActions(await getTopActions(active.hours));

  const selectedCategory = (ACTION_CATEGORIES as readonly string[]).includes(
    cat ?? "",
  )
    ? (cat as ActionCategory)
    : null;
  const visible = selectedCategory
    ? groups.filter((g) => g.category === selectedCategory)
    : groups;
  const totalClicks = groups.reduce((s, g) => s + g.clicks, 0);

  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-12">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-card-foreground flex items-center gap-2 text-lg font-medium">
              <MousePointerClick className="size-5" />
              Interactions
            </p>
            <p className="text-muted-foreground text-xs">
              Every clicked control, grouped by what it does ·{" "}
              <Link href="/l10/analytics" className="underline underline-offset-2">
                <ArrowLeft className="inline size-3" /> back to analytics
              </Link>
            </p>
          </div>
          <PeriodFilter
            periods={[...PERIODS]}
            value={active.key}
            basePath="/l10/analytics/actions"
          />
        </CardContent>
      </Card>

      {/* Category chips */}
      <Card className="col-span-12">
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href={`/l10/analytics/actions?period=${active.key}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              !selectedCategory
                ? "bg-primary text-primary-foreground border-transparent"
                : "border-border hover:bg-muted",
            )}
          >
            All · {totalClicks}
          </Link>
          {groups.map((g) => (
            <Link
              key={g.category}
              href={`/l10/analytics/actions?period=${active.key}&cat=${encodeURIComponent(g.category)}`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                selectedCategory === g.category
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "border-border hover:bg-muted",
              )}
            >
              {g.category} · {g.clicks}
            </Link>
          ))}
        </CardContent>
      </Card>

      {groups.length === 0 ? (
        <Card className="col-span-12">
          <CardContent>
            <p className="text-muted-foreground py-8 text-center text-xs">
              No interactions in this period yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        visible.map((g) => (
          <Card
            key={g.category}
            className={cn(
              "col-span-12",
              !selectedCategory && "xl:col-span-6",
            )}
          >
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-card-foreground text-sm font-medium">
                    {g.category}
                  </p>
                  <p className="text-muted-foreground text-xs break-words">
                    {CATEGORY_DESCRIPTIONS[g.category]}
                  </p>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {g.clicks} clicks · {Math.round((g.clicks / totalClicks) * 100)}%
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-border border-b text-left text-xs">
                      <th className="py-2 pr-2 font-medium">Control</th>
                      <th className="py-2 pr-2 font-medium">Module</th>
                      <th className="py-2 pr-2 text-right font-medium">Clicks</th>
                      <th className="py-2 pr-2 text-right font-medium">Users</th>
                      <th className="py-2 font-medium">Last used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedCategory ? g.controls : g.controls.slice(0, 8)).map(
                      (c) => (
                        <tr
                          key={`${c.label}|${c.module}`}
                          className="border-border border-b last:border-0"
                        >
                          <td className="min-w-0 py-2 pr-2 font-medium break-words">
                            {c.label}
                          </td>
                          <td className="text-muted-foreground py-2 pr-2 text-xs">
                            {c.module}
                          </td>
                          <td className="py-2 pr-2 text-right">{c.clicks}</td>
                          <td className="py-2 pr-2 text-right">{c.users}</td>
                          <td className="text-muted-foreground py-2 text-xs whitespace-nowrap">
                            {c.last_used}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
                {!selectedCategory && g.controls.length > 8 ? (
                  <Link
                    href={`/l10/analytics/actions?period=${active.key}&cat=${encodeURIComponent(g.category)}`}
                    className="text-muted-foreground hover:text-foreground mt-2 inline-block text-xs font-medium"
                  >
                    +{g.controls.length - 8} more →
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
