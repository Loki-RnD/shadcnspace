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

export interface UpdateUserInput extends Omit<CreateUserInput, "password"> {
  userId: string;
  /** empty string = keep current password */
  password: string;
}

export async function updateUser(input: UpdateUserInput) {
  assertSuperAdmin();

  if (!input.fullName.trim() || !input.email.trim()) {
    return { ok: false as const, error: "Name and email are required." };
  }
  if (input.password && input.password.length < 6) {
    return { ok: false as const, error: "New password must be 6+ characters." };
  }
  if (input.businessIds.length === 0) {
    return { ok: false as const, error: "Grant access to at least one company." };
  }

  try {
    await sql`
      update core.users set
        full_name = ${input.fullName.trim()},
        email = ${input.email.trim().toLowerCase()},
        system_role = ${input.systemRole},
        company_role = ${input.companyRole.trim() || "HOD"},
        dept_access_all = ${input.deptAccessAll},
        sub_dept_access_all = ${input.subDeptAccessAll}
      where id = ${input.userId}
    `;
    if (input.password) {
      await sql`update core.users
                set password_hash = crypt(${input.password}, gen_salt('bf'))
                where id = ${input.userId}`;
    }

    // Replace grants with the submitted set
    await sql`delete from core.user_business_access where user_id = ${input.userId}`;
    await sql`delete from core.user_department_access where user_id = ${input.userId}`;
    await sql`delete from core.user_sub_department_access where user_id = ${input.userId}`;

    for (const bizId of input.businessIds) {
      await sql`insert into core.user_business_access (user_id, business_id)
                values (${input.userId}, ${bizId}) on conflict do nothing`;
    }
    if (!input.deptAccessAll) {
      for (const deptId of input.departmentIds) {
        await sql`insert into core.user_department_access (user_id, department_id)
                  values (${input.userId}, ${deptId}) on conflict do nothing`;
      }
    }
    if (!input.subDeptAccessAll) {
      for (const subId of input.subDepartmentIds) {
        await sql`insert into core.user_sub_department_access (user_id, sub_department_id)
                  values (${input.userId}, ${subId}) on conflict do nothing`;
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

export async function deleteUser(userId: string) {
  assertSuperAdmin();

  const [target] = await sql`
    select email, system_role from core.users where id = ${userId}`;
  if (!target) return { ok: false as const, error: "User not found." };
  if (target.email === currentUser.email) {
    return { ok: false as const, error: "You cannot delete your own account." };
  }
  if (target.system_role === "super_admin") {
    const [{ count }] = await sql`
      select count(*)::int as count from core.users
      where system_role = 'super_admin' and active`;
    if (Number(count) <= 1) {
      return { ok: false as const, error: "Cannot delete the last super admin." };
    }
  }

  await sql`delete from core.users where id = ${userId}`;
  revalidatePath("/l10/admin");
  return { ok: true as const };
}
