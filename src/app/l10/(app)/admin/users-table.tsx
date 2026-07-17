"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Pencil,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminUserRow, OrgBusiness } from "@/lib/l10/identity";
import { deleteUser } from "./actions";
import { ActiveToggle } from "./active-toggle";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { UserFormDialog } from "./user-form-dialog";

const ROLE_FILTERS = [
  { key: "all", label: "All" },
  { key: "super_admin", label: "Super Admin" },
  { key: "hod", label: "HOD" },
  { key: "member", label: "Member" },
];

const AVATAR_TINTS = [
  "bg-[#f05100]/15 text-[#f05100]",
  "bg-[#009588]/15 text-[#009588]",
  "bg-[#104e64]/15 text-[#104e64] dark:text-[#7fb6c9]",
  "bg-[#fcbb00]/20 text-[#8a6700] dark:text-[#fcbb00]",
  "bg-[#f99c00]/15 text-[#b06e00] dark:text-[#f99c00]",
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type SortKey = "user_code" | "full_name" | "system_role" | "company_role";

export function UsersTable({
  users,
  org,
}: {
  users: AdminUserRow[];
  org: OrgBusiness[];
}) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("user_code");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUserRow | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | undefined>();
  const [resetTarget, setResetTarget] = useState<AdminUserRow | undefined>();
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let rows = users;
    if (roleFilter !== "all") rows = rows.filter((u) => u.system_role === roleFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.company_role.toLowerCase().includes(q) ||
          u.companies.some((c) => c.toLowerCase().includes(q)),
      );
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [users, roleFilter, query, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteUser(deleteTarget.id);
      if (res.ok) toast.success(`${deleteTarget.full_name} deleted`);
      else toast.error(res.error);
      setDeleteTarget(undefined);
    });
  }

  const sortHead = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="hover:text-foreground flex items-center gap-1"
    >
      {label}
      <ArrowUpDown
        className={cn("size-3.5", sortKey === key ? "opacity-100" : "opacity-40")}
      />
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: role pills + search + create */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {ROLE_FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={roleFilter === f.key ? "default" : "outline"}
              onClick={() => {
                setRoleFilter(f.key);
                setPage(0);
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search name, email, company…"
              className="h-9 pl-8"
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditTarget(undefined);
              setFormOpen(true);
            }}
          >
            <UserPlus className="size-4" /> Create User
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border-border overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{sortHead("user_code", "#")}</TableHead>
              <TableHead>{sortHead("full_name", "User")}</TableHead>
              <TableHead>{sortHead("system_role", "System role")}</TableHead>
              <TableHead>{sortHead("company_role", "Company role")}</TableHead>
              <TableHead>Companies</TableHead>
              <TableHead>Departments</TableHead>
              <TableHead>Sub-departments</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground h-24 text-center">
                  No users match the current filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((u, i) => (
              <TableRow key={u.id}>
                <TableCell className="text-muted-foreground">{u.user_code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback
                        className={cn(
                          "text-xs font-medium",
                          AVATAR_TINTS[i % AVATAR_TINTS.length],
                        )}
                      >
                        {initials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{u.full_name}</span>
                      <span className="text-muted-foreground text-xs">{u.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {u.system_role === "super_admin" ? (
                    <Badge>Super Admin</Badge>
                  ) : (
                    <Badge variant="secondary" className="capitalize">
                      {u.system_role}
                    </Badge>
                  )}
                </TableCell>
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
                <TableCell className="max-w-52">
                  {u.dept_access_all ? (
                    <Badge variant="secondary">All</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {u.departments.join(", ") || "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-52">
                  {u.sub_dept_access_all ? (
                    <Badge variant="secondary">All</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {u.sub_departments.join(", ") || "Full dept visibility"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <ActiveToggle userId={u.id} active={u.active} name={u.full_name} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Edit ${u.full_name}`}
                      onClick={() => {
                        setEditTarget(u);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Reset password for ${u.full_name}`}
                      onClick={() => setResetTarget(u)}
                    >
                      <KeyRound className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete ${u.full_name}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-muted-foreground text-xs">
          {filtered.length} user{filtered.length === 1 ? "" : "s"}
          {roleFilter !== "all" || query ? " (filtered)" : ""}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Rows per page</span>
            <NativeSelect
              className="h-8 w-16"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </NativeSelect>
          </div>
          <span className="text-muted-foreground text-xs">
            Page {safePage + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <UserFormDialog
        org={org}
        user={editTarget}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <ResetPasswordDialog
        user={resetTarget}
        onClose={() => setResetTarget(undefined)}
      />

      {/* Delete confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(undefined)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.full_name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the user and all their access grants.
              Consider deactivating instead if they may return.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(undefined)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
