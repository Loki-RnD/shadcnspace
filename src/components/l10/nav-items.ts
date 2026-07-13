import {
  LayoutDashboard,
  Table2,
  Mountain,
  ListChecks,
  TriangleAlert,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export interface L10NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const l10NavItems: L10NavItem[] = [
  {
    title: "Dashboard",
    href: "/l10",
    icon: LayoutDashboard,
    description: "Weekly health at a glance",
  },
  {
    title: "Scorecard",
    href: "/l10/scorecard",
    icon: Table2,
    description: "Measurables by week",
  },
  {
    title: "Rocks",
    href: "/l10/rocks",
    icon: Mountain,
    description: "Quarterly priorities",
  },
  {
    title: "To-Dos",
    href: "/l10/todos",
    icon: ListChecks,
    description: "7-day commitments",
  },
  {
    title: "Issues",
    href: "/l10/issues",
    icon: TriangleAlert,
    description: "IDS list",
  },
  {
    title: "Meeting",
    href: "/l10/meeting",
    icon: Presentation,
    description: "Run the Level 10",
  },
];
