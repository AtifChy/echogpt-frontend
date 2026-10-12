// Isolated HTTP fixture for manual browser checks. Never used by the application.
// Start explicitly with: bun run test/fixture-api.ts --fixture
if (!process.argv.includes("--fixture"))
  throw new Error("This test fixture requires the --fixture flag.");

let active = false;
let nextId = 100;
let used = 0;
const user = {
  id: 9001,
  email: "frontend-qa@example.invalid",
  displayName: "Frontend QA",
  role: { name: "ADMIN" },
  status: "ACTIVE",
  createdAt: "2026-10-10T00:00:00.000Z",
};
const conversations: { id: number; providerId: number; createdAt: string; updatedAt: string }[] =
  [];
const messages = new Map<
  number,
  {
    id: number;
    role: string;
    content: string;
    inputTokens: number;
    outputTokens: number;
    createdAt: string;
  }[]
>();
const searches: { id: number; query: string; createdAt: string }[] = [];
type FixtureProvider = {
  id: number;
  name: string;
  type: "OPENAI" | "ANTHROPIC" | "GEMINI";
  model: string;
  enabled: boolean;
  isDefault: boolean;
};
const providers: FixtureProvider[] = [
  {
    id: 1,
    name: "Fixture OpenAI",
    type: "OPENAI",
    model: "gpt-fixture",
    enabled: true,
    isDefault: true,
  },
];
const sources = Array.from({ length: 5 }, (_, index) => ({
  citation: index + 1,
  title: `Fixture reference ${index + 1}: Example documentation`,
  url: `https://reference-${index + 1}.example.invalid/articles/${index + 1}`,
  hostname: `reference-${index + 1}.example.invalid`,
  snippets: [`Isolated browser QA source ${index + 1}; this is fixture content.`],
}));

Bun.serve({
  hostname: "127.0.0.1",
  port: 3302,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace("/api/v1/", "");
    const json = (data: unknown, status = 200) => Response.json(data, { status });
    const empty = () => new Response(null, { status: 204 });
    const now = () => new Date().toISOString();
    if (path === "health") return json({ status: "ok" });
    if (path === "auth/login") {
      const body = (await request.json()) as { email: string; password: string };
      if (body.email !== user.email || body.password !== "frontend-fixture-password")
        return json({ message: "Invalid email or password" }, 401);
      active = true;
      return json({
        user: { ...user, role: "ADMIN" },
        accessToken: "fixture-access",
        refreshToken: "fixture-refresh",
      });
    }
    if (path === "auth/refresh")
      return active
        ? json({ accessToken: "fixture-access", refreshToken: "fixture-refresh" })
        : json({ message: "Session is no longer active" }, 401);
    if (!active || request.headers.get("authorization") !== "Bearer fixture-access")
      return json({ message: "Unauthorized" }, 401);
    if (path === "auth/logout") {
      active = false;
      return empty();
    }
    if (path === "users/me") {
      if (request.method === "PATCH") {
        const body = (await request.json()) as { displayName: string };
        user.displayName = body.displayName;
      }
      if (request.method === "DELETE") {
        active = false;
        return empty();
      }
      return json(user);
    }
    if (path === "users/me/password") {
      active = false;
      return empty();
    }
    if (path === "usage/me")
      return json({
        plan: "FREE",
        status: "ACTIVE",
        limit: 100,
        used,
        remaining: 100 - used,
        periodStart: "2026-10-01T00:00:00.000Z",
        periodEnd: "2026-11-01T00:00:00.000Z",
      });
    if (path === "conversations") {
      if (request.method === "POST") {
        const conversation = { id: nextId++, providerId: 1, createdAt: now(), updatedAt: now() };
        conversations.unshift(conversation);
        messages.set(conversation.id, []);
        return json(conversation, 201);
      }
      return json(conversations);
    }
    if (/^conversations\/\d+\/messages$/.test(path))
      return json(messages.get(Number(path.split("/")[1])) || []);
    if (/^conversations\/\d+$/.test(path) && request.method === "DELETE") {
      const id = Number(path.split("/")[1]);
      const index = conversations.findIndex((row) => row.id === id);
      if (index >= 0) conversations.splice(index, 1);
      messages.delete(id);
      return empty();
    }
    if (path === "chat/messages") {
      const body = (await request.json()) as {
        conversationId: number;
        prompt: string;
        webSearch?: boolean;
      };
      const rows = messages.get(body.conversationId)!;
      rows.push({
        id: nextId++,
        role: "USER",
        content: body.prompt,
        inputTokens: 0,
        outputTokens: 0,
        createdAt: now(),
      });
      if (body.prompt.includes("[fail]"))
        return json({ message: "Fixture: provider unavailable" }, 502);
      const message = {
        id: nextId++,
        role: "ASSISTANT",
        content:
          "## A little clarity\n\nThis is an isolated **browser test response**, not a real AI result.\n\nHere is a short paragraph before the list.\n\n* First fixture point with a wrapped\n  continuation line.\n* Second fixture point.\n* Third fixture point.\n\n  * An indented detail.\n\n```typescript\nconst idea = 'Keep exploring';\n```",
        inputTokens: 12,
        outputTokens: 32,
        createdAt: now(),
      };
      rows.push(message);
      used += body.webSearch ? 2 : 1;
      return json({ message }, 201);
    }
    if (path === "search" && request.method === "POST") {
      const body = (await request.json()) as { query: string };
      const row = { id: nextId++, query: body.query, createdAt: now() };
      searches.unshift(row);
      used++;
      return json({ searchId: row.id, query: row.query, sources });
    }
    if (path === "search/history" || path === "search/recent") {
      if (request.method === "DELETE") {
        searches.length = 0;
        return empty();
      }
      return json(searches);
    }
    if (path === "search/suggestions")
      return json(
        searches
          .filter((row) => row.query.startsWith(url.searchParams.get("q") || ""))
          .map((row) => row.query),
      );
    if (path === "admin/dashboard")
      return json({
        users: 1,
        conversations: conversations.length,
        searches: searches.length,
        requests: used,
      });
    if (path === "admin/health")
      return json({ database: "fixture", databaseLatencyMs: 1, uptimeSeconds: 100 });
    if (path === "admin/providers") {
      if (request.method === "GET") return json(providers);
      if (request.method !== "POST") return json({ message: "Method not allowed" }, 405);
      let body: Record<string, unknown>;
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        return json({ message: "A valid JSON body is required" }, 400);
      }
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 80 ||
        typeof body.model !== "string" ||
        !body.model.trim() ||
        body.model.trim().length > 100 ||
        !["OPENAI", "ANTHROPIC", "GEMINI"].includes(String(body.type)) ||
        typeof body.apiKey !== "string" ||
        body.apiKey.trim().length < 10
      )
        return json({ message: "Invalid provider details" }, 400);
      const provider: FixtureProvider = {
        id: nextId++,
        name: body.name.trim(),
        type: body.type as FixtureProvider["type"],
        model: body.model.trim(),
        enabled: false,
        isDefault: false,
      };
      providers.push(provider);
      return json(provider, 201);
    }
    const providerRoute = path.match(/^admin\/providers\/(\d+)(?:\/(enabled|default|health))?$/);
    if (providerRoute) {
      const id = Number(providerRoute[1]);
      const action = providerRoute[2];
      const providerIndex = providers.findIndex((row) => row.id === id);
      if (providerIndex < 0) return json({ message: "Provider not found" }, 404);
      const provider = providers[providerIndex];
      if (!action && request.method === "PATCH") {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ message: "A valid JSON body is required" }, 400);
        }
        if (
          (body.name !== undefined &&
            (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80)) ||
          (body.model !== undefined &&
            (typeof body.model !== "string" ||
              !body.model.trim() ||
              body.model.trim().length > 100)) ||
          (body.apiKey !== undefined &&
            (typeof body.apiKey !== "string" || body.apiKey.trim().length < 10))
        )
          return json({ message: "Invalid provider details" }, 400);
        if (typeof body.name === "string") provider.name = body.name.trim();
        if (typeof body.model === "string") provider.model = body.model.trim();
        // Intentionally discard apiKey. The fixture never stores or logs credentials.
        return json(provider);
      }
      if (!action && request.method === "DELETE") {
        if (provider.isDefault) return json({ message: "Cannot delete the default provider" }, 409);
        providers.splice(providerIndex, 1);
        return empty();
      }
      if (action === "enabled" && request.method === "PATCH") {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ message: "A valid JSON body is required" }, 400);
        }
        if (typeof body.enabled !== "boolean")
          return json({ message: "enabled must be a boolean" }, 400);
        provider.enabled = body.enabled;
        return json(provider);
      }
      if (action === "default" && request.method === "PUT") {
        if (!provider.enabled)
          return json({ message: "Enable the provider before setting it as default" }, 409);
        for (const row of providers) row.isDefault = row.id === provider.id;
        return json(provider);
      }
      if (action === "health" && request.method === "POST") {
        if (!provider.enabled)
          return json({ message: "Enable the provider before testing its connection" }, 409);
        await new Promise((resolve) => setTimeout(resolve, 150));
        return json({
          status: "ok",
          latency: 150,
          message: "Fixture health check; no AI service was contacted.",
        });
      }
      return json({ message: "Method not allowed" }, 405);
    }
    if (path === "admin/users")
      return json([{ ...user, subscriptions: { plan: "FREE", status: "ACTIVE" } }]);
    if (path === "admin/request-logs")
      return json([
        {
          requestId: 1,
          userId: user.id,
          operation: "CHAT",
          status: "SUCCESS",
          latencyMs: 120,
          createdAt: now(),
        },
      ]);
    return json({ message: "Fixture endpoint not found" }, 404);
  },
});
console.log("Isolated browser-test API: http://127.0.0.1:3302/api/v1");
