import "server-only";

import { sql } from "./db";

// Aggregations for the super-admin analytics page (/l10/analytics).
// Raw events land via POST /api/l10/analytics (see analytics-tracker.tsx).
// Every query takes the master period filter as a number of hours
// (null = lifetime).

export const PERIODS = [
  { key: "24h", label: "Last 24 Hours", hours: 24 },
  { key: "7d", label: "Last 7 Days", hours: 168 },
  { key: "14d", label: "Last 14 Days", hours: 336 },
  { key: "30d", label: "Last 30 Days", hours: 720 },
  { key: "3m", label: "Last 3 Months", hours: 2190 },
  { key: "6m", label: "Last 6 Months", hours: 4380 },
  { key: "12m", label: "Last 12 Months", hours: 8760 },
  { key: "life", label: "Lifetime", hours: null },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];

export function resolvePeriod(key: string | undefined) {
  return PERIODS.find((p) => p.key === key) ?? PERIODS[3]; // default 30d
}

// Lifetime is approximated with a far past cutoff so every query can use
// a single `created_at > cutoff` shape (Neon sql`` cannot compose fragments).
const LIFETIME_HOURS = 24 * 365 * 50;

export interface AnalyticsSummary {
  visitors: number;
  visitors_prev: number;
  pageviews: number;
  pageviews_prev: number;
  actions: number;
  bounce_rate: string | null;
  errors: number;
  avg_rating: string | null;
  ratings_count: number;
}

export async function getSummary(hours: number | null): Promise<AnalyticsSummary> {
  const h = hours ?? LIFETIME_HOURS;
  const rows = await sql`
    with cur as (
      select * from l10.analytics_events
      where created_at > now() - make_interval(hours => ${h})
    ),
    prev as (
      select * from l10.analytics_events
      where created_at > now() - make_interval(hours => ${h * 2})
        and created_at <= now() - make_interval(hours => ${h})
    ),
    sessions as (
      select session_id, count(*) filter (where event_type = 'pageview') as views
      from cur
      where session_id is not null
      group by session_id
    )
    select
      (select count(distinct user_id) from cur)::int  as visitors,
      (select count(distinct user_id) from prev)::int as visitors_prev,
      (select count(*) from cur where event_type = 'pageview')::int  as pageviews,
      (select count(*) from prev where event_type = 'pageview')::int as pageviews_prev,
      (select count(*) from cur where event_type = 'action')::int    as actions,
      (select to_char(100.0 * count(*) filter (where views <= 1) / nullif(count(*), 0), 'FM990.0')
        from sessions where views > 0)                               as bounce_rate,
      (select count(*) from l10.client_errors
        where created_at > now() - make_interval(hours => ${h}))::int as errors,
      (select to_char(avg(score), 'FM9.0') from l10.ux_ratings
        where created_at > now() - make_interval(hours => ${h}))     as avg_rating,
      (select count(*) from l10.ux_ratings
        where created_at > now() - make_interval(hours => ${h}))::int as ratings_count
  `;
  return rows[0] as AnalyticsSummary;
}

export interface SeriesPoint {
  bucket: string;
  pageviews: number;
  visitors: number;
}

/** Time series bucketed to fit the window: hours (≤48h), days (≤93d), months. */
export async function getSeries(hours: number | null): Promise<SeriesPoint[]> {
  const h = hours ?? LIFETIME_HOURS;
  const unit = h <= 48 ? "hour" : h <= 2232 ? "day" : "month";
  const fmt = unit === "hour" ? "HH24:00" : unit === "day" ? "Mon DD" : "Mon YYYY";
  const rows = await sql`
    select
      to_char(date_trunc(${unit}, created_at), ${fmt})        as bucket,
      count(*) filter (where event_type = 'pageview')::int    as pageviews,
      count(distinct user_id)::int                            as visitors
    from l10.analytics_events
    where created_at > now() - make_interval(hours => ${h})
    group by date_trunc(${unit}, created_at)
    order by date_trunc(${unit}, created_at)
  `;
  return rows as SeriesPoint[];
}

export interface BreakdownSlice {
  name: string;
  count: number;
}

export interface Breakdowns {
  devices: BreakdownSlice[];
  browsers: BreakdownSlice[];
  systems: BreakdownSlice[];
}

export async function getBreakdowns(hours: number | null): Promise<Breakdowns> {
  const h = hours ?? LIFETIME_HOURS;
  const [devices, browsers, systems] = await Promise.all([
    sql`
      select device as name, count(distinct session_id)::int as count
      from l10.analytics_events
      where device is not null and created_at > now() - make_interval(hours => ${h})
      group by device order by count desc
    `,
    sql`
      select browser as name, count(distinct session_id)::int as count
      from l10.analytics_events
      where browser is not null and created_at > now() - make_interval(hours => ${h})
      group by browser order by count desc
    `,
    sql`
      select os as name, count(distinct session_id)::int as count
      from l10.analytics_events
      where os is not null and created_at > now() - make_interval(hours => ${h})
      group by os order by count desc
    `,
  ]);
  return {
    devices: devices as BreakdownSlice[],
    browsers: browsers as BreakdownSlice[],
    systems: systems as BreakdownSlice[],
  };
}

export interface ModuleUsage {
  module: string;
  current: number;
  previous: number;
}

/** Pageviews per app module — this month vs previous month (radar chart). */
export async function getModuleUsage(): Promise<ModuleUsage[]> {
  const rows = await sql`
    select
      initcap(coalesce(nullif(split_part(path, '/', 3), ''), 'dashboard')) as module,
      count(*) filter (where created_at >= date_trunc('month', now()))::int as current,
      count(*) filter (
        where created_at >= date_trunc('month', now()) - interval '1 month'
          and created_at < date_trunc('month', now()))::int as previous
    from l10.analytics_events
    where event_type = 'pageview'
      and created_at >= date_trunc('month', now()) - interval '1 month'
    group by 1
    order by 2 desc
    limit 8
  `;
  return rows as ModuleUsage[];
}

export interface PageUsage {
  path: string;
  views: number;
  users: number;
}

export async function getTopPages(hours: number | null): Promise<PageUsage[]> {
  const h = hours ?? LIFETIME_HOURS;
  const rows = await sql`
    select path, count(*)::int as views, count(distinct user_id)::int as users
    from l10.analytics_events
    where event_type = 'pageview'
      and created_at > now() - make_interval(hours => ${h})
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

export async function getTopActions(hours: number | null): Promise<ActionUsage[]> {
  const h = hours ?? LIFETIME_HOURS;
  const rows = await sql`
    select
      target,
      count(*)::int                 as clicks,
      count(distinct user_id)::int  as users,
      mode() within group (order by path) as top_path
    from l10.analytics_events
    where event_type = 'action'
      and target is not null
      and created_at > now() - make_interval(hours => ${h})
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

export async function getErrorGroups(hours: number | null): Promise<ErrorGroup[]> {
  const h = hours ?? LIFETIME_HOURS;
  const rows = await sql`
    select
      message,
      path,
      source,
      count(*)::int                as occurrences,
      count(distinct user_id)::int as affected_users,
      to_char(max(created_at), 'YYYY-MM-DD HH24:MI') as last_seen
    from l10.client_errors
    where created_at > now() - make_interval(hours => ${h})
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

export async function getUserActivity(hours: number | null): Promise<UserActivity[]> {
  const h = hours ?? LIFETIME_HOURS;
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
      and e.created_at > now() - make_interval(hours => ${h})
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

export async function getRatings(hours: number | null): Promise<RatingsData> {
  const h = hours ?? LIFETIME_HOURS;
  const [distribution, recent] = await Promise.all([
    sql`
      select score::int as score, count(*)::int as count
      from l10.ux_ratings
      where created_at > now() - make_interval(hours => ${h})
      group by score
      order by score desc
    `,
    sql`
      select
        r.score::int as score, r.comment, r.path, u.full_name,
        to_char(r.created_at, 'YYYY-MM-DD') as created_at
      from l10.ux_ratings r
      join core.users u on u.id = r.user_id
      where r.created_at > now() - make_interval(hours => ${h})
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
