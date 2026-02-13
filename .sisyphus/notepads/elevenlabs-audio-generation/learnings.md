# ElevenLabs Audio Generation - Learnings

## Task 1: ElevenLabsService Creation

### Key Decisions
- **Used raw `fetch` instead of ElevenLabs SDK methods** — the API project runs on Cloudflare Workers which doesn't support Node.js streams. The SDK is installed for type references but the service uses fetch directly for Workers compatibility.
- **Voice presets placed in `shared/src/constants/voice-presets.ts`** — shared needed a new `constants/` directory. Added export to `shared/src/index.ts`.
- **Background generation reuses SFX API** — ElevenLabs doesn't have a separate background music API. Background generation is SFX with longer duration and "ambient background:" prefix on the prompt.

### API Endpoints Used
- SFX: `POST /v1/sound-generation?output_format=<format>`
- TTS: `POST /v1/text-to-speech/{voiceId}?output_format=<format>`
- Auth header: `xi-api-key`

### Constraints Discovered
- SFX max duration: 22 seconds (ElevenLabs limit)
- Prompt influence range: 0.0 - 1.0
- TTS returns audio without duration metadata (set to null in result)
- Cost estimation is approximate — ElevenLabs charges per character for TTS, flat per SFX generation

### Files Created
- `api/src/services/ElevenLabsService.ts` — main service
- `shared/src/constants/voice-presets.ts` — 5 curated voice presets

### Files Modified
- `api/package.json` — added `elevenlabs` dependency
- `shared/src/index.ts` — export voice presets

## Task 2: API Routes Creation

### Key Decisions
- **Auth pattern**: Extracted reusable `authenticateRequest()` helper matching the existing inline Supabase `getUser(token)` pattern used in index.ts routes. Supports `dev-token` bypass in `__DEV__` mode.
- **R2 storage structure**: `audio/{type}/{nanoid}.mp3` — e.g., `audio/sfx/abc123.mp3`, `audio/voice/def456.mp3`, `audio/background/ghi789.mp3`
- **Metadata**: Stored as R2 `customMetadata` with type, prompt/text, userId, generatedAt, and optional durationSeconds
- **No middleware abstraction**: Used per-route auth call (consistent with existing Hono routes in this project, which don't use middleware-based auth)

### Routes Created
- `POST /api/audio/generate-sfx` — SFX generation via ElevenLabs sound-generation API
- `POST /api/audio/generate-voice` — TTS generation with voiceId param
- `POST /api/audio/generate-background` — Background ambient audio (wraps SFX with prefix)
- `GET /api/audio/voice-presets` — Returns curated voice presets from shared constants

### Files Created
- `api/src/routes/audio.ts` — all four route handlers

### Files Modified
- `api/src/index.ts` — imported and registered `audioRouter` at `/api/audio`
- `api/src/trpc/context.ts` — added `ELEVENLABS_API_KEY?: string` to `Env` interface

### Response Format (all generation routes)
```json
{
  "assetId": "nanoid",
  "url": "/assets/audio/{type}/{id}.mp3",
  "contentType": "audio/mpeg",
  "durationSeconds": 2,
  "type": "sfx"
}
```

## Task 3: Chat Tools Integration

### Key Decisions
- **Added `env?: Env` to `ChatToolContext`** — optional so existing callers (and stale tests referencing `artifactService`) aren't broken. Audio tools gracefully return `{ ok: false, error: "Audio generation not configured" }` when env is missing.
- **Called ElevenLabsService directly** instead of making internal HTTP requests to `/api/audio/*` routes. Avoids auth overhead (chat is already authenticated) and keeps tools self-contained.
- **Voice presets exposed via `z.enum()`** — uses `Object.keys(VOICE_PRESETS)` cast as tuple for zod enum validation. Defaults to "narrator" preset.
- **R2 storage matches route pattern** — `audio/{type}/{nanoid}.mp3` consistent with the HTTP routes.

### Architecture
- `ChatToolContext.env` threaded from `ChatHandlerContext.env` → `createChatTools()`
- `ChatHandlerContext` updated to include optional `env?: Env`
- `index.ts` passes `c.env` when calling `handleChatStream()`
- `stream-handler.ts` and `chat-handler.ts` both forward `ctx.env` to `createChatTools()`

### Tools Added
1. **`generateSoundEffect`** — text→SFX via ElevenLabs sound-generation API. Params: text, durationSeconds (0.5-22), promptInfluence (0-1).
2. **`generateVoice`** — text→speech via ElevenLabs TTS. Params: text, voicePreset (enum from VOICE_PRESETS), stability, similarityBoost, style.
3. **`generateBackgroundSound`** — text→ambient audio via ElevenLabs (wraps SFX with "ambient background:" prefix). Same params as SFX.

### Files Modified
- `api/src/chat/chat-tools.ts` — added 3 tools + `env` to context + imports
- `api/src/chat/chat-handler.ts` — added `env?: Env` to `ChatHandlerContext`, passed to `createChatTools()`
- `api/src/chat/stream-handler.ts` — passed `ctx.env` to `createChatTools()`
- `api/src/index.ts` — passed `c.env` to `handleChatStream()` context

### Notes
- Existing `chat-tools.test.ts` is stale (references `artifactService` from pre-git migration). Does not test new audio tools.
- `tsc --noEmit` passes clean.
- LSP diagnostics clean on all 4 modified files.

## Task 4: Audio Asset List Route

### Key Decisions
- **Uses `ASSETS.head()` per object** to retrieve `customMetadata` — `list()` returns objects but not custom metadata, so a head request per object is needed.
- **Filters by `userId`** server-side — only returns assets belonging to the authenticated user. No sensitive user IDs exposed in response.
- **Type filter via query param** — `?type=sfx|voice|background` narrows the R2 `list()` prefix to `audio/{type}/` for efficiency.
- **Asset ID extracted from R2 key** — strips path prefix and file extension from key like `audio/sfx/abc123.mp3` → `abc123`.
- **Prompt field normalizes voice vs SFX** — voice routes store prompt as `text`, SFX/background as `prompt`. List route returns whichever exists as `prompt`.

### Route Added
- `GET /api/audio/list` — lists all audio assets for authenticated user
- Optional query: `?type=sfx|voice|background`
- Response: `{ assets: [{ id, url, type, prompt, createdAt }] }`

### Files Modified
- `api/src/routes/audio.ts` — added list route before voice-presets route

## Task 5: Billing Integration (Generation Tracking)

### Key Decisions
- **Created `api/src/billing/generationTracker.ts`** — standalone `trackGeneration()` function that takes a D1 database handle and generation params. Fire-and-forget error handling (logs but doesn't throw) so billing failures never break audio generation.
- **`generations` table** follows existing schema patterns: TEXT PKs, INTEGER timestamps, `metadata_json` for extensible data. Type column constrained to `sfx | voice | background`.
- **`estimatedCredits`** comes from `ElevenLabsService.estimateCost()` — 100 credits flat for SFX/background, per-character for voice TTS.
- **Cost details string** stored in `metadata_json.costDetails` for audit trail.
- **Voice route** includes `voiceId` and `modelId` in metadata for tracking which voice/model was used.

### Schema
- `generations` table: id, user_id, type, prompt, asset_id, r2_key, duration_seconds (REAL), estimated_credits (INTEGER), metadata_json, created_at
- Indexes on user_id, type, created_at

### Files Created
- `api/src/billing/generationTracker.ts`

### Files Modified
- `api/schema.sql` — added `generations` table and indexes
- `api/src/routes/audio.ts` — added `trackGeneration()` calls in all 3 generation routes (sfx, voice, background)

## Binary File Previews (2026-02-12)
- Added `BinaryPreviewPanel` to `FileViewer` to handle binary files (images, audio).
- Created `AudioPreview` using `expo-av` for playback.
- Created `ImagePreview` using `react-native-gesture-handler` and `react-native-reanimated` for pan-zoom.
- Installed `expo-av` dependency.
- Used `resolveAssetUrl` from `app/lib/config/env.ts` to correctly resolve asset URLs.
