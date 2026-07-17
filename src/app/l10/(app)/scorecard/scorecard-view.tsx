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
import { archiveMetric, saveCellValue } from "./actions";
import { MeasurableDialog } from "./new-measurable-dialog";

const ORANGE = "#f05100";
const nf = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 });

type Cell = { value: number; rag: "on" | "off" | null };

// Frozen (sticky) column geometry — px widths and cumulative left offsets.
// On phones only trend + title stay frozen; anything wider than ~200px of
// sticky columns leaves no room to reach the period cells.
type ColGeom = { w: number; left: number };
type ColsMap = Record<
  "check" | "trend" | "title" | "goal" | "avg" | "total",
  ColGeom | null
>;

const COLS_DESKTOP: ColsMap = {
  check: { w: 36, left: 0 },
  trend: { w: 48, left: 36 },
  title: { w: 288, left: 84 },
  goal: { w: 96, left: 372 },
  avg: { w: 80, left: 468 },
  total: { w: 80, left: 548 },
};

const COLS_MOBILE: ColsMap = {
  check: null,
  trend: { w: 40, left: 0 },
  title: { w: 148, left: 40 },
  goal: null,
  avg: null,
  total: null,
};

function fixedWidth(cols: ColsMap) {
  return Object.values(cols).reduce((sum, c) => sum + (c?.w ?? 0), 0);
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

function stickyCell(geom: ColGeom, extra?: string) {
  return {
    className: cn(
      "sticky z-10 bg-card group-hover:bg-muted/60 transition-colors",
      extra,
    ),
    style: { left: geom.left, minWidth: geom.w, width: geom.w },
  };
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
        parsed === null ? null : { value: parsed, rag: res.rag },
      );
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
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "h-8 w-full min-w-20 rounded px-1 text-center text-xs tabular-nums",
        "hover:ring-1 hover:ring-[#f05100]/40",
        ragClass(cell?.rag),
        pending && "opacity-50",
      )}
    >
      {cell ? nf.format(cell.value) : "–"}
    </button>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentStart = periods[periods.length - 1]?.start;
  const isMobile = useIsMobile();
  const cols = isMobile ? COLS_MOBILE : COLS_DESKTOP;
  const fixedCount = Object.values(cols).filter(Boolean).length;

  // land on the newest periods (right end) — Ninety behaviour
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [periods]);

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
    <div
      ref={scrollRef}
      className="max-h-[520px] overflow-x-auto overflow-y-auto border-t"
    >
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs">
            <th
              colSpan={fixedCount}
              className="bg-card sticky top-0 left-0 z-40 p-0"
              style={{ minWidth: fixedWidth(cols) }}
            />
            {yearSpans.map((y) => (
              <th
                key={y.year}
                colSpan={y.span}
                className="bg-card sticky top-0 z-20 border-b px-2 py-1 text-left font-medium"
              >
                {y.year}
              </th>
            ))}
            <th className="bg-card sticky top-0 z-20 border-b p-0" />
          </tr>
          <tr className="text-muted-foreground text-xs [&>th]:px-2 [&>th]:py-2 [&>th]:font-medium">
            {cols.check ? (
              <th
                className="bg-card sticky z-30 border-b"
                style={{
                  top: 25,
                  left: cols.check.left,
                  minWidth: cols.check.w,
                }}
              >
                <Checkbox
                  checked={rows.length > 0 && rows.every((r) => checked[r.id])}
                  onCheckedChange={(v) =>
                    setChecked(
                      Object.fromEntries(rows.map((r) => [r.id, v === true])),
                    )
                  }
                />
              </th>
            ) : null}
            {cols.trend ? (
              <th
                className="bg-card sticky z-30 border-b text-center"
                style={{
                  top: 25,
                  left: cols.trend.left,
                  minWidth: cols.trend.w,
                }}
              >
                {isMobile ? (
                  <LineChartIcon className="mx-auto size-3.5" />
                ) : (
                  <>
                    View
                    <br />
                    Trend
                  </>
                )}
              </th>
            ) : null}
            {cols.title ? (
              <th
                className="bg-card sticky z-30 border-b text-left"
                style={{
                  top: 25,
                  left: cols.title.left,
                  minWidth: cols.title.w,
                }}
              >
                Title
              </th>
            ) : null}
            {cols.goal ? (
              <th
                className="bg-card sticky z-30 border-b text-right"
                style={{ top: 25, left: cols.goal.left, minWidth: cols.goal.w }}
              >
                Goal
              </th>
            ) : null}
            {cols.avg ? (
              <th
                className="bg-card sticky z-30 border-b text-right"
                style={{ top: 25, left: cols.avg.left, minWidth: cols.avg.w }}
              >
                Average
              </th>
            ) : null}
            {cols.total ? (
              <th
                className="bg-card sticky z-30 border-b text-right"
                style={{
                  top: 25,
                  left: cols.total.left,
                  minWidth: cols.total.w,
                }}
              >
                Total
              </th>
            ) : null}
            {periods.map((p) => {
              const [a, b] = p.label.split(" - ");
              return (
                <th
                  key={p.start}
                  className={cn(
                    "bg-card sticky z-20 min-w-24 border-b text-center whitespace-nowrap",
                    p.start === currentStart &&
                      "border-l-2 border-l-[#f05100]/70",
                  )}
                  style={{ top: 25 }}
                >
                  {b ? (
                    <>
                      {a} -<br />
                      {b}
                    </>
                  ) : (
                    a
                  )}
                </th>
              );
            })}
            <th className="bg-card sticky z-20 w-8 border-b" style={{ top: 25 }} />
          </tr>
        </thead>
        <tbody>
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
              <tr key={m.id} className="group border-b last:border-0">
                {cols.check ? (
                  <td {...stickyCell(cols.check, "px-2")}>
                    <Checkbox
                      checked={checked[m.id] ?? false}
                      onCheckedChange={(v) =>
                        setChecked({ [m.id]: v === true })
                      }
                    />
                  </td>
                ) : null}
                {cols.trend ? (
                  <td {...stickyCell(cols.trend, "px-2 text-center")}>
                    <TrendPopover metric={m} periods={periods} cells={cells} />
                  </td>
                ) : null}
                <td {...stickyCell(cols.title!, "px-2 py-1.5")}>
                  <div className="flex items-center gap-2">
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
                    <button
                      type="button"
                      onClick={() => onEdit(m)}
                      className="truncate text-left text-xs font-medium hover:text-[#f05100] hover:underline"
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
                </td>
                {cols.goal ? (
                  <td
                    {...stickyCell(
                      cols.goal,
                      "px-2 text-right text-xs whitespace-nowrap",
                    )}
                  >
                    {m.goal_text ?? "—"}
                  </td>
                ) : null}
                {cols.avg ? (
                  <td
                    {...stickyCell(
                      cols.avg,
                      "px-2 text-right text-xs tabular-nums",
                    )}
                  >
                    {avg === null ? "—" : nf.format(avg)}
                  </td>
                ) : null}
                {cols.total ? (
                  <td
                    {...stickyCell(
                      cols.total,
                      "px-2 text-right text-xs tabular-nums",
                    )}
                  >
                    {total === null ? "—" : nf.format(total)}
                  </td>
                ) : null}
                {periods.map((p) => (
                  <td
                    key={p.start}
                    className={cn(
                      "p-1",
                      p.start === currentStart &&
                        "border-l-2 border-l-[#f05100]/70",
                    )}
                  >
                    <EditableCell
                      metric={m}
                      period={p}
                      cadence={cadence}
                      cell={cells[p.start]}
                      onSaved={(start, cell) => setOverride(m.id, start, cell)}
                    />
                  </td>
                ))}
                <td className="px-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon" }),
                            "size-7 sm:opacity-0 sm:group-hover:opacity-100",
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
                          if (res.ok) toast.success("Measurable archived");
                          else toast.error(res.error);
                        }}
                      >
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={fixedCount + 1 + periods.length}
                className="text-muted-foreground h-24 text-center text-xs"
              >
                No data to show
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-[#f05100]/40 text-[#f05100] hover:bg-[#f05100]/5 hover:text-[#f05100]"
                  onClick={() => {
                    setDialogGroup(groupName);
                    setDialogMetric(null);
                    setDialogOpen(true);
                  }}
                >
                  New Measurable <ChevronDown className="size-3" />
                </Button>
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
    </div>
  );
}
