import type { Metadata } from "next";

import { L10Header } from "@/components/l10/l10-header";
import { L10ThemeProvider } from "@/components/l10/theme-provider";

export const metadata: Metadata = {
  title: "HOD L10 — Level 10 Meeting Platform",
  description:
    "Loki Ventures Level 10 meeting platform: Scorecard, Rocks, To-Dos and Issues.",
};

export default function L10Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <L10ThemeProvider>
      <div className="bg-background flex min-h-svh flex-col">
        <L10Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
        <footer className="text-muted-foreground mx-auto w-full max-w-7xl border-t px-4 py-4 text-xs sm:px-6">
          Loki Ventures · L10 Platform · Meets weekly
        </footer>
      </div>
    </L10ThemeProvider>
  );
}
