import "server-only";

import { sql } from "./db";

// Aggregations for the super-admin analytics page (/l10/analytics).
// Raw events land via POST /api/l10/analytics (see analytics-tracker.tsx).

export interface AnalyticsSummary {
  dau: number;
  wau: number;
  mau: number;
  pageviews_30d: number;
  actions_30d: number;
  errors_7d: number;
  avg_rating: string | null;
  ratings_count: number;
}

export async function getSummary(): Promise<AnalyticsSummary> {
  const rows = await sql`
    select
      (select count(distinct user_id) from l10.analytics_events
        where created_at > now() - interval '1 day')::int  as dau,
      (select count(distinct user_id) from l10.analytics_events
        where created_at > now() - interval '7 days')::int as wau,
      (select count(distinct user_id) from l10.analytics_events
        where created_at > now() - interval '30 days')::int as mau,
      (select count(*) from l10.analytics_events
        where event_type = 'pageview'
          and created_at > now() - interval '30 days')::int as pageviews_30d,
      (select count(*) from l10.analytics_events
        where event_type = 'action'
          and created_at > now() - interval '30 days')::int as actions_30d,
      (select count(*) from l10.client_errors
        where created_at > now() - interval '7 days')::int  as errors_7d,
      (select to_char(avg(score), 'FM9.0') from l10.ux_ratings
        where created_at > now() - interval '90 days')      as avg_rating,
      (select count(*) from l10.ux_ratings)::int            as ratings_count
  `;
  return rows[0] as AnalyticsSummary;
}

export interface DailyActivity {
  day: string;
  pageviews: number;
  actives: number;
}

export async function getDailyActivity(): Promise<DailyActivity[]> {
  const rows = await sql`
    select
      to_char(created_at::date, 'YYYY-MM-DD')                     as day,
      count(*) filter (where event_type = 'pageview')::int        as pageviews,
      count(distinct user_id)::int                                as actives
    from l10.analytics_events
    where created_at > now() - interval '14 days'
    group by created_at::date
    order by created_at::date
  `;
  return rows as DailyActivity[];
}

export interface PageUsage {
  path: string;
  views: number;
  users: number;
}

export async function getTopPages(): Promise<PageUsage[]> {
  const rows = await sql`
    select path, count(*)::int as views, count(distinct user_id)::int as users
    from l10.analytics_events
    where event_type = 'pageview'
      and created_at > now() - interval '30 days'
    group by path
    order by views desc
    limit 10
  `;
  return rows as PageUsage[];
}

export interface ActionUsage {
  target: string;
  clicks: number;
  users: number;
  top_path: string;
}

export async function getTopActions(): Promise<ActionUsage[]> {
  const rows = await sql`
    select
      target,
      count(*)::int                 as clicks,
      count(distinct user_id)::int  as users,
      mode() within group (order by path) as top_path
    from l10.analytics_events
    where event_type = 'action'
      and target is not null
      and created_at > now() - interval '30 days'
    group by target
    order by clicks desc
    limit 15
  `;
  return rows as ActionUsage[];
}

export interface ErrorGroup {
  message: string;
  path: string;
  source: string | null;
  occurrences: number;
  affected_users: number;
  last_seen: string;
}

export async function getErrorGroups(): Promise<ErrorGroup[]> {
  const rows = await sql`
    select
      message,
      path,
      source,
      count(*)::int                as occurrences,
      count(distinct user_id)::int as affected_users,
      to_char(max(created_at), 'YYYY-MM-DD HH24:MI') as last_seen
    from l10.client_errors
    where created_at > now() - interval '30 days'
    group by message, path, source
    order by occurrences desc, max(created_at) desc
    limit 15
  `;
  return rows as ErrorGroup[];
}

export interface UserActivity {
  full_name: string;
  email: string;
  system_role: string;
  pageviews: number;
  actions: number;
  last_seen: string | null;
}

export async function getUserActivity(): Promise<UserActivity[]> {
  const rows = await sql`
    select
      u.full_name,
      u.email,
      u.system_role,
      count(e.id) filter (where e.event_type = 'pageview')::int as pageviews,
      count(e.id) filter (where e.event_type = 'action')::int   as actions,
      to_char(max(e.created_at), 'YYYY-MM-DD HH24:MI')          as last_seen
    from core.users u
    left join l10.analytics_events e
      on e.user_id = u.id
      and e.created_at > now() - interval '30 days'
    where u.active
    group by u.id, u.full_name, u.email, u.system_role
    order by max(e.created_at) desc nulls last
  `;
  return rows as UserActivity[];
}

export interface RatingRow {
  score: number;
  comment: string | null;
  path: string | null;
  full_name: string;
  created_at: string;
}

export interface RatingsData {
  distribution: { score: number; count: number }[];
  recent: RatingRow[];
}

export async function getRatings(): Promise<RatingsData> {
  const [distribution, recent] = await Promise.all([
    sql`
      select score::int as score, count(*)::int as count
      from l10.ux_ratings
      group by score
      order by score desc
    `,
    sql`
      select
        r.score::int as score, r.comment, r.path, u.full_name,
        to_char(r.created_at, 'YYYY-MM-DD') as created_at
      from l10.ux_ratings r
      join core.users u on u.id = r.user_id
      order by r.created_at desc
      limit 10
    `,
  ]);
  return {
    distribution: distribution as RatingsData["distribution"],
    recent: recent as RatingRow[],
  };
}

/** Prompt for a rating at most once every 30 days per user. */
export async function shouldPromptRating(userId: string): Promise<boolean> {
  const rows = await sql`
    select exists(
      select 1 from l10.ux_ratings
      where user_id = ${userId}
        and created_at > now() - interval '30 days'
    ) as rated
  `;
  return !(rows[0] as { rated: boolean }).rated;
}
