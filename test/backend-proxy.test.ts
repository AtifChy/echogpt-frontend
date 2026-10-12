import { describe, expect, mock, test } from "bun:test";

import { NextRequest } from "next/server";

// Next.js supplies this guard at build time; Bun tests run the server module directly.
mock.module("server-only", () => ({}));
const { handleBackendRequest } = await import("../src/lib/backend-proxy");

function request(path: string, options: ConstructorParameters<typeof NextRequest>[1] = {}) {
  return new NextRequest(`http://localhost:3001/api/backend/${path}`, options);
}
function fetcher(response: Response) {
  return mock(async () => response) as unknown as typeof fetch;
}

describe("NestJS proxy", () => {
  test("accepts the incoming frontend host when Next reconstructs a localhost URL", async () => {
    const upstream = fetcher(
      Response.json({ user: { id: 7 }, accessToken: "access", refreshToken: "refresh" }),
    );
    const response = await handleBackendRequest(
      request("auth/login", {
        method: "POST",
        headers: {
          Host: "127.0.0.1:3001",
          Origin: "http://127.0.0.1:3001",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
      ["auth", "login"],
      upstream,
    );
    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  test("rejects unknown paths without contacting an upstream", async () => {
    const upstream = fetcher(Response.json({}));
    const response = await handleBackendRequest(
      request("https://untrusted.example"),
      ["https:", "untrusted.example"],
      upstream,
    );
    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("requires a session for protected routes", async () => {
    const upstream = fetcher(Response.json({}));
    const response = await handleBackendRequest(
      request("conversations"),
      ["conversations"],
      upstream,
    );
    expect(response.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("rejects cross-origin mutations", async () => {
    const upstream = fetcher(Response.json({}));
    const response = await handleBackendRequest(
      request("auth/login", {
        method: "POST",
        headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" },
        body: "{}",
      }),
      ["auth", "login"],
      upstream,
    );
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("rejects form submissions rather than forwarding credentials", async () => {
    const upstream = fetcher(Response.json({}));
    const response = await handleBackendRequest(
      request("auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "email=test@example.com",
      }),
      ["auth", "login"],
      upstream,
    );
    expect(response.status).toBe(415);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("stores tokens in HttpOnly cookies without returning them to JavaScript", async () => {
    const upstream = fetcher(
      Response.json({
        user: { id: 7 },
        accessToken: "private-access",
        refreshToken: "private-refresh",
      }),
    );
    const response = await handleBackendRequest(
      request("auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "test-password" }),
      }),
      ["auth", "login"],
      upstream,
    );
    expect(await response.json()).toEqual({ user: { id: 7 } });
    expect(response.cookies.get("echo_access")?.value).toBe("private-access");
    expect(response.cookies.get("echo_refresh")?.value).toBe("private-refresh");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  test("forwards the cookie access token and preserves pagination", async () => {
    const upstream = mock(async (url: URL, options: RequestInit) => {
      expect(url.pathname).toBe("/api/v1/admin/users");
      expect(url.search).toBe("?page=2&limit=25");
      expect(new Headers(options.headers).get("authorization")).toBe("Bearer private-access");
      expect(new Headers(options.headers).has("cookie")).toBe(false);
      return Response.json([]);
    }) as unknown as typeof fetch;
    const response = await handleBackendRequest(
      request("admin/users?page=2&limit=25", {
        headers: { Cookie: "echo_access=private-access; unrelated=sensitive" },
      }),
      ["admin", "users"],
      upstream,
    );
    expect(response.status).toBe(200);
  });

  test("uses the cookie refresh token, not client-supplied tokens", async () => {
    const upstream = mock(async (_url: URL, options: RequestInit) => {
      expect(JSON.parse(String(options.body))).toEqual({ refreshToken: "cookie-refresh" });
      return Response.json({ accessToken: "new-access", refreshToken: "new-refresh" });
    }) as unknown as typeof fetch;
    const response = await handleBackendRequest(
      request("auth/refresh", {
        method: "POST",
        headers: { Cookie: "echo_refresh=cookie-refresh" },
        body: JSON.stringify({ refreshToken: "untrusted-token" }),
      }),
      ["auth", "refresh"],
      upstream,
    );
    expect(await response.json()).toEqual({ success: true });
    expect(response.cookies.get("echo_refresh")?.value).toBe("new-refresh");
  });

  test("clears cookies when the refresh token is revoked", async () => {
    const upstream = fetcher(Response.json({ message: "Invalid refresh token" }, { status: 401 }));
    const response = await handleBackendRequest(
      request("auth/refresh", { method: "POST", headers: { Cookie: "echo_refresh=revoked" } }),
      ["auth", "refresh"],
      upstream,
    );
    expect(response.status).toBe(401);
    expect(response.cookies.get("echo_access")?.maxAge).toBe(0);
    expect(response.cookies.get("echo_refresh")?.maxAge).toBe(0);
  });

  test("clears the session when logout succeeds", async () => {
    const response = await handleBackendRequest(
      request("auth/logout", { method: "POST", headers: { Cookie: "echo_access=private-access" } }),
      ["auth", "logout"],
      fetcher(new Response(null, { status: 204 })),
    );
    expect(response.status).toBe(204);
    expect(response.cookies.get("echo_access")?.maxAge).toBe(0);
    expect(response.cookies.get("echo_refresh")?.maxAge).toBe(0);
  });

  test("clears the session after a password change", async () => {
    const response = await handleBackendRequest(
      request("users/me/password", {
        method: "PATCH",
        headers: { Cookie: "echo_access=private-access", "Content-Type": "application/json" },
        body: "{}",
      }),
      ["users", "me", "password"],
      fetcher(new Response(null, { status: 204 })),
    );
    expect(response.status).toBe(204);
    expect(response.cookies.get("echo_refresh")?.maxAge).toBe(0);
  });

  test("returns a useful gateway error without leaking upstream details", async () => {
    const upstream = mock(async () => {
      throw new Error("private infrastructure detail");
    }) as unknown as typeof fetch;
    const response = await handleBackendRequest(request("health"), ["health"], upstream);
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("private infrastructure detail");
  });

  test("maps every provider route and method to the upstream", async () => {
    const cases: [string[], string][] = [
      [["admin", "providers"], "GET"],
      [["admin", "providers"], "POST"],
      [["admin", "providers", "12"], "PATCH"],
      [["admin", "providers", "12"], "DELETE"],
      [["admin", "providers", "12", "enabled"], "PATCH"],
      [["admin", "providers", "12", "default"], "PUT"],
      [["admin", "providers", "12", "health"], "POST"],
    ];

    for (const [segments, method] of cases) {
      const upstream = mock(async (url: URL, options: RequestInit) => {
        expect(url.pathname).toBe(`/api/v1/${segments.join("/")}`);
        expect(options.method).toBe(method);
        return Response.json({ ok: true });
      }) as unknown as typeof fetch;
      const response = await handleBackendRequest(
        request(segments.join("/"), {
          method,
          headers: {
            Cookie: "echo_access=private-access",
            ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
          },
          ...(method === "GET" || method === "DELETE" ? {} : { body: "{}" }),
        }),
        segments,
        upstream,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(upstream).toHaveBeenCalledTimes(1);
    }
  });

  test("requires authentication for provider routes", async () => {
    const upstream = fetcher(Response.json({}));
    const response = await handleBackendRequest(
      request("admin/providers"),
      ["admin", "providers"],
      upstream,
    );
    expect(response.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("rejects unsupported provider methods and unknown paths before forwarding", async () => {
    const upstream = fetcher(Response.json({}));
    const wrongMethod = await handleBackendRequest(
      request("admin/providers", {
        method: "PUT",
        headers: { Cookie: "echo_access=private-access", "Content-Type": "application/json" },
        body: "{}",
      }),
      ["admin", "providers"],
      upstream,
    );
    const unknownPath = await handleBackendRequest(
      request("admin/providers/not-an-id", { headers: { Cookie: "echo_access=private-access" } }),
      ["admin", "providers", "not-an-id"],
      upstream,
    );
    expect(wrongMethod.status).toBe(405);
    expect(unknownPath.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("rejects cross-origin provider mutations before forwarding", async () => {
    const upstream = fetcher(Response.json({}));
    const response = await handleBackendRequest(
      request("admin/providers", {
        method: "POST",
        headers: {
          Cookie: "echo_access=private-access",
          Origin: "https://untrusted.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
      ["admin", "providers"],
      upstream,
    );
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  test("passes provider authorization failures through without caching", async () => {
    const upstream = fetcher(Response.json({ message: "Forbidden" }, { status: 403 }));
    const response = await handleBackendRequest(
      request("admin/providers", { headers: { Cookie: "echo_access=private-access" } }),
      ["admin", "providers"],
      upstream,
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "Forbidden" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
