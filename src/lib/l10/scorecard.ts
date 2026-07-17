import "server-only";

import { sql } from "./db";

// Weeks run Monday → Saturday to match the HOD workbook. Non-weekly cadences
// (monthly/quarterly/annual) use calendar periods; all share scorecard_weeks
// rows disambiguated by `cadence` (migration 0004).

export type Cadence = "weekly" | "monthly" | "quarterly" | "annual";

export interface TeamRow {
  id: string;
  name: string;
  business_short: string;
}

export interface MemberRow {
  id: string;
  full_name: string;
}

export interface PeriodWindow {
  start: string; // ISO yyyy-mm-dd
  end: string; // ISO yyyy-mm-dd
  label: string; // column header, e.g. 'Jul 13 - Jul 19' / 'Jul 2026' / 'Q3 2026'
  year: number; // for the year band above the columns
}

export interface MetricRow {
  id: string;
  seq: number;
  group_name: string | null;
  title: string;
  unit: string | null;
  goal_text: string | null;
  goal_op: ">=" | "<=" | "band" | null;
  goal_value: number | null;
  goal_min: number | null;
  goal_max: number | null;
  owner_name: string | null;
  /** cell values keyed by period start ISO date */
  values: Record<string, { value: number; rag: "on" | "off" | null }>;
}

export async function listTeamsForCompanies(
  companies: string[],
): Promise<TeamRow[]> {
  const rows = await sql`
    select t.id, t.name, b.short_name as business_short
    from l10.teams t
    join core.businesses b on b.id = t.business_id
    where b.short_name = any(${companies})
    order by b.code, t.name
  `;
  return rows as TeamRow[];
}

export async function listTeamMembers(teamId: string): Promise<MemberRow[]> {
  const rows = await sql`
    select id, full_name from l10.members
    where team_id = ${teamId} and active
    order by full_name
  `;
  return rows as MemberRow[];
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function md(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Trailing periods for a cadence, newest first (index 0 = current period). */
export function trailingPeriods(
  cadence: Cadence,
  count?: number,
  today = new Date(),
): PeriodWindow[] {
  const n =
    count ??
    { weekly: 13, monthly: 13, quarterly: 8, annual: 5 }[cadence];
  const t = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const out: PeriodWindow[] = [];

  for (let i = 0; i < n; i++) {
    let start: Date;
    let end: Date;
    let label: string;

    if (cadence === "weekly") {
      // Monday of the current week, minus i weeks; ends Saturday.
      start = new Date(t);
      start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7) - i * 7);
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 5);
      label = `${md(start)} - ${md(end)}`;
    } else if (cadence === "monthly") {
      start = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - i, 1));
      end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
      label = `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
    } else if (cadence === "quarterly") {
      const q = Math.floor(t.getUTCMonth() / 3) - i;
      start = new Date(Date.UTC(t.getUTCFullYear(), q * 3, 1));
      end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0));
      label = `Q${Math.floor(start.getUTCMonth() / 3) + 1} ${start.getUTCFullYear()}`;
    } else {
      start = new Date(Date.UTC(t.getUTCFullYear() - i, 0, 1));
      end = new Date(Date.UTC(t.getUTCFullYear() - i, 11, 31));
      label = `${start.getUTCFullYear()}`;
    }

    out.push({ start: iso(start), end: iso(end), label, year: start.getUTCFullYear() });
  }
  return out;
}

/** Metrics + cell values for a team/cadence over the given period windows. */
export async function getScorecard(
  teamId: string,
  cadence: Cadence,
  periods: PeriodWindow[],
): Promise<MetricRow[]> {
  const starts = periods.map((p) => p.start);
  const rows = (await sql`
    select
      m.id, m.seq, m.group_name, m.title, m.unit, m.goal_text,
      m.goal_op, m.goal_value, m.goal_min, m.goal_max,
      o.full_name as owner_name,
      coalesce((
        select json_object_agg(
          w.week_start,
          json_build_object('value', v.value, 'rag', v.rag)
        )
        from l10.scorecard_values v
        join l10.scorecard_weeks w on w.id = v.week_id
        where v.metric_id = m.id
          and w.cadence = ${cadence}
          and w.week_start = any(${starts}::date[])
          and v.value is not null
      ), '{}'::json) as values
    from l10.scorecard_metrics m
    left join l10.members o on o.id = m.owner_id
    where m.team_id = ${teamId} and m.active and m.cadence = ${cadence}
    order by m.group_name nulls first, m.seq
  `) as Array<Omit<MetricRow, "values"> & { values: MetricRow["values"] }>;

  return rows.map((r) => ({
    ...r,
    goal_value: r.goal_value === null ? null : Number(r.goal_value),
    goal_min: r.goal_min === null ? null : Number(r.goal_min),
    goal_max: r.goal_max === null ? null : Number(r.goal_max),
    values: Object.fromEntries(
      Object.entries(r.values ?? {}).map(([k, v]) => [
        k,
        { value: Number(v.value), rag: v.rag },
      ]),
    ),
  }));
}
