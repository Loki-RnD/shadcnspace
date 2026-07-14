"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { OrgBusiness } from "@/lib/l10/identity";
import { createUser } from "./actions";

export function CreateUserDialog({ org }: { org: OrgBusiness[] }) {
  const [open, setOpen] = useState(false);
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

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const accessibleBusinesses = org.filter((b) => businessIds.includes(b.id));

  function submit() {
    startTransition(async () => {
      const res = await createUser({
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
      });
      if (res.ok) {
        toast.success(`User ${fullName} created`);
        setOpen(false);
        setFullName(""); setEmail(""); setPassword("");
        setBusinessIds([]); setDepartmentIds([]); setSubDepartmentIds([]);
        setDeptAll(false); setSubDeptAll(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlus className="size-4" /> Add user
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Password is stored as a bcrypt hash. Access follows the four-layer
            model: company → department → sub-department.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="cu-name">Full name</Label>
              <Input id="cu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Wanjiku" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cu-email">Email</Label>
              <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="janew@loki-ventures.com" />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cu-pass">Password</Label>
              <Input id="cu-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cu-sysrole">System role</Label>
              <NativeSelect id="cu-sysrole" value={systemRole} onChange={(e) => setSystemRole(e.target.value)}>
                <option value="super_admin">Super Admin</option>
                <option value="hod">HOD</option>
                <option value="member">Member</option>
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cu-corole">Company role</Label>
              <Input id="cu-corole" value={companyRole} onChange={(e) => setCompanyRole(e.target.value)} />
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
            <Label htmlFor="cu-deptall">All departments</Label>
            <Switch id="cu-deptall" checked={deptAll} onCheckedChange={setDeptAll} />
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
            <Label htmlFor="cu-suball">All sub-departments</Label>
            <Switch id="cu-suball" checked={subDeptAll} onCheckedChange={setSubDeptAll} />
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
            {pending ? "Creating…" : "Create user"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
