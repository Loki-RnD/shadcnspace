import { ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getSessionUser } from "@/lib/l10/auth/session";
import { listOrg, listUsers } from "@/lib/l10/identity";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (user?.systemRole !== "super_admin") {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-2 text-sm">
          <ShieldAlert className="size-6" />
          Admin is restricted to super admins.
        </CardContent>
      </Card>
    );
  }

  const [users, org] = await Promise.all([listUsers(), listOrg()]);

  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-12">
        <CardContent className="flex flex-col gap-1">
          <p className="text-card-foreground text-lg font-medium">User Management</p>
          <p className="text-muted-foreground text-xs font-normal">
            Users, roles and access rights — live from Neon (core.*)
          </p>
        </CardContent>
      </Card>

      <Card className="col-span-12">
        <CardContent>
          <UsersTable users={users} org={org} />
        </CardContent>
      </Card>
    </div>
  );
}
