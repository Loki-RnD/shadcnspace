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
  /** quarterly revenue target; goal_value derives from it (/13.5 wk, /3 mo) */
  quarterly_target: number | null;
  owner_id: string | null;
  owner_name: string | null;
  /** cell values keyed by period start ISO date */
  values: Record<
    string,
    { value: number; rag: "on" | "off" | null; note: string | null }
  >;
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

export interface MonthOption {
  key: string; // 'yyyy-mm'
  label: string; // 'Jul 2026'
}

/** Recent calendar months, newest first (index 0 = current month). */
export function monthOptions(count = 12, today = new Date()): MonthOption[] {
  const out: MonthOption[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1),
    );
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    out.push({
      key: `${d.getUTCFullYear()}-${mm}`,
      label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    });
  }
  return out;
}

/** Weekly windows for the given months ('yyyy-mm'), chronological. A week
 *  belongs to the month containing its Thursday (majority of Mon–Sat days),
 *  so single-month totals stay additive across adjacent months. */
export function weeksForMonths(monthKeys: string[]): PeriodWindow[] {
  const map = new Map<string, PeriodWindow>();
  for (const key of monthKeys) {
    const [y, m] = key.split("-").map(Number);
    if (!y || !m) continue;
    const monthEnd = new Date(Date.UTC(y, m, 0));
    // Monday of the week containing the 1st
    const monday = new Date(Date.UTC(y, m - 1, 1));
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    for (; monday <= monthEnd; monday.setUTCDate(monday.getUTCDate() + 7)) {
      const thursday = new Date(monday);
      thursday.setUTCDate(thursday.getUTCDate() + 3);
      if (thursday.getUTCFullYear() !== y || thursday.getUTCMonth() !== m - 1)
        continue;
      const end = new Date(monday);
      end.setUTCDate(end.getUTCDate() + 5);
      map.set(iso(monday), {
        start: iso(monday),
        end: iso(end),
        label: `${md(monday)} - ${md(end)}`,
        year: monday.getUTCFullYear(),
      });
    }
  }
  return [...map.values()].sort((a, b) => (a.start < b.start ? -1 : 1));
}

/** Periods of a cadence overlapping [from, to] (ISO dates), chronological.
 *  Capped at 120 periods to keep the grid sane. */
export function periodsBetween(
  cadence: Cadence,
  from: string,
  to: string,
): PeriodWindow[] {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const lo = new Date(Date.UTC(fy, fm - 1, fd));
  const hi = new Date(Date.UTC(ty, tm - 1, td));
  if (lo > hi) return [];
  const out: PeriodWindow[] = [];

  if (cadence === "weekly") {
    // Monday of the week containing `from`; Mon–Sat windows overlapping range
    const monday = new Date(lo);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    for (
      ;
      monday <= hi && out.length < 120;
      monday.setUTCDate(monday.getUTCDate() + 7)
    ) {
      const end = new Date(monday);
      end.setUTCDate(end.getUTCDate() + 5);
      if (end < lo) continue;
      out.push({
        start: iso(monday),
        end: iso(end),
        label: `${md(monday)} - ${md(end)}`,
        year: monday.getUTCFullYear(),
      });
    }
  } else if (cadence === "monthly") {
    let y = lo.getUTCFullYear();
    let m = lo.getUTCMonth();
    while (out.length < 120) {
      const start = new Date(Date.UTC(y, m, 1));
      if (start > hi) break;
      out.push({
        start: iso(start),
        end: iso(new Date(Date.UTC(y, m + 1, 0))),
        label: `${MONTHS[m]} ${y}`,
        year: y,
      });
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
  } else if (cadence === "quarterly") {
    let y = lo.getUTCFullYear();
    let q = Math.floor(lo.getUTCMonth() / 3);
    while (out.length < 120) {
      const start = new Date(Date.UTC(y, q * 3, 1));
      if (start > hi) break;
      out.push({
        start: iso(start),
        end: iso(new Date(Date.UTC(y, q * 3 + 3, 0))),
        label: `Q${q + 1} ${y}`,
        year: y,
      });
      q++;
      if (q > 3) {
        q = 0;
        y++;
      }
    }
  } else {
    for (
      let y = lo.getUTCFullYear();
      y <= hi.getUTCFullYear() && out.length < 120;
      y++
    ) {
      out.push({
        start: iso(new Date(Date.UTC(y, 0, 1))),
        end: iso(new Date(Date.UTC(y, 11, 31))),
        label: `${y}`,
        year: y,
      });
    }
  }
  return out;
}

export interface QuarterOption {
  key: string; // 'yyyy-Qn'
  label: string; // 'Q3 2026'
}

/** Recent calendar quarters, newest first (index 0 = current quarter). */
export function quarterOptions(count = 6, today = new Date()): QuarterOption[] {
  const out: QuarterOption[] = [];
  let y = today.getUTCFullYear();
  let q = Math.floor(today.getUTCMonth() / 3); // 0-based
  for (let i = 0; i < count; i++) {
    out.push({ key: `${y}-Q${q + 1}`, label: `Q${q + 1} ${y}` });
    q--;
    if (q < 0) {
      q = 3;
      y--;
    }
  }
  return out;
}

/** Month keys ('yyyy-mm') covered by the given quarters ('yyyy-Qn'). */
export function monthsOfQuarters(quarterKeys: string[]): string[] {
  const out: string[] = [];
  for (const key of quarterKeys) {
    const m = key.match(/^(\d{4})-Q([1-4])$/);
    if (!m) continue;
    const y = Number(m[1]);
    const q = Number(m[2]);
    for (let i = 0; i < 3; i++)
      out.push(`${y}-${String((q - 1) * 3 + i + 1).padStart(2, "0")}`);
  }
  return out;
}

/** Monthly windows for the given months ('yyyy-mm'), chronological. */
export function monthPeriods(monthKeys: string[]): PeriodWindow[] {
  const map = new Map<string, PeriodWindow>();
  for (const key of monthKeys) {
    const [y, m] = key.split("-").map(Number);
    if (!y || !m) continue;
    const start = new Date(Date.UTC(y, m - 1, 1));
    map.set(iso(start), {
      start: iso(start),
      end: iso(new Date(Date.UTC(y, m, 0))),
      label: `${MONTHS[m - 1]} ${y}`,
      year: y,
    });
  }
  return [...map.values()].sort((a, b) => (a.start < b.start ? -1 : 1));
}

/** Quarterly windows for the given quarters ('yyyy-Qn'), chronological. */
export function quarterPeriods(quarterKeys: string[]): PeriodWindow[] {
  const map = new Map<string, PeriodWindow>();
  for (const key of quarterKeys) {
    const m = key.match(/^(\d{4})-Q([1-4])$/);
    if (!m) continue;
    const y = Number(m[1]);
    const q = Number(m[2]) - 1;
    const start = new Date(Date.UTC(y, q * 3, 1));
    map.set(iso(start), {
      start: iso(start),
      end: iso(new Date(Date.UTC(y, q * 3 + 3, 0))),
      label: `Q${q + 1} ${y}`,
      year: y,
    });
  }
  return [...map.values()].sort((a, b) => (a.start < b.start ? -1 : 1));
}

/** Resolve a range-preset key to period windows, chronological.
 *  Numeric keys ('13w', '6m', '8q', '5y') are trailing-N presets; named keys
 *  are calendar windows: tm/lm = this/last month, tq/lq = this/last quarter,
 *  ytd = Jan 1 → today, ty/ly = this/last full year. */
export function presetPeriods(
  cadence: Cadence,
  key: string,
  today = new Date(),
): PeriodWindow[] {
  const trailing = key.match(/^(\d+)[wmqy]$/);
  if (trailing)
    return trailingPeriods(cadence, Number(trailing[1]), today).reverse();

  const y = today.getUTCFullYear();
  const m0 = today.getUTCMonth();
  const todayIso = iso(
    new Date(Date.UTC(y, m0, today.getUTCDate())),
  );
  const monthKey = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const byMonths = (keys: string[]) =>
    cadence === "weekly" ? weeksForMonths(keys) : monthPeriods(keys);

  switch (key) {
    case "tm":
      return byMonths([monthKey(new Date(Date.UTC(y, m0, 1)))]);
    case "lm":
      return byMonths([monthKey(new Date(Date.UTC(y, m0 - 1, 1)))]);
    case "tq":
    case "lq": {
      let q = Math.floor(m0 / 3);
      let qy = y;
      if (key === "lq") {
        q--;
        if (q < 0) {
          q = 3;
          qy--;
        }
      }
      const qk = `${qy}-Q${q + 1}`;
      if (cadence === "quarterly") return quarterPeriods([qk]);
      return byMonths(monthsOfQuarters([qk]));
    }
    case "ytd":
      return periodsBetween(cadence, `${y}-01-01`, todayIso);
    case "ty":
      return periodsBetween(cadence, `${y}-01-01`, `${y}-12-31`);
    case "ly":
      return periodsBetween(cadence, `${y - 1}-01-01`, `${y - 1}-12-31`);
  }
  return trailingPeriods(cadence, undefined, today).reverse();
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
      m.goal_op, m.goal_value, m.goal_min, m.goal_max, m.quarterly_target,
      m.owner_id, o.full_name as owner_name,
      coalesce((
        select json_object_agg(
          w.week_start,
          json_build_object('value', v.value, 'rag', v.rag, 'note', v.note)
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
    quarterly_target:
      r.quarterly_target === null ? null : Number(r.quarterly_target),
    values: Object.fromEntries(
      Object.entries(r.values ?? {}).map(([k, v]) => [
        k,
        { value: Number(v.value), rag: v.rag, note: v.note ?? null },
      ]),
    ),
  }));
}
