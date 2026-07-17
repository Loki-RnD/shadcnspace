// Turns raw client error messages into plain-language descriptions for the
// analytics error pages. Safe to import from client or server components.

export interface ErrorDescription {
  /** short category chip */
  category: "UI Component" | "Network" | "Code Bug" | "Deploy" | "Unhandled";
  /** one-line plain-language explanation */
  summary: string;
  /** what to do about it */
  advice: string;
}

export function describeError(
  message: string,
  source?: string | null,
): ErrorDescription {
  const m = message;

  if (/Base UI error #?\d+|MenuGroupContext|Base UI:/i.test(m)) {
    return {
      category: "UI Component",
      summary:
        "A UI component (menu, dialog or similar) crashed while rendering.",
      advice:
        "The affected control appears dead or closes instantly. Usually a component wiring bug — check the linked Base UI error code for specifics.",
    };
  }
  if (/ChunkLoadError|Loading chunk|dynamically imported module/i.test(m)) {
    return {
      category: "Deploy",
      summary:
        "The browser tried to load a code bundle that no longer exists — typically an open tab from before a new deployment.",
      advice: "Harmless if rare; users fix it with a reload. The in-app update toast should reduce these.",
    };
  }
  if (/Failed to fetch|NetworkError|Load failed|ERR_INTERNET|timeout/i.test(m)) {
    return {
      category: "Network",
      summary: "A network request failed — the user was offline or the server was unreachable.",
      advice: "Expected occasionally on flaky connections. Investigate only if it spikes or clusters on one page.",
    };
  }
  if (/^Uncaught (TypeError|ReferenceError|RangeError)|is not a function|is not defined|Cannot read propert|undefined is not/i.test(m)) {
    return {
      category: "Code Bug",
      summary: "The page's JavaScript hit a programming error (accessing something that doesn't exist).",
      advice: "A real bug on the page shown — the stack trace below points at the failing code.",
    };
  }
  if (source === "unhandledrejection" || /Unhandled rejection/i.test(m)) {
    return {
      category: "Unhandled",
      summary: "A background operation (promise) failed and nothing handled the failure.",
      advice: "Often a failed API call surfacing late. Check the message and stack for the operation involved.",
    };
  }
  return {
    category: "Unhandled",
    summary: "An uncaught client-side exception on this page.",
    advice: "Check the stack trace and recent occurrences below to narrow it down.",
  };
}
