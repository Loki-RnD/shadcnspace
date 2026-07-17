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
import { currentQuarter, listRocks } from "@/lib/l10/work";
import { RocksView } from "./rocks-view";

export const dynamic = "force-dynamic";

function quarterOptions(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = -1; i <= 2; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i * 3, 1),
    );
    out.push(`Q${Math.floor(d.getUTCMonth() / 3) + 1}-${d.getUTCFullYear()}`);
  }
  return [...new Set(out)];
}

export default async function RocksPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; tab?: string }>;
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
  const archived = params.tab === "archive";

  const [rocks, members] = await Promise.all([
    listRocks(team.id, { archived }),
    listTeamMembers(team.id),
  ]);

  return (
    <>
      <PageHeader
        title="Rocks"
        description="Set and track quarterly goals to help your team consistently hit their targets."
      />

      {/* Tabs — List | Planning Board | Archive */}
      <div className="mb-4 flex items-center gap-6 border-b">
        <Link
          href={`/l10/rocks?team=${team.id}`}
          className={cn(
            "-mb-px border-b-2 pb-2 text-sm transition-colors",
            !archived
              ? "border-[#f05100] font-semibold text-[#f05100]"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          List
        </Link>
        <span className="text-muted-foreground/50 cursor-not-allowed pb-2 text-sm">
          Planning Board
        </span>
        <Link
          href={`/l10/rocks?team=${team.id}&tab=archive`}
          className={cn(
            "-mb-px border-b-2 pb-2 text-sm transition-colors",
            archived
              ? "border-[#f05100] font-semibold text-[#f05100]"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          Archive
        </Link>
      </div>

      {/* Team filter pill */}
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
                    href={`/l10/rocks?team=${t.id}${archived ? "&tab=archive" : ""}`}
                  />
                }
              >
                {t.business_short} · {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="text-muted-foreground flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs">
          Quarter:{" "}
          <span className="text-foreground font-medium">
            {archived ? "Past quarters" : currentQuarter()}
          </span>
        </div>
      </div>

      <RocksView
        teamId={team.id}
        rocks={rocks}
        members={members}
        quarters={quarterOptions()}
        defaultQuarter={currentQuarter()}
        archived={archived}
      />
    </>
  );
}
