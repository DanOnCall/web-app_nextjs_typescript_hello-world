# Auth0 Next.js SDK v4 Quick Guide

## Configure Auth0 and Next.js

### Install the SDK

```shell
npm i @auth0/nextjs-auth0@4.0.0-beta.7
```

### Configure an Auth0 application

> [!IMPORTANT]  
> If you haven't done so already, [sign up to create a free Auth0 account](https://auth0.com/signup).

Create a Regular Web Application in the [Auth0 Dashboard](https://manage.auth0.com/#/applications).

> If you're using an existing application, verify that you have configured the following settings in your Regular Web Application:
>
> - Click on the "Settings" tab of your application's page.
> - Scroll down and click on the "Show Advanced Settings" link.
> - Under "Advanced Settings", click on the "OAuth" tab.
> - Ensure that "JsonWebToken Signature Algorithm" is set to RS256 and that "OIDC Conformant" is enabled.

Next, configure the following URLs for your application under the "Application URIs" section of the "Settings" page:

- **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3000`

Take note of the **Domain**, **Client ID**, and **Client Secret** values under the "Basic Information" section. You'll need these values in the next step.

### Add the environment variables

You need to allow your Next.js application to communicate properly with Auth0. You can do so by creating a `.env` or `.env.local` file under your root project directory that defines the necessary Auth0 configuration values as follows:

```
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_SECRET=
APP_BASE_URL=http://localhost:3000
```

The Auth0 SDK uses the `AUTH0_SECRET` to encrypt the session cookie. You can execute the following command to generate a suitable string for the `AUTH0_SECRET` value:

```shell
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

> [!NOTE]  
> For more details about loading environment variables in Next.js, visit the ["Environment Variables" document](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables).

### Create and configure the Auth0 client

Create an instance of the Auth0 client to import and use whenever you need access to the authentication methods on the server.

Add the following contents to a file named `lib/auth0.ts`:

```ts
import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client();
```

The `Auth0Client()` method can take a configuration object with any of the following properties to configure the Auth0 client and its behavior:

| Option                  | Type                      | Description                                                                                                                                                    |
| ----------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain                  | `string`                  | The Auth0 domain for the tenant (e.g.: `example.us.auth0.com`). If it's not specified, it will be loaded from the `AUTH0_DOMAIN` environment variable.         |
| clientId                | `string`                  | The Auth0 client ID. If it's not specified, it will be loaded from the `AUTH0_CLIENT_ID` environment variable.                                                 |
| clientSecret            | `string`                  | The Auth0 client secret. If it's not specified, it will be loaded from the `AUTH0_CLIENT_SECRET` environment variable.                                         |
| authorizationParameters | `AuthorizationParameters` | The authorization parameters to pass to the `/authorize` endpoint. See [Passing authorization parameters](#passing-authorization-parameters) for more details. |
| appBaseUrl              | `string`                  | The URL of your application (e.g.: `http://localhost:3000`). If it's not specified, it will be loaded from the `APP_BASE_URL` environment variable.            |
| secret                  | `string`                  | A 32-byte, hex-encoded secret used for encrypting cookies. If it's not specified, it will be loaded from the `AUTH0_SECRET` environment variable.              |
| signInReturnToPath      | `string`                  | The path to redirect the user to after successfully authenticating. Defaults to `/`.                                                                           |
| session                 | `SessionConfiguration`    | Configure the session timeouts and whether to use rolling sessions or not. See [Session configuration](#session-configuration) for additional details.         |
| beforeSessionSaved      | `BeforeSessionSavedHook`  | A method to manipulate the session before persisting it. See [beforeSessionSaved](#beforesessionsaved) for additional details.                                 |
| onCallback              | `OnCallbackHook`          | A method to handle errors or manage redirects after attempting to authenticate. See [onCallback](#oncallback) for additional details.                          |
| sessionStore            | `SessionStore`            | A custom session store implementation used to persist sessions to a data store. See [Database sessions](#database-sessions) for additional details.            |

### Add the authentication middleware

Create a `middleware.ts` file under your root project directory or under the `src/` directory if you are following that project structure pattern:

```ts
import type { NextRequest } from "next/server";

import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
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
```

By default, **the middleware does not protect any pages**. The Auth0 SDK uses that Next.js middleware to provide the necessary functionality for rolling sessions and to mount authentication routes such as the following:

- `/auth/login`: Your Next.js application redirects users to your identity provider for them to log in.
- `/auth/callback`: Your identity provider redirects users to this route after they successfully log in.
- `/auth/logout`: Your Next.js application logs out the user.
- `/auth/profile`: You can fetch user profile information in JSON format.
- `/auth/access-token`: You can fetch an access token, which is refreshed automatically if a refresh token is available.
- `/auth/backchannel-logout`: The route to receive and process an OIDC Back-Channel Logout event.

## Authenticate users

You can now begin to authenticate your users by redirecting them to the `/auth/login` route:

```tsx
import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();

  if (!session) {
    return (
      <main>
        <a href="/auth/login?screen_hint=signup">Sign up</a>
        <a href="/auth/login">Log in</a>
      </main>
    );
  }

  return (
    <main>
      <h1>Welcome, {session.user.name}!</h1>
    </main>
  );
}
```

> [!IMPORTANT]  
> You must use `<a>` tags instead of the `<Link>` component to ensure that the routing is not done client-side, as that may result in some unexpected behavior.

## Protect Routes and Access Authenticated User Information

### In the browser

To access the currently authenticated user on the client, you can use the `useUser()` hook, like so:

```tsx
"use client";

import { useUser } from "@auth0/nextjs-auth0";

export default function Profile() {
  const { user, isLoading, error } = useUser();

  if (isLoading) return <div>Loading...</div>;

  return (
    <main>
      <h1>Profile</h1>
      <div>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </div>
    </main>
  );
}
```

### On the server (App Router)

On the server, the `getSession()` helper can be used in Server Components, Server Routes, Server Actions, and middleware to get the session of the currently authenticated user and to protect resources, like so:

```tsx
import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return (
    <main>
      <h1>Welcome, {session.user.name}!</h1>
    </main>
  );
}
```

### On the server (Pages Router)

On the server, the `getSession(req)` helper can be used in `getServerSideProps`, API routes, and middleware to get the session of the currently authenticated user and to protect resources, like so:

```tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

import { auth0 } from "@/lib/auth0";

export const getServerSideProps = (async (ctx) => {
  const session = await auth0.getSession(ctx.req);

  if (!session) return { props: { user: null } };

  return { props: { user: session.user ?? null } };
}) satisfies GetServerSideProps<{ user: any | null }>;

export default function Page({
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!user) {
    return (
      <main>
        <p>Not authenticated!</p>
      </main>
    );
  }

  return (
    <main>
      <p>Welcome, {user.name}!</p>
    </main>
  );
}
```

## Getting an access token

The `getAccessToken()` helper can be used both in the browser and on the server to obtain the access token to call external APIs. If the access token has expired and a refresh token is available, it will automatically be refreshed and persisted.

### In the browser

To obtain an access token to call an external API on the client, you can use the `getAccessToken()` helper like so:

```tsx
"use client";

import { getAccessToken } from "@auth0/nextjs-auth0";

export default function Component() {
  async function fetchData() {
    const token = await getAccessToken();

    // call external API with the token...
  }

  return (
    <main>
      <button onClick={fetchData}>Fetch Data</button>
    </main>
  );
}
```

### On the server (App Router)

On the server, the `getAccessToken()` helper can be used in Server Components, Server Routes, Server Actions, and middleware to get an access token to call external APIs, like so:

```tsx
import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";

export async function GET() {
  const token = await auth0.getAccessToken();

  // call external API with token...

  return NextResponse.json({
    message: "Success!",
  });
}
```

### On the server (Pages Router)

On the server, the `getAccessToken(req)` helper can be used in `getServerSideProps`, API routes, and middleware to get an access token to call external APIs, like so:

```tsx
import type { NextApiRequest, NextApiResponse } from "next";

import { auth0 } from "@/lib/auth0";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ message: string }>
) {
  const token = await auth0.getAccessToken(req);

  // call external API with token...

  res.status(200).json({ message: "Success!" });
}
```

## Passing authorization parameters

There are two options to customize the authorization parameters that you can pass to the `/authorize` endpoint.

You can define authorization parameters when instantiating the Auth0 client by defining a property on its configuration object:

```ts
export const auth0 = new Auth0Client({
  authorizationParameters: {
    scope: "openid profile email",
    audience: "urn:custom:api",
  },
});
```

On the other hand, whenever you need to specify the authorization parameters dynamically, you can add query parameters to the `/auth/login` endpoint directly. For example, to specify an `audience` authorization parameter upon login, you can redirect your users to the login page as follows:

```html
<a href="/auth/login?audience=urn:my-api">Login</a>
```

## The `returnTo` parameter

### Redirecting the user after authentication

The `returnTo` parameter can be appended to the login to specify where you would like to redirect the user after they have completed their authentication and have returned to your application.

For example: `/auth/login?returnTo=/dashboard` would redirect the user to the `/dashboard` route after they have authenticated.

### Redirecting the user after logging out

The `returnTo` parameter can be appended to the logout to specify where you would like to redirect the user after they have logged out.

For example: `/auth/login?returnTo=https://example.com/some-page` would redirect the user to the `https://example.com/some-page` URL after they have logged out.

> [!NOTE]  
> The URLs specified as `returnTo` parameters must be registered in your client's **Allowed Logout URLs**.

## Hooks

The SDK exposes hooks to enable you to provide custom logic that would be run at certain lifecycle events.

### `beforeSessionSaved`

The `beforeSessionSaved` hook is run right before the session is persisted. It provides a mechanism to modify the session claims before persisting them.

The hook receives a `SessionData` object and must return a Promise that resolves to a `SessionData` object: `(session: SessionData) => Promise<SessionData>`. For example:

```ts
export const auth0 = new Auth0Client({
  async beforeSessionSaved(session) {
    return {
      ...session,
      user: {
        ...session.user,
        foo: "bar",
      },
    };
  },
});
```

### `onCallback`

The `onCallback` hook is run once the user has been redirected back from Auth0 to your application with either an error or the authorization code which will be verified and exchanged.

The `onCallback` hook receives three parameters:

1. `error`: the error returned from Auth0 or when attempting to complete the transaction. This will be `null` if the transaction was completed successfully.
2. `context`: provides context on the transaction that initiated the transaction.
3. `session`: the `SessionData` that will persist once the transaction is completed successfully. This will be `null` if there was an error.

The hook must return a Promise that resolves to a `NextResponse`.

For example, a custom `onCallback` hook may be specified like so:

```ts
export const auth0 = new Auth0Client({
  async onCallback(error, context, session) {
    // redirect the user to a custom error page
    if (error) {
      return NextResponse.redirect(
        new URL(`/error?error=${error.message}`, process.env.APP_BASE_URL)
      );
    }

    // Complete the redirect to the provided returnTo URL
    return NextResponse.redirect(
      new URL(context.returnTo || "/", process.env.APP_BASE_URL)
    );
  },
});
```

## Session configuration

The session configuration can be managed by specifying a `session` object when configuring the Auth0 client, like so:

```ts
export const auth0 = new Auth0Client({
  session: {
    rolling: true,
    absoluteDuration: 60 * 60 * 24 * 30, // 30 days in seconds
    inactivityDuration: 60 * 60 * 24 * 7, // 7 days in seconds
  },
});
```

| Option             | Type      | Description                                                                                                                                                                                                                                   |
| ------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| rolling            | `boolean` | When enabled, the session will continue to be extended as long as it is used within the inactivity duration. Once the upper bound, set via the `absoluteDuration`, has been reached, the session will no longer be extended. Default: `true`. |
| absoluteDuration   | `number`  | The absolute duration after which the session will expire. The value must be specified in seconds. Default: `30 days`.                                                                                                                        |
| inactivityDuration | `number`  | The duration of inactivity after which the session will expire. The value must be specified in seconds. Default: `7 days`.                                                                                                                    |

## Database sessions

By default, the user's sessions are stored in encrypted cookies. You may choose to persist the sessions in your data store of choice.

To do this, you can provide a `SessionStore` implementation as an option when configuring the Auth0 client, like so:

```ts
export const auth0 = new Auth0Client({
  sessionStore: {
    async get(id) {
      // query and return a session by its ID
    },
    async set(id, sessionData) {
      // Upsert the session given its ID and sessionData
    },
    async delete(id) {
      // Delete the session using its ID
    },
    async deleteByLogoutToken({ sid, sub }: { sid: string; sub: string }) {
      // optional method to be implemented when using Back-Channel Logout
    },
  },
});
```

## Back-Channel Logout

The SDK can be configured to listen to [Back-Channel Logout](https://auth0.com/docs/authenticate/login/logout/back-channel-logout) events. By default, a route will be mounted, `/auth/backchannel-logout`, which will verify the logout token and call the `deleteByLogoutToken` method of your session store implementation to allow you to remove the session.

To use Back-Channel Logout, you will need to provide a session store implementation as shown in the [Database sessions](#database-sessions) section above with the `deleteByLogoutToken` implemented.

A `LogoutToken` object will be passed as the parameter to `deleteByLogoutToken`, which will contain either a `sid` claim, a `sub` claim, or both.

## Combining middleware

By default, the middleware does not protect any pages. It is used to mount the authentication routes and provide the necessary functionality for rolling sessions.

You can combine multiple middleware, like so:

```ts
export async function middleware(request: NextRequest) {
  const authResponse = await auth0.middleware(request);

  // If the path starts with /auth, let the auth middleware handle it
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return authResponse;
  }

  // Call any other middleware here
  const someOtherResponse = await someOtherMiddleware(request);

  // add any headers from the auth middleware to the response
  for (const [key, value] of authResponse.headers) {
    someOtherResponse.headers.set(key, value);
  }

  return someOtherResponse;
}
```
