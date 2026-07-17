"use server";

import { redirect } from "next/navigation";

import { sql } from "@/lib/l10/db";
import { createSession, getSessionUser } from "@/lib/l10/auth/session";

export interface ChangePasswordState {
  error: string | null;
}

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await getSessionUser();
  if (!user) redirect("/l10/login");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const [same] = await sql`
    select 1 from core.users
    where id = ${user.id} and password_hash = crypt(${password}, password_hash)
  `;
  if (same) {
    return {
      error: "Your new password must be different from the one-time password.",
    };
  }

  await sql`
    update core.users
    set password_hash = crypt(${password}, gen_salt('bf')),
        must_change_password = false
    where id = ${user.id}
  `;

  // Re-issue the session without the one-time-password lock.
  await createSession({ ...user, mustChangePassword: false });

  redirect("/l10");
}