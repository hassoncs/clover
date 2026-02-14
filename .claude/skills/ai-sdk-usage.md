---
name: ai-sdk-usage
description: "Use when calling AI/LLM APIs, generating text/objects with AI, using generateText/generateObject/streamText, creating AI clients, or adding AI features to any package. Covers OpenRouter, Vercel AI SDK, model selection, and secrets via hush."
---

# AI SDK Usage

> **MANDATORY**: All AI/LLM calls in this project go through OpenRouter via Vercel AI SDK. Never use provider SDKs directly.

## The Rule

```
NEVER: @anthropic-ai/sdk, openai (direct), @google/generative-ai
ALWAYS: ai + @ai-sdk/openai → OpenRouter
```

## Stack

| Layer | Package | Purpose |
|-------|---------|---------|
| AI SDK | `ai` (Vercel AI SDK) | `generateText`, `generateObject`, `streamText` |
| Provider | `@ai-sdk/openai` | OpenAI-compatible client (used for OpenRouter) |
| Router | OpenRouter | `https://openrouter.ai/api/v1` — routes to any model |
| Secrets | `hush` | `OPENROUTER_API_KEY` from vault |

## Pattern

### Creating a model

```typescript
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const model = openrouter.chat("anthropic/claude-sonnet-4");
```

### Canonical reference: `api/src/ai/model-factory.ts`

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function createModel(options: {
  apiKey: string;
  model?: string;
}): LanguageModel {
  const openrouter = createOpenAI({
    apiKey: options.apiKey,
    baseURL: OPENROUTER_BASE_URL,
  });
  return openrouter.chat(options.model ?? "anthropic/claude-sonnet-4");
}
```

### Generating text

```typescript
import { generateText } from "ai";

const { text } = await generateText({
  model,
  prompt: "Your prompt here",
});
```

### Generating structured objects

```typescript
import { generateObject } from "ai";
import { z } from "zod";

const { object } = await generateObject({
  model,
  schema: z.object({ name: z.string(), score: z.number() }),
  prompt: "Generate a player",
});
```

### Streaming

```typescript
import { streamText } from "ai";

const result = streamText({
  model,
  prompt: "Your prompt here",
});

for await (const chunk of result.fullStream) {
  // handle chunks
}
```

## CLI Scripts & Secrets

Any CLI script or command that calls AI must use `hush run --` to inject the API key:

```bash
# Correct
hush run -- pnpm content cli -- generate --game-type=quip --count=50
hush run -- npx tsx api/scripts/some-ai-script.ts

# WRONG - will fail with "API key required"
pnpm content cli -- generate --game-type=quip --count=50
```

The environment variable is `OPENROUTER_API_KEY`. Access it via `process.env.OPENROUTER_API_KEY`.

## Model Selection

| Use Case | Model ID | Notes |
|----------|----------|-------|
| General generation | `anthropic/claude-sonnet-4` | Default |
| Fast/cheap tasks | `anthropic/claude-3-5-haiku-20241022` | Moderation, classification |
| Complex reasoning | `anthropic/claude-opus-4-20250514` | Planning, architecture |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `@anthropic-ai/sdk` directly | Use `ai` + `@ai-sdk/openai` via OpenRouter |
| Using `ANTHROPIC_API_KEY` | Use `OPENROUTER_API_KEY` |
| Hardcoding `baseURL` | Use constant `https://openrouter.ai/api/v1` |
| Running AI scripts without `hush` | Prefix with `hush run --` |
| Using `openai` package directly | Use `@ai-sdk/openai` (Vercel's OpenAI-compatible provider) |

## Structured Output with OpenRouter

### The Problem

`generateObject` in AI SDK v6 sends `response_format: { type: "json_schema", json_schema: { strict: true, schema: ... } }`. This **only works natively with OpenAI models**. Anthropic and open-source models via OpenRouter **ignore `response_format` entirely** — the model never sees the schema and returns markdown/text instead of JSON.

### Solution: Per-Provider Configuration

| Provider | Config | Why |
|----------|--------|-----|
| OpenAI | Default (native json_schema) | Works out of the box |
| Anthropic | `provider: { order: ["Anthropic"] }` + `providerOptions.openrouter.response_format: { type: "json_object" }` + inject schema into system prompt | Anthropic ignores response_format; must force routing away from Google |
| Open Source | `providerOptions.openrouter.response_format: { type: "json_object" }` + inject schema into system prompt | Varies by model; json_object + prompt injection is most reliable |

### Schema Injection Pattern

For non-OpenAI providers, convert the Zod schema to JSON Schema and inject it into the system prompt:

```typescript
import { zodToJsonSchema } from "zod-to-json-schema";

if (providerFamily !== "openai") {
  const jsonSchema = zodToJsonSchema(schema);
  system = `${system}\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no explanations.\n\nYour response must conform to this JSON schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
}
```

### Response-Healing Plugin

Add `plugins: [{ id: "response-healing" }]` to OpenRouter settings. Fixes malformed JSON (trailing commas, missing braces). **Only works with non-streaming requests.**

### Reference Implementation

See `packages/content-pipeline/src/generate/client.ts` for a complete working example with all three provider families.

### Gotchas

- **`.required()` on Zod schemas**: Optional fields cause OpenAI strict mode to fail. Use `.required()` on generation-specific schemas.
- **OpenRouter model IDs**: Don't use date suffixes. `anthropic/claude-sonnet-4` is valid, `anthropic/claude-sonnet-4-20250514` is NOT.
- **AI SDK v6 changes**: The `mode` parameter was removed from `generateObject` — it always sends `responseFormat` now.
- **Dead code in provider**: `@openrouter/ai-sdk-provider`'s `defaultObjectGenerationMode = "tool"` is dead code from v5.
- **Anthropic routing**: Without `provider: { order: ["Anthropic"] }`, OpenRouter may route to Google which ignores JSON mode.
- **`require_parameters: true`**: Causes 404 for Anthropic. Don't use it.

## Gotchas

- **OpenRouter model IDs** use `provider/model` format (e.g., `anthropic/claude-sonnet-4`), not bare model names
- **Rate limits** are per-key on OpenRouter, not per-model
- **Streaming** requires CORS headers on SSE responses (see `agent-orchestration` skill)
- **Standalone packages** (like `content-pipeline`) should NOT import from `@slopcade/api` — copy the pattern locally
