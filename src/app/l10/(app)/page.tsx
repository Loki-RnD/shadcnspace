import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { MemberStack } from "@/components/l10/member-avatar";
import { l10Members } from "@/components/l10/members";
import { l10NavItems } from "@/components/l10/nav-items";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSessionUser } from "@/lib/l10/auth/session";
import { getDashboardStats } from "@/lib/l10/dashboard";
import { listTeamsForCompanies, trailingPeriods } from "@/lib/l10/scorecard";

export const dynamic = "force-dynamic";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** '2026-07-20' → '20 Jul 2026' */
function weekLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export default async function L10DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
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
  const stats = await getDashboardStats(team.id);
  const [thisWeek] = trailingPeriods("weekly", 1);

  const scorecardPct = stats.scorecard
    ? Math.round((stats.scorecard.onGoal / stats.scorecard.rated) * 100)
    : null;

  const kpis = [
    {
      label: "Scorecard on track",
      value: scorecardPct === null ? "—" : `${scorecardPct}%`,
      hint: stats.scorecard
        ? `${stats.scorecard.onGoal} of ${stats.scorecard.rated} measurables at goal`
        : "no weekly data yet",
      href: "/l10/scorecard",
    },
    {
      label: "Rocks on track",
      value:
        stats.rocks.total === 0
          ? "—"
          : `${stats.rocks.onTrack}/${stats.rocks.total}`,
      hint:
        stats.rocks.total === 0
          ? "no rocks this quarter"
          : "quarterly priorities",
      href: "/l10/rocks",
    },
    {
      label: "Open To-Dos",
      value: `${stats.todos.open}`,
      hint: `${stats.todos.dueSoon} due within 7 days`,
      href: "/l10/todos",
    },
    {
      label: "Open Issues",
      value: `${stats.issues.open}`,
      hint: "awaiting IDS",
      href: "/l10/issues",
    },
  ];

  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-12">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-card-foreground text-lg font-medium">
              L10 Dashboard
            </p>
            <p className="text-muted-foreground text-xs font-normal">
              Weekly health across the Level 10 disciplines
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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
                    render={<Link href={`/l10?team=${t.id}`} />}
                  >
                    {t.business_short} · {t.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-2">
              <MemberStack members={l10Members} max={5} />
              <span className="text-muted-foreground text-xs">
                {l10Members.length} members
              </span>
            </div>
            <Badge variant="outline">
              Week of {weekLabel(thisWeek.start)}
            </Badge>
            <Image
              src="/images/l10/we-run-on-eos-badge.png"
              alt="We Run on EOS"
              width={96}
              height={64}
              className="h-12 w-auto"
            />
          </div>
        </CardContent>
      </Card>

      {kpis.map((kpi) => (
        <Link
          key={kpi.label}
          href={`${kpi.href}?team=${team.id}`}
          className="group col-span-12 sm:col-span-6 xl:col-span-3"
        >
          <Card className="h-full transition-shadow group-hover:shadow-md">
            <CardContent className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs font-normal">
                  {kpi.label}
                </p>
                <p className="text-card-foreground text-2xl font-semibold tabular-nums">
                  {kpi.value}
                </p>
                <p className="text-muted-foreground text-xs">{kpi.hint}</p>
              </div>
              <ArrowUpRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </CardContent>
          </Card>
        </Link>
      ))}

      {l10NavItems
        .filter(
          (item) =>
            item.href !== "/l10" &&
            (!item.adminOnly || user.systemRole === "super_admin"),
        )
        .map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group col-span-12 sm:col-span-6 xl:col-span-4"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="bg-muted flex size-9 items-center justify-center rounded-lg">
                    <item.icon className="size-4" />
                  </span>
                  <ArrowUpRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <CardTitle className="mt-2 text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
                <MemberStack
                  members={l10Members}
                  max={4}
                  size="sm"
                  className="mt-2"
                />
              </CardHeader>
            </Card>
          </Link>
        ))}
    </div>
  );
}