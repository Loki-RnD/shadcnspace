"use server";

import { revalidatePath } from "next/cache";

import { sql } from "@/lib/l10/db";
import { getSessionUser } from "@/lib/l10/auth/session";
import type { MemberRow } from "@/lib/l10/scorecard";

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

/** Members of a team, for the create dialog's assignee selects. */
export async function membersForTeam(teamId: string): Promise<MemberRow[]> {
  await assertTeamAccess(teamId);
  const rows = await sql`
    select id, full_name from l10.members
    where team_id = ${teamId} and active
    order by full_name
  `;
  return rows as MemberRow[];
}

export interface HeadlineInput {
  teamId: string;
  title: string;
  description: string | null;
  kind: "headline" | "cascading";
}

export async function createHeadline(input: HeadlineInput) {
  try {
    const user = await assertTeamAccess(input.teamId);
    if (!input.title.trim())
      return { ok: false as const, error: "Title is required." };
    const [me] = await sql`
      select id from l10.members
      where team_id = ${input.teamId} and core_user_id = ${user.id}
    `;
    await sql`
      insert into l10.headlines (team_id, owner_id, title, description, kind)
      values (${input.teamId}, ${me?.id ?? null}, ${input.title.trim()},
              ${input.description?.trim() || null}, ${input.kind})
    `;
    revalidatePath("/l10");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}