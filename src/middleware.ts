import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/l10/auth/token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  // This deployment serves only the L10 app — anything outside /l10 goes
  // straight to the dashboard (signed in) or the login page (signed out).
  if (!pathname.startsWith("/l10")) {
    return NextResponse.redirect(
      new URL(user ? "/l10" : "/l10/login", request.url),
    );
  }

  const isPublicAuthPage =
    pathname === "/l10/login" ||
    pathname === "/l10/forgot-password" ||
    pathname === "/l10/reset-password";
  if (isPublicAuthPage) {
    return user
      ? NextResponse.redirect(new URL("/l10", request.url))
      : NextResponse.next();
  }

  if (!user) {
    const login = new URL("/l10/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, API routes and static assets
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
