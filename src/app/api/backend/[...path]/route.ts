import type { NextRequest } from "next/server";

import { handleBackendRequest } from "@/lib/backend-proxy";

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleBackendRequest(request, path);
}

export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
