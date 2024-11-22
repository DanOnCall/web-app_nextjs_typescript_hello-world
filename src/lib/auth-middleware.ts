import { NextRequest } from "next/server";
import { auth0Client } from "./auth0-client";

const matchPath = (path: string, patterns: RegExp[]): boolean => {
  for (const pattern of patterns) {
    const match = pattern.test(path);

    if (match) {
      return true;
    }
  }

  return false;
};

export const runRouteGuards = async (
  request: NextRequest,
  publicRoutePatterns: RegExp[],
): Promise<{
  redirect: {
    loginUrl: URL;
  };
} | null> => {
  const { pathname } = request.nextUrl;

  const loginPath = "/auth/login";
  const returnToQueryParamKey = "returnTo";

  const isMatch = matchPath(pathname, publicRoutePatterns);

  if (isMatch) {
    return null;
  }

  const session = await auth0Client.getSession();

  if (!session) {
    const loginUrl = new URL(loginPath, process.env.APP_BASE_URL);
    loginUrl.searchParams.append(
      returnToQueryParamKey,
      request.nextUrl.pathname,
    );

    return {
      redirect: {
        loginUrl,
      },
    };
  }

  return null;
};
