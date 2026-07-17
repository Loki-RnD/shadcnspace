import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/l10/theme-toggle";

export const metadata: Metadata = {
  title: "Forgot password — HOD L10",
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
          src="/images/l10/eos-logo-plain.png"
          alt="EOS"
          width={126}
          height={48}
          className="h-12 w-auto dark:hidden"
          priority
        />
        <Image
          src="/images/l10/eos-logo-dark-plain.png"
          alt="EOS"
          width={126}
          height={48}
          className="hidden h-12 w-auto dark:block"
          priority
        />

        <h1 className="text-foreground mt-8 text-2xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <p className="text-muted-foreground mt-3 text-sm text-balance">
          HOD L10 accounts are provisioned and managed by your team&apos;s
          super admin. Ask them to reset your password and you&apos;ll be back
          in shortly.
        </p>

        <Link
          href="/l10/login"
          className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#f05100] via-[#fb8c00] to-[#fbbf24] text-[15px] font-semibold text-white shadow-[0_8px_32px_rgba(240,81,0,0.25)] transition-[filter] hover:brightness-110 dark:shadow-[0_8px_32px_rgba(240,81,0,0.35)]"
        >
          Back to sign in
        </Link>
      </main>
    </div>
  );
}