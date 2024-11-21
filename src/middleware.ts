import type { NextRequest } from "next/server";

import { auth0Client } from "./lib/auth0-client";
import { NextResponse } from "next/server";
import { runRouteGuards } from "./lib/auth-middleware";

export async function middleware(request: NextRequest) {
  const authResponse = await auth0Client.middleware(request);

  if (request.nextUrl.pathname.startsWith("/auth")) {
    return authResponse;
  }

  runRouteGuards(request);

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
