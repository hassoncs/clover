# Admin Audio Generation Implementation Plan

**Goal:** Enable triggering TTS audio generation for party content directly from the admin content review UI.

**Architecture:** New `partyContent.generateAudio` tRPC route reads content body, extracts text, calls ElevenLabs TTS, uploads mp3 to R2, and creates the `party_content_assets` DB row. The admin UI gets a generate button per-row (for items missing audio) and a bulk generate action.

**Tech Stack:** tRPC, ElevenLabs API, Cloudflare R2, React/Tailwind admin UI

---

### Task 1: Create `partyContent.generateAudio` tRPC route

**Files:**
- Modify: `api/src/trpc/routes/party-content.ts`

**What it does:**
- Accepts `{ contentIds: string[] }` (1..N content IDs)
- For each content ID:
  1. Reads `party_content` row (body, brand_id, content_type)
  2. Extracts TTS text from body (reuse `extractVoiceText` logic from generate-audio.ts)
  3. Skips if content type is in SKIP_VOICE_TYPES
  4. Skips if `party_content_assets` row already exists for this content
  5. Calls ElevenLabs TTS via `ElevenLabsService.generateVoice()`
  6. Uploads mp3 to R2 at `audio/voice/{brand}/content/{contentType}/{contentId}.mp3`
  7. Creates `party_content_assets` row with file_size populated
- Returns `{ generated: number, skipped: number, errors: string[] }`
- Uses `adminProcedure` (admin-only)
- Needs `ELEVENLABS_API_KEY` from env

### Task 2: Add generate button to ContentReviewPage

**Files:**
- Modify: `apps/admin/src/pages/ContentReviewPage.tsx`

**What it does:**
- Audio column cell logic:
  - Has audio asset → play/pause button (existing)
  - Missing audio + type needs audio → ⚠ icon + small "Generate" button
  - Type doesn't need audio → dash
- Add a "Generate Missing Audio" bulk button in the header bar
  - Sends all visible content IDs that are missing audio
  - Shows progress/result toast
- Wire up `trpc.partyContent.generateAudio.useMutation()`
- Invalidate list query on success

### Task 3: Test end-to-end

- Pick a slopcade dilemma content item
- Click generate from the admin UI
- Verify mp3 appears in R2 and play button works
