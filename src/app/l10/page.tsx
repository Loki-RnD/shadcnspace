import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { PageHeader } from "@/components/l10/page-header";
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
    <>
      <PageHeader
        title="Dashboard"
        description="Weekly health across the Level 10 disciplines."
        actions={<Badge variant="outline">Week of 13 Jul 2026</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {kpi.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">
              {kpi.hint}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {l10NavItems
          .filter((item) => item.href !== "/l10")
          .map((item) => (
            <Link key={item.href} href={item.href} className="group">
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
                </CardHeader>
              </Card>
            </Link>
          ))}
      </div>
    </>
  );
}
