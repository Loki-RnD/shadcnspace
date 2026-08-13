"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

// Generic multi-select filter pill (Owner / Months / Quarters). URL-driven:
// edits only its own query param so every other filter — including the other
// cadences' namespaced params — survives. Checkbox items keep the menu open
// so several options can be picked in one go.

export function FilterPill({
  param,
  label,
  allLabel = "All",
  options,
  selected,
}: {
  /** query param this pill owns, e.g. 'w_months' */
  param: string;
  label: string;
  allLabel?: string;
  options: { key: string; label: string }[];
  selected: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const push = (keys: string[]) => {
    const q = new URLSearchParams(searchParams.toString());
    if (keys.length) q.set(param, keys.join(","));
    else q.delete(param);
    router.push(`${pathname}?${q.toString()}`);
  };

  const toggle = (key: string, checked: boolean) => {
    const next = checked
      ? [...selected, key]
      : selected.filter((k) => k !== key);
    // keep param order stable, matching the menu
    push(options.map((o) => o.key).filter((k) => next.includes(k)));
  };

  const picked = options.filter((o) => selected.includes(o.key));
  const summary =
    picked.length === 0
      ? allLabel
      : picked.length <= 2
        ? picked.map((o) => o.label).join(", ")
        : `${picked.length} selected`;

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
          {label}:
        </span>
        <span className="font-medium">{summary}</span>
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-48 overflow-y-auto">
        <DropdownMenuItem
          onClick={() => push([])}
          className={cn(picked.length === 0 && "bg-muted/60 font-medium")}
        >
          {allLabel}
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
