"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Binoculars,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { OwnerAvatar } from "@/components/l10/owner-avatar";
import type { MemberRow } from "@/lib/l10/scorecard";
import type { RockRow } from "@/lib/l10/work";
import {
  addMilestone,
  deleteMilestone,
  deleteRock,
  setRockStatus,
  toggleMilestone,
} from "./actions";
import { RockDialog } from "./rock-dialog";

const STATUS: Record<
  RockRow["status"],
  { label: string; className: string }
> = {
  on_track: {
    label: "On Track",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  off_track: {
    label: "Off Track",
    className: "bg-red-500/15 text-red-700 dark:text-red-400",
  },
  done: {
    label: "Done",
    className: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
};

const df = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function fmtDate(d: string | null) {
  return d ? df.format(new Date(d)) : "—";
}

function StatusPill({
  rock,
  teamId,
}: {
  rock: RockRow;
  teamId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
          STATUS[rock.status].className,
          pending && "opacity-50",
        )}
      >
        {STATUS[rock.status].label}
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(STATUS) as RockRow["status"][]).map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() =>
              startTransition(async () => {
                const res = await setRockStatus(teamId, rock.id, s);
                if (!res.ok) toast.error(res.error);
              })
            }
          >
            {STATUS[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MilestoneList({
  rock,
  teamId,
}: {
  rock: RockRow;
  teamId: string;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="bg-muted/30 flex flex-col gap-1 rounded-lg border px-3 py-2">
      {rock.milestones.map((ms) => (
        <div key={ms.id} className="group/ms flex items-center gap-2 text-xs">
          <Checkbox
            checked={ms.done}
            onCheckedChange={(v) =>
              startTransition(async () => {
                const res = await toggleMilestone(
                  teamId,
                  rock.id,
                  ms.id,
                  v === true,
                );
                if (!res.ok) toast.error(res.error);
              })
            }
          />
          <span className={cn(ms.done && "text-muted-foreground line-through")}>
            {ms.title}
          </span>
          <span className="text-muted-foreground ml-auto whitespace-nowrap">
            {fmtDate(ms.due_date)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-5 opacity-0 group-hover/ms:opacity-100"
            onClick={() =>
              startTransition(async () => {
                const res = await deleteMilestone(teamId, rock.id, ms.id);
                if (!res.ok) toast.error(res.error);
              })
            }
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
      <form
        className="mt-1 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newTitle.trim()) return;
          startTransition(async () => {
            const res = await addMilestone(teamId, rock.id, newTitle, null);
            if (!res.ok) toast.error(res.error);
            else setNewTitle("");
          });
        }}
      >
        <Plus className="text-muted-foreground size-3" />
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add milestone…"
          className="placeholder:text-muted-foreground w-full bg-transparent text-xs outline-none"
          disabled={pending}
        />
      </form>
    </div>
  );
}

function RockTable({
  rocks,
  teamId,
  onEdit,
}: {
  rocks: RockRow[];
  teamId: string;
  onEdit: (rock: RockRow) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground border-b text-xs [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
          <th className="w-8" />
          <th className="text-left">Status</th>
          <th className="w-full text-left">Title</th>
          <th className="text-left whitespace-nowrap">Milestones</th>
          <th className="text-left whitespace-nowrap">Due Date</th>
          <th className="w-8" />
        </tr>
      </thead>
      <tbody>
        {rocks.map((r) => {
          const isExpanded = expanded[r.id] ?? false;
          const done = r.milestones.filter((m) => m.done).length;
          return (
            <Fragment key={r.id}>
              <tr className="group border-b last:border-0">
                <td className="px-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((e) => ({ ...e, [r.id]: !isExpanded }))
                    }
                    className="text-muted-foreground hover:text-foreground"
                    title="Milestones"
                  >
                    <ChevronRight
                      className={cn(
                        "size-4 transition-transform",
                        isExpanded && "rotate-90",
                      )}
                    />
                  </button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <StatusPill rock={r} teamId={teamId} />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onEdit(r)}
                    className="text-left text-sm font-medium hover:text-[#f05100] hover:underline"
                  >
                    {r.title}
                  </button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.milestones.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(done / r.milestones.length) * 100}
                        className="h-1.5 w-16"
                      />
                      <span className="text-muted-foreground text-xs">
                        {done}/{r.milestones.length}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="text-muted-foreground px-3 py-2 text-xs whitespace-nowrap">
                  {fmtDate(r.due_date)}
                </td>
                <td className="px-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-0 group-hover:opacity-100"
                        />
                      }
                    >
                      <Ellipsis className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(r)}>
                        <Pencil className="size-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={async () => {
                          const res = await deleteRock(teamId, r.id);
                          if (res.ok) toast.success("Rock deleted");
                          else toast.error(res.error);
                        }}
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
              {isExpanded ? (
                <tr className="border-b last:border-0">
                  <td />
                  <td colSpan={5} className="px-3 pb-3">
                    <MilestoneList rock={r} teamId={teamId} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

export function RocksView({
  teamId,
  rocks,
  members,
  quarters,
  defaultQuarter,
  archived,
}: {
  teamId: string;
  rocks: RockRow[];
  members: MemberRow[];
  quarters: string[];
  defaultQuarter: string;
  archived: boolean;
}) {
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogRock, setDialogRock] = useState<RockRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rocks.filter(
      (r) =>
        (!q || r.title.toLowerCase().includes(q)) &&
        (ownerFilter === "all" || r.owner_id === ownerFilter),
    );
  }, [rocks, query, ownerFilter]);

  const company = filtered.filter((r) => r.is_company);
  const byOwner = useMemo(() => {
    const map = new Map<string, { name: string | null; rows: RockRow[] }>();
    for (const r of filtered.filter((r) => !r.is_company)) {
      const key = r.owner_id ?? "unowned";
      if (!map.has(key)) map.set(key, { name: r.owner_name, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar — owner filter + search + Add Rock */}
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-muted/50 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs">
            <span className="text-muted-foreground">Owner:</span>
            <span className="font-medium">
              {ownerFilter === "all"
                ? "All"
                : (members.find((m) => m.id === ownerFilter)?.full_name ??
                  "All")}
            </span>
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setOwnerFilter("all")}>
              All
            </DropdownMenuItem>
            {members.map((m) => (
              <DropdownMenuItem key={m.id} onClick={() => setOwnerFilter(m.id)}>
                {m.full_name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="relative min-w-56">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Rocks..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        {!archived ? (
          <Button
            size="sm"
            className="ml-auto gap-1 bg-[#f05100] text-white hover:bg-[#f05100]/90"
            onClick={() => {
              setDialogRock(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Add Rock
          </Button>
        ) : null}
      </div>

      {/* Company Rocks */}
      <div className="bg-card rounded-xl border">
        <div className="flex items-center gap-2 px-4 py-3">
          <Binoculars className="size-4 text-[#f05100]" />
          <p className="text-base font-semibold">Company Rocks</p>
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-medium">
            {company.length}
          </span>
        </div>
        {company.length > 0 ? (
          <div className="border-t">
            <RockTable
              rocks={company}
              teamId={teamId}
              onEdit={(r) => {
                setDialogRock(r);
                setDialogOpen(true);
              }}
            />
          </div>
        ) : (
          <p className="text-muted-foreground border-t px-4 py-6 text-center text-xs">
            No Company Rocks for {archived ? "past quarters" : defaultQuarter}.
          </p>
        )}
      </div>

      {/* Per-owner rocks */}
      {byOwner.map(([key, group]) => (
        <div key={key} className="bg-card rounded-xl border">
          <div className="flex items-center gap-2 px-4 py-3">
            <OwnerAvatar name={group.name} />
            <p className="text-base font-semibold">
              {group.name ?? "Unassigned"}
            </p>
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-medium">
              {group.rows.length}
            </span>
          </div>
          <div className="border-t">
            <RockTable
              rocks={group.rows}
              teamId={teamId}
              onEdit={(r) => {
                setDialogRock(r);
                setDialogOpen(true);
              }}
            />
          </div>
        </div>
      ))}

      {filtered.length === 0 ? (
        <div className="bg-card text-muted-foreground rounded-xl border py-16 text-center text-sm">
          {archived
            ? "No archived Rocks (past quarters)."
            : `Your team hasn't created any Rocks for ${defaultQuarter} yet.`}
        </div>
      ) : null}

      <RockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teamId={teamId}
        members={members}
        quarters={quarters}
        defaultQuarter={defaultQuarter}
        rock={dialogRock}
      />
    </div>
  );
}
