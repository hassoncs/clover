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

const model = openrouter.chat("anthropic/claude-sonnet-4-20250514");
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
  return openrouter.chat(options.model ?? "anthropic/claude-sonnet-4-20250514");
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
| General generation | `anthropic/claude-sonnet-4-20250514` | Default |
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

## Gotchas

- **OpenRouter model IDs** use `provider/model` format (e.g., `anthropic/claude-sonnet-4-20250514`), not bare model names
- **Rate limits** are per-key on OpenRouter, not per-model
- **Streaming** requires CORS headers on SSE responses (see `agent-orchestration` skill)
- **Standalone packages** (like `content-pipeline`) should NOT import from `@slopcade/api` — copy the pattern locally
