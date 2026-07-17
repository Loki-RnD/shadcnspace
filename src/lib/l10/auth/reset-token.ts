import "server-only";

import { createHash } from "crypto";

// Only the SHA-256 of a reset token is stored, so a DB leak can't be
// replayed as a live reset link.
export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}