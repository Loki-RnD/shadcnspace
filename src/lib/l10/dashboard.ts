import "server-only";

import { sql } from "./db";
import { trailingPeriods } from "./scorecard";
import { currentQuarter } from "./work";

// Aggregate KPIs for the dashboard landing page. All four run in one
// Promise.all round-trip against l10.* on Neon.

export interface DashboardStats {
  /** current week when rated values exist, else previous week; null = no data */
  scorecard: { onGoal: number; rated: number; weekStart: string } | null;
  rocks: { onTrack: number; total: number };
  todos: { open: number; dueSoon: number };
  issues: { open: number };
}

export async function getDashboardStats(
  teamId: string,
): Promise<DashboardStats> {
  const [thisWeek, lastWeek] = trailingPeriods("weekly", 2);
  const quarter = currentQuarter();

  const [scorecardRows, rockRows, todoRows, issueRows] = await Promise.all([
    sql`
      select
        to_char(w.week_start, 'YYYY-MM-DD') as week_start,
        count(*) filter (where v.rag = 'on')::int as on_goal,
        count(*) filter (where v.rag is not null)::int as rated
      from l10.scorecard_values v
      join l10.scorecard_weeks w on w.id = v.week_id
      join l10.scorecard_metrics m on m.id = v.metric_id
      where m.team_id = ${teamId} and m.active and m.cadence = 'weekly'
        and w.cadence = 'weekly'
        and w.week_start in (${thisWeek.start}::date, ${lastWeek.start}::date)
        and v.value is not null
      group by w.week_start
    `,
    sql`
      select
        count(*)::int as total,
        count(*) filter (where status in ('on_track', 'done'))::int as on_track
      from l10.rocks
      where team_id = ${teamId} and quarter = ${quarter}
    `,
    sql`
      select
        count(*)::int as open,
        count(*) filter (where due_date <= current_date + 7)::int as due_soon
      from l10.todos
      where team_id = ${teamId} and status = 'open' and not is_private
    `,
    sql`
      select count(*)::int as open
      from l10.issues
      where team_id = ${teamId} and term = 'short' and status in ('open', 'ids')
    `,
  ]);

  const weeks = scorecardRows as Array<{
    week_start: string;
    on_goal: number;
    rated: number;
  }>;
  const week =
    weeks.find((w) => w.week_start === thisWeek.start && w.rated > 0) ??
    weeks.find((w) => w.week_start === lastWeek.start && w.rated > 0) ??
    null;

  const rocks = rockRows[0] as { total: number; on_track: number };
  const todos = todoRows[0] as { open: number; due_soon: number };
  const issues = issueRows[0] as { open: number };

  return {
    scorecard: week
      ? {
          onGoal: Number(week.on_goal),
          rated: Number(week.rated),
          weekStart: week.week_start,
        }
      : null,
    rocks: { onTrack: Number(rocks.on_track), total: Number(rocks.total) },
    todos: { open: Number(todos.open), dueSoon: Number(todos.due_soon) },
    issues: { open: Number(issues.open) },
  };
}