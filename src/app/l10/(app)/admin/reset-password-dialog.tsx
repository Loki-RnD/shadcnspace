"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Dices } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUserRow } from "@/lib/l10/identity";
import { resetUserPassword } from "./actions";

// Unambiguous characters only — these get read out loud or typed from
// a chat message.
const OTP_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateOtp(length = 10) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => OTP_CHARSET[b % OTP_CHARSET.length]).join("");
}

export function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: AdminUserRow | undefined;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  function close() {
    setPassword("");
    onClose();
  }

  function copy() {
    navigator.clipboard.writeText(password);
    toast.success("One-time password copied");
  }

  async function submit() {
    if (!user) return;
    setPending(true);
    try {
      const res = await resetUserPassword(user.id, password);
      if (res.ok) {
        toast.success(
          `One-time password set for ${res.name}. Share it with them securely.`,
        );
        close();
      } else {
        toast.error(res.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={Boolean(user)} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password — {user?.full_name}</DialogTitle>
          <DialogDescription>
            They&apos;ll sign in with this one-time password and be required
            to set their own before using the app. Any pending email reset
            links are voided.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="otp">One-time password</Label>
          <div className="flex gap-1.5">
            <Input
              id="otp"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Generate password"
              onClick={() => setPassword(generateOtp())}
            >
              <Dices className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy password"
              disabled={!password}
              onClick={copy}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || password.length < 6}
            className="bg-gradient-to-r from-[#f05100] via-[#fb8c00] to-[#fbbf24] text-white hover:brightness-110"
          >
            {pending ? "Setting…" : "Set one-time password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}