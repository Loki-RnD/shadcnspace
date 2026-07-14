import { ShieldAlert } from "lucide-react";

import { currentUser } from "@/components/l10/members";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listOrg, listUsers } from "@/lib/l10/identity";
import { ActiveToggle } from "./active-toggle";
import { CreateUserDialog } from "./create-user-dialog";

export const dynamic = "force-dynamic";

function roleBadge(role: string) {
  return role === "super_admin" ? (
    <Badge>Super Admin</Badge>
  ) : (
    <Badge variant="secondary" className="capitalize">
      {role}
    </Badge>
  );
}

export default async function AdminPage() {
  // Placeholder gate until session auth lands; actions re-check server-side.
  if (currentUser.systemRole !== "super_admin") {
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
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-card-foreground text-lg font-medium">Admin</p>
            <p className="text-muted-foreground text-xs font-normal">
              Users, roles and access rights — live from Neon (core.*)
            </p>
          </div>
          <CreateUserDialog org={org} />
        </CardContent>
      </Card>

      <Card className="col-span-12">
        <CardContent className="overflow-x-auto p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>User</TableHead>
                <TableHead>System role</TableHead>
                <TableHead>Company role</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead>Departments</TableHead>
                <TableHead>Sub-departments</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-muted-foreground">
                    {u.user_code}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{u.full_name}</span>
                      <span className="text-muted-foreground text-xs">
                        {u.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{roleBadge(u.system_role)}</TableCell>
                  <TableCell>{u.company_role}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {u.companies.map((c) => (
                        <Badge key={c} variant="outline">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-56">
                    {u.dept_access_all ? (
                      <Badge variant="secondary">All</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {u.departments.join(", ") || "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56">
                    {u.sub_dept_access_all ? (
                      <Badge variant="secondary">All</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {u.sub_departments.join(", ") || "Full dept visibility"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActiveToggle
                      userId={u.id}
                      active={u.active}
                      name={u.full_name}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
