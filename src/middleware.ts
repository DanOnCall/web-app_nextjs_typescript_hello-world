import type { NextRequest } from "next/server";

import { auth0 } from "./lib/auth0";
import { NextResponse } from "next/server";

const protectedRoutes = new Set(["/profile", "/protected", "/admin"]);

export async function middleware(request: NextRequest) {
  const authResponse = await auth0.middleware(request);

  if (request.nextUrl.pathname.startsWith("/auth")) {
    return authResponse;
  }

  const session = await auth0.getSession();

  if (protectedRoutes.has(request.nextUrl.pathname) && !session) {
    const loginURL = new URL("/auth/login", process.env.APP_BASE_URL);
    loginURL.searchParams.append("returnTo", request.nextUrl.pathname);

    return NextResponse.redirect(loginURL);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
