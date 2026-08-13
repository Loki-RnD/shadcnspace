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
  monthPeriods,
  monthsOfQuarters,
  periodsBetween,
  presetPeriods,
  quarterOptions,
  quarterPeriods,
  trailingPeriods,
  weeksForMonths,
  type Cadence,
  type PeriodWindow,
} from "@/lib/l10/scorecard";
import { FilterPill } from "./filter-pill";
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

// Every filter param is namespaced per cadence (w_range, m_months, q_owners,
// ...) so each view keeps its own filters — switching Weekly → Monthly and
// back never loses or reinterprets a selection.
const PREFIX: Record<Cadence, string> = {
  weekly: "w_",
  monthly: "m_",
  quarterly: "q_",
  annual: "a_",
};

// Date-range presets per cadence: calendar windows first, trailing-N after.
const RANGE_PRESETS: Record<Cadence, { key: string; label: string }[]> = {
  weekly: [
    { key: "tm", label: "This Month" },
    { key: "lm", label: "Last Month" },
    { key: "tq", label: "This Quarter" },
    { key: "lq", label: "Last Quarter" },
    { key: "ytd", label: "Year to Date" },
    { key: "4w", label: "Last 4 Weeks" },
    { key: "13w", label: "Last 13 Weeks" },
    { key: "26w", label: "Last 26 Weeks" },
  ],
  monthly: [
    { key: "tq", label: "This Quarter" },
    { key: "lq", label: "Last Quarter" },
    { key: "ytd", label: "Year to Date" },
    { key: "ty", label: "This Year" },
    { key: "ly", label: "Last Year" },
    { key: "6m", label: "Last 6 Months" },
    { key: "13m", label: "Last 13 Months" },
  ],
  quarterly: [
    { key: "ty", label: "This Year" },
    { key: "ly", label: "Last Year" },
    { key: "4q", label: "Last 4 Quarters" },
    { key: "8q", label: "Last 8 Quarters" },
    { key: "12q", label: "Last 12 Quarters" },
  ],
  annual: [
    { key: "3y", label: "Last 3 Years" },
    { key: "5y", label: "Last 5 Years" },
    { key: "10y", label: "Last 10 Years" },
  ],
};

const DEFAULT_RANGE: Record<Cadence, string> = {
  weekly: "13w",
  monthly: "ytd",
  quarterly: "ty",
  annual: "5y",
};

type SP = Record<string, string | string[] | undefined>;

/** Rebuild the scorecard URL keeping every current param, applying overrides
 *  (null deletes) — this is what keeps each cadence's filters alive across
 *  team/view switches. */
function href(params: SP, overrides: Record<string, string | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (typeof v === "string" && v !== "") q.set(k, v);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) q.delete(k);
    else q.set(k, v);
  }
  const s = q.toString();
  return `/l10/scorecard${s ? `?${s}` : ""}`;
}

export default async function ScorecardPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
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
  const str = (k: string) =>
    typeof params[k] === "string" ? (params[k] as string) : "";
  const team = teams.find((t) => t.id === str("team")) ?? teams[0];
  const cadence: Cadence = (
    CADENCE_TABS.some((c) => c.key === str("cadence"))
      ? str("cadence")
      : "weekly"
  ) as Cadence;
  const p = PREFIX[cadence];

  const presets = RANGE_PRESETS[cadence];
  const rangeKey = presets.some((r) => r.key === str(`${p}range`))
    ? str(`${p}range`)
    : DEFAULT_RANGE[cadence];

  // Month/quarter picks — months on weekly+monthly, quarters everywhere but
  // annual. Picks union together and override the date range.
  const months = cadence === "weekly" || cadence === "monthly"
    ? monthOptions(12)
    : [];
  const quarters = cadence !== "annual" ? quarterOptions(6) : [];
  const selectedMonths = str(`${p}months`)
    .split(",")
    .filter((k) => months.some((o) => o.key === k));
  const selectedQuarters = str(`${p}quarters`)
    .split(",")
    .filter((k) => quarters.some((o) => o.key === k));
  const pickedMonthKeys = [
    ...new Set([...selectedMonths, ...monthsOfQuarters(selectedQuarters)]),
  ];
  const hasPeriodPick =
    cadence === "quarterly"
      ? selectedQuarters.length > 0
      : pickedMonthKeys.length > 0;

  // Custom calendar range — overrides the preset (month/quarter picks win)
  const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
  const from = str(`${p}from`);
  const to = str(`${p}to`);
  const custom =
    from && to && ISO_DAY.test(from) && ISO_DAY.test(to) && from <= to
      ? { from, to }
      : null;

  // chronological left → right; the current period is the rightmost column
  let periods: PeriodWindow[];
  if (cadence === "weekly" && pickedMonthKeys.length)
    periods = weeksForMonths(pickedMonthKeys);
  else if (cadence === "monthly" && pickedMonthKeys.length)
    periods = monthPeriods(pickedMonthKeys);
  else if (cadence === "quarterly" && selectedQuarters.length)
    periods = quarterPeriods(selectedQuarters);
  else if (custom) periods = periodsBetween(cadence, custom.from, custom.to);
  else periods = presetPeriods(cadence, rangeKey);

  const currentPeriodStart = trailingPeriods(cadence, 1)[0].start;
  const [allMetrics, members] = await Promise.all([
    getScorecard(team.id, cadence, periods),
    listTeamMembers(team.id),
  ]);

  // Owner pill — filters the metric rows by owner, per cadence like the rest
  const selectedOwners = str(`${p}owners`)
    .split(",")
    .filter((k) => members.some((m) => m.id === k));
  const metrics = selectedOwners.length
    ? allMetrics.filter(
        (m) => m.owner_id !== null && selectedOwners.includes(m.owner_id),
      )
    : allMetrics;

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
            href={href(params, { team: team.id, cadence: t.key })}
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

      {/* Filter bar — Team · View by · Owner · Date Range · Months · Quarters */}
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
              <DropdownMenuItem
                key={t.id}
                render={<Link href={href(params, { team: t.id })} />}
              >
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
                    href={href(params, { team: team.id, cadence: t.key })}
                  />
                }
                className={cn(t.key === cadence && "bg-muted/60 font-medium")}
              >
                {VIEW_BY[t.key]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <FilterPill
          param={`${p}owners`}
          label="Owner"
          options={members.map((m) => ({ key: m.id, label: m.full_name }))}
          selected={selectedOwners}
        />
        <RangeFilter
          rangeParam={`${p}range`}
          fromParam={`${p}from`}
          toParam={`${p}to`}
          clearParams={[`${p}months`, `${p}quarters`]}
          presets={presets}
          activeKey={rangeKey}
          custom={custom}
          dimmed={hasPeriodPick}
        />
        {months.length > 0 ? (
          <FilterPill
            param={`${p}months`}
            label="Months"
            options={months}
            selected={selectedMonths}
          />
        ) : null}
        {quarters.length > 0 ? (
          <FilterPill
            param={`${p}quarters`}
            label="Quarters"
            options={quarters}
            selected={selectedQuarters}
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
