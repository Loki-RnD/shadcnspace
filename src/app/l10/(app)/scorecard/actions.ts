"use server";

import { revalidatePath } from "next/cache";

import { sql } from "@/lib/l10/db";
import { getSessionUser } from "@/lib/l10/auth/session";
import type { Cadence } from "@/lib/l10/scorecard";

async function assertTeamAccess(teamId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in");
  const [team] = await sql`
    select t.id from l10.teams t
    join core.businesses b on b.id = t.business_id
    where t.id = ${teamId} and b.short_name = any(${user.companies})
  `;
  if (!team) throw new Error("Team not found or no access");
  return user;
}

export interface SaveCellInput {
  metricId: string;
  cadence: Cadence;
  periodStart: string; // ISO yyyy-mm-dd
  periodEnd: string; // ISO yyyy-mm-dd
  label: string;
  value: number | null; // null clears the cell
  /** omit = leave note untouched; '' or null clears it */
  note?: string | null;
}

export interface SaveCellResult {
  ok: boolean;
  rag: "on" | "off" | null;
  error?: string;
}

export async function saveCellValue(
  input: SaveCellInput,
): Promise<SaveCellResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, rag: null, error: "Not signed in" };

  try {
    const [metric] = await sql`
      select m.id, m.team_id, m.goal_op, m.goal_value, m.goal_min, m.goal_max
      from l10.scorecard_metrics m
      join l10.teams t on t.id = m.team_id
      join core.businesses b on b.id = t.business_id
      where m.id = ${input.metricId} and b.short_name = any(${user.companies})
    `;
    if (!metric) return { ok: false, rag: null, error: "Metric not found" };

    // Materialize the period column on first write (idempotent).
    const [week] = await sql`
      insert into l10.scorecard_weeks
        (team_id, cadence, week_start, week_end, label, month_anchor)
      values (
        ${metric.team_id}, ${input.cadence}, ${input.periodStart},
        ${input.periodEnd}, ${input.label},
        date_trunc('month', ${input.periodStart}::date)::date
      )
      on conflict (team_id, cadence, week_start)
        do update set label = excluded.label
      returning id
    `;

    if (input.value === null) {
      await sql`
        delete from l10.scorecard_values
        where metric_id = ${input.metricId} and week_id = ${week.id}
      `;
      revalidatePath("/l10/scorecard");
      return { ok: true, rag: null };
    }

    const v = input.value;
    let rag: "on" | "off" | null = null;
    if (metric.goal_op === ">=" && metric.goal_value !== null)
      rag = v >= Number(metric.goal_value) ? "on" : "off";
    else if (metric.goal_op === "<=" && metric.goal_value !== null)
      rag = v <= Number(metric.goal_value) ? "on" : "off";
    else if (
      metric.goal_op === "band" &&
      metric.goal_min !== null &&
      metric.goal_max !== null
    )
      rag =
        v >= Number(metric.goal_min) && v <= Number(metric.goal_max)
          ? "on"
          : "off";

    const [member] = await sql`
      select m.id from l10.members m
      where m.team_id = ${metric.team_id} and m.core_user_id = ${user.id}
    `;

    await sql`
      insert into l10.scorecard_values (metric_id, week_id, value, rag, source, entered_by)
      values (${input.metricId}, ${week.id}, ${v}, ${rag}, 'manual', ${member?.id ?? null})
      on conflict (metric_id, week_id) do update
        set value = excluded.value, rag = excluded.rag,
            source = excluded.source, entered_by = excluded.entered_by
    `;

    if (input.note !== undefined) {
      await sql`
        update l10.scorecard_values
        set note = ${input.note?.trim() || null}
        where metric_id = ${input.metricId} and week_id = ${week.id}
      `;
    }

    revalidatePath("/l10/scorecard");
    return { ok: true, rag };
  } catch (e) {
    return {
      ok: false,
      rag: null,
      error: e instanceof Error ? e.message : "Save failed",
    };
  }
}

export interface CreateMetricInput {
  teamId: string;
  cadence: Cadence;
  title: string;
  ownerId: string | null;
  unit: string | null;
  groupName: string | null;
  goalOp: ">=" | "<=" | "band" | null;
  goalValue: number | null;
  goalMin: number | null;
  goalMax: number | null;
  /** quarterly target; when set the goal derives from it per cadence */
  quarterlyTarget?: number | null;
}

// Quarterly targets divide evenly: monthly = /3, weekly = monthly/4.5 (the
// workbook's =K6/4.5 convention). quarterly_target / divisor = goal_value.
// (duplicated in new-measurable-dialog.tsx — "use server" can't export consts)
const QT_DIVISOR: Record<Cadence, number> = {
  weekly: 13.5,
  monthly: 3,
  quarterly: 1,
  annual: 0.25,
};

function deriveGoalFromQuarterly(cadence: Cadence, qt: number) {
  const value = Math.round((qt / QT_DIVISOR[cadence]) * 100) / 100;
  // goal column shows just the number — keep it uncluttered
  const text = value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return { value, text };
}

/** Effective goal fields: a quarterly target overrides manual >=/<= goals. */
function resolveGoal(input: CreateMetricInput) {
  const qt = input.quarterlyTarget ?? null;
  if (qt !== null) {
    const d = deriveGoalFromQuarterly(input.cadence, qt);
    return {
      quarterlyTarget: qt,
      goalOp: ">=" as const,
      goalValue: d.value,
      goalMin: null,
      goalMax: null,
      goalText: d.text,
    };
  }
  const goalText =
    input.goalOp === "band"
      ? `${input.goalMin ?? "?"}-${input.goalMax ?? "?"}`
      : input.goalOp && input.goalValue !== null
        ? `${input.goalOp === ">=" ? ">=" : "<="} ${input.goalValue}`
        : null;
  return {
    quarterlyTarget: null,
    goalOp: input.goalOp,
    goalValue: input.goalValue,
    goalMin: input.goalMin,
    goalMax: input.goalMax,
    goalText,
  };
}

export async function createMetric(input: CreateMetricInput) {
  try {
    await assertTeamAccess(input.teamId);
    if (!input.title.trim())
      return { ok: false as const, error: "Title is required." };

    const g = resolveGoal(input);

    await sql`
      insert into l10.scorecard_metrics
        (team_id, seq, cadence, group_name, owner_id, title, unit,
         goal_text, goal_op, goal_value, goal_min, goal_max,
         quarterly_target, source)
      values (
        ${input.teamId},
        (select coalesce(max(seq), 0) + 1 from l10.scorecard_metrics
         where team_id = ${input.teamId} and cadence = ${input.cadence}),
        ${input.cadence},
        ${input.groupName?.trim() || (input.cadence === "weekly" ? "Weekly KPIs" : null)},
        ${input.ownerId}, ${input.title.trim()}, ${input.unit?.trim() || null},
        ${g.goalText}, ${g.goalOp}, ${g.goalValue},
        ${g.goalMin}, ${g.goalMax}, ${g.quarterlyTarget}, 'manual'
      )
    `;
    revalidatePath("/l10/scorecard");
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Create failed",
    };
  }
}

export interface UpdateMetricInput extends CreateMetricInput {
  metricId: string;
}

export async function updateMetric(input: UpdateMetricInput) {
  try {
    await assertTeamAccess(input.teamId);
    if (!input.title.trim())
      return { ok: false as const, error: "Title is required." };

    const g = resolveGoal(input);

    const [row] = await sql`
      update l10.scorecard_metrics set
        title = ${input.title.trim()},
        owner_id = ${input.ownerId},
        unit = ${input.unit?.trim() || null},
        group_name = ${input.groupName?.trim() || null},
        goal_text = ${g.goalText},
        goal_op = ${g.goalOp},
        goal_value = ${g.goalValue},
        goal_min = ${g.goalMin},
        goal_max = ${g.goalMax},
        quarterly_target = ${g.quarterlyTarget}
      where id = ${input.metricId} and team_id = ${input.teamId}
      returning id
    `;
    if (!row) return { ok: false as const, error: "Metric not found" };

    // re-derive RAG for existing values against the new goal
    await sql`
      update l10.scorecard_values v set rag = case
        when ${g.goalOp}::text = '>=' and ${g.goalValue}::numeric is not null
          then case when v.value >= ${g.goalValue} then 'on' else 'off' end
        when ${g.goalOp}::text = '<=' and ${g.goalValue}::numeric is not null
          then case when v.value <= ${g.goalValue} then 'on' else 'off' end
        when ${g.goalOp}::text = 'band'
             and ${g.goalMin}::numeric is not null
             and ${g.goalMax}::numeric is not null
          then case when v.value between ${g.goalMin} and ${g.goalMax}
                    then 'on' else 'off' end
        else null
      end
      where v.metric_id = ${input.metricId} and v.value is not null
    `;

    revalidatePath("/l10/scorecard");
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Update failed",
    };
  }
}

export async function archiveMetric(metricId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  try {
    const [row] = await sql`
      update l10.scorecard_metrics m set active = false
      from l10.teams t
      join core.businesses b on b.id = t.business_id
      where m.id = ${metricId} and m.team_id = t.id
        and b.short_name = any(${user.companies})
      returning m.id
    `;
    if (!row) return { ok: false as const, error: "Metric not found" };
    revalidatePath("/l10/scorecard");
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Archive failed",
    };
  }
}
