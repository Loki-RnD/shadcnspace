"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { AdminUserRow, OrgBusiness } from "@/lib/l10/identity";
import { createUser, updateUser } from "./actions";

export function UserFormDialog({
  org,
  user,
  open,
  onOpenChange,
}: {
  org: OrgBusiness[];
  /** undefined = create mode */
  user?: AdminUserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = Boolean(user);
  const [pending, startTransition] = useTransition();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [systemRole, setSystemRole] = useState("hod");
  const [companyRole, setCompanyRole] = useState("HOD");
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [deptAll, setDeptAll] = useState(false);
  const [subDeptAll, setSubDeptAll] = useState(false);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [subDepartmentIds, setSubDepartmentIds] = useState<string[]>([]);

  // (Re)hydrate form state whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setFullName(user?.full_name ?? "");
    setEmail(user?.email ?? "");
    setPassword("");
    setSystemRole(user?.system_role ?? "hod");
    setCompanyRole(user?.company_role ?? "HOD");
    setBusinessIds(user?.business_ids ?? []);
    setDeptAll(user?.dept_access_all ?? false);
    setSubDeptAll(user?.sub_dept_access_all ?? false);
    setDepartmentIds(user?.department_ids ?? []);
    setSubDepartmentIds(user?.sub_department_ids ?? []);
  }, [open, user]);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const accessibleBusinesses = org.filter((b) => businessIds.includes(b.id));

  function submit() {
    startTransition(async () => {
      const payload = {
        fullName,
        email,
        password,
        systemRole: systemRole as "super_admin" | "hod" | "member",
        companyRole,
        businessIds,
        deptAccessAll: deptAll,
        subDeptAccessAll: subDeptAll,
        departmentIds,
        subDepartmentIds,
      };
      const res = editing
        ? await updateUser({ ...payload, userId: user!.id })
        : await createUser(payload);
      if (res.ok) {
        toast.success(editing ? `${fullName} updated` : `User ${fullName} created`);
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${user?.full_name}` : "Create user"}</DialogTitle>
          <DialogDescription>
            Passwords are stored as bcrypt hashes. Access follows the
            four-layer model: company → department → sub-department.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="uf-name">Full name</Label>
              <Input id="uf-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Wanjiku" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="uf-email">Email</Label>
              <Input id="uf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="janew@loki-ventures.com" />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="uf-pass">
                {editing ? "New password" : "Password"}
              </Label>
              <Input
                id="uf-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editing ? "Leave blank to keep" : undefined}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="uf-sysrole">System role</Label>
              <NativeSelect id="uf-sysrole" value={systemRole} onChange={(e) => setSystemRole(e.target.value)}>
                <option value="super_admin">Super Admin</option>
                <option value="hod">HOD</option>
                <option value="member">Member</option>
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="uf-corole">Company role</Label>
              <Input id="uf-corole" value={companyRole} onChange={(e) => setCompanyRole(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="grid gap-1.5">
            <Label>Company access</Label>
            <div className="flex gap-4">
              {org.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={businessIds.includes(b.id)}
                    onCheckedChange={() => setBusinessIds(toggle(businessIds, b.id))}
                  />
                  {b.name} ({b.short_name})
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="uf-deptall">All departments</Label>
            <Switch id="uf-deptall" checked={deptAll} onCheckedChange={setDeptAll} />
          </div>

          {!deptAll && accessibleBusinesses.length > 0 && (
            <div className="grid gap-2">
              <Label>Department access</Label>
              {accessibleBusinesses.map((b) => (
                <div key={b.id} className="grid gap-1">
                  <p className="text-muted-foreground text-xs font-medium">{b.short_name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {b.departments.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={departmentIds.includes(d.id)}
                          onCheckedChange={() => setDepartmentIds(toggle(departmentIds, d.id))}
                        />
                        {d.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="uf-suball">All sub-departments</Label>
            <Switch id="uf-suball" checked={subDeptAll} onCheckedChange={setSubDeptAll} />
          </div>

          {!subDeptAll && accessibleBusinesses.length > 0 && (
            <div className="grid gap-2">
              <Label>Sub-department access</Label>
              <p className="text-muted-foreground text-xs">
                Leave a department&apos;s sub-departments unchecked for full
                department visibility; checking any narrows access to only
                those.
              </p>
              {accessibleBusinesses.map((b) =>
                b.departments
                  .filter((d) => d.sub_departments.length > 0)
                  .filter((d) => deptAll || departmentIds.includes(d.id))
                  .map((d) => (
                    <div key={d.id} className="grid gap-1">
                      <p className="text-muted-foreground text-xs font-medium">
                        {b.short_name} · {d.name}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {d.sub_departments.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={subDepartmentIds.includes(s.id)}
                              onCheckedChange={() => setSubDepartmentIds(toggle(subDepartmentIds, s.id))}
                            />
                            {s.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )),
              )}
            </div>
          )}

          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Create user"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
