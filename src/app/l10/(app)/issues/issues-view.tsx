"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  Ellipsis,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { OwnerAvatar } from "@/components/l10/owner-avatar";
import type { MemberRow } from "@/lib/l10/scorecard";
import type { IssueRow } from "@/lib/l10/work";
import {
  createIssue,
  deleteIssue,
  moveIssueTerm,
  reopenIssue,
  solveIssue,
  updateIssue,
} from "./actions";

const df = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function IssueDialog({
  open,
  onOpenChange,
  teamId,
  members,
  term,
  issue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  members: MemberRow[];
  term: "short" | "long";
  issue: IssueRow | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTitle(issue?.title ?? "");
    setDescription(issue?.description ?? "");
    setOwnerId(issue?.owner_id ?? "");
  }, [open, issue]);

  function submit() {
    startTransition(async () => {
      const base = {
        teamId,
        title,
        description: description || null,
        ownerId: ownerId || null,
        term: issue?.term ?? term,
      };
      const res = issue
        ? await updateIssue({ ...base, issueId: issue.id })
        : await createIssue(base);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(issue ? "Issue updated" : "Issue added");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{issue ? "Edit Issue" : "Add Issue"}</DialogTitle>
          <DialogDescription>
            {(issue?.term ?? term) === "short"
              ? "Short-Term — solve it in a weekly L10."
              : "Long-Term — park it for quarterly planning."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="is-title">Title</Label>
            <Input
              id="is-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name the issue"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="is-desc">Description</Label>
            <Textarea
              id="is-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context for the discussion (optional)"
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="is-owner">Owner</Label>
            <NativeSelect
              id="is-owner"
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
            {pending ? "Saving…" : issue ? "Save Changes" : "Add Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IssuesView({
  teamId,
  issues,
  members,
  term,
  archived,
}: {
  teamId: string;
  issues: IssueRow[];
  members: MemberRow[];
  term: "short" | "long";
  archived: boolean;
}) {
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogIssue, setDialogIssue] = useState<IssueRow | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter(
      (i) =>
        (!q || i.title.toLowerCase().includes(q)) &&
        (ownerFilter === "all" || i.owner_id === ownerFilter),
    );
  }, [issues, query, ownerFilter]);

  return (
    <div className="flex flex-col gap-4">
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
        <div className="relative min-w-0 flex-1 sm:min-w-56 sm:flex-none">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Issues..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        {!archived ? (
          <Button
            size="sm"
            className="ml-auto gap-1 bg-[#f05100] text-white hover:bg-[#f05100]/90"
            onClick={() => {
              setDialogIssue(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Add Issue
          </Button>
        ) : null}
      </div>

      <div className="bg-card rounded-xl border">
        <div className="flex items-baseline gap-2 px-4 py-3">
          <p className="text-base font-semibold">
            {archived
              ? "Solved Issues"
              : term === "short"
                ? "Short-Term Issues"
                : "Long-Term Issues"}
          </p>
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-medium">
            {filtered.length}
          </span>
        </div>
        {filtered.length > 0 ? (
          <table className="w-full border-t text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-xs [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                <th className="hidden w-10 text-left sm:table-cell">#</th>
                <th className="w-full text-left">Title</th>
                <th className="text-left">Owner</th>
                <th className="hidden text-left whitespace-nowrap sm:table-cell">
                  Created
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((i, idx) => (
                <tr key={i.id} className="group border-b last:border-0">
                  <td className="text-muted-foreground hidden px-3 py-2 text-xs tabular-nums sm:table-cell">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDialogIssue(i);
                        setDialogOpen(true);
                      }}
                      className={cn(
                        "text-left text-sm font-medium hover:text-[#f05100] hover:underline",
                        i.status === "solved" &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {i.title}
                    </button>
                    {i.description ? (
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                        {i.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <OwnerAvatar name={i.owner_name} />
                  </td>
                  <td className="text-muted-foreground hidden px-3 py-2 text-xs whitespace-nowrap sm:table-cell">
                    {df.format(new Date(i.created_at))}
                  </td>
                  <td className="px-1">
                    <div className="flex items-center gap-1">
                      {!archived ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-emerald-600 sm:opacity-0 sm:group-hover:opacity-100"
                          title="Solve"
                          onClick={() =>
                            startTransition(async () => {
                              const res = await solveIssue(teamId, i.id);
                              if (res.ok) toast.success("Issue solved 🎉");
                              else toast.error(res.error);
                            })
                          }
                        >
                          <CheckCircle2 className="size-4" />
                        </Button>
                      ) : null}
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
                              setDialogIssue(i);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" /> Edit
                          </DropdownMenuItem>
                          {archived ? (
                            <DropdownMenuItem
                              onClick={async () => {
                                const res = await reopenIssue(teamId, i.id);
                                if (res.ok) toast.success("Issue reopened");
                                else toast.error(res.error);
                              }}
                            >
                              <RotateCcw className="size-3.5" /> Reopen
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={async () => {
                                const next =
                                  i.term === "short" ? "long" : "short";
                                const res = await moveIssueTerm(
                                  teamId,
                                  i.id,
                                  next,
                                );
                                if (res.ok)
                                  toast.success(
                                    `Moved to ${next === "short" ? "Short" : "Long"}-Term`,
                                  );
                                else toast.error(res.error);
                              }}
                            >
                              <ArrowLeftRight className="size-3.5" /> Move to{" "}
                              {i.term === "short" ? "Long" : "Short"}-Term
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={async () => {
                              const res = await deleteIssue(teamId, i.id);
                              if (res.ok) toast.success("Issue deleted");
                              else toast.error(res.error);
                            }}
                          >
                            <Trash2 className="size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted-foreground border-t px-4 py-10 text-center text-sm">
            {archived
              ? "No solved Issues yet."
              : "Your team hasn't added any Issues yet."}
          </p>
        )}
      </div>

      <IssueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teamId={teamId}
        members={members}
        term={term}
        issue={dialogIssue}
      />
    </div>
  );
}
