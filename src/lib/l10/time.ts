// Kenya runs on East Africa Time (UTC+3, no DST) — the platform's business
// timezone. Servers (Vercel) and Neon run UTC, so "today" and period
// boundaries must be derived explicitly instead of from the process clock.

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Now, shifted so getUTC* getters read Nairobi wall-clock. Pair only with
 *  code that does its calendar math via getUTC* / Date.UTC (all of lib/l10). */
export function nowNairobi(): Date {
  return new Date(Date.now() + EAT_OFFSET_MS);
}

/** Today's date in Nairobi as 'yyyy-mm-dd'. */
export function todayNairobiIso(): string {
  return nowNairobi().toISOString().slice(0, 10);
}
