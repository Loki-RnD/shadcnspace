import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

import { cn } from "@/lib/utils";
import { L10ThemeProvider } from "@/components/l10/theme-provider";
import { UpdateNotifier } from "@/components/l10/update-notifier";

export const metadata: Metadata = {
  title: "HOD L10 — Level 10 Meeting Platform",
  description:
    "Loki Ventures Level 10 meeting platform: Scorecard, Rocks, To-Dos and Issues.",
  icons: [{ url: "/images/l10/eos-bulb.png", type: "image/png", rel: "icon" }],
};

export default function L10Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <L10ThemeProvider>
      <div
        className={cn(
          "l10-theme bg-background text-foreground flex min-h-svh w-full flex-col",
          GeistSans.variable,
        )}
      >
        <UpdateNotifier />
        {children}
      </div>
    </L10ThemeProvider>
  );
}
