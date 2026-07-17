import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/l10/auth/token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // This deployment serves only the L10 app — send everything else
  // (the forked shadcnspace registry site) to /l10.
  if (!pathname.startsWith("/l10")) {
    return NextResponse.redirect(new URL("/l10", request.url));
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  const isLoginPage = pathname === "/l10/login";
  if (isLoginPage) {
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
