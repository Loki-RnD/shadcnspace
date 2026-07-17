import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/l10/auth/session";
import { ThemeToggle } from "@/components/l10/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — EOS",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reset?: string }>;
}) {
  if (await getSessionUser()) redirect("/l10");

  const { from, reset } = await searchParams;

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#f7f4f0] px-4 py-12 dark:bg-[#0b0a09]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[240px] w-[340px] -translate-x-1/2 rounded-full bg-[#f05100]/10 blur-[80px] dark:bg-[#f05100]/20 sm:-top-40 sm:h-[420px] sm:w-[680px] sm:blur-[140px]" />
        <div className="absolute -bottom-28 left-1/2 h-[240px] w-[420px] -translate-x-1/2 rounded-full bg-amber-400/15 blur-[90px] dark:bg-amber-500/15 sm:-bottom-48 sm:h-[420px] sm:w-[880px] sm:blur-[160px]" />
      </div>

      <ThemeToggle className="absolute top-4 right-4 z-20" />

      <main className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <Image
          src="/images/l10/we-run-on-eos-badge.png"
          alt="We run on EOS"
          width={200}
          height={131}
          className="h-32 w-auto drop-shadow-[0_12px_40px_rgba(240,81,0,0.2)] dark:drop-shadow-[0_12px_48px_rgba(240,81,0,0.35)]"
          priority
        />

        <h1 className="text-foreground font-display mt-6 text-center text-3xl font-semibold tracking-tight">
          EOS Platform
        </h1>
        <p className="text-muted-foreground font-accent mt-2 text-center text-xs font-semibold tracking-[0.22em] uppercase">
          For LVL/PSK Teams
        </p>

        <h2 className="text-foreground mt-6 text-center text-xl font-semibold tracking-tight">
          Welcome back
        </h2>

        {reset ? (
          <p className="mt-4 w-full rounded-xl bg-emerald-500/10 px-4 py-2.5 text-center text-sm text-emerald-700 dark:text-emerald-400">
            Your password has been updated. Sign in with your new password.
          </p>
        ) : null}

        <div className="mt-6 w-full">
          <LoginForm from={from} />
        </div>
      </main>
    </div>
  );
}