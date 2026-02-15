# User-Facing AI Ingress Inventory

This document lists all entry points where user-provided text is passed to an external AI/LLM provider.

## 1. Game Generation & Refinement (tRPC)

| Route Path | File Location | Operation | Auth | Input Field |
|------------|---------------|-----------|------|-------------|
| `games.generate` | `api/src/trpc/routes/games.ts` | Full game definition generation | Protected | `prompt` (max 500) |
| `games.refine` | `api/src/trpc/routes/games.ts` | Incremental game modification | Protected | `request` (max 300) |
| `games.analyze` | `api/src/trpc/routes/games.ts` | Intent classification (fast model) | Public | `prompt` (max 500) |

## 2. Live Workspace Chat (SSE / Chat Handler)

| Entry Point | File Location | Operation | Auth | Input Field |
|-------------|---------------|-----------|------|-------------|
| `chatThreads.sendMessage` | `api/src/chat/chat-handler.ts` | Multi-turn agent conversation | Protected | `userText` |
| `chatThreads.submitToolAnswer` | `api/src/chat/chat-handler.ts` | User response to agent questions | Protected | `answerText` |

*Note: These flow through `api/src/chat/stream-handler.ts` for real-time generation.*

## 3. Asset Generation Pipeline (tRPC)

| Route Path | File Location | Operation | Auth | Input Field |
|------------|---------------|-----------|------|-------------|
| `generationJobs.createGenerationJob` | `api/src/trpc/routes/asset-system/generation-jobs.ts` | Batch asset generation | Protected | `themePrompt`, `entityPrompt` |

*Note: These prompts are often structured/wrapped but contain raw user strings.*

## 4. Text Effects & UI (Hono / tRPC)

| Route Path | File Location | Operation | Auth | Input Field |
|------------|---------------|-----------|------|-------------|
| `POST /text-grid/stylize` | `api/src/routes/text-grid.ts` | Image-to-image stylization | Public* | `prompt` |
| `games.generateTitle` | `api/src/ai/generate-title.ts` | Session title generation | Protected | `input` (first message) |

*\*Public route in Hono, needs verification if it should be protected.*

## 5. Admin Tools (tRPC - Internal Only)

| Route Path | File Location | Operation | Auth | Input Field |
|------------|---------------|-----------|------|-------------|
| `adminTools.generateSound` | `api/src/trpc/routes/admin-tools.ts` | SFX generation (ElevenLabs) | Admin | `text` |
| `adminTools.generateVoice` | `api/src/trpc/routes/admin-tools.ts` | TTS generation (ElevenLabs) | Admin | `text` |
| `adminTools.generatePartyContent` | `api/src/trpc/routes/admin-tools.ts` | Batch prompt generation | Admin | `game` |

---
*Last Updated: 2026-02-15*
