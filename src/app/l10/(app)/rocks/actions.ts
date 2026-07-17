"use server";

import { revalidatePath } from "next/cache";

import { sql } from "@/lib/l10/db";
import { getSessionUser } from "@/lib/l10/auth/session";

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

function fail(e: unknown) {
  return {
    ok: false as const,
    error: e instanceof Error ? e.message : "Request failed",
  };
}

export interface RockInput {
  teamId: string;
  title: string;
  ownerId: string | null;
  quarter: string;
  dueDate: string | null;
  isCompany: boolean;
}

export async function createRock(input: RockInput) {
  try {
    await assertTeamAccess(input.teamId);
    if (!input.title.trim())
      return { ok: false as const, error: "Title is required." };
    await sql`
      insert into l10.rocks (team_id, owner_id, quarter, title, due_date, is_company)
      values (${input.teamId}, ${input.ownerId}, ${input.quarter},
              ${input.title.trim()}, ${input.dueDate}, ${input.isCompany})
    `;
    revalidatePath("/l10/rocks");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function updateRock(input: RockInput & { rockId: string }) {
  try {
    await assertTeamAccess(input.teamId);
    if (!input.title.trim())
      return { ok: false as const, error: "Title is required." };
    await sql`
      update l10.rocks set
        title = ${input.title.trim()}, owner_id = ${input.ownerId},
        quarter = ${input.quarter}, due_date = ${input.dueDate},
        is_company = ${input.isCompany}
      where id = ${input.rockId} and team_id = ${input.teamId}
    `;
    revalidatePath("/l10/rocks");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function setRockStatus(
  teamId: string,
  rockId: string,
  status: "on_track" | "off_track" | "done",
) {
  try {
    await assertTeamAccess(teamId);
    await sql`
      update l10.rocks set status = ${status}
      where id = ${rockId} and team_id = ${teamId}
    `;
    revalidatePath("/l10/rocks");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRock(teamId: string, rockId: string) {
  try {
    await assertTeamAccess(teamId);
    await sql`delete from l10.rocks where id = ${rockId} and team_id = ${teamId}`;
    revalidatePath("/l10/rocks");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

// ── Milestones ────────────────────────────────────────────────────────────────

async function rockPctFromMilestones(rockId: string) {
  await sql`
    update l10.rocks r set pct = sub.pct
    from (
      select case when count(*) = 0 then null
             else round(100.0 * count(*) filter (where done) / count(*)) end as pct
      from l10.rock_milestones where rock_id = ${rockId}
    ) sub
    where r.id = ${rockId}
  `;
}

export async function addMilestone(
  teamId: string,
  rockId: string,
  title: string,
  dueDate: string | null,
) {
  try {
    await assertTeamAccess(teamId);
    if (!title.trim())
      return { ok: false as const, error: "Title is required." };
    await sql`
      insert into l10.rock_milestones (rock_id, title, due_date, seq)
      values (${rockId}, ${title.trim()}, ${dueDate},
        (select coalesce(max(seq), 0) + 1 from l10.rock_milestones
         where rock_id = ${rockId}))
    `;
    await rockPctFromMilestones(rockId);
    revalidatePath("/l10/rocks");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleMilestone(
  teamId: string,
  rockId: string,
  milestoneId: string,
  done: boolean,
) {
  try {
    await assertTeamAccess(teamId);
    await sql`
      update l10.rock_milestones
      set done = ${done}, completed_at = ${done ? new Date().toISOString() : null}
      where id = ${milestoneId} and rock_id = ${rockId}
    `;
    await rockPctFromMilestones(rockId);
    revalidatePath("/l10/rocks");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMilestone(
  teamId: string,
  rockId: string,
  milestoneId: string,
) {
  try {
    await assertTeamAccess(teamId);
    await sql`
      delete from l10.rock_milestones
      where id = ${milestoneId} and rock_id = ${rockId}
    `;
    await rockPctFromMilestones(rockId);
    revalidatePath("/l10/rocks");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}
