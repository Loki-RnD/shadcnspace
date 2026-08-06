import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/l10/page-header";
import { getSessionUser } from "@/lib/l10/auth/session";
import {
  getScorecard,
  listTeamMembers,
  listTeamsForCompanies,
  monthOptions,
  periodsBetween,
  trailingPeriods,
  weeksForMonths,
  type Cadence,
} from "@/lib/l10/scorecard";
import { MonthFilter } from "./month-filter";
import { RangeFilter } from "./range-filter";
import { ScorecardView } from "./scorecard-view";

export const dynamic = "force-dynamic";

const CADENCE_TABS: { key: Cadence; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "annual", label: "Annual" },
];

const VIEW_BY: Record<Cadence, string> = {
  weekly: "Week",
  monthly: "Month",
  quarterly: "Quarter",
  annual: "Year",
};

// Date-range presets per cadence; the first entry is the default.
const RANGE_OPTIONS: Record<Cadence, { count: number; label: string }[]> = {
  weekly: [
    { count: 13, label: "Last 13 Weeks" },
    { count: 26, label: "Last 26 Weeks" },
    { count: 52, label: "Last 52 Weeks" },
  ],
  monthly: [
    { count: 13, label: "Last 13 Months" },
    { count: 6, label: "Last 6 Months" },
    { count: 24, label: "Last 24 Months" },
  ],
  quarterly: [
    { count: 8, label: "Last 8 Quarters" },
    { count: 4, label: "Last 4 Quarters" },
    { count: 12, label: "Last 12 Quarters" },
  ],
  annual: [
    { count: 5, label: "Last 5 Years" },
    { count: 3, label: "Last 3 Years" },
    { count: 10, label: "Last 10 Years" },
  ],
};

export default async function ScorecardPage({
  searchParams,
}: {
  searchParams: Promise<{
    team?: string;
    cadence?: string;
    range?: string;
    months?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const user = await getSessionUser();
  if (!user) return null; // middleware redirects; belt-and-braces

  const teams = await listTeamsForCompanies(user.companies);
  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
          No teams found for your companies ({user.companies.join(", ")}).
        </CardContent>
      </Card>
    );
  }

  const params = await searchParams;
  const team = teams.find((t) => t.id === params.team) ?? teams[0];
  const cadence: Cadence = (
    CADENCE_TABS.some((c) => c.key === params.cadence)
      ? params.cadence
      : "weekly"
  ) as Cadence;

  const rangeOptions = RANGE_OPTIONS[cadence];
  const range =
    rangeOptions.find((r) => r.count === Number(params.range)) ??
    rangeOptions[0];

  // Month filter (weekly only) — selected months override the date range.
  const months = cadence === "weekly" ? monthOptions(12) : [];
  const selectedMonths = (params.months ?? "")
    .split(",")
    .filter((k) => months.some((o) => o.key === k));

  // Custom calendar range — overrides the preset (months, if set, win)
  const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
  const custom =
    params.from &&
    params.to &&
    ISO_DAY.test(params.from) &&
    ISO_DAY.test(params.to) &&
    params.from <= params.to
      ? { from: params.from, to: params.to }
      : null;

  // chronological left → right; the current period is the rightmost column
  const periods =
    selectedMonths.length > 0
      ? weeksForMonths(selectedMonths)
      : custom
        ? periodsBetween(cadence, custom.from, custom.to)
        : trailingPeriods(cadence, range.count).reverse();
  const currentPeriodStart = trailingPeriods(cadence, 1)[0].start;
  const [metrics, members] = await Promise.all([
    getScorecard(team.id, cadence, periods),
    listTeamMembers(team.id),
  ]);

  return (
    <>
      <PageHeader
        title="Scorecard"
        description="Record and evaluate key metrics, streamlined for strategic success."
      />

      {/* Cadence tabs — Trends | Weekly | Monthly | Quarterly | Annual */}
      <div className="mb-4 flex items-center gap-4 overflow-x-auto border-b sm:gap-6">
        <span className="text-muted-foreground/50 shrink-0 cursor-not-allowed pb-2 text-sm">
          Trends
        </span>
        {CADENCE_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/l10/scorecard?team=${team.id}&cadence=${t.key}`}
            className={cn(
              "-mb-px shrink-0 border-b-2 pb-2 text-sm whitespace-nowrap transition-colors",
              t.key === cadence
                ? "border-[#f05100] font-semibold text-[#f05100]"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Filter bar — Team · View by · Date Range */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-muted/50 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">Team:</span>
            <span className="font-medium">
              {team.business_short} · {team.name}
            </span>
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {teams.map((t) => (
              <DropdownMenuItem key={t.id} render={<Link href={`/l10/scorecard?team=${t.id}&cadence=${cadence}${custom ? `&from=${custom.from}&to=${custom.to}` : `&range=${range.count}`}${selectedMonths.length ? `&months=${selectedMonths.join(",")}` : ""}`} />}>
                {t.business_short} · {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-muted/50 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">View by:</span>
            <span className="font-medium">{VIEW_BY[cadence]}</span>
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {CADENCE_TABS.map((t) => (
              <DropdownMenuItem
                key={t.key}
                render={
                  <Link
                    href={`/l10/scorecard?team=${team.id}&cadence=${t.key}`}
                  />
                }
                className={cn(t.key === cadence && "bg-muted/60 font-medium")}
              >
                {VIEW_BY[t.key]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <RangeFilter
          teamId={team.id}
          cadence={cadence}
          presets={[...rangeOptions].sort((a, b) => a.count - b.count)}
          activeCount={range.count}
          custom={custom}
          dimmed={selectedMonths.length > 0}
        />
        {cadence === "weekly" ? (
          <MonthFilter
            teamId={team.id}
            range={range.count}
            options={months}
            selected={selectedMonths}
          />
        ) : null}
      </div>

      <ScorecardView
        teamId={team.id}
        cadence={cadence}
        periods={periods}
        currentPeriodStart={currentPeriodStart}
        metrics={metrics}
        members={members}
      />
    </>
  );
}
