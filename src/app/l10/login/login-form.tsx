"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({ from }: { from?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <Card className="w-full max-w-md px-6 py-10 sm:px-10">
      <CardHeader className="gap-4 p-0 text-center">
        <Badge variant="outline" className="mx-auto gap-1.5 rounded-full px-3 py-1">
          <LogIn className="size-3.5" />
          Welcome
        </Badge>
        <div className="flex flex-col gap-2">
          <h1 className="text-card-foreground text-2xl font-semibold tracking-tight">
            Sign in to HOD L10
          </h1>
          <p className="text-muted-foreground text-sm font-normal text-balance">
            Sign in to access your team&apos;s Scorecard, Rocks, To-Dos and
            Issues.
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <form action={formAction} className="flex flex-col gap-4">
          {from ? <input type="hidden" name="from" value={from} /> : null}
          <Input
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            aria-label="Email"
            className="h-11 rounded-lg"
          />
          <Input
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            aria-label="Password"
            className="h-11 rounded-lg"
          />

          {state.error ? (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="h-11 w-full rounded-lg"
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            Accounts are provisioned by your team&apos;s super admin.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
