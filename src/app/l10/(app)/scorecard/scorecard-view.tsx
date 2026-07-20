"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  CirclePlus,
  Ellipsis,
  LineChart as LineChartIcon,
  Pencil,
  Plus,
  Redo2,
  Search,
  Sparkles,
  Undo2,
} from "lucide-react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  Cadence,
  MemberRow,
  MetricRow,
  PeriodWindow,
} from "@/lib/l10/scorecard";
import {
  archiveMetric,
  listArchivedMetrics,
  restoreMetric,
  saveCellValue,
  type ArchivedMetric,
} from "./actions";
import { MeasurableDialog } from "./new-measurable-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ORANGE = "#f05100";
const nf = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 });

type Cell = { value: number; rag: "on" | "off" | null; note: string | null };

// Split-grid geometry, matching Ninety's ag-grid: a fixed left section for
// the measurable columns and a separately scrolling section for the period
// cells. Widths mirror the live grid (65+50+220+50+130+115+115 = 745px).
// On phones only trend + title stay fixed; anything wider leaves no room to
// reach the period cells.
type ColsMap = Record<
  "check" | "trend" | "title" | "owner" | "goal" | "avg" | "total",
  number | null
>;

const COLS_DESKTOP: ColsMap = {
  check: 65,
  trend: 50,
  title: 220,
  owner: 50,
  goal: 130,
  avg: 115,
  total: 115,
};

const COLS_MOBILE: ColsMap = {
  check: null,
  trend: 40,
  title: 148,
  owner: null,
  goal: null,
  avg: null,
  total: null,
};

const PERIOD_W = 105; // ag-grid score column width
const ACTIONS_W = 40; // trailing row-menu column (ours; Ninety has none)
const HEADER_H = 75; // 30px year band + 45px column labels
const ROW_H = 42; // --ag-line-height

function fixedWidth(cols: ColsMap) {
  return Object.values(cols).reduce<number>((sum, w) => sum + (w ?? 0), 0);
}

const AVATAR_TINTS = [
  "bg-[#f05100]/15 text-[#f05100]",
  "bg-[#009588]/15 text-[#009588]",
  "bg-[#104e64]/15 text-[#104e64] dark:text-[#7fb6c9]",
  "bg-[#fcbb00]/20 text-[#8a6700] dark:text-[#fcbb00]",
  "bg-[#f99c00]/15 text-[#b06e00] dark:text-[#f99c00]",
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ragClass(rag: "on" | "off" | null | undefined) {
  if (rag === "on")
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (rag === "off") return "bg-red-500/15 text-red-700 dark:text-red-400";
  return "";
}

function EditableCell({
  metric,
  period,
  cadence,
  cell,
  onSaved,
}: {
  metric: MetricRow;
  period: PeriodWindow;
  cadence: Cadence;
  cell: Cell | undefined;
  onSaved: (periodStart: string, cell: Cell | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function commit(raw: string) {
    setEditing(false);
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : Number(trimmed.replace(/,/g, ""));
    if (parsed !== null && Number.isNaN(parsed)) {
      toast.error("Enter a number");
      return;
    }
    const unchanged =
      (parsed === null && cell === undefined) || parsed === cell?.value;
    if (unchanged) return;

    startTransition(async () => {
      const res = await saveCellValue({
        metricId: metric.id,
        cadence,
        periodStart: period.start,
        periodEnd: period.end,
        label: period.label,
        value: parsed,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Save failed");
        return;
      }
      onSaved(
        period.start,
        parsed === null
          ? null
          : { value: parsed, rag: res.rag, note: cell?.note ?? null },
      );
    });
  }

  function commitNote(raw: string) {
    setNoteOpen(false);
    if (!cell) return;
    const note = raw.trim() || null;
    if (note === (cell.note ?? null)) return;
    startTransition(async () => {
      const res = await saveCellValue({
        metricId: metric.id,
        cadence,
        periodStart: period.start,
        periodEnd: period.end,
        label: period.label,
        value: cell.value,
        note,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Save failed");
        return;
      }
      onSaved(period.start, { ...cell, rag: res.rag, note });
    });
  }

  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={cell?.value ?? ""}
        inputMode="decimal"
        className="bg-background h-8 w-full min-w-20 rounded border px-1 text-center text-xs outline-none"
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setEditing(true)}
        onContextMenu={(e) => {
          e.preventDefault();
          if (cell) setNoteOpen(true);
          else toast.info("Enter a value first, then right-click to comment");
        }}
        title={cell?.note ?? undefined}
        className={cn(
          "h-8 w-full min-w-20 rounded px-1 text-center text-xs tabular-nums",
          "hover:ring-1 hover:ring-[#f05100]/40",
          ragClass(cell?.rag),
          pending && "opacity-50",
        )}
      >
        {cell ? nf.format(cell.value) : "–"}
        {cell?.note ? (
          <span
            aria-hidden
            className="absolute top-0.5 right-0.5 size-0 border-t-[6px] border-l-[6px] border-t-[#f05100] border-l-transparent"
          />
        ) : null}
      </button>
      {noteOpen ? (
        <div className="bg-popover absolute top-9 left-1/2 z-50 w-56 -translate-x-1/2 rounded-md border p-2 shadow-md">
          <textarea
            autoFocus
            defaultValue={cell?.note ?? ""}
            rows={3}
            placeholder="Comment for this cell…"
            className="bg-background w-full resize-none rounded border px-2 py-1 text-xs outline-none"
            onBlur={(e) => commitNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                e.currentTarget.blur();
              if (e.key === "Escape") setNoteOpen(false);
            }}
          />
          <p className="text-muted-foreground mt-1 text-[10px]">
            Click away to save · Esc to cancel
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TrendPopover({
  metric,
  periods,
  cells,
}: {
  metric: MetricRow;
  periods: PeriodWindow[]; // chronological
  cells: Record<string, Cell>;
}) {
  const data = periods.map((p) => ({
    label: p.label,
    value: cells[p.start]?.value ?? null,
  }));
  const hasData = data.some((d) => d.value !== null);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-7 hover:text-[#f05100]"
          />
        }
      >
        <LineChartIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <p className="mb-1 text-xs font-semibold">{metric.title}</p>
        {hasData ? (
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 4, right: 4, bottom: 0, left: -22 }}
              >
                <XAxis dataKey="label" hide />
                <YAxis tick={{ fontSize: 9 }} width={52} />
                <ChartTooltip
                  formatter={(v) => nf.format(Number(v))}
                  labelStyle={{ fontSize: 10 }}
                  contentStyle={{ fontSize: 10 }}
                />
                {metric.goal_value !== null ? (
                  <ReferenceLine
                    y={metric.goal_value}
                    stroke={ORANGE}
                    strokeDasharray="4 2"
                  />
                ) : null}
                <Line
                  dataKey="value"
                  stroke={ORANGE}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-xs">
            No data to display
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function GroupTable({
  rows,
  periods,
  cadence,
  checked,
  setChecked,
  overrides,
  setOverride,
  onEdit,
}: {
  rows: MetricRow[];
  periods: PeriodWindow[];
  cadence: Cadence;
  checked: Record<string, boolean>;
  setChecked: (updates: Record<string, boolean>) => void;
  overrides: Record<string, Record<string, Cell | null>>;
  setOverride: (metricId: string, start: string, cell: Cell | null) => void;
  onEdit: (metric: MetricRow) => void;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fakeRef = useRef<HTMLDivElement>(null);
  const vScrollRef = useRef<HTMLDivElement>(null);
  const [sbW, setSbW] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const currentStart = periods[periods.length - 1]?.start;
  const isMobile = useIsMobile();
  const cols = isMobile ? COLS_MOBILE : COLS_DESKTOP;
  const fixedW = fixedWidth(cols);
  const rightW = periods.length * PERIOD_W + ACTIONS_W;

  // one horizontal position shared by the header viewport, the body viewport
  // and the bottom scrollbar strip (ag-grid's fake horizontal scroll)
  function syncScroll(left: number) {
    for (const el of [headerRef.current, bodyRef.current, fakeRef.current]) {
      if (el && el.scrollLeft !== left) el.scrollLeft = left;
    }
  }

  // land on the newest periods (right end) — Ninety behaviour
  useEffect(() => {
    syncScroll(rightW);
    // the vertical scrollbar steals width from the body pane only; pad the
    // header and scroll strip so the period columns stay aligned
    const v = vScrollRef.current;
    setSbW(v ? v.offsetWidth - v.clientWidth : 0);
  }, [periods, rightW, rows.length]);

  const yearSpans = useMemo(() => {
    const spans: { year: number; span: number }[] = [];
    for (const p of periods) {
      const last = spans[spans.length - 1];
      if (last && last.year === p.year) last.span++;
      else spans.push({ year: p.year, span: 1 });
    }
    return spans;
  }, [periods]);

  const cellsFor = (m: MetricRow): Record<string, Cell> => {
    const merged: Record<string, Cell> = { ...m.values };
    for (const [start, cell] of Object.entries(overrides[m.id] ?? {})) {
      if (cell === null) delete merged[start];
      else merged[start] = cell;
    }
    return merged;
  };

  const ownerTint = (name: string) =>
    AVATAR_TINTS[
      Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) %
        AVATAR_TINTS.length
    ];

  return (
    <div className="border-t">
      {/* header — fixed measurable columns, then the period viewport */}
      <div
        className="text-muted-foreground flex border-b text-xs font-medium"
        style={{ paddingRight: sbW }}
      >
        <div
          className="flex shrink-0"
          style={{ width: fixedW, height: HEADER_H }}
        >
          {cols.check ? (
            <div
              className="flex items-center justify-center"
              style={{ width: cols.check }}
            >
              <Checkbox
                checked={rows.length > 0 && rows.every((r) => checked[r.id])}
                onCheckedChange={(v) =>
                  setChecked(
                    Object.fromEntries(rows.map((r) => [r.id, v === true])),
                  )
                }
              />
            </div>
          ) : null}
          {cols.trend ? (
            <div
              className="flex items-center justify-center text-center"
              style={{ width: cols.trend }}
            >
              {isMobile ? (
                <LineChartIcon className="size-3.5" />
              ) : (
                <>
                  View
                  <br />
                  Trend
                </>
              )}
            </div>
          ) : null}
          <div className="flex items-center px-2" style={{ width: cols.title! }}>
            Title
          </div>
          {cols.owner ? (
            <div
              className="flex items-center justify-center"
              style={{ width: cols.owner }}
            >
              Owner
            </div>
          ) : null}
          {cols.goal ? (
            <div
              className="flex items-center px-2"
              style={{ width: cols.goal }}
            >
              Goal
            </div>
          ) : null}
          {cols.avg ? (
            <div
              className="flex items-center justify-end px-2"
              style={{ width: cols.avg }}
            >
              Average
            </div>
          ) : null}
          {cols.total ? (
            <div
              className="flex items-center justify-end px-2"
              style={{ width: cols.total }}
            >
              Total
            </div>
          ) : null}
        </div>
        <div ref={headerRef} className="min-w-0 flex-1 overflow-hidden">
          <div style={{ width: rightW }}>
            <div className="flex h-[30px] items-end pb-1">
              {yearSpans.map((y) => (
                <div
                  key={y.year}
                  className="shrink-0 px-2"
                  style={{ width: y.span * PERIOD_W }}
                >
                  {y.year}
                </div>
              ))}
            </div>
            <div className="flex h-[45px]">
              {periods.map((p) => {
                const [a, b] = p.label.split(" - ");
                return (
                  <div
                    key={p.start}
                    className={cn(
                      "flex shrink-0 items-center justify-center text-center whitespace-nowrap",
                      p.start === currentStart &&
                        "border-l-2 border-l-[#f05100]/70",
                    )}
                    style={{ width: PERIOD_W }}
                  >
                    {b ? (
                      <span>
                        {a} -<br />
                        {b}
                      </span>
                    ) : (
                      a
                    )}
                  </div>
                );
              })}
              <div className="shrink-0" style={{ width: ACTIONS_W }} />
            </div>
          </div>
        </div>
      </div>

      {/* body — vertical scroll wraps both panes; horizontal scroll lives
          only in the period pane (its native scrollbar is hidden and driven
          by the strip below, like ag-grid's fake horizontal scroll) */}
      {rows.length === 0 ? (
        <div className="text-muted-foreground flex h-24 items-center justify-center text-xs">
          No data to show
        </div>
      ) : (
        <div ref={vScrollRef} className="max-h-[520px] overflow-y-auto">
          <div className="flex items-start">
            <div className="shrink-0" style={{ width: fixedW }}>
              {rows.map((m) => {
                const cells = cellsFor(m);
                const vals = Object.values(cells).map((c) => c.value);
                const avg = vals.length
                  ? vals.reduce((a, b) => a + b, 0) / vals.length
                  : null;
                const total = vals.length
                  ? vals.reduce((a, b) => a + b, 0)
                  : null;
                return (
                  <div
                    key={m.id}
                    onMouseEnter={() => setHovered(m.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      "flex items-center border-b transition-colors",
                      hovered === m.id && "bg-muted/60",
                    )}
                    style={{ height: ROW_H }}
                  >
                    {cols.check ? (
                      <div
                        className="flex justify-center"
                        style={{ width: cols.check }}
                      >
                        <Checkbox
                          checked={checked[m.id] ?? false}
                          onCheckedChange={(v) =>
                            setChecked({ [m.id]: v === true })
                          }
                        />
                      </div>
                    ) : null}
                    {cols.trend ? (
                      <div
                        className="flex justify-center"
                        style={{ width: cols.trend }}
                      >
                        <TrendPopover
                          metric={m}
                          periods={periods}
                          cells={cells}
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 px-2" style={{ width: cols.title! }}>
                      <div className="flex items-center gap-1.5">
                        {/* Owner column is hidden on phones — surface the
                            avatar inline so ownership stays visible. */}
                        {isMobile ? (
                          m.owner_name ? (
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                                ownerTint(m.owner_name),
                              )}
                            >
                              {initials(m.owner_name)}
                            </span>
                          ) : (
                            <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[9px]">
                              —
                            </span>
                          )
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onEdit(m)}
                          className={cn(
                            "min-w-0 flex-1 text-left text-xs font-medium hover:text-[#f05100] hover:underline",
                            isMobile
                              ? "line-clamp-2 leading-snug break-words"
                              : "truncate",
                          )}
                          title="Edit measurable"
                        >
                          {m.title}
                          {m.unit ? (
                            <span className="text-muted-foreground ml-1 font-normal">
                              ({m.unit})
                            </span>
                          ) : null}
                        </button>
                      </div>
                    </div>
                    {cols.owner ? (
                      <div
                        className="flex justify-center"
                        style={{ width: cols.owner }}
                      >
                        {m.owner_name ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span
                                  className={cn(
                                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                    ownerTint(m.owner_name),
                                  )}
                                />
                              }
                            >
                              {initials(m.owner_name)}
                            </TooltipTrigger>
                            <TooltipContent>{m.owner_name}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[10px]">
                            —
                          </span>
                        )}
                      </div>
                    ) : null}
                    {cols.goal ? (
                      <div
                        className="truncate px-2 text-xs whitespace-nowrap"
                        style={{ width: cols.goal }}
                      >
                        {m.goal_text ?? "—"}
                      </div>
                    ) : null}
                    {cols.avg ? (
                      <div
                        className="px-2 text-right text-xs tabular-nums"
                        style={{ width: cols.avg }}
                      >
                        {avg === null ? "—" : nf.format(avg)}
                      </div>
                    ) : null}
                    {cols.total ? (
                      <div
                        className="px-2 text-right text-xs tabular-nums"
                        style={{ width: cols.total }}
                      >
                        {total === null ? "—" : nf.format(total)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div
              ref={bodyRef}
              onScroll={(e) => syncScroll(e.currentTarget.scrollLeft)}
              className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div style={{ width: rightW }}>
                {rows.map((m) => {
                  const cells = cellsFor(m);
                  return (
                    <div
                      key={m.id}
                      onMouseEnter={() => setHovered(m.id)}
                      onMouseLeave={() => setHovered(null)}
                      className={cn(
                        "flex items-center border-b transition-colors",
                        hovered === m.id && "bg-muted/60",
                      )}
                      style={{ height: ROW_H }}
                    >
                      {periods.map((p) => (
                        <div
                          key={p.start}
                          className={cn(
                            "shrink-0 p-1",
                            p.start === currentStart &&
                              "border-l-2 border-l-[#f05100]/70",
                          )}
                          style={{ width: PERIOD_W }}
                        >
                          <EditableCell
                            metric={m}
                            period={p}
                            cadence={cadence}
                            cell={cells[p.start]}
                            onSaved={(start, cell) =>
                              setOverride(m.id, start, cell)
                            }
                          />
                        </div>
                      ))}
                      <div
                        className="flex shrink-0 justify-center"
                        style={{ width: ACTIONS_W }}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon" }),
                              "size-7 sm:opacity-0",
                              hovered === m.id && "sm:opacity-100",
                            )}
                          >
                            <Ellipsis className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(m)}>
                              <Pencil className="size-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={async () => {
                                const res = await archiveMetric(m.id);
                                if (res.ok)
                                  toast.success("Measurable archived");
                                else toast.error(res.error);
                              }}
                            >
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* bottom horizontal scrollbar — left spacer under the fixed columns,
          track only under the period section (ag-body-horizontal-scroll) */}
      <div className="flex" style={{ paddingRight: sbW }}>
        <div className="shrink-0" style={{ width: fixedW }} />
        <div
          ref={fakeRef}
          onScroll={(e) => syncScroll(e.currentTarget.scrollLeft)}
          className="h-[15px] min-w-0 flex-1 overflow-x-scroll overflow-y-hidden"
        >
          <div style={{ width: rightW, height: 1 }} />
        </div>
      </div>
    </div>
  );
}

export function ScorecardView({
  teamId,
  cadence,
  periods,
  metrics,
  members,
}: {
  teamId: string;
  cadence: Cadence;
  periods: PeriodWindow[]; // chronological, oldest → newest
  metrics: MetricRow[];
  members: MemberRow[];
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [checked, setCheckedState] = useState<Record<string, boolean>>({});
  const [extraGroups, setExtraGroups] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<
    Record<string, Record<string, Cell | null>>
  >({});
  const [dialogGroup, setDialogGroup] = useState<string | null>(null);
  const [dialogMetric, setDialogMetric] = useState<MetricRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addExistingOpen, setAddExistingOpen] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? metrics.filter((m) => m.title.toLowerCase().includes(q))
      : metrics;
    const map = new Map<string, MetricRow[]>();
    for (const m of filtered) {
      const g =
        m.group_name ??
        (cadence === "weekly"
          ? "Weekly KPIs"
          : `${cadence[0].toUpperCase()}${cadence.slice(1)} KPIs`);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(m);
    }
    for (const g of extraGroups) if (!map.has(g)) map.set(g, []);
    return [...map.entries()];
  }, [metrics, query, extraGroups, cadence]);

  function newGroup() {
    const name = window.prompt("Group name");
    if (name?.trim()) setExtraGroups((g) => [...g, name.trim()]);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden items-center rounded-lg border sm:flex">
          <Button variant="ghost" size="icon" className="size-8" disabled>
            <Undo2 className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" disabled>
            <Redo2 className="size-3.5" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-[#f05100] hover:text-[#f05100]"
          onClick={newGroup}
        >
          <Plus className="size-3.5" /> New group
        </Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="hidden text-[#f05100] opacity-60 sm:inline-flex"
              />
            }
          >
            Go to Measurable Manager
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
        <Button
          variant="outline"
          size="icon"
          className="hidden size-8 sm:inline-flex"
          disabled
        >
          <Ellipsis className="size-3.5" />
        </Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="hidden gap-1 text-[#f05100] opacity-60 sm:inline-flex"
              />
            }
          >
            <Sparkles className="size-3.5" /> Optimize Scorecard
          </TooltipTrigger>
          <TooltipContent>AI optimize — coming soon</TooltipContent>
        </Tooltip>
        <div className="relative min-w-0 flex-1 sm:ml-1 sm:min-w-56 sm:flex-none">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Measurables..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Group cards */}
      {groups.map(([groupName, rows]) => {
        const isCollapsed = collapsed[groupName] ?? false;
        return (
          <div key={groupName} className="bg-card rounded-xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="flex items-baseline gap-2">
                <p className="text-card-foreground text-base font-semibold">
                  {groupName}
                </p>
                <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-medium">
                  {rows.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Ninety's kpi-action-menu: Create new / Add existing */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "gap-1 border-[#f05100]/40 text-[#f05100] hover:bg-[#f05100]/5 hover:text-[#f05100]",
                    )}
                  >
                    New Measurable <ChevronDown className="size-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setDialogGroup(groupName);
                        setDialogMetric(null);
                        setDialogOpen(true);
                      }}
                    >
                      <CirclePlus className="size-5" strokeWidth={1.75} />
                      Create new Measurable
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAddExistingOpen(true)}>
                      <CirclePlus className="size-5" strokeWidth={1.75} />
                      Add existing Measurable
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" className="size-7" disabled>
                  <Ellipsis className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [groupName]: !isCollapsed }))
                  }
                >
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      !isCollapsed && "rotate-180",
                    )}
                  />
                </Button>
              </div>
            </div>

            {!isCollapsed ? (
              <GroupTable
                rows={rows}
                periods={periods}
                cadence={cadence}
                checked={checked}
                setChecked={(updates) =>
                  setCheckedState((c) => ({ ...c, ...updates }))
                }
                overrides={overrides}
                setOverride={(metricId, start, cell) =>
                  setOverrides((o) => ({
                    ...o,
                    [metricId]: { ...o[metricId], [start]: cell },
                  }))
                }
                onEdit={(m) => {
                  setDialogMetric(m);
                  setDialogGroup(m.group_name);
                  setDialogOpen(true);
                }}
              />
            ) : null}
          </div>
        );
      })}

      {groups.length === 0 ? (
        <div className="bg-card text-muted-foreground rounded-xl border py-16 text-center text-sm">
          No measurables{query ? ` matching “${query}”` : " yet"} — use New
          Measurable to add one.
        </div>
      ) : null}

      <MeasurableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teamId={teamId}
        cadence={cadence}
        members={members}
        defaultGroup={dialogGroup}
        metric={dialogMetric}
      />
      <AddExistingDialog
        open={addExistingOpen}
        onOpenChange={setAddExistingOpen}
        teamId={teamId}
        cadence={cadence}
      />
    </div>
  );
}

/** "Add existing Measurable" — restore an archived measurable to the
 *  scorecard (the pool Ninety draws from when re-adding). */
function AddExistingDialog({
  open,
  onOpenChange,
  teamId,
  cadence,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  cadence: Cadence;
}) {
  const [items, setItems] = useState<ArchivedMetric[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setItems(null);
    listArchivedMetrics(teamId, cadence)
      .then(setItems)
      .catch(() => setItems([]));
  }, [open, teamId, cadence]);

  function add(m: ArchivedMetric) {
    startTransition(async () => {
      const res = await restoreMetric(m.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`“${m.title}” added to the scorecard`);
      setItems((list) => list?.filter((i) => i.id !== m.id) ?? null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add existing Measurable</DialogTitle>
          <DialogDescription>
            Restore an archived measurable to this scorecard.
          </DialogDescription>
        </DialogHeader>
        {items === null ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No archived measurables for this scorecard.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {items.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {m.title}
                    {m.unit ? (
                      <span className="text-muted-foreground ml-1 font-normal">
                        ({m.unit})
                      </span>
                    ) : null}
                  </p>
                  {m.group_name ? (
                    <p className="text-muted-foreground text-xs">
                      {m.group_name}
                    </p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  className="gap-1 border-[#f05100]/40 text-[#f05100] hover:bg-[#f05100]/5 hover:text-[#f05100]"
                  onClick={() => add(m)}
                >
                  <CirclePlus className="size-4" strokeWidth={1.75} /> Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
