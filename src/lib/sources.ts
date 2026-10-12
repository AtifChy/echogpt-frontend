import type { Source } from "@/lib/types";

export function safeSourceUrl(url: string) {
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

export function sourceLinks(sources: Source[]) {
  return sources.flatMap((source) => {
    const href = safeSourceUrl(source.url);
    if (!href) return [];
    return [{ ...source, href, domain: new URL(href).hostname.replace(/^www\./, "") }];
  });
}
