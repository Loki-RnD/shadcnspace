"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Polls /api/l10/version and prompts the user to reload when the server
 * reports a new deployment id (i.e. we shipped an update while they had
 * the app open).
 */
export function UpdateNotifier() {
  const knownId = useRef<string | null>(null);
  const notified = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (cancelled || notified.current) return;
      try {
        const res = await fetch("/api/l10/version", { cache: "no-store" });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id: string };
        if (knownId.current === null) {
          knownId.current = id;
          return;
        }
        if (id !== knownId.current) {
          notified.current = true;
          toast("EOS has been updated", {
            description: "Reload to get the latest version.",
            duration: Infinity,
            action: {
              label: "Reload",
              onClick: () => window.location.reload(),
            },
          });
        }
      } catch {
        // offline or server restarting — try again next tick
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
