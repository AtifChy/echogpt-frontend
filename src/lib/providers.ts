import type { ProviderType } from "@/lib/types";

export const PROVIDER_TYPES = [
  { label: "OpenAI", value: "OPENAI" },
  { label: "Claude (Anthropic)", value: "ANTHROPIC" },
  { label: "Google Gemini", value: "GEMINI" },
] as const;

export function providerPayload(form: FormData, editing: boolean) {
  const name = String(form.get("name") ?? "").trim();
  const model = String(form.get("model") ?? "").trim();
  const apiKey = String(form.get("apiKey") ?? "").trim();
  if (!name || name.length > 80)
    throw new Error("Use a provider name between 1 and 80 characters.");
  if (!model || model.length > 100) throw new Error("Use a model ID between 1 and 100 characters.");
  if ((!editing || apiKey) && apiKey.length < 10)
    throw new Error("The API key must contain at least 10 characters.");
  if (editing) return { name, model, ...(apiKey ? { apiKey } : {}) };
  const type = String(form.get("type") ?? "") as ProviderType;
  if (!PROVIDER_TYPES.some((provider) => provider.value === type))
    throw new Error("Choose a supported provider type.");
  return { name, model, type, apiKey, enabled: false };
}
