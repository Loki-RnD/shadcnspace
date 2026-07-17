"use server";

import { redirect } from "next/navigation";

import { sql } from "@/lib/l10/db";
import { hashResetToken } from "@/lib/l10/auth/reset-token";

export interface ResetPasswordState {
  error: string | null;
}

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) {
    return { error: "This reset link is invalid. Request a new one." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const [row] = await sql`
    select id, user_id
    from core.password_reset_tokens
    where token_hash = ${hashResetToken(token)}
      and used_at is null
      and expires_at > now()
  `;

  if (!row) {
    return {
      error: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  await sql`
    update core.users
    set password_hash = crypt(${password}, gen_salt('bf')),
        must_change_password = false
    where id = ${row.user_id}
  `;
  await sql`
    update core.password_reset_tokens
    set used_at = now()
    where id = ${row.id}
  `;

  redirect("/l10/login?reset=1");
}