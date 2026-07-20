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

export interface IssueInput {
  teamId: string;
  title: string;
  description: string | null;
  ownerId: string | null;
  term: "short" | "long";
  priority?: number | null;
}

export async function createIssue(input: IssueInput) {
  try {
    const user = await assertTeamAccess(input.teamId);
    if (!input.title.trim())
      return { ok: false as const, error: "Title is required." };
    const [me] = await sql`
      select id from l10.members
      where team_id = ${input.teamId} and core_user_id = ${user.id}
    `;
    await sql`
      insert into l10.issues (team_id, raised_by, owner_id, title, description, term, priority)
      values (${input.teamId}, ${me?.id ?? null}, ${input.ownerId},
              ${input.title.trim()}, ${input.description?.trim() || null},
              ${input.term}, ${input.priority ?? null})
    `;
    revalidatePath("/l10/issues");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function updateIssue(input: IssueInput & { issueId: string }) {
  try {
    await assertTeamAccess(input.teamId);
    if (!input.title.trim())
      return { ok: false as const, error: "Title is required." };
    await sql`
      update l10.issues set
        title = ${input.title.trim()},
        description = ${input.description?.trim() || null},
        owner_id = ${input.ownerId},
        term = ${input.term}
      where id = ${input.issueId} and team_id = ${input.teamId}
    `;
    revalidatePath("/l10/issues");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function solveIssue(teamId: string, issueId: string) {
  try {
    await assertTeamAccess(teamId);
    await sql`
      update l10.issues set status = 'solved', solved_at = now()
      where id = ${issueId} and team_id = ${teamId}
    `;
    revalidatePath("/l10/issues");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function reopenIssue(teamId: string, issueId: string) {
  try {
    await assertTeamAccess(teamId);
    await sql`
      update l10.issues set status = 'open', solved_at = null
      where id = ${issueId} and team_id = ${teamId}
    `;
    revalidatePath("/l10/issues");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function moveIssueTerm(
  teamId: string,
  issueId: string,
  term: "short" | "long",
) {
  try {
    await assertTeamAccess(teamId);
    await sql`
      update l10.issues set term = ${term}
      where id = ${issueId} and team_id = ${teamId}
    `;
    revalidatePath("/l10/issues");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteIssue(teamId: string, issueId: string) {
  try {
    await assertTeamAccess(teamId);
    await sql`delete from l10.issues where id = ${issueId} and team_id = ${teamId}`;
    revalidatePath("/l10/issues");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}
