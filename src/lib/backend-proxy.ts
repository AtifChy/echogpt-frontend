import "server-only";
import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "echo_access";
const REFRESH_COOKIE = "echo_refresh";
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/backend",
  maxAge: 60 * 60 * 24 * 30,
};

const routes: [RegExp, string[]][] = [
  [/^auth\/(login|register|refresh|logout)$/, ["POST"]],
  [/^users\/me$/, ["GET", "PATCH", "DELETE"]],
  [/^users\/me\/password$/, ["PATCH"]],
  [/^conversations$/, ["GET", "POST"]],
  [/^conversations\/\d+$/, ["DELETE"]],
  [/^conversations\/\d+\/messages$/, ["GET"]],
  [/^chat\/messages$/, ["POST"]],
  [/^search$/, ["POST"]],
  [/^search\/history$/, ["GET", "DELETE"]],
  [/^search\/(recent|suggestions)$/, ["GET"]],
  [/^(subscriptions|usage)\/me$/, ["GET"]],
  [/^health$/, ["GET"]],
  [/^admin\/(dashboard|users|subscriptions|request-logs|health)$/, ["GET"]],
  [/^admin\/users\/\d+\/status$/, ["PATCH"]],
  [/^admin\/users\/\d+\/subscription$/, ["PATCH"]],
  [/^admin\/providers$/, ["GET", "POST"]],
  [/^admin\/providers\/\d+$/, ["PATCH", "DELETE"]],
  [/^admin\/providers\/\d+\/enabled$/, ["PATCH"]],
  [/^admin\/providers\/\d+\/default$/, ["PUT"]],
  [/^admin\/providers\/\d+\/health$/, ["POST"]],
];

function clearSession(response: NextResponse) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
  }
  return response;
}

export async function handleBackendRequest(
  request: NextRequest,
  segments: string[],
  fetcher: typeof fetch = fetch,
) {
  const path = segments.join("/");
  const allowed = routes.find(([pattern]) => pattern.test(path));
  if (!allowed) return NextResponse.json({ message: "Endpoint not found" }, { status: 404 });
  if (!allowed[1].includes(request.method)) {
    return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
  }
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    // Next may reconstruct nextUrl with its configured hostname. Compare with
    // the actual incoming host so localhost, loopback, and deployed hosts work.
    const host = request.headers.get("host") || request.nextUrl.host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
    const protocol =
      forwardedProtocol === "https" || forwardedProtocol === "http"
        ? forwardedProtocol
        : request.nextUrl.protocol.replace(":", "");
    let sameOrigin = !origin;
    try {
      if (origin) sameOrigin = new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
    }
    if (
      path !== "auth/logout" &&
      path !== "auth/refresh" &&
      !request.headers.get("content-type")?.includes("application/json")
    ) {
      return NextResponse.json({ message: "A JSON request body is required" }, { status: 415 });
    }
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const isPublic = ["auth/login", "auth/register", "health"].includes(path);
  if (path === "auth/refresh" && !refreshToken) {
    return clearSession(NextResponse.json({ message: "Sign in to continue" }, { status: 401 }));
  }
  if (!isPublic && path !== "auth/refresh" && !accessToken) {
    const response = NextResponse.json({ message: "Sign in to continue" }, { status: 401 });
    return path === "auth/logout" ? clearSession(response) : response;
  }

  try {
    const base = (process.env.BACKEND_API_URL || "http://localhost:3010/api/v1").replace(/\/$/, "");
    const upstreamUrl = new URL(`${base}/${path}`);
    upstreamUrl.search = request.nextUrl.search;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (accessToken && !isPublic && path !== "auth/refresh")
      headers.Authorization = `Bearer ${accessToken}`;
    const body =
      request.method === "GET"
        ? undefined
        : path === "auth/refresh"
          ? JSON.stringify({ refreshToken })
          : await request.text();
    const upstream = await fetcher(upstreamUrl, {
      method: request.method,
      headers,
      ...(body ? { body } : {}),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(path === "chat/messages" ? 120_000 : 40_000),
    });
    const data = upstream.status === 204 ? null : await upstream.json();
    if (upstream.ok && ["auth/login", "auth/register", "auth/refresh"].includes(path)) {
      if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
        return NextResponse.json({ message: "Invalid authentication response" }, { status: 502 });
      }
      const response = NextResponse.json(data.user ? { user: data.user } : { success: true });
      response.cookies.set(ACCESS_COOKIE, data.accessToken, cookieOptions);
      response.cookies.set(REFRESH_COOKIE, data.refreshToken, cookieOptions);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    const response =
      upstream.status === 204
        ? new NextResponse(null, { status: 204 })
        : NextResponse.json(data, { status: upstream.status });
    response.headers.set("Cache-Control", "no-store");
    if (
      path === "auth/logout" ||
      (path === "auth/refresh" && upstream.status === 401) ||
      (upstream.ok &&
        (path === "users/me/password" || (path === "users/me" && request.method === "DELETE")))
    )
      clearSession(response);
    return response;
  } catch {
    const response = NextResponse.json(
      { message: "Cannot reach EchoGPT. Make sure the backend is running, then try again." },
      { status: 502 },
    );
    return path === "auth/logout" ? clearSession(response) : response;
  }
}
