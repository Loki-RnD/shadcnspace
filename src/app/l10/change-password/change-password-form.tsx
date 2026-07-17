"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { changePassword, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = { error: null };

const fieldClass =
  "h-11 rounded-xl bg-white focus-visible:border-[#f05100]/70 focus-visible:ring-[#f05100]/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2 text-left">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            minLength={6}
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

      <div className="flex flex-col gap-2 text-left">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          name="confirm"
          type={showPassword ? "text" : "password"}
          placeholder="Repeat your new password"
          autoComplete="new-password"
          minLength={6}
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
        {pending ? "Saving…" : "Set password & continue"}
      </Button>
    </form>
  );
}