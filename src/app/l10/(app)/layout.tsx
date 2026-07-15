import { redirect } from "next/navigation";

import { L10Header } from "@/components/l10/l10-header";
import { L10Nav } from "@/components/l10/l10-nav";
import { getSessionUser } from "@/lib/l10/auth/session";

export default async function L10AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Middleware already gates /l10/*; this is defense in depth for the chrome.
  const user = await getSessionUser();
  if (!user) redirect("/l10/login");

  return (
    <main className="bg-background outline-border relative m-2 flex w-full flex-1 flex-col overflow-clip rounded-xl px-3 outline sm:px-6">
      <L10Header user={user} />
      <L10Nav isSuperAdmin={user.systemRole === "super_admin"} />
      <div className="flex flex-1 flex-col gap-4 p-4">
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
