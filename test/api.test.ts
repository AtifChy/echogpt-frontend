import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import { api, ApiError } from "../src/lib/api";

afterEach(() => mock.restore());

describe("browser API client", () => {
  test("shares a refresh rotation between concurrent unauthorized queries", async () => {
    let refreshed = false;
    let refreshCount = 0;
    spyOn(globalThis, "fetch").mockImplementation((async (input: Parameters<typeof fetch>[0]) => {
      if (String(input).endsWith("auth/refresh")) {
        refreshCount++;
        await new Promise((resolve) => setTimeout(resolve, 5));
        refreshed = true;
        return Response.json({ success: true });
      }
      return refreshed
        ? Response.json({ ok: true })
        : Response.json({ message: "Expired" }, { status: 401 });
    }) as typeof fetch);
    const results = await Promise.all([api("conversations"), api("usage/me")]);
    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(refreshCount).toBe(1);
  });

  test("does not rotate a session for invalid login credentials", async () => {
    const fetchMock = spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ message: "Invalid email or password" }, { status: 401 }),
    );
    expect(api("auth/login", { method: "POST", body: "{}" })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("keeps invalid-current-password errors intact without replaying the mutation", async () => {
    const fetchMock = spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ message: "Current password is incorrect" }, { status: 401 }),
    );
    expect(api("users/me/password", { method: "PATCH", body: "{}" })).rejects.toThrow(
      "Current password is incorrect",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("handles no-content responses", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    expect(await api("auth/logout", { method: "POST" })).toBeUndefined();
  });

  test("displays validation messages from the backend", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { message: ["email must be an email", "password is too short"] },
        { status: 400 },
      ),
    );
    expect(api("auth/register", { method: "POST", body: "{}" })).rejects.toThrow(
      "email must be an email. password is too short",
    );
  });
});
