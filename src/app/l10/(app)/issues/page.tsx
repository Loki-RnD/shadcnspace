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
import { listTeamMembers, listTeamsForCompanies } from "@/lib/l10/scorecard";
import { listIssues } from "@/lib/l10/work";
import { IssuesView } from "./issues-view";

export const dynamic = "force-dynamic";

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; tab?: string; archive?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;

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
  const term = params.tab === "long" ? "long" : "short";
  const archived = params.archive === "1";

  const [issues, members] = await Promise.all([
    listIssues(team.id, { term, archived }),
    listTeamMembers(team.id),
  ]);

  const base = `/l10/issues?team=${team.id}`;

  return (
    <>
      <PageHeader
        title="Issues"
        description="Identify and organize your team's most pressing Issues to resolve them with ease."
      />

      {/* Tabs — Short-Term | Long-Term */}
      <div className="mb-4 flex items-center gap-6 border-b">
        <Link
          href={base}
          className={cn(
            "-mb-px border-b-2 pb-2 text-sm transition-colors",
            term === "short"
              ? "border-[#f05100] font-semibold text-[#f05100]"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          Short-Term
        </Link>
        <Link
          href={`${base}&tab=long`}
          className={cn(
            "-mb-px border-b-2 pb-2 text-sm transition-colors",
            term === "long"
              ? "border-[#f05100] font-semibold text-[#f05100]"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          Long-Term
        </Link>
      </div>

      {/* Filter pills — Team switcher + Archive toggle */}
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
                render={
                  <Link
                    href={`/l10/issues?team=${t.id}${term === "long" ? "&tab=long" : ""}`}
                  />
                }
              >
                {t.business_short} · {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Link
          href={`${base}${term === "long" ? "&tab=long" : ""}${archived ? "" : "&archive=1"}`}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition-colors",
            archived
              ? "border-[#f05100]/50 bg-[#f05100]/10 font-medium text-[#f05100]"
              : "text-muted-foreground hover:bg-muted/50",
          )}
        >
          Archive
        </Link>
      </div>

      <IssuesView
        teamId={team.id}
        issues={issues}
        members={members}
        term={term}
        archived={archived}
      />
    </>
  );
}
