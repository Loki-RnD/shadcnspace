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

export interface TodoInput {
  teamId: string;
  title: string;
  ownerId: string | null;
  dueDate: string | null;
  isPrivate: boolean;
  description?: string | null;
}

export async function createTodo(input: TodoInput) {
  try {
    const user = await assertTeamAccess(input.teamId);
    if (!input.title.trim())
      return { ok: false as const, error: "Title is required." };

    // private to-dos always belong to the acting user's member row
    let ownerId = input.ownerId;
    if (input.isPrivate) {
      const [me] = await sql`
        select id from l10.members
        where team_id = ${input.teamId} and core_user_id = ${user.id}
      `;
      if (!me)
        return {
          ok: false as const,
          error: "You are not a member of this team.",
        };
      ownerId = me.id;
    }

    await sql`
      insert into l10.todos (team_id, owner_id, title, due_date, is_private, source, description)
      values (${input.teamId}, ${ownerId}, ${input.title.trim()},
              ${input.dueDate}, ${input.isPrivate}, 'portal',
              ${input.description?.trim() || null})
    `;
    revalidatePath("/l10/todos");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function updateTodo(input: TodoInput & { todoId: string }) {
  try {
    await assertTeamAccess(input.teamId);
    if (!input.title.trim())
      return { ok: false as const, error: "Title is required." };
    await sql`
      update l10.todos set
        title = ${input.title.trim()}, owner_id = ${input.ownerId},
        due_date = ${input.dueDate}
      where id = ${input.todoId} and team_id = ${input.teamId}
    `;
    revalidatePath("/l10/todos");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleTodo(
  teamId: string,
  todoId: string,
  done: boolean,
) {
  try {
    await assertTeamAccess(teamId);
    await sql`
      update l10.todos set
        status = ${done ? "done" : "open"},
        completed_at = ${done ? new Date().toISOString() : null}
      where id = ${todoId} and team_id = ${teamId}
    `;
    revalidatePath("/l10/todos");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

/** Ninety's "drop down" — the to-do isn't getting done; move it to Issues. */
export async function dropToIssue(teamId: string, todoId: string) {
  try {
    await assertTeamAccess(teamId);
    const [todo] = await sql`
      update l10.todos set status = 'dropped'
      where id = ${todoId} and team_id = ${teamId} and status = 'open'
      returning id, title, owner_id
    `;
    if (!todo)
      return { ok: false as const, error: "To-Do not found or not open" };
    await sql`
      insert into l10.issues (team_id, owner_id, title, term, from_todo_id)
      values (${teamId}, ${todo.owner_id}, ${todo.title}, 'short', ${todo.id})
    `;
    revalidatePath("/l10/todos");
    revalidatePath("/l10/issues");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTodo(teamId: string, todoId: string) {
  try {
    await assertTeamAccess(teamId);
    await sql`delete from l10.todos where id = ${todoId} and team_id = ${teamId}`;
    revalidatePath("/l10/todos");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}
