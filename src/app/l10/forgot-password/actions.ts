"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";

import { sql } from "@/lib/l10/db";
import { hashResetToken } from "@/lib/l10/auth/reset-token";
import { passwordResetEmail, sendMail } from "@/lib/l10/mail";

export interface ForgotPasswordState {
  sent: boolean;
  error: string | null;
}

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { sent: false, error: "Enter your email address." };
  }

  const [user] = await sql`
    select id, full_name, email, active
    from core.users
    where lower(email) = lower(${email})
  `;

  // Whether or not the account exists we report success, so the form
  // can't be used to probe which emails are registered.
  if (user?.active) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(token);

    await sql`
      delete from core.password_reset_tokens
      where user_id = ${user.id} and used_at is null
    `;
    await sql`
      insert into core.password_reset_tokens (user_id, token_hash, expires_at)
      values (${user.id}, ${tokenHash}, now() + interval '1 hour')
    `;

    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const base = process.env.APP_URL ?? `${proto}://${host}`;
    const mail = passwordResetEmail(
      user.full_name,
      `${base}/l10/reset-password?token=${token}`,
    );

    try {
      await sendMail({ to: user.email, ...mail });
    } catch (error) {
      console.error("password reset email failed:", error);
      return {
        sent: false,
        error:
          "We couldn't send the email right now. Try again in a minute or contact your super admin.",
      };
    }
  }

  return { sent: true, error: null };
}