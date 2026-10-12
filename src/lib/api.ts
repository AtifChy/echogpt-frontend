export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshRequest: Promise<Response> | null = null;

async function refreshSession() {
  // Concurrent queries share one rotation because refresh tokens are single-use.
  refreshRequest ??= fetch("/api/backend/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
  }).finally(() => {
    refreshRequest = null;
  });
  return refreshRequest;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  notifySessionExpired = true,
): Promise<T> {
  const init: RequestInit = {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
  };
  let response = await fetch(`/api/backend/${path}`, init);
  if (response.status === 401 && !path.startsWith("auth/") && path !== "users/me/password") {
    const refreshed = await refreshSession();
    if (refreshed.ok) response = await fetch(`/api/backend/${path}`, init);
    else if (refreshed.status === 401) {
      if (notifySessionExpired && typeof window !== "undefined")
        window.dispatchEvent(new Event("echogpt:session-expired"));
    } else {
      throw new ApiError(
        "Unable to reconnect to your session. Please try again.",
        refreshed.status,
      );
    }
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message) ? body.message.join(". ") : body?.message;
    throw new ApiError(
      message || `Request failed (${response.status}). Please try again.`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
