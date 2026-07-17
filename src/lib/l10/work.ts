import "server-only";

import { sql } from "./db";

// Data access for Rocks, To-Dos and Issues (l10.* on Neon).

export interface RockMilestone {
  id: string;
  title: string;
  due_date: string | null;
  done: boolean;
  seq: number;
}

export interface RockRow {
  id: string;
  title: string;
  quarter: string;
  status: "on_track" | "off_track" | "done";
  pct: number | null;
  due_date: string | null;
  is_company: boolean;
  owner_id: string | null;
  owner_name: string | null;
  milestones: RockMilestone[];
}

export interface TodoRow {
  id: string;
  title: string;
  horizon: "short" | "long";
  is_private: boolean;
  due_date: string | null;
  open_date: string;
  status: "open" | "done" | "dropped";
  owner_id: string | null;
  owner_name: string | null;
}

export interface IssueRow {
  id: string;
  title: string;
  description: string | null;
  term: "short" | "long";
  status: "open" | "ids" | "solved";
  priority: number | null;
  created_at: string;
  owner_id: string | null;
  owner_name: string | null;
}

/** e.g. 'Q3-2026' — matches the seed convention in l10.rocks.quarter */
export function currentQuarter(today = new Date()): string {
  return `Q${Math.floor(today.getUTCMonth() / 3) + 1}-${today.getUTCFullYear()}`;
}

export async function listRocks(
  teamId: string,
  opts: { archived?: boolean } = {},
): Promise<RockRow[]> {
  const quarter = currentQuarter();
  const rows = await sql`
    select
      r.id, r.title, r.quarter, r.status, r.pct, r.due_date, r.is_company,
      r.owner_id, o.full_name as owner_name,
      coalesce((
        select json_agg(json_build_object(
          'id', ms.id, 'title', ms.title, 'due_date', ms.due_date,
          'done', ms.done, 'seq', ms.seq
        ) order by ms.seq, ms.created_at)
        from l10.rock_milestones ms where ms.rock_id = r.id
      ), '[]'::json) as milestones
    from l10.rocks r
    left join l10.members o on o.id = r.owner_id
    where r.team_id = ${teamId}
      and ((${opts.archived ?? false} and r.quarter <> ${quarter})
        or (not ${opts.archived ?? false} and r.quarter = ${quarter}))
    order by r.is_company desc, o.full_name nulls last, r.created_at
  `;
  return rows as RockRow[];
}

export async function listTodos(
  teamId: string,
  opts: {
    isPrivate: boolean;
    /** member id whose private to-dos to show (required for private) */
    memberId?: string | null;
    archived?: boolean;
  },
): Promise<TodoRow[]> {
  const rows = await sql`
    select
      t.id, t.title, t.horizon, t.is_private, t.due_date, t.open_date,
      t.status, t.owner_id, o.full_name as owner_name
    from l10.todos t
    left join l10.members o on o.id = t.owner_id
    where t.team_id = ${teamId}
      and t.is_private = ${opts.isPrivate}
      and (not ${opts.isPrivate} or t.owner_id = ${opts.memberId ?? null})
      and ((${opts.archived ?? false} and t.status in ('done','dropped'))
        or (not ${opts.archived ?? false} and t.status = 'open'))
    order by t.due_date nulls last, t.created_at
  `;
  return rows as TodoRow[];
}

export async function listIssues(
  teamId: string,
  opts: { term: "short" | "long"; archived?: boolean },
): Promise<IssueRow[]> {
  const rows = await sql`
    select
      i.id, i.title, i.description, i.term, i.status, i.priority,
      i.created_at, i.owner_id, o.full_name as owner_name
    from l10.issues i
    left join l10.members o on o.id = i.owner_id
    where i.team_id = ${teamId}
      and i.term = ${opts.term}
      and ((${opts.archived ?? false} and i.status = 'solved')
        or (not ${opts.archived ?? false} and i.status in ('open','ids')))
    order by i.priority nulls last, i.created_at
  `;
  return rows as IssueRow[];
}

/** The l10.member row belonging to a signed-in core user on this team. */
export async function getMemberForUser(
  teamId: string,
  coreUserId: string,
): Promise<{ id: string } | null> {
  const [row] = await sql`
    select id from l10.members
    where team_id = ${teamId} and core_user_id = ${coreUserId}
  `;
  return (row as { id: string }) ?? null;
}
