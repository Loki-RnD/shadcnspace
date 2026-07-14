import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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

// Placeholder KPIs — wired to l10.* Supabase views in the data-mapping phase.
const kpis = [
  { label: "Scorecard on track", value: "—", hint: "of measurables at goal" },
  { label: "Rocks on track", value: "—", hint: "quarterly priorities" },
  { label: "Open To-Dos", value: "—", hint: "due within 7 days" },
  { label: "Open Issues", value: "—", hint: "awaiting IDS" },
];

export default function L10DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-4">
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MemberStack members={l10Members} max={5} />
              <span className="text-muted-foreground text-xs">
                {l10Members.length} members
              </span>
            </div>
            <Badge variant="outline">Week of 13 Jul 2026</Badge>
          </div>
        </CardContent>
      </Card>

      {kpis.map((kpi) => (
        <Card key={kpi.label} className="col-span-12 sm:col-span-6 xl:col-span-3">
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
          </CardContent>
        </Card>
      ))}

      {l10NavItems
        .filter((item) => item.href !== "/l10")
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
