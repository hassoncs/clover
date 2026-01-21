# VCR Cassettes

This directory contains recorded HTTP responses for replay in tests.

## How it works

1. **Recording** (local dev, requires API keys):
   - Run `pnpm tsx api/src/ai/__tests__/record-cassettes.ts`
   - Real HTTP responses are captured and saved as JSON

2. **Replay** (CI, no keys needed):
   - Tests use `fetchMock` from `cloudflare:test` to intercept fetch
   - Cassettes are loaded and responses are replayed

## Cassette format

```json
{
  "metadata": {
    "recordedAt": "2024-01-21T...",
    "model": "openai/gpt-4o",
    "baseURL": "https://openrouter.ai/api/v1"
  },
  "request": {
    "method": "POST",
    "url": "https://openrouter.ai/api/v1/chat/completions",
    "bodyHash": "abc123..."
  },
  "response": {
    "status": 200,
    "headers": { "content-type": "application/json" },
    "body": { ... }
  }
}
```

## Regenerating cassettes

When prompts, schemas, or models change, regenerate cassettes:

```bash
OPENROUTER_API_KEY=your-key pnpm tsx api/src/ai/__tests__/record-cassettes.ts
```
