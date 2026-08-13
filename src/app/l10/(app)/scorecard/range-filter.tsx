"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Date Range pill: calendar presets (This Month / This Quarter / YTD / ...),
// trailing-N presets, plus a from/to range calendar. Params are namespaced
// per cadence (w_range, m_from, ...) so each view keeps its own filters; the
// pill edits only its own params and clears the month/quarter picks for its
// cadence (last-clicked wins), leaving everything else in the URL intact.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** local calendar date → 'yyyy-mm-dd' (no toISOString — avoids tz shift) */
function isoLocal(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** '2026-07-05' → '5 Jul 2026' */
function fmt(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function RangeFilter({
  rangeParam,
  fromParam,
  toParam,
  clearParams,
  presets,
  activeKey,
  custom,
  dimmed,
}: {
  /** namespaced query params this pill owns, e.g. 'w_range' / 'w_from' / 'w_to' */
  rangeParam: string;
  fromParam: string;
  toParam: string;
  /** params cleared when a preset/custom range is picked (month/quarter picks) */
  clearParams: string[];
  presets: { key: string; label: string }[];
  activeKey: string;
  /** active custom range from the URL, if any */
  custom: { from: string; to: string } | null;
  /** true when a month/quarter pick overrides this pill */
  dimmed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(
    custom
      ? { from: parseISO(custom.from), to: parseISO(custom.to) }
      : undefined,
  );

  const push = (set: Record<string, string | null>) => {
    const q = new URLSearchParams(searchParams.toString());
    for (const key of clearParams) q.delete(key);
    for (const [key, value] of Object.entries(set)) {
      if (value === null) q.delete(key);
      else q.set(key, value);
    }
    router.push(`${pathname}?${q.toString()}`);
  };

  const label = custom
    ? `${fmt(custom.from)} – ${fmt(custom.to)}`
    : (presets.find((p) => p.key === activeKey)?.label ?? "");

  const apply = () => {
    if (!draft?.from || !draft.to) return;
    setOpen(false);
    push({
      [rangeParam]: null,
      [fromParam]: isoLocal(draft.from),
      [toParam]: isoLocal(draft.to),
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs",
          custom && !dimmed
            ? "border-[#f05100]/50 bg-[#f05100]/10 font-medium text-[#f05100]"
            : "hover:bg-muted/50",
        )}
      >
        <span className={custom && !dimmed ? "" : "text-muted-foreground"}>
          Date Range:
        </span>
        <span
          className={cn(
            "font-medium",
            dimmed && "text-muted-foreground line-through",
          )}
        >
          {label}
        </span>
        <ChevronDown className="size-3" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex shrink-0 flex-col gap-1 border-b p-2 sm:border-r sm:border-b-0">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  push({
                    [rangeParam]: p.key,
                    [fromParam]: null,
                    [toParam]: null,
                  });
                }}
                className={cn(
                  "hover:bg-muted rounded-md px-2 py-1.5 text-left text-xs whitespace-nowrap",
                  !custom &&
                    !dimmed &&
                    p.key === activeKey &&
                    "bg-muted font-medium",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={draft}
              onSelect={setDraft}
              defaultMonth={draft?.from}
            />
            <div className="flex items-center justify-end gap-2 border-t p-2">
              {custom ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraft(undefined);
                    setOpen(false);
                    push({ [fromParam]: null, [toParam]: null });
                  }}
                >
                  Clear
                </Button>
              ) : null}
              <Button
                size="sm"
                disabled={!draft?.from || !draft.to}
                onClick={apply}
                className="bg-[#f05100] text-white hover:bg-[#f05100]/90"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
