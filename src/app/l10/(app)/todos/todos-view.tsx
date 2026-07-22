"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ChevronDown,
  Ellipsis,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { MemberRow } from "@/lib/l10/scorecard";
import type { TodoRow } from "@/lib/l10/work";
import {
  createTodo,
  deleteTodo,
  dropToIssue,
  toggleTodo,
  updateTodo,
} from "./actions";

const df = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function firstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] ?? "";
}

function TodoDialog({
  open,
  onOpenChange,
  teamId,
  members,
  isPrivate,
  todo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  members: MemberRow[];
  isPrivate: boolean;
  todo: TodoRow | null;
}) {
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTitle(todo?.title ?? "");
    setOwnerId(todo?.owner_id ?? "");
    setDueDate(todo?.due_date?.slice(0, 10) ?? "");
  }, [open, todo]);

  function submit() {
    startTransition(async () => {
      const base = {
        teamId,
        title,
        ownerId: ownerId || null,
        dueDate: dueDate || null,
        isPrivate,
      };
      const res = todo
        ? await updateTodo({ ...base, todoId: todo.id })
        : await createTodo(base);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(todo ? "To-Do updated" : "To-Do created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{todo ? "Edit To-Do" : "Create To-Do"}</DialogTitle>
          <DialogDescription>
            {isPrivate
              ? "Private — only visible to you."
              : "Team To-Do — visible to the whole team."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="td-title">Title</Label>
            <Input
              id="td-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to get done?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!isPrivate ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="td-owner">Owner</Label>
                <NativeSelect
                  id="td-owner"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                >
                  <option value="">No owner</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="td-due">Due date</Label>
              <Input
                id="td-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || !title.trim()}
            className="bg-[#f05100] text-white hover:bg-[#f05100]/90"
          >
            {pending ? "Saving…" : todo ? "Save Changes" : "Create To-Do"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TodosView({
  teamId,
  todos,
  members,
  isPrivate,
  archived,
}: {
  teamId: string;
  todos: TodoRow[];
  members: MemberRow[];
  isPrivate: boolean;
  archived: boolean;
}) {
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTodo, setDialogTodo] = useState<TodoRow | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return todos.filter(
      (t) =>
        (!q || t.title.toLowerCase().includes(q)) &&
        (ownerFilter === "all" || t.owner_id === ownerFilter),
    );
  }, [todos, query, ownerFilter]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {!isPrivate ? (
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
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => setOwnerFilter(m.id)}
                >
                  {m.full_name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <div className="relative min-w-0 flex-1 sm:min-w-56 sm:flex-none">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search To-Dos..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        {!archived ? (
          <Button
            size="sm"
            className="ml-auto gap-1 bg-[#f05100] text-white hover:bg-[#f05100]/90"
            onClick={() => {
              setDialogTodo(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Create To-Do
          </Button>
        ) : null}
      </div>

      <div className="bg-card rounded-xl border">
        <div className="flex items-baseline gap-2 px-4 py-3">
          <p className="text-base font-semibold">
            {archived ? "Archived To-Dos" : isPrivate ? "Private To-Dos" : "To-Dos"}
          </p>
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-medium">
            {filtered.length}
          </span>
        </div>
        {filtered.length > 0 ? (
          <table className="w-full border-t text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-xs [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                <th className="w-10" />
                <th className="w-full text-left">Title</th>
                {!isPrivate ? (
                  <th className="hidden text-left sm:table-cell">Owner</th>
                ) : null}
                <th className="hidden text-left whitespace-nowrap sm:table-cell">
                  Open Date
                </th>
                <th className="text-left whitespace-nowrap">Due Date</th>
                <th className="text-left whitespace-nowrap">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const overdue =
                  t.status === "open" && t.due_date && t.due_date < today;
                const save = (
                  patch: Partial<{
                    title: string;
                    ownerId: string | null;
                    openDate: string | null;
                    dueDate: string | null;
                  }>,
                ) =>
                  startTransition(async () => {
                    const res = await updateTodo({
                      teamId,
                      todoId: t.id,
                      title: patch.title ?? t.title,
                      ownerId:
                        patch.ownerId !== undefined
                          ? patch.ownerId
                          : (t.owner_id ?? null),
                      openDate:
                        patch.openDate !== undefined
                          ? patch.openDate
                          : (t.open_date?.slice(0, 10) ?? null),
                      dueDate:
                        patch.dueDate !== undefined
                          ? patch.dueDate
                          : (t.due_date?.slice(0, 10) ?? null),
                      isPrivate,
                    });
                    if (!res.ok) toast.error(res.error);
                  });
                return (
                  <tr key={t.id} className="group border-b last:border-0">
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={t.status === "done"}
                        onCheckedChange={(v) =>
                          startTransition(async () => {
                            const res = await toggleTodo(
                              teamId,
                              t.id,
                              v === true,
                            );
                            if (!res.ok) toast.error(res.error);
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        defaultValue={t.title}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== t.title) save({ title: v });
                          else e.target.value = t.title;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") {
                            e.currentTarget.value = t.title;
                            e.currentTarget.blur();
                          }
                        }}
                        className={cn(
                          "w-full min-w-40 rounded border border-transparent bg-transparent px-1 py-1 text-sm font-medium outline-none",
                          "hover:border-input focus:border-input focus:bg-background",
                          t.status !== "open" &&
                            "text-muted-foreground line-through",
                        )}
                      />
                      {t.status === "dropped" ? (
                        <span className="text-muted-foreground ml-2 text-[10px] uppercase">
                          dropped to issues
                        </span>
                      ) : null}
                    </td>
                    {!isPrivate ? (
                      <td className="hidden px-3 py-1.5 sm:table-cell">
                        <NativeSelect
                          value={t.owner_id ?? ""}
                          onChange={(e) =>
                            save({ ownerId: e.target.value || null })
                          }
                          className="h-7 w-24 text-xs"
                          title={t.owner_name ?? undefined}
                        >
                          <option value="">—</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {firstName(m.full_name)}
                            </option>
                          ))}
                        </NativeSelect>
                      </td>
                    ) : null}
                    <td className="hidden px-3 py-1.5 sm:table-cell">
                      <input
                        type="date"
                        defaultValue={t.open_date?.slice(0, 10) ?? ""}
                        onChange={(e) =>
                          save({ openDate: e.target.value || null })
                        }
                        className="text-muted-foreground hover:border-input focus:border-input h-7 rounded border border-transparent bg-transparent px-1 text-xs outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="date"
                        defaultValue={t.due_date?.slice(0, 10) ?? ""}
                        onChange={(e) =>
                          save({ dueDate: e.target.value || null })
                        }
                        className={cn(
                          "hover:border-input focus:border-input h-7 rounded border border-transparent bg-transparent px-1 text-xs outline-none",
                          overdue
                            ? "font-medium text-red-600 dark:text-red-400"
                            : "text-muted-foreground",
                        )}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      {t.status === "dropped" ? (
                        <span className="text-muted-foreground text-xs">
                          Dropped
                        </span>
                      ) : (
                        <NativeSelect
                          value={t.status === "done" ? "done" : "open"}
                          onChange={(e) =>
                            startTransition(async () => {
                              const res = await toggleTodo(
                                teamId,
                                t.id,
                                e.target.value === "done",
                              );
                              if (!res.ok) toast.error(res.error);
                            })
                          }
                          className={cn(
                            "h-7 w-26 text-xs",
                            t.status === "done"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : undefined,
                          )}
                        >
                          <option value="open">Not done</option>
                          <option value="done">Done</option>
                        </NativeSelect>
                      )}
                    </td>
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
                          <DropdownMenuItem
                            onClick={() => {
                              setDialogTodo(t);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" /> Edit
                          </DropdownMenuItem>
                          {t.status === "open" && !isPrivate ? (
                            <DropdownMenuItem
                              onClick={async () => {
                                const res = await dropToIssue(teamId, t.id);
                                if (res.ok)
                                  toast.success("Moved to Issues list");
                                else toast.error(res.error);
                              }}
                            >
                              <ArrowDownToLine className="size-3.5" /> Drop to
                              Issues
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={async () => {
                              const res = await deleteTodo(teamId, t.id);
                              if (res.ok) toast.success("To-Do deleted");
                              else toast.error(res.error);
                            }}
                          >
                            <Trash2 className="size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-muted-foreground border-t px-4 py-10 text-center text-sm">
            {archived
              ? "No archived To-Dos."
              : `You have no ${isPrivate ? "Private" : "Team"} To-Dos right now.`}
          </p>
        )}
      </div>

      <TodoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teamId={teamId}
        members={members}
        isPrivate={isPrivate}
        todo={dialogTodo}
      />
    </div>
  );
}
