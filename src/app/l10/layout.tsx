import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

import { cn } from "@/lib/utils";
import { L10Header } from "@/components/l10/l10-header";
import { L10Nav } from "@/components/l10/l10-nav";
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
      <div
        className={cn(
          "l10-theme bg-background text-foreground flex min-h-svh w-full",
          GeistSans.variable,
        )}
      >
        <main className="bg-background outline-border relative m-2 flex w-full flex-1 flex-col overflow-clip rounded-xl outline">
          <L10Header />
          <L10Nav />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="l10-container xl:mt-3">
              <div className="min-h-[calc(100vh-140px)]">{children}</div>
            </div>
          </div>
          <footer className="text-muted-foreground l10-container px-4 py-4 text-xs">
            Loki Ventures · L10 Platform · Meets weekly
          </footer>
        </main>
      </div>
    </L10ThemeProvider>
  );
}
