import "server-only";

import { sql } from "./db";

// Data access for the Rocks Trends view: every quarter's rocks (the list
// page only loads the current quarter) plus the editable quarter windows
// that time-to-complete metrics are judged against.

export interface RockTrendRow {
  id: string;
  title: string;
  quarter: string;
  status: "on_track" | "off_track" | "done";
  is_company: boolean;
  period_mode: "quarter" | "elastic";
  start_date: string | null; // elastic rocks only
  due_date: string | null;
  completed_at: string | null; // ISO timestamp
  owner_id: string | null;
  owner_name: string | null;
}

export interface QuarterPeriod {
  quarter: string;
  start_date: string;
  end_date: string;
}

export interface RockStatusEvent {
  rock_id: string;
  status: "on_track" | "off_track" | "done";
  changed_at: string; // ISO timestamp
}

export async function listRockTrends(teamId: string): Promise<RockTrendRow[]> {
  const rows = await sql`
    select
      r.id, r.title, r.quarter, r.status, r.is_company, r.period_mode,
      to_char(r.start_date, 'YYYY-MM-DD') as start_date,
      to_char(r.due_date, 'YYYY-MM-DD') as due_date,
      to_char(r.completed_at at time zone 'utc', 'YYYY-MM-DD') as completed_at,
      r.owner_id, o.full_name as owner_name
    from l10.rocks r
    left join l10.members o on o.id = r.owner_id
    where r.team_id = ${teamId}
    order by r.quarter, o.full_name nulls last, r.created_at
  `;
  return rows as RockTrendRow[];
}

export async function listQuarterPeriods(): Promise<QuarterPeriod[]> {
  const rows = await sql`
    select quarter,
      to_char(start_date, 'YYYY-MM-DD') as start_date,
      to_char(end_date, 'YYYY-MM-DD') as end_date
    from l10.quarter_periods
    order by start_date
  `;
  return rows as QuarterPeriod[];
}

/** Status-change log for a team's rocks (baseline-seeded by migration 0013,
 *  appended by setRockStatus). Powers the intra-quarter on-track trend. */
export async function listRockStatusEvents(
  teamId: string,
): Promise<RockStatusEvent[]> {
  const rows = await sql`
    select e.rock_id, e.status,
      to_char(e.changed_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as changed_at
    from l10.rock_status_events e
    join l10.rocks r on r.id = e.rock_id
    where r.team_id = ${teamId}
    order by e.changed_at
  `;
  return rows as RockStatusEvent[];
}
