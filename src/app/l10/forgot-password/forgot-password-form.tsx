"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordReset,
  type ForgotPasswordState,
} from "./actions";

const initialState: ForgotPasswordState = { sent: false, error: null };

const fieldClass =
  "h-11 rounded-xl bg-white focus-visible:border-[#f05100]/70 focus-visible:ring-[#f05100]/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  if (state.sent) {
    return (
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <MailCheck className="size-8 text-[#f05100]" />
        <p className="text-muted-foreground text-sm text-balance">
          Check your inbox — if that email has an EOS account, a reset link is
          on its way. It expires in 1 hour.
        </p>
        <Link
          href="/l10/login"
          className="text-sm font-medium text-[#f05100] transition-colors hover:text-[#fb8c00] dark:text-[#fb8c00] dark:hover:text-[#fbbf24]"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2 text-left">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
          required
          className={fieldClass}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-full bg-gradient-to-r from-[#f05100] via-[#fb8c00] to-[#fbbf24] text-[15px] font-semibold text-white shadow-[0_8px_32px_rgba(240,81,0,0.25)] transition-[filter] hover:brightness-110 dark:shadow-[0_8px_32px_rgba(240,81,0,0.35)]"
      >
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <Link
        href="/l10/login"
        className="text-center text-sm font-medium text-[#f05100] transition-colors hover:text-[#fb8c00] dark:text-[#fb8c00] dark:hover:text-[#fbbf24]"
      >
        Back to sign in
      </Link>
    </form>
  );
}