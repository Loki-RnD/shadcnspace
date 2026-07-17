import { NextResponse } from "next/server";

// Stamped once per server boot/deploy. When a new deploy (or dev-server
// restart) changes this id, clients prompt the user to reload.
const BOOT_ID =
  process.env.VERCEL_DEPLOYMENT_ID ??
  `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { id: BOOT_ID },
    { headers: { "cache-control": "no-store" } },
  );
}
