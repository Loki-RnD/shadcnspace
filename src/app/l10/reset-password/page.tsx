import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { sql } from "@/lib/l10/db";
import { hashResetToken } from "@/lib/l10/auth/reset-token";
import { ThemeToggle } from "@/components/l10/theme-toggle";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset password — EOS",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let valid = false;
  if (token) {
    const [row] = await sql`
      select id
      from core.password_reset_tokens
      where token_hash = ${hashResetToken(token)}
        and used_at is null
        and expires_at > now()
    `;
    valid = Boolean(row);
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#f7f4f0] px-4 py-12 dark:bg-[#0b0a09]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[240px] w-[340px] -translate-x-1/2 rounded-full bg-[#f05100]/10 blur-[80px] dark:bg-[#f05100]/20 sm:-top-40 sm:h-[420px] sm:w-[680px] sm:blur-[140px]" />
        <div className="absolute -bottom-28 left-1/2 h-[240px] w-[420px] -translate-x-1/2 rounded-full bg-amber-400/15 blur-[90px] dark:bg-amber-500/15 sm:-bottom-48 sm:h-[420px] sm:w-[880px] sm:blur-[160px]" />
      </div>

      <ThemeToggle className="absolute top-4 right-4 z-20" />

      <main className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <Image
          src="/images/l10/we-run-on-eos-badge.png"
          alt="We run on EOS"
          width={160}
          height={105}
          className="h-24 w-auto drop-shadow-[0_12px_40px_rgba(240,81,0,0.2)] dark:drop-shadow-[0_12px_48px_rgba(240,81,0,0.35)]"
          priority
        />

        {valid && token ? (
          <>
            <h1 className="text-foreground mt-6 text-2xl font-semibold tracking-tight">
              Choose a new password
            </h1>
            <p className="text-muted-foreground mt-3 text-sm text-balance">
              Enter a new password for your EOS account. You&apos;ll be signed
              in with it from now on.
            </p>
            <div className="mt-8 w-full">
              <ResetPasswordForm token={token} />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-foreground mt-6 text-2xl font-semibold tracking-tight">
              This link has expired
            </h1>
            <p className="text-muted-foreground mt-3 text-sm text-balance">
              Reset links work once and expire after 1 hour. Request a new one
              and check your inbox again.
            </p>
            <Link
              href="/l10/forgot-password"
              className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#f05100] via-[#fb8c00] to-[#fbbf24] text-[15px] font-semibold text-white shadow-[0_8px_32px_rgba(240,81,0,0.25)] transition-[filter] hover:brightness-110 dark:shadow-[0_8px_32px_rgba(240,81,0,0.35)]"
            >
              Request a new link
            </Link>
          </>
        )}
      </main>
    </div>
  );
}