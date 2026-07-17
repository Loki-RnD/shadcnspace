import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/l10/auth/token";
import { sql } from "@/lib/l10/db";

export const dynamic = "force-dynamic";

const MAX_BATCH = 25;

type IncomingEvent = {
  kind?: unknown;
  path?: unknown;
  target?: unknown;
  message?: unknown;
  stack?: unknown;
  source?: unknown;
  score?: unknown;
  comment?: unknown;
};

const str = (v: unknown, max: number) =>
  typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;

function parseUserAgent(ua: string | null) {
  if (!ua) return { device: null, browser: null, os: null };

  const device = /iPad|Tablet/i.test(ua)
    ? "Tablet"
    : /Mobi|iPhone|Android.*Mobile/i.test(ua)
      ? "Phone"
      : "Desktop";

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "Other";

  const os = /Windows NT/.test(ua)
    ? "Windows"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Android/.test(ua)
          ? "Android"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";

  return { device, browser, os };
}

export async function POST(request: NextRequest) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let events: IncomingEvent[];
  let sessionId: string | null;
  try {
    // sendBeacon posts text/plain, so parse the raw body rather than .json()
    const body = JSON.parse(await request.text()) as {
      events?: unknown;
      sessionId?: unknown;
    };
    if (!Array.isArray(body.events)) throw new Error("bad shape");
    events = body.events.slice(0, MAX_BATCH) as IncomingEvent[];
    sessionId = str(body.sessionId, 64);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;
  const { device, browser, os } = parseUserAgent(userAgent);
  const inserts: Promise<unknown>[] = [];

  for (const e of events) {
    const path = str(e.path, 300) ?? "/l10";
    if (e.kind === "pageview" || e.kind === "action") {
      inserts.push(
        sql`
          insert into l10.analytics_events
            (user_id, event_type, path, target, session_id, device, browser, os)
          values
            (${user.id}, ${e.kind}, ${path}, ${str(e.target, 120)},
             ${sessionId}, ${device}, ${browser}, ${os})
        `,
      );
    } else if (e.kind === "error") {
      const message = str(e.message, 500);
      if (!message) continue;
      inserts.push(
        sql`
          insert into l10.client_errors (user_id, path, source, message, stack, user_agent)
          values (${user.id}, ${path}, ${str(e.source, 200)}, ${message},
                  ${str(e.stack, 4000)}, ${userAgent})
        `,
      );
    } else if (e.kind === "rating") {
      const score = Number(e.score);
      if (!Number.isInteger(score) || score < 1 || score > 5) continue;
      inserts.push(
        sql`
          insert into l10.ux_ratings (user_id, score, comment, path)
          values (${user.id}, ${score}, ${str(e.comment, 1000)}, ${path})
        `,
      );
    }
  }

  await Promise.all(inserts);
  return NextResponse.json({ ok: true, stored: inserts.length });
}
