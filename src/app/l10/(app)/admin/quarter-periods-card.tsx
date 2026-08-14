"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CirclePlus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QuarterPeriod } from "@/lib/l10/rock-trends";
import { deleteQuarterPeriod, saveQuarterPeriod } from "./actions";

// Editable quarter windows (l10.quarter_periods). Quarter-locked rocks are
// judged strictly against these; edits recompute the Rocks Trends metrics on
// next load.

type Draft = { start: string; end: string };

function overlaps(
  rows: { quarter: string; start: string; end: string }[],
): string[] {
  const sorted = [...rows]
    .filter((r) => !r.quarter.startsWith("FY")) // FY windows span quarters by design
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  const out: string[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start <= sorted[i - 1].end)
      out.push(`${sorted[i - 1].quarter} and ${sorted[i].quarter} overlap`);
  }
  return out;
}

export function QuarterPeriodsCard({ periods }: { periods: QuarterPeriod[] }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ quarter: "", start: "", end: "" });
  const [pending, startTransition] = useTransition();

  const rows = periods.map((p) => ({
    quarter: p.quarter,
    start: drafts[p.quarter]?.start ?? p.start_date,
    end: drafts[p.quarter]?.end ?? p.end_date,
    dirty:
      drafts[p.quarter] !== undefined &&
      (drafts[p.quarter].start !== p.start_date ||
        drafts[p.quarter].end !== p.end_date),
  }));

  const warnings = useMemo(() => overlaps(rows), [rows]);

  function setDraft(quarter: string, patch: Partial<Draft>) {
    setDrafts((d) => {
      const row = periods.find((p) => p.quarter === quarter);
      if (!row) return d;
      const cur = d[quarter] ?? { start: row.start_date, end: row.end_date };
      return { ...d, [quarter]: { ...cur, ...patch } };
    });
  }

  function save(quarter: string, start: string, end: string) {
    startTransition(async () => {
      const res = await saveQuarterPeriod({
        quarter,
        startDate: start,
        endDate: end,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${quarter} window saved`);
      setDrafts((d) => {
        const rest = { ...d };
        delete rest[quarter];
        return rest;
      });
      if (adding) {
        setAdding(false);
        setNewRow({ quarter: "", start: "", end: "" });
      }
    });
  }

  function remove(quarter: string) {
    startTransition(async () => {
      const res = await deleteQuarterPeriod(quarter);
      if (!res.ok) toast.error(res.error);
      else toast.success(`${quarter} removed`);
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-card-foreground text-sm font-medium">
            Quarter Periods
          </p>
          <p className="text-muted-foreground text-xs">
            Windows that quarter-locked rocks and time-to-complete metrics are
            judged against. Milestone (elastic) rocks keep their own dates.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 border-[#f05100]/40 text-[#f05100] hover:bg-[#f05100]/5"
          onClick={() => setAdding(true)}
        >
          <CirclePlus className="size-3.5" /> Add quarter
        </Button>
      </div>

      {warnings.length > 0 ? (
        <p className="mb-2 rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-400">
          {warnings.join(" · ")}
        </p>
      ) : null}

      <div className="divide-y rounded-lg border">
        <div className="text-muted-foreground grid grid-cols-[100px_1fr_1fr_140px] items-center gap-2 px-3 py-2 text-[11px] font-medium">
          <span>Quarter</span>
          <span>Start</span>
          <span>End</span>
          <span />
        </div>
        {rows.map((r) => (
          <div
            key={r.quarter}
            className="grid grid-cols-[100px_1fr_1fr_140px] items-center gap-2 px-3 py-2"
          >
            <span className="text-xs font-medium">{r.quarter}</span>
            <Input
              type="date"
              value={r.start}
              onChange={(e) => setDraft(r.quarter, { start: e.target.value })}
              className="h-8 text-xs"
            />
            <Input
              type="date"
              value={r.end}
              onChange={(e) => setDraft(r.quarter, { end: e.target.value })}
              className="h-8 text-xs"
            />
            <span className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={!r.dirty || pending || r.start >= r.end}
                className={cn(
                  "h-8 text-xs",
                  r.dirty && "border-[#f05100]/40 text-[#f05100]",
                )}
                onClick={() => save(r.quarter, r.start, r.end)}
              >
                Save
              </Button>
              <Button
                size="icon"
                variant="ghost"
                disabled={pending}
                className="text-muted-foreground size-8 hover:text-red-600"
                onClick={() => remove(r.quarter)}
                title={`Remove ${r.quarter}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </span>
          </div>
        ))}
        {adding ? (
          <div className="grid grid-cols-[100px_1fr_1fr_140px] items-center gap-2 px-3 py-2">
            <Input
              placeholder="Q4-2026"
              value={newRow.quarter}
              onChange={(e) =>
                setNewRow((n) => ({ ...n, quarter: e.target.value }))
              }
              className="h-8 text-xs"
            />
            <Input
              type="date"
              value={newRow.start}
              onChange={(e) =>
                setNewRow((n) => ({ ...n, start: e.target.value }))
              }
              className="h-8 text-xs"
            />
            <Input
              type="date"
              value={newRow.end}
              onChange={(e) => setNewRow((n) => ({ ...n, end: e.target.value }))}
              className="h-8 text-xs"
            />
            <span className="flex items-center justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={
                  pending ||
                  !newRow.quarter.trim() ||
                  !newRow.start ||
                  !newRow.end ||
                  newRow.start >= newRow.end
                }
                className="h-8 border-[#f05100]/40 text-xs text-[#f05100]"
                onClick={() => save(newRow.quarter, newRow.start, newRow.end)}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setAdding(false);
                  setNewRow({ quarter: "", start: "", end: "" });
                }}
              >
                Cancel
              </Button>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
