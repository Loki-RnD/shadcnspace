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
  trailingPeriods,
  type Cadence,
} from "@/lib/l10/scorecard";
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

const RANGE_LABEL: Record<Cadence, string> = {
  weekly: "Last 13 Weeks",
  monthly: "Last 13 Months",
  quarterly: "Last 8 Quarters",
  annual: "Last 5 Years",
};

export default async function ScorecardPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; cadence?: string }>;
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

  // chronological left → right; the current period is the rightmost column
  const periods = trailingPeriods(cadence).reverse();
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
              <DropdownMenuItem key={t.id} render={<Link href={`/l10/scorecard?team=${t.id}&cadence=${cadence}`} />}>
                {t.business_short} · {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="text-muted-foreground flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs">
          View by:{" "}
          <span className="text-foreground font-medium">
            {VIEW_BY[cadence]}
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs">
          Date Range:{" "}
          <span className="text-foreground font-medium">
            {RANGE_LABEL[cadence]}
          </span>
        </div>
      </div>

      <ScorecardView
        teamId={team.id}
        cadence={cadence}
        periods={periods}
        metrics={metrics}
        members={members}
      />
    </>
  );
}
