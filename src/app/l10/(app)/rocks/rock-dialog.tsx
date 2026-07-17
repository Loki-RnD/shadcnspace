"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { MemberRow } from "@/lib/l10/scorecard";
import type { RockRow } from "@/lib/l10/work";
import { createRock, updateRock } from "./actions";

export function RockDialog({
  open,
  onOpenChange,
  teamId,
  members,
  quarters,
  defaultQuarter,
  rock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  members: MemberRow[];
  quarters: string[];
  defaultQuarter: string;
  rock: RockRow | null; // present = edit
}) {
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [quarter, setQuarter] = useState(defaultQuarter);
  const [dueDate, setDueDate] = useState("");
  const [isCompany, setIsCompany] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTitle(rock?.title ?? "");
    setOwnerId(rock?.owner_id ?? "");
    setQuarter(rock?.quarter ?? defaultQuarter);
    setDueDate(rock?.due_date?.slice(0, 10) ?? "");
    setIsCompany(rock?.is_company ?? false);
  }, [open, rock, defaultQuarter]);

  function submit() {
    startTransition(async () => {
      const base = {
        teamId,
        title,
        ownerId: ownerId || null,
        quarter,
        dueDate: dueDate || null,
        isCompany,
      };
      const res = rock
        ? await updateRock({ ...base, rockId: rock.id })
        : await createRock(base);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(rock ? "Rock updated" : "Rock created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rock ? "Edit Rock" : "Add Rock"}</DialogTitle>
          <DialogDescription>
            Tangible, manageable goal for the quarter.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rk-title">Title</Label>
            <Input
              id="rk-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Launch the new pricing model"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rk-owner">Owner</Label>
              <NativeSelect
                id="rk-owner"
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rk-quarter">Quarter</Label>
              <NativeSelect
                id="rk-quarter"
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
              >
                {quarters.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rk-due">Due date</Label>
              <Input
                id="rk-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox
                checked={isCompany}
                onCheckedChange={(v) => setIsCompany(v === true)}
              />
              Company Rock
            </label>
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
            {pending ? "Saving…" : rock ? "Save Changes" : "Add Rock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
