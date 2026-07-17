// Classifies raw click-tracking targets into meaningful interaction groups
// for the analytics pages. Click labels come from auto-capture (data-track,
// aria-label or text content), so this also normalizes noisy dynamic labels
// (dates, numbers, long item titles). Client- and server-safe.

export const ACTION_CATEGORIES = [
  "Create & Add",
  "Edit & Save",
  "Complete & Status",
  "Delete & Remove",
  "Meeting Flow",
  "Filters & Views",
  "Feature Actions",
  "Navigation",
  "System & Account",
] as const;

export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

export const CATEGORY_DESCRIPTIONS: Record<ActionCategory, string> = {
  "Create & Add": "New records: to-dos, issues, rocks, measurables, users",
  "Edit & Save": "Editing existing records and saving forms",
  "Complete & Status": "Completing items and changing statuses",
  "Delete & Remove": "Deleting or archiving records",
  "Meeting Flow": "Running the Level 10 meeting",
  "Filters & Views": "Filtering, sorting and switching views",
  "Feature Actions": "Other in-feature interactions",
  Navigation: "Moving between pages and modules",
  "System & Account": "Theme, notifications, account menu, ratings",
};

const NAV_LABELS = new Set([
  "dashboard",
  "scorecard",
  "rocks",
  "to-dos",
  "todos",
  "issues",
  "meeting",
  "admin",
  "analytics",
  "eos",
  "back to home",
  "back to sign in",
  "back to analytics",
  "view all errors",
  "view all interactions",
]);

const DATE_LABEL =
  /^(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\s*\d{1,2}([./-]\d{1,2})?$/i;

export interface ClassifiedAction {
  category: ActionCategory;
  /** cleaned display label */
  label: string;
}

export function moduleFromPath(path: string): string {
  const seg = path.split("/")[2] ?? "";
  if (!seg) return "Dashboard";
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

export function classifyAction(target: string, path: string): ClassifiedAction {
  const raw = target.replace(/\s+/g, " ").trim();
  const l = raw.toLowerCase();

  // --- normalize noisy dynamic labels first ---
  if (/^rating-star-\d$/.test(l) || l === "rating-later" || l === "rating-submit") {
    return { category: "System & Account", label: "UX rating prompt" };
  }
  if (/^\d+([.,]\d+)?%?$/.test(l)) {
    return { category: "Feature Actions", label: "Numeric cell" };
  }
  if (DATE_LABEL.test(l)) {
    return { category: "Filters & Views", label: "Date / week cell" };
  }
  const label = raw.length > 48 ? `${moduleFromPath(path)} item` : raw;

  // --- system chrome ---
  if (
    /(toggle theme|notification|account menu|sign out|profile|team settings|search)/.test(l)
  ) {
    return { category: "System & Account", label };
  }

  // --- navigation ---
  if (NAV_LABELS.has(l) || /^back\b|^go to\b/.test(l)) {
    return { category: "Navigation", label };
  }

  // --- meeting flow ---
  if (
    path.startsWith("/l10/meeting") ||
    /(start meeting|next section|conclude|segue|ids\b|wrap[- ]?up)/.test(l)
  ) {
    if (!path.startsWith("/l10/meeting") && !/meeting/.test(l)) {
      // keyword matched but not on the meeting page — fall through below
    } else {
      return { category: "Meeting Flow", label };
    }
  }

  // --- CRUD-ish buckets ---
  if (/^(add|new|create|\+)\b|^\+/.test(l)) return { category: "Create & Add", label };
  if (/^(edit|save|update|submit|rename)\b/.test(l))
    return { category: "Edit & Save", label };
  if (/^(delete|remove|archive)\b/.test(l))
    return { category: "Delete & Remove", label };
  if (/^(mark|complete|done|resolve|close)\b|checkbox|^toggle\b/.test(l))
    return { category: "Complete & Status", label };

  // --- filters, sorting, view switching ---
  if (
    /^(owner|filter|sort|view|show|hide|all|open|closed|weekly|monthly|quarterly|annual|period|prev|next|today|this week|last week|expand|collapse)\b|:$/.test(l) ||
    /^(owner|status|term|cadence):/i.test(raw)
  ) {
    return { category: "Filters & Views", label };
  }

  return { category: "Feature Actions", label };
}

// ---------------------------------------------------------------------------
// Aggregation: raw click rows → categories → merged controls

export interface RawActionRow {
  target: string;
  clicks: number;
  users: number;
  top_path: string;
  last_used: string;
}

export interface GroupedControl {
  label: string;
  module: string;
  clicks: number;
  /** max distinct users across merged raw labels (conservative) */
  users: number;
  last_used: string;
}

export interface ActionGroup {
  category: ActionCategory;
  clicks: number;
  controls: GroupedControl[];
}

export function groupActions(rows: RawActionRow[]): ActionGroup[] {
  const groups = new Map<ActionCategory, Map<string, GroupedControl>>();

  for (const row of rows) {
    const { category, label } = classifyAction(row.target, row.top_path);
    const module = moduleFromPath(row.top_path);
    const byControl = groups.get(category) ?? new Map<string, GroupedControl>();
    const key = `${label}|${module}`;
    const existing = byControl.get(key);
    if (existing) {
      existing.clicks += row.clicks;
      existing.users = Math.max(existing.users, row.users);
      if (row.last_used > existing.last_used) existing.last_used = row.last_used;
    } else {
      byControl.set(key, {
        label,
        module,
        clicks: row.clicks,
        users: row.users,
        last_used: row.last_used,
      });
    }
    groups.set(category, byControl);
  }

  return ACTION_CATEGORIES.map((category) => {
    const byControl = groups.get(category);
    if (!byControl) return null;
    const controls = [...byControl.values()].sort((a, b) => b.clicks - a.clicks);
    return {
      category,
      clicks: controls.reduce((s, c) => s + c.clicks, 0),
      controls,
    };
  }).filter(Boolean) as ActionGroup[];
}
