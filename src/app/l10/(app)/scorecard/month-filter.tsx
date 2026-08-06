"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Multi-select month filter for the weekly scorecard. URL-driven like the
// other pills; checkbox items keep the menu open so several months can be
// picked in one go.

interface MonthOption {
  key: string; // 'yyyy-mm'
  label: string; // 'Jul 2026'
}

export function MonthFilter({
  teamId,
  range,
  options,
  selected,
}: {
  teamId: string;
  range: number;
  options: MonthOption[];
  selected: string[];
}) {
  const router = useRouter();

  const url = (months: string[]) =>
    `/l10/scorecard?team=${teamId}&cadence=weekly&range=${range}` +
    (months.length ? `&months=${months.join(",")}` : "");

  const toggle = (key: string, checked: boolean) => {
    const next = checked
      ? [...selected, key]
      : selected.filter((k) => k !== key);
    // keep param order stable (newest first, matching the menu)
    router.push(
      url(options.map((o) => o.key).filter((k) => next.includes(k))),
    );
  };

  const picked = options.filter((o) => selected.includes(o.key));
  const label =
    picked.length === 0
      ? "All"
      : picked.length <= 2
        ? picked.map((o) => o.label).join(", ")
        : `${picked.length} months`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs",
          picked.length > 0
            ? "border-[#f05100]/50 bg-[#f05100]/10 font-medium text-[#f05100]"
            : "hover:bg-muted/50",
        )}
      >
        <span className={picked.length > 0 ? "" : "text-muted-foreground"}>
          Months:
        </span>
        <span className="font-medium">{label}</span>
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem
          onClick={() => router.push(url([]))}
          className={cn(picked.length === 0 && "bg-muted/60 font-medium")}
        >
          All (use date range)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.key}
            checked={selected.includes(o.key)}
            onCheckedChange={(checked) => toggle(o.key, checked === true)}
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
