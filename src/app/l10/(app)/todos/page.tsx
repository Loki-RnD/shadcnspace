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
import { getMemberForUser, listTodos } from "@/lib/l10/work";
import { TodosView } from "./todos-view";

export const dynamic = "force-dynamic";

export default async function TodosPage({
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
  const isPrivate = params.tab === "private";
  const archived = params.archive === "1";

  const me = await getMemberForUser(team.id, user.id);
  const [todos, members] = await Promise.all([
    listTodos(team.id, { isPrivate, memberId: me?.id ?? null, archived }),
    listTeamMembers(team.id),
  ]);

  const base = `/l10/todos?team=${team.id}`;

  return (
    <>
      <PageHeader
        title="To-Dos"
        description="Create, assign, and track deadlines for critical tasks."
      />

      {/* Tabs — Team | Private */}
      <div className="mb-4 flex items-center gap-6 border-b">
        <Link
          href={base}
          className={cn(
            "-mb-px border-b-2 pb-2 text-sm transition-colors",
            !isPrivate
              ? "border-[#f05100] font-semibold text-[#f05100]"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          Team
        </Link>
        <Link
          href={`${base}&tab=private`}
          className={cn(
            "-mb-px border-b-2 pb-2 text-sm transition-colors",
            isPrivate
              ? "border-[#f05100] font-semibold text-[#f05100]"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          Private
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
                    href={`/l10/todos?team=${t.id}${isPrivate ? "&tab=private" : ""}`}
                  />
                }
              >
                {t.business_short} · {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Link
          href={`${base}${isPrivate ? "&tab=private" : ""}${archived ? "" : "&archive=1"}`}
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

      <TodosView
        teamId={team.id}
        todos={todos}
        members={members}
        isPrivate={isPrivate}
        archived={archived}
      />
    </>
  );
}
