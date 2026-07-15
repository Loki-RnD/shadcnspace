// Edge-safe JWT helpers — imported by middleware, keep free of next/headers
// and server-only.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "l10_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  systemRole: "super_admin" | "hod" | "member";
  companyRole: string;
  companies: string[];
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set (generate a random string; see .env.local)");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    systemRole: user.systemRole,
    companyRole: user.companyRole,
    companies: user.companies,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      name: (payload.name as string) ?? "",
      email: payload.email,
      systemRole: (payload.systemRole as SessionUser["systemRole"]) ?? "member",
      companyRole: (payload.companyRole as string) ?? "",
      companies: (payload.companies as string[]) ?? [],
    };
  } catch {
    return null;
  }
}
