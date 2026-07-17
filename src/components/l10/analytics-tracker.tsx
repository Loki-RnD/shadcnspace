"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type QueuedEvent = {
  kind: "pageview" | "action" | "error";
  path: string;
  target?: string;
  message?: string;
  stack?: string;
  source?: string;
};

const ENDPOINT = "/api/l10/analytics";
const FLUSH_INTERVAL_MS = 10_000;
const MAX_QUEUE = 25;

/** Per-browser-tab session id — the unit for bounce-rate calculations. */
function sessionId(): string {
  let sid = sessionStorage.getItem("l10_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("l10_sid", sid);
  }
  return sid;
}

function send(events: QueuedEvent[]) {
  if (events.length === 0) return;
  const payload = JSON.stringify({ events, sessionId: sessionId() });
  // sendBeacon survives page unload; fall back to keepalive fetch
  if (!(navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, payload))) {
    fetch(ENDPOINT, { method: "POST", body: payload, keepalive: true }).catch(
      () => {},
    );
  }
}

/**
 * In-app usage telemetry for the super-admin analytics page: page views,
 * clicked controls, and uncaught client errors. Batched and flushed
 * periodically / on tab hide. Only mounted inside the authed /l10 app.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const queue = useRef<QueuedEvent[]>([]);
  const lastPath = useRef<string | null>(null);

  const push = (event: QueuedEvent) => {
    queue.current.push(event);
    if (queue.current.length >= MAX_QUEUE) {
      send(queue.current.splice(0));
    }
  };

  // Page views on route change
  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    push({ kind: "pageview", path: pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "button, a, [role='button'], [data-track]",
      );
      if (!el) return;
      const label =
        el.dataset.track ||
        el.getAttribute("aria-label") ||
        el.textContent?.replace(/\s+/g, " ").trim();
      if (!label) return;
      push({
        kind: "action",
        path: window.location.pathname,
        target: label.slice(0, 120),
      });
    };

    const onError = (event: ErrorEvent) => {
      push({
        kind: "error",
        path: window.location.pathname,
        message: event.message || "Unknown error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        source: event.filename || undefined,
      });
      send(queue.current.splice(0));
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      push({
        kind: "error",
        path: window.location.pathname,
        message:
          reason instanceof Error
            ? reason.message
            : `Unhandled rejection: ${String(reason).slice(0, 300)}`,
        stack: reason instanceof Error ? reason.stack : undefined,
        source: "unhandledrejection",
      });
      send(queue.current.splice(0));
    };

    const flush = () => send(queue.current.splice(0));
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    const interval = setInterval(flush, FLUSH_INTERVAL_MS);

    return () => {
      flush();
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
