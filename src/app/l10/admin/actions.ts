"use server";

import { revalidatePath } from "next/cache";

import { sql } from "@/lib/l10/db";
import { currentUser } from "@/components/l10/members";

// Placeholder gate until session auth lands: server actions re-check the
// acting user's system role so the check isn't UI-only.
function assertSuperAdmin() {
  if (currentUser.systemRole !== "super_admin") {
    throw new Error("Not authorized: super admin required");
  }
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  password: string;
  systemRole: "super_admin" | "hod" | "member";
  companyRole: string;
  businessIds: string[];
  deptAccessAll: boolean;
  subDeptAccessAll: boolean;
  departmentIds: string[];
  subDepartmentIds: string[];
}

export async function createUser(input: CreateUserInput) {
  assertSuperAdmin();

  if (!input.fullName.trim() || !input.email.trim() || input.password.length < 6) {
    return { ok: false as const, error: "Name, email and a password of 6+ characters are required." };
  }
  if (input.businessIds.length === 0) {
    return { ok: false as const, error: "Grant access to at least one company." };
  }

  try {
    const [user] = await sql`
      insert into core.users
        (user_code, full_name, email, password_hash,
         system_role, company_role, dept_access_all, sub_dept_access_all)
      values (
        (select lpad((coalesce(max(user_code::int), 0) + 1)::text, 2, '0') from core.users),
        ${input.fullName.trim()},
        ${input.email.trim().toLowerCase()},
        crypt(${input.password}, gen_salt('bf')),
        ${input.systemRole},
        ${input.companyRole.trim() || "HOD"},
        ${input.deptAccessAll},
        ${input.subDeptAccessAll}
      )
      returning id
    `;

    for (const bizId of input.businessIds) {
      await sql`insert into core.user_business_access (user_id, business_id)
                values (${user.id}, ${bizId}) on conflict do nothing`;
    }
    if (!input.deptAccessAll) {
      for (const deptId of input.departmentIds) {
        await sql`insert into core.user_department_access (user_id, department_id)
                  values (${user.id}, ${deptId}) on conflict do nothing`;
      }
    }
    if (!input.subDeptAccessAll) {
      for (const subId of input.subDepartmentIds) {
        await sql`insert into core.user_sub_department_access (user_id, sub_department_id)
                  values (${user.id}, ${subId}) on conflict do nothing`;
      }
    }

    revalidatePath("/l10/admin");
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return {
      ok: false as const,
      error: msg.includes("users_email_key")
        ? "A user with that email already exists."
        : msg,
    };
  }
}

export async function setUserActive(userId: string, active: boolean) {
  assertSuperAdmin();
  await sql`update core.users set active = ${active} where id = ${userId}`;
  revalidatePath("/l10/admin");
  return { ok: true as const };
}
