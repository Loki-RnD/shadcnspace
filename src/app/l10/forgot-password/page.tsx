import type { Metadata } from "next";
import Image from "next/image";

import { ThemeToggle } from "@/components/l10/theme-toggle";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password — EOS",
};

export default function ForgotPasswordPage() {
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

        <h1 className="text-foreground mt-6 text-2xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-muted-foreground mt-3 text-sm text-balance">
          Enter the email you use for EOS and we&apos;ll send you a link to
          choose a new password.
        </p>

        <div className="mt-8 w-full">
          <ForgotPasswordForm />
        </div>
      </main>
    </div>
  );
}