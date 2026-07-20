"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import type { Cadence, MemberRow, MetricRow } from "@/lib/l10/scorecard";
import { createMetric, updateMetric } from "./actions";

type GoalOp = "none" | ">=" | "<=" | "band";

// quarterly target → per-cadence goal (matches QT_DIVISOR in actions.ts)
const QT_DIVISOR: Record<Cadence, number> = {
  weekly: 13.5,
  monthly: 3,
  quarterly: 1,
  annual: 0.25,
};

export function MeasurableDialog({
  open,
  onOpenChange,
  teamId,
  cadence,
  members,
  defaultGroup,
  metric,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  cadence: Cadence;
  members: MemberRow[];
  defaultGroup: string | null;
  /** present = edit mode */
  metric: MetricRow | null;
}) {
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [unit, setUnit] = useState("");
  const [goalOp, setGoalOp] = useState<GoalOp>("none");
  const [goalValue, setGoalValue] = useState("");
  const [goalMin, setGoalMin] = useState("");
  const [goalMax, setGoalMax] = useState("");
  const [quarterlyTarget, setQuarterlyTarget] = useState("");
  const [pending, startTransition] = useTransition();

  const qtNum = quarterlyTarget.trim() === "" ? null : Number(quarterlyTarget);
  const derivedGoal =
    qtNum !== null && Number.isFinite(qtNum)
      ? Math.round((qtNum / QT_DIVISOR[cadence]) * 100) / 100
      : null;

  // (re)hydrate fields whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setTitle(metric?.title ?? "");
    setOwnerId(
      metric?.owner_name
        ? (members.find((m) => m.full_name === metric.owner_name)?.id ?? "")
        : "",
    );
    setUnit(metric?.unit ?? "");
    setGoalOp((metric?.goal_op as GoalOp) ?? "none");
    setGoalValue(metric?.goal_value?.toString() ?? "");
    setGoalMin(metric?.goal_min?.toString() ?? "");
    setGoalMax(metric?.goal_max?.toString() ?? "");
    setQuarterlyTarget(metric?.quarterly_target?.toString() ?? "");
  }, [open, metric, members]);

  function submit() {
    const num = (s: string) => (s.trim() === "" ? null : Number(s));
    if (
      derivedGoal === null &&
      goalOp !== "none" &&
      goalOp !== "band" &&
      num(goalValue) === null
    ) {
      toast.error("Enter a goal value");
      return;
    }
    startTransition(async () => {
      const base = {
        teamId,
        cadence,
        title,
        ownerId: ownerId || null,
        unit: unit || null,
        groupName: metric?.group_name ?? defaultGroup,
        goalOp: goalOp === "none" ? null : goalOp,
        goalValue: goalOp === ">=" || goalOp === "<=" ? num(goalValue) : null,
        goalMin: goalOp === "band" ? num(goalMin) : null,
        goalMax: goalOp === "band" ? num(goalMax) : null,
        quarterlyTarget: goalOp === ">=" ? qtNum : null,
      };
      const res = metric
        ? await updateMetric({ ...base, metricId: metric.id })
        : await createMetric(base);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(metric ? "Measurable updated" : "Measurable created");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {metric ? "Edit Measurable" : "New Measurable"}
          </DialogTitle>
          <DialogDescription>
            {(metric?.group_name ?? defaultGroup)
              ? `Group: ${metric?.group_name ?? defaultGroup} · `
              : null}
            {cadence[0].toUpperCase() + cadence.slice(1)} cadence
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nm-title">Title</Label>
            <Input
              id="nm-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly revenue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nm-owner">Owner</Label>
              <NativeSelect
                id="nm-owner"
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
              <Label htmlFor="nm-unit">Unit</Label>
              <Input
                id="nm-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="KES, pct, count…"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nm-goal-op">Goal</Label>
              <NativeSelect
                id="nm-goal-op"
                value={goalOp}
                onChange={(e) => setGoalOp(e.target.value as GoalOp)}
              >
                <option value="none">No goal</option>
                <option value=">=">At least (≥)</option>
                <option value="<=">At most (≤)</option>
                <option value="band">Between</option>
              </NativeSelect>
            </div>
            {goalOp === ">=" || goalOp === "<=" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nm-goal-value">Goal value</Label>
                <Input
                  id="nm-goal-value"
                  inputMode="decimal"
                  value={derivedGoal !== null ? String(derivedGoal) : goalValue}
                  disabled={derivedGoal !== null}
                  onChange={(e) => setGoalValue(e.target.value)}
                />
              </div>
            ) : null}
            {goalOp === "band" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nm-goal-min">Min</Label>
                  <Input
                    id="nm-goal-min"
                    inputMode="decimal"
                    value={goalMin}
                    onChange={(e) => setGoalMin(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nm-goal-max">Max</Label>
                  <Input
                    id="nm-goal-max"
                    inputMode="decimal"
                    value={goalMax}
                    onChange={(e) => setGoalMax(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>
          {goalOp === ">=" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nm-qtr-target">Quarterly target (optional)</Label>
              <Input
                id="nm-qtr-target"
                inputMode="decimal"
                value={quarterlyTarget}
                onChange={(e) => setQuarterlyTarget(e.target.value)}
                placeholder="e.g. 16500000"
              />
              <p className="text-muted-foreground text-xs">
                Splits evenly per period — monthly ÷3, weekly ÷13.5. Overrides
                the goal value.
              </p>
            </div>
          ) : null}
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
            {pending
              ? "Saving…"
              : metric
                ? "Save Changes"
                : "Create Measurable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
