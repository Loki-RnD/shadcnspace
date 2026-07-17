"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

const fieldClass =
  "h-11 rounded-xl bg-white focus-visible:border-[#f05100]/70 focus-visible:ring-[#f05100]/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500";

export function LoginForm({ from }: { from?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      {from ? <input type="hidden" name="from" value={from} /> : null}
      <input type="hidden" name="remember" value={remember ? "1" : ""} />

      <div className="flex flex-col gap-2">
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            className={cn(fieldClass, "pr-11")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label className="gap-2.5">
          <Switch
            checked={remember}
            onCheckedChange={setRemember}
            className="data-checked:bg-[#f05100]"
          />
          Remember me
        </Label>
        <Link
          href="/l10/forgot-password"
          className="text-sm font-medium text-[#f05100] transition-colors hover:text-[#fb8c00] dark:text-[#fb8c00] dark:hover:text-[#fbbf24]"
        >
          Forgot password?
        </Link>
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
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        Accounts are provisioned by your team&apos;s super admin.
      </p>
    </form>
  );
}