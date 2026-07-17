import { redirect } from "next/navigation";

import { AnalyticsTracker } from "@/components/l10/analytics-tracker";
import { L10Header } from "@/components/l10/l10-header";
import { L10Nav } from "@/components/l10/l10-nav";
import { RatingPrompt } from "@/components/l10/rating-prompt";
import { shouldPromptRating } from "@/lib/l10/analytics";
import { getSessionUser } from "@/lib/l10/auth/session";

export default async function L10AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Middleware already gates /l10/*; this is defense in depth for the chrome.
  const user = await getSessionUser();
  if (!user) redirect("/l10/login");

  const promptRating = await shouldPromptRating(user.id).catch(() => false);

  return (
    <main className="bg-background outline-border relative m-0 flex w-full flex-1 flex-col overflow-clip rounded-none px-3 outline sm:m-2 sm:rounded-xl sm:px-6">
      <AnalyticsTracker />
      <RatingPrompt shouldPrompt={promptRating} />
      <L10Header user={user} />
      <L10Nav isSuperAdmin={user.systemRole === "super_admin"} />
      <div className="flex flex-1 flex-col gap-4 px-0 py-4 sm:p-4">
        <div className="l10-container xl:mt-3">
          <div className="min-h-[calc(100vh-140px)]">{children}</div>
        </div>
      </div>
      <footer className="text-muted-foreground l10-container px-4 py-4 text-xs">
        Loki Ventures · L10 Platform · Meets weekly
      </footer>
    </main>
  );
}
