"use server";

import { redirect } from "next/navigation";

import { sql } from "@/lib/l10/db";
import {
  createSession,
  destroySession,
  type SessionUser,
} from "@/lib/l10/auth/session";

export interface LoginState {
  error: string | null;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const [user] = await sql`
    select
      u.id, u.full_name, u.email, u.system_role, u.company_role, u.active,
      coalesce((
        select array_agg(b.short_name order by b.short_name)
        from core.user_business_access ba
        join core.businesses b on b.id = ba.business_id
        where ba.user_id = u.id), '{}') as companies
    from core.users u
    where lower(u.email) = lower(${email})
      and u.password_hash = crypt(${password}, u.password_hash)
  `;

  if (!user) {
    return { error: "Invalid email or password." };
  }
  if (!user.active) {
    return { error: "This account has been deactivated. Contact a super admin." };
  }

  await createSession({
    id: user.id,
    name: user.full_name,
    email: user.email,
    systemRole: user.system_role,
    companyRole: user.company_role,
    companies: user.companies,
  } satisfies SessionUser);

  // Only follow same-app redirect targets
  redirect(from.startsWith("/l10") ? from : "/l10");
}

export async function logout() {
  await destroySession();
  redirect("/l10/login");
}
