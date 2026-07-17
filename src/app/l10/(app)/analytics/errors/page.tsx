import Link from "next/link";
import { ArrowLeft, Bug, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getErrorGroupDetail,
  getErrorGroups,
  PERIODS,
  resolvePeriod,
} from "@/lib/l10/analytics";
import { describeError } from "@/lib/l10/error-descriptions";
import { getSessionUser } from "@/lib/l10/auth/session";
import { cn } from "@/lib/utils";
import { PeriodFilter } from "../analytics-charts";

export const dynamic = "force-dynamic";

const CATEGORY_STYLES: Record<string, string> = {
  "UI Component": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Network: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "Code Bug": "bg-red-500/10 text-red-600 dark:text-red-400",
  Deploy: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Unhandled: "bg-muted text-muted-foreground",
};

export default async function AnalyticsErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; g?: string }>;
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

  const { period, g } = await searchParams;
  const active = resolvePeriod(period);
  const gid = g ? Number(g) : null;

  const [groups, detail] = await Promise.all([
    getErrorGroups(active.hours),
    gid && Number.isInteger(gid) ? getErrorGroupDetail(gid) : null,
  ]);

  const selected = detail ?? null;
  const selectedDesc = selected
    ? describeError(selected.message, selected.source)
    : null;

  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-12">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-card-foreground flex items-center gap-2 text-lg font-medium">
              <Bug className="size-5" />
              Client Errors
            </p>
            <p className="text-muted-foreground text-xs">
              Uncaught browser errors, grouped and explained ·{" "}
              <Link href="/l10/analytics" className="underline underline-offset-2">
                <ArrowLeft className="inline size-3" /> back to analytics
              </Link>
            </p>
          </div>
          <PeriodFilter
            periods={[...PERIODS]}
            value={active.key}
            basePath="/l10/analytics/errors"
          />
        </CardContent>
      </Card>

      {/* Group list */}
      <Card className="col-span-12 xl:col-span-5">
        <CardContent className="flex flex-col gap-1">
          {groups.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-xs">
              No client errors in this period. 🎉
            </p>
          ) : (
            groups.map((e) => {
              const d = describeError(e.message, e.source);
              const isActive = selected && e.gid === gid;
              return (
                <Link
                  key={e.gid}
                  href={`/l10/analytics/errors?period=${active.key}&g=${e.gid}`}
                  className={cn(
                    "border-border flex min-w-0 flex-col gap-1 rounded-lg border p-3 transition-colors",
                    isActive ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        CATEGORY_STYLES[d.category],
                      )}
                    >
                      {d.category}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[11px]">
                      {e.occurrences}× · {e.affected_users} user(s) · {e.last_seen}
                    </span>
                  </div>
                  <p className="min-w-0 text-sm font-medium break-words">
                    {d.summary}
                  </p>
                  <p className="text-muted-foreground min-w-0 text-xs break-all">
                    {e.path}
                  </p>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Detail */}
      <Card className="col-span-12 xl:col-span-7">
        <CardContent className="flex min-w-0 flex-col gap-4">
          {!selected || !selectedDesc ? (
            <p className="text-muted-foreground py-8 text-center text-xs">
              Select an error on the left to inspect it.
            </p>
          ) : (
            <>
              <div className="flex min-w-0 flex-col gap-2">
                <span
                  className={cn(
                    "w-fit rounded-full px-2 py-0.5 text-[11px] font-medium",
                    CATEGORY_STYLES[selectedDesc.category],
                  )}
                >
                  {selectedDesc.category}
                </span>
                <p className="min-w-0 text-sm font-medium break-words">
                  {selectedDesc.summary}
                </p>
                <p className="text-muted-foreground min-w-0 text-xs break-words">
                  {selectedDesc.advice}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs font-medium">
                  Raw message
                </p>
                <p className="bg-muted/50 min-w-0 rounded-md p-2 font-mono text-xs break-words">
                  {selected.message}
                </p>
                <p className="text-muted-foreground min-w-0 text-xs break-all">
                  Page: {selected.path}
                  {selected.source ? ` · Source: ${selected.source}` : ""}
                </p>
              </div>

              {selected.occurrences.find((o) => o.stack) ? (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Latest stack trace
                  </p>
                  <pre className="bg-muted/50 max-h-56 min-w-0 overflow-y-auto rounded-md p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                    {selected.occurrences.find((o) => o.stack)?.stack}
                  </pre>
                </div>
              ) : null}

              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs font-medium">
                  Recent occurrences
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-border border-b text-left text-xs">
                        <th className="py-2 pr-2 font-medium">When</th>
                        <th className="py-2 pr-2 font-medium">User</th>
                        <th className="py-2 font-medium">Browser</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.occurrences.map((o, i) => (
                        <tr key={i} className="border-border border-b last:border-0">
                          <td className="text-muted-foreground py-2 pr-2 text-xs whitespace-nowrap">
                            {o.seen_at}
                          </td>
                          <td className="py-2 pr-2 text-xs">
                            {o.full_name ?? "—"}
                          </td>
                          <td className="text-muted-foreground min-w-0 py-2 text-xs break-words">
                            <span className="line-clamp-1">{o.user_agent ?? "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-muted-foreground text-[11px]">
                <Badge variant="outline" className="mr-1 align-middle text-[10px]">
                  tip
                </Badge>
                Occurrence counts respect the period filter; the detail shows the
                20 most recent events for this error.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
