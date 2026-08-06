"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

// Date Range pill: trailing presets plus a from/to range calendar. Custom
// ranges land in the URL as ?from=yyyy-mm-dd&to=yyyy-mm-dd and override the
// preset; picking either clears the month filter (last-clicked wins).

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
  teamId,
  cadence,
  presets,
  activeCount,
  custom,
  dimmed,
}: {
  teamId: string;
  cadence: string;
  presets: { count: number; label: string }[];
  activeCount: number;
  /** active custom range from the URL, if any */
  custom: { from: string; to: string } | null;
  /** true when the month filter overrides this pill */
  dimmed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(
    custom
      ? { from: parseISO(custom.from), to: parseISO(custom.to) }
      : undefined,
  );

  const base = `/l10/scorecard?team=${teamId}&cadence=${cadence}`;
  const label = custom
    ? `${fmt(custom.from)} – ${fmt(custom.to)}`
    : (presets.find((p) => p.count === activeCount)?.label ?? "");

  const apply = () => {
    if (!draft?.from || !draft.to) return;
    setOpen(false);
    router.push(`${base}&from=${isoLocal(draft.from)}&to=${isoLocal(draft.to)}`);
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
                key={p.count}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`${base}&range=${p.count}`);
                }}
                className={cn(
                  "hover:bg-muted rounded-md px-2 py-1.5 text-left text-xs whitespace-nowrap",
                  !custom &&
                    !dimmed &&
                    p.count === activeCount &&
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
                    router.push(`${base}&range=${activeCount}`);
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
