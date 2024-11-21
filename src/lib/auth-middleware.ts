import { NextRequest, NextResponse } from "next/server";
import { auth0Client } from "./auth0-client";

const protectedRoutes = new Set(["/profile", "/protected", "/admin"]);

export const runRouteGuards = async (request: NextRequest) => {
  const loginPath = "/auth/login";
  const returnToQueryParamKey = "returnTo";
  const session = await auth0Client.getSession();

  if (protectedRoutes.has(request.nextUrl.pathname) && !session) {
    const loginURL = new URL(loginPath, process.env.APP_BASE_URL);
    loginURL.searchParams.append(
      returnToQueryParamKey,
      request.nextUrl.pathname,
    );

    return NextResponse.redirect(loginURL);
  }
};
