import { describe, expect, test } from "bun:test";

import { PROVIDER_TYPES, providerPayload } from "../src/lib/providers";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("provider configuration", () => {
  test("exposes the supported provider types", () => {
    expect(PROVIDER_TYPES).toEqual([
      { label: "OpenAI", value: "OPENAI" },
      { label: "Claude (Anthropic)", value: "ANTHROPIC" },
      { label: "Google Gemini", value: "GEMINI" },
    ]);
  });

  test("trims and creates a disabled provider with its selected type and key", () => {
    expect(
      providerPayload(
        form({
          name: "  Work OpenAI  ",
          model: "  gpt-test  ",
          type: "OPENAI",
          apiKey: "  abcdefghij-secret  ",
        }),
        false,
      ),
    ).toEqual({
      name: "Work OpenAI",
      model: "gpt-test",
      type: "OPENAI",
      apiKey: "abcdefghij-secret",
      enabled: false,
    });
  });

  test("requires a valid provider type and API key on create", () => {
    expect(() =>
      providerPayload(form({ name: "Valid", model: "model", type: "OPENAI" }), false),
    ).toThrow();
    expect(() =>
      providerPayload(
        form({ name: "Valid", model: "model", type: "OTHER", apiKey: "1234567890" }),
        false,
      ),
    ).toThrow();
  });

  test("allows an edit without a replacement key and omits immutable fields", () => {
    expect(
      providerPayload(
        form({ name: " Updated ", model: " model-v2 ", type: "OTHER", apiKey: " " }),
        true,
      ),
    ).toEqual({ name: "Updated", model: "model-v2" });
  });

  test("trims and includes a replacement key when editing", () => {
    expect(
      providerPayload(
        form({ name: "Updated", model: "model-v2", apiKey: "  replacement-key  " }),
        true,
      ),
    ).toEqual({ name: "Updated", model: "model-v2", apiKey: "replacement-key" });
  });

  test("rejects names and models outside their allowed lengths", () => {
    expect(() =>
      providerPayload(form({ name: " ", model: "m", type: "OPENAI", apiKey: "1234567890" }), false),
    ).toThrow();
    expect(() =>
      providerPayload(
        form({ name: "n".repeat(81), model: "m", type: "OPENAI", apiKey: "1234567890" }),
        false,
      ),
    ).toThrow();
    expect(() =>
      providerPayload(
        form({ name: "n", model: "m".repeat(101), type: "OPENAI", apiKey: "1234567890" }),
        false,
      ),
    ).toThrow();
  });

  test("rejects a supplied key shorter than ten characters", () => {
    expect(() =>
      providerPayload(
        form({ name: "Valid", model: "model", type: "OPENAI", apiKey: "123456789" }),
        false,
      ),
    ).toThrow();
    expect(() =>
      providerPayload(form({ name: "Valid", model: "model", apiKey: "short" }), true),
    ).toThrow();
  });
});
