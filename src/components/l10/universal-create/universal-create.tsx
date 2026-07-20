"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Check,
  ChevronDown,
  CirclePlus,
  EllipsisVertical,
  Italic,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Pilcrow,
  Plus,
  Sparkles,
  Type,
  Underline,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { memberVisuals } from "@/components/l10/members";
import type { MemberRow, TeamRow } from "@/lib/l10/scorecard";
import type { SessionUser } from "@/lib/l10/auth/token";
import { createIssue } from "@/app/l10/(app)/issues/actions";
import { createRock } from "@/app/l10/(app)/rocks/actions";
import { createTodo } from "@/app/l10/(app)/todos/actions";
import { createHeadline, membersForTeam } from "./actions";

// Ninety's universal Create dialog (bottom-right 640x700 panel with the
// orange top strip). Item types in Ninety's dropdown order.
const ITEM_TYPES = [
  "Rock",
  "To-Do",
  "Issue",
  "Headline",
  "Cascading Message",
] as const;
type ItemType = (typeof ITEM_TYPES)[number];

const NINETY_ORANGE = "#f05100";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function plusDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

function quarterOptions(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = -1; i <= 2; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i * 3, 1),
    );
    out.push(`Q${Math.floor(d.getUTCMonth() / 3) + 1}-${d.getUTCFullYear()}`);
  }
  return [...new Set(out)];
}

function currentQuarter(): string {
  const now = new Date();
  return `Q${Math.floor(now.getUTCMonth() / 3) + 1}-${now.getUTCFullYear()}`;
}

/* ---------- Ninety-styled form primitives (36px, 4px radius) ---------- */

function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="mb-1.5 text-sm text-foreground">
      {children}
      {optional ? (
        <span className="text-muted-foreground/70"> (optional)</span>
      ) : null}
    </div>
  );
}

function NinetySelect({
  value,
  onChange,
  children,
  ariaLabel,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative w-full">
      <select
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "border-border bg-background h-9 w-full appearance-none rounded-[4px] border pr-9 pl-4 text-sm outline-none",
          "focus-visible:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-60",
          value === "" && "text-muted-foreground/70",
        )}
      >
        {children}
      </select>
      <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </div>
  );
}

function NinetyDateInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="date"
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-border bg-background h-9 w-full rounded-[4px] border px-4 text-sm outline-none focus-visible:border-foreground/40"
    />
  );
}

function ToolbarButton({
  label,
  onClick,
  withCaret,
  withDots,
  children,
}: {
  label: string;
  onClick?: () => void;
  withCaret?: boolean;
  withDots?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // preserve the editor selection so execCommand hits the right range
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="text-foreground/80 hover:bg-foreground/5 flex h-9 items-center justify-center gap-0.5 rounded px-2"
    >
      {children}
      {withCaret ? <ChevronDown className="size-3" /> : null}
      {withDots ? <EllipsisVertical className="size-3 opacity-70" /> : null}
    </button>
  );
}

/* --------------------------------- main --------------------------------- */

export function UniversalCreate({
  user,
  teams,
  initialMembers,
}: {
  user: SessionUser;
  teams: TeamRow[];
  initialMembers: MemberRow[];
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [itemType, setItemType] = useState<ItemType>("Issue");
  const [pending, startTransition] = useTransition();

  // shared fields
  const [title, setTitle] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
  const editorRef = useRef<HTMLDivElement>(null);

  // issue
  const [priority, setPriority] = useState("");
  const [whoId, setWhoId] = useState("");
  const [term, setTerm] = useState<"short" | "long">("short");
  // rock
  const [isCompany, setIsCompany] = useState(false);
  const [rockDue, setRockDue] = useState(plusDays(90));
  const [rockStatus, setRockStatus] = useState<"on_track" | "off_track" | "done">("on_track");
  const [quarter, setQuarter] = useState(currentQuarter());
  // to-do
  const [todoDue, setTodoDue] = useState(plusDays(7));
  const [repeat, setRepeat] = useState("none");
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => setMounted(true), []);

  // refresh member list when the team changes
  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    membersForTeam(teamId)
      .then((rows) => {
        if (cancelled) return;
        setMembers(rows);
        setWhoId("");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const resetForm = useCallback(() => {
    setTitle("");
    setPriority("");
    setWhoId("");
    setTerm("short");
    setIsCompany(false);
    setRockDue(plusDays(90));
    setRockStatus("on_track");
    setQuarter(currentQuarter());
    setTodoDue(plusDays(7));
    setRepeat("none");
    setIsPrivate(false);
    if (editorRef.current) editorRef.current.innerHTML = "";
  }, []);

  // Esc closes, matching the dialog affordance
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const { initials, color } = memberVisuals(user.email, user.name);
  const canCreate = title.trim().length > 0 && !!teamId && !pending;

  function exec(command: string) {
    editorRef.current?.focus();
    document.execCommand(command);
  }

  function description(): string | null {
    const text = editorRef.current?.innerText.trim() ?? "";
    return text || null;
  }

  function submit() {
    if (!canCreate) return;
    startTransition(async () => {
      const desc = description();
      const res =
        itemType === "Issue"
          ? await createIssue({
              teamId,
              title,
              description: desc,
              ownerId: whoId || null,
              term,
              priority: priority ? Number(priority) : null,
            })
          : itemType === "Rock"
            ? await createRock({
                teamId,
                title,
                ownerId: null,
                quarter,
                dueDate: rockDue || null,
                isCompany,
                description: desc,
                status: rockStatus,
              })
            : itemType === "To-Do"
              ? await createTodo({
                  teamId,
                  title,
                  ownerId: null,
                  dueDate: todoDue || null,
                  isPrivate,
                  description: desc,
                })
              : await createHeadline({
                  teamId,
                  title,
                  description: desc,
                  kind: itemType === "Headline" ? "headline" : "cascading",
                });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${itemType} created`);
      resetForm();
      setOpen(false);
      router.refresh();
    });
  }

  const helperNoun =
    itemType === "Cascading Message"
      ? "Changing the team will affect which users can own the Cascading Message."
      : `Changing the team will affect which users the ${itemType} can be assigned to.`;

  const panel = (
    <div
      role="dialog"
      aria-label={`Create ${itemType}`}
      className={cn(
        "bg-background fixed right-0 bottom-0 z-50 flex flex-col shadow-[0_11px_15px_-7px_rgba(0,0,0,.2),0_24px_38px_3px_rgba(0,0,0,.14),0_9px_46px_8px_rgba(0,0,0,.12)] sm:right-2",
        expanded
          ? "w-[min(1100px,100vw)] max-h-[calc(100vh-16px)] h-[calc(100vh-16px)]"
          : "w-[640px] max-w-[100vw]",
        !expanded && !minimized && "h-[700px] max-h-[calc(100vh-16px)]",
      )}
    >
      {/* brand strip */}
      <div className="h-1 shrink-0" style={{ background: NINETY_ORANGE }} />

      {/* header */}
      <div className="border-border flex h-[76px] shrink-0 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Create</h2>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Select item type"
              className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight outline-none"
              style={{ color: NINETY_ORANGE }}
            >
              {itemType}
              <ChevronDown className="mt-0.5 size-5" strokeWidth={3} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[370px] rounded-[4px] p-0">
              {ITEM_TYPES.map((t) => (
                <DropdownMenuItem
                  key={t}
                  onClick={() => setItemType(t)}
                  className={cn(
                    "rounded-none px-4 py-2.5 text-sm",
                    t === itemType && "bg-foreground/5",
                  )}
                >
                  {t}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="text-muted-foreground flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={minimized ? "Restore" : "Minimize"}
            onClick={() => setMinimized((m) => !m)}
          >
            <Minus className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={expanded ? "Collapse" : "Expand"}
            onClick={() => {
              setExpanded((e) => !e);
              setMinimized(false);
            }}
          >
            {expanded ? (
              <Minimize2 className="size-5" />
            ) : (
              <Maximize2 className="size-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {!minimized ? (
        <>
          {/* body */}
          <div className="flex-1 overflow-y-auto px-6 pt-5 pb-4">
            {itemType === "Rock" ? (
              <button
                type="button"
                onClick={() =>
                  toast.info("SMART Rock drafting is coming soon.")
                }
                className="mb-4 flex h-9 items-center gap-2 rounded-[4px] px-4 text-sm font-medium text-white"
                style={{ background: NINETY_ORANGE }}
              >
                <Sparkles className="size-4" />
                Help me draft a SMART Rock
              </button>
            ) : null}

            {/* avatar + title */}
            <div className="flex items-start gap-4">
              <Avatar className="mt-[22px] size-[38px]">
                <AvatarFallback className={cn("text-xs font-medium", color)}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <FieldLabel>Title</FieldLabel>
                <input
                  value={title}
                  maxLength={65536}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Add a title for the ${itemType}...`}
                  className={cn(
                    "bg-background h-9 w-full rounded-[4px] border px-4 text-sm outline-none",
                    "placeholder:text-muted-foreground/70",
                    title.trim()
                      ? "border-border focus-visible:border-foreground/40"
                      : "border-[#ce4651]",
                  )}
                />
              </div>
            </div>
            <div className="text-muted-foreground/70 mt-1.5 text-right text-sm">
              {title.length.toLocaleString()}/65,536
            </div>

            {/* description editor */}
            <div className="border-border mt-1 rounded-[10px] border">
              <div className="border-border/70 flex h-[50px] items-center gap-0.5 border-b px-2">
                <ToolbarButton label="Bold" onClick={() => exec("bold")}>
                  <Bold className="size-[18px]" strokeWidth={2.75} />
                </ToolbarButton>
                <ToolbarButton label="Italic" onClick={() => exec("italic")}>
                  <Italic className="size-[18px]" />
                </ToolbarButton>
                <ToolbarButton
                  label="Underline"
                  onClick={() => exec("underline")}
                >
                  <Underline className="size-[18px]" />
                </ToolbarButton>
                <ToolbarButton label="Text formatting" withDots>
                  <Type className="size-[18px]" />
                </ToolbarButton>
                <ToolbarButton
                  label="Align left"
                  onClick={() => exec("justifyLeft")}
                >
                  <AlignLeft className="size-[18px]" />
                </ToolbarButton>
                <ToolbarButton
                  label="Align center"
                  onClick={() => exec("justifyCenter")}
                >
                  <AlignCenter className="size-[18px]" />
                </ToolbarButton>
                <ToolbarButton
                  label="Bullet list"
                  withCaret
                  onClick={() => exec("insertUnorderedList")}
                >
                  <List className="size-[18px]" />
                </ToolbarButton>
                <ToolbarButton
                  label="Numbered list"
                  onClick={() => exec("insertOrderedList")}
                >
                  <ListOrdered className="size-[18px]" />
                </ToolbarButton>
                <ToolbarButton label="Paragraph style" withDots>
                  <Pilcrow className="size-[18px]" />
                </ToolbarButton>
                <ToolbarButton label="Insert" withDots>
                  <Plus className="size-[18px]" />
                </ToolbarButton>
                <div className="flex-1" />
                <ToolbarButton label="More options">
                  <EllipsisVertical className="size-[18px]" />
                </ToolbarButton>
              </div>
              <div
                ref={editorRef}
                contentEditable
                role="textbox"
                aria-label="Description"
                aria-multiline="true"
                data-placeholder="Add a description (optional)..."
                suppressContentEditableWarning
                className={cn(
                  "min-h-[100px] p-5 text-sm outline-none",
                  "empty:before:text-muted-foreground/70 empty:before:content-[attr(data-placeholder)]",
                )}
              />
            </div>

            {/* type-specific fields */}
            {itemType === "Issue" ? (
              <div className="mt-6 grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2">
                <div>
                  <FieldLabel optional>Priority</FieldLabel>
                  <NinetySelect
                    ariaLabel="Priority"
                    value={priority}
                    onChange={setPriority}
                  >
                    <option value="">Select a priority...</option>
                    <option value="1">High</option>
                    <option value="2">Medium</option>
                    <option value="3">Low</option>
                  </NinetySelect>
                </div>
                <div>
                  <FieldLabel optional>Who</FieldLabel>
                  <NinetySelect
                    ariaLabel="Who the Issue is with"
                    value={whoId}
                    onChange={setWhoId}
                  >
                    <option value="">
                      Select or enter who the Issue is with...
                    </option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </NinetySelect>
                </div>
                <div>
                  <FieldLabel>Team</FieldLabel>
                  <NinetySelect
                    ariaLabel="Team"
                    value={teamId}
                    onChange={setTeamId}
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </NinetySelect>
                </div>
                <div>
                  <FieldLabel>Interval</FieldLabel>
                  <NinetySelect
                    ariaLabel="Interval"
                    value={term}
                    onChange={(v) => setTerm(v as "short" | "long")}
                  >
                    <option value="short">Short-Term</option>
                    <option value="long">Long-Term</option>
                  </NinetySelect>
                </div>
                <p className="text-muted-foreground col-span-full text-sm">
                  {helperNoun}
                </p>
              </div>
            ) : null}

            {itemType === "Rock" ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsCompany((c) => !c)}
                  className="border-border mt-5 flex items-center gap-3 rounded-[8px] border px-4 py-2.5"
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border-2",
                      isCompany
                        ? "border-transparent text-white"
                        : "border-muted-foreground/30 bg-muted/40",
                    )}
                    style={isCompany ? { background: NINETY_ORANGE } : undefined}
                  >
                    {isCompany ? <Check className="size-4" strokeWidth={3} /> : null}
                  </span>
                  <span className="text-lg text-foreground/80">
                    Company Rock
                  </span>
                </button>
                <div className="mt-6 grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Due date</FieldLabel>
                    <NinetyDateInput
                      ariaLabel="Due date"
                      value={rockDue}
                      onChange={setRockDue}
                    />
                  </div>
                  <div>
                    <FieldLabel>Status</FieldLabel>
                    <NinetySelect
                      ariaLabel="Status"
                      value={rockStatus}
                      onChange={(v) =>
                        setRockStatus(v as "on_track" | "off_track" | "done")
                      }
                    >
                      <option value="on_track">On-track</option>
                      <option value="off_track">Off-track</option>
                      <option value="done">Complete</option>
                    </NinetySelect>
                  </div>
                  <div>
                    <FieldLabel>Team</FieldLabel>
                    <NinetySelect
                      ariaLabel="Team"
                      value={teamId}
                      onChange={setTeamId}
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </NinetySelect>
                  </div>
                  <div>
                    <FieldLabel optional>Other Teams</FieldLabel>
                    <NinetySelect
                      ariaLabel="Other Teams"
                      value=""
                      onChange={() =>
                        toast.info("Multi-team Rocks are coming soon.")
                      }
                    >
                      <option value="">Add the Rock to other teams...</option>
                    </NinetySelect>
                  </div>
                  <p className="text-muted-foreground col-span-full text-sm">
                    {helperNoun}
                  </p>
                  <div>
                    <FieldLabel>Quarter</FieldLabel>
                    <NinetySelect
                      ariaLabel="Quarter"
                      value={quarter}
                      onChange={setQuarter}
                    >
                      {quarterOptions().map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </NinetySelect>
                  </div>
                </div>
              </>
            ) : null}

            {itemType === "To-Do" ? (
              <div className="mt-6 grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2">
                <div>
                  <FieldLabel>Due date</FieldLabel>
                  <NinetyDateInput
                    ariaLabel="Due date"
                    value={todoDue}
                    onChange={setTodoDue}
                  />
                </div>
                <div>
                  <FieldLabel>Repeat</FieldLabel>
                  <NinetySelect
                    ariaLabel="Repeat"
                    value={repeat}
                    onChange={setRepeat}
                  >
                    <option value="none">Don&apos;t repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every other week</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </NinetySelect>
                </div>
                <div>
                  <FieldLabel>Team</FieldLabel>
                  <NinetySelect
                    ariaLabel="Team"
                    value={teamId}
                    onChange={setTeamId}
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </NinetySelect>
                </div>
                <div>
                  <FieldLabel>Private To-Do</FieldLabel>
                  <label className="flex h-9 items-center gap-3 text-sm">
                    <Switch
                      checked={isPrivate}
                      onCheckedChange={(v) => setIsPrivate(v === true)}
                    />
                    Make this To-Do private.
                  </label>
                </div>
                <p className="text-muted-foreground col-span-full text-sm">
                  {helperNoun}
                </p>
              </div>
            ) : null}

            {itemType === "Headline" || itemType === "Cascading Message" ? (
              <div className="mt-6">
                <FieldLabel>Team</FieldLabel>
                <NinetySelect
                  ariaLabel="Team"
                  value={teamId}
                  onChange={setTeamId}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </NinetySelect>
                <p className="text-muted-foreground mt-3 text-sm">
                  {helperNoun}
                </p>
              </div>
            ) : null}

            {/* attachments */}
            <div className="border-border mt-8 border-t pt-5">
              <div className="flex items-center gap-2">
                <span className="text-sm">Attachments</span>
                <button
                  type="button"
                  aria-label="Add attachment"
                  onClick={() => toast.info("Attachments are coming soon.")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <CirclePlus className="size-5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="border-border flex shrink-0 items-center gap-3 border-t px-6 py-3.5">
            <button
              type="button"
              disabled={!canCreate}
              onClick={submit}
              className={cn(
                "h-9 flex-[2] rounded-[4px] text-sm transition-colors",
                canCreate
                  ? "text-white hover:opacity-90"
                  : "bg-foreground/5 text-foreground/40 cursor-not-allowed",
              )}
              style={canCreate ? { background: NINETY_ORANGE } : undefined}
            >
              {pending ? "Creating…" : `Create ${itemType}`}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border-border text-muted-foreground hover:bg-foreground/5 h-9 flex-1 rounded-[4px] border text-sm"
            >
              Cancel
            </button>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
          setMinimized(false);
        }}
        disabled={open || teams.length === 0}
        className="h-9 rounded-[4px] bg-[#f05100] px-5 text-sm font-medium text-white hover:bg-[#f05100]/90 disabled:bg-foreground/5 disabled:text-foreground/40"
      >
        Create
      </Button>
      {mounted && open ? createPortal(panel, document.body) : null}
    </>
  );
}