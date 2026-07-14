"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { setUserActive } from "./actions";

export function ActiveToggle({
  userId,
  active,
  name,
}: {
  userId: string;
  active: boolean;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={active}
      disabled={pending}
      aria-label={`Toggle ${name} active`}
      onCheckedChange={(next) =>
        startTransition(async () => {
          await setUserActive(userId, next);
          toast.success(`${name} ${next ? "activated" : "deactivated"}`);
        })
      }
    />
  );
}
