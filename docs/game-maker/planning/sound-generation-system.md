# Sound Generation System Implementation Plan

**Goal:** Add AI-generated sound effects and background music to Clover Game Maker with reliable playback, caching, and asset storage.

**Architecture:** Add an AudioManager on the client (expo-av) that plays sounds referenced by `soundId` in rules. Add a server-side SoundService that generates and stores audio in R2 (patterned after `api/src/ai/assets.ts`) and exposes tRPC routes for generation/listing. Extend GameDefinition to include a sound library and background music references.

**Tech Stack:** Expo SDK 54, `expo-av`, Cloudflare Workers (Hono + tRPC), R2, D1, OpenRouter, ElevenLabs (SFX), Mubert (music).

---

## Research Summary

### Scenario.com Status
**Scenario.com does NOT offer sound/audio generation APIs.** They only provide image generation services (text-to-image, img2img, background removal). We'll need to integrate separate audio generation services.

### Existing Audio Infrastructure
The codebase already has placeholder audio infrastructure:
- `shared/src/types/rules.ts` - defines `type: 'sound'` with `soundId: string`
- `shared/src/types/schemas.ts` - Zod schema for sound events  
- `app/lib/game-engine/RulesEvaluator.ts` - has `case 'sound'` statement (not implemented)
- **NO expo-av or audio library installed yet**

---

## Architecture Overview

### Client Audio Layer
- **AudioManager** (new) encapsulates `expo-av` and handles:
  - Preloading sound URLs
  - Playing SFX by `soundId` (one-shot)
  - Starting/stopping background music
  - Volume controls per channel (sfx/music) + global mute
  - In-memory cache of `Audio.Sound` instances (LRU)
- **RulesEvaluator integration:** `case 'sound'` fires a callback (e.g., `onSoundAction`) instead of directly playing audio. The callback is wired in `GameRuntime.native.tsx`.
- **GameDefinition audio manifest:** A `sounds` map (id → url, type, loop, defaultVolume) so rules can reference `soundId` without needing runtime URL lookup.
- **BehaviorContext extension (optional):** Add `playSound(soundId, volume?)` for behavior-driven effects (future support).

### Server Audio Layer
- **SoundService** (new) mirrors `AssetService`:
  - Calls ElevenLabs (SFX) or Mubert (music)
  - Uploads audio buffer to R2 under `generated/sound/...`
  - Persists metadata in D1 (new `sounds` table)
  - Returns `soundId`, `assetUrl`, and `r2Key`
- **tRPC routes**: `/sounds.generate`, `/sounds.generateBatch`, `/sounds.list`, `/sounds.get`
- **Caching strategy:** Hash prompt + style + duration into a deterministic key to dedupe requests and reuse existing R2 objects.

### Asset Storage
- Use existing public CDN pattern `https://assets.clover.app/<r2Key>`.
- Add `audio/mpeg` or `audio/wav` metadata on upload.

---

## API Selection & Integration

### Options Compared

| Option | Best For | Pros | Cons | Est. Cost |
| --- | --- | --- | --- | --- |
| **ElevenLabs Sound Effects** | SFX | High quality text-to-SFX, game-focused | Cost per sound | $0.05-$0.20/sound |
| **Mubert API** | Music | Royalty-free, AI-generated loops | API complexity, less SFX | $0.10-$0.50/track |
| **Pre-made library** | SFX/Music | Free, instant, reliable | Less unique/customizable | Free |

### Recommendation
- **Phase 2 (MVP):** Pre-made sound library for immediate playability
- **Phase 3 (MVP+1):** ElevenLabs for AI-generated SFX
- **Phase 4 (Future):** Mubert for dynamic background music

**Rationale:** SFX variety matters most for gameplay feedback. Start with bundled sounds for MVP, then add AI generation as enhancement. Music can use pre-made loops initially.

### Cost Analysis

**Per-Game Estimates:**
- SFX: 8-12 sounds × $0.05-$0.20 = **$0.40-$2.40 per game**
- Music: 1-2 tracks × $0.10-$0.50 = **$0.10-$1.00 per game**
- Storage: ~150-500 KB per SFX, ~1-3 MB per music track

**Cost Reduction via Caching:**
- Hash prompts (style + description + duration) to create deterministic keys
- Check D1 for existing sounds with matching hash before generating
- Reuse across games: **50-80% cost reduction** (e.g., "jump sound" reused across platformers)

**Storage Costs:**
- R2: ~$0.015/GB/month
- Average game: 3-8 MB audio → ~$0.0001/month per game
- Negligible at scale

---

## Implementation Phases

### Phase 1: Audio Playback System (expo-av)

**Goal:** Local playback with rule-driven sound actions.

**Tasks:**

1. **Add AudioManager** (`app/lib/audio/AudioManager.ts`)
   - Install `expo-av`: `npx expo install expo-av`
   - Create AudioManager class with methods:
     - `preload(soundId, url): Promise<void>`
     - `playSfx(soundId, volume?): Promise<void>`
     - `playMusic(soundId, loop, volume?): Promise<void>`
     - `stopMusic(): void`
     - `setVolume(channel, volume): void` (sfx | music | master)
     - `mute(): void`, `unmute(): void`
   - Implement LRU cache for loaded Audio.Sound instances
   - Handle missing sounds gracefully (log warning, continue)

2. **Wire RulesEvaluator to AudioManager**
   - Modify `app/lib/game-engine/RulesEvaluator.ts`:
     - Add `onSoundAction?: (soundId: string, volume?: number) => void` to context
     - Implement `case 'sound'` to call `onSoundAction`
   - Modify `app/lib/game-engine/GameRuntime.native.tsx`:
     - Instantiate AudioManager
     - Pass `onSoundAction` callback to RulesEvaluator
     - Wire to `audioManager.playSfx(soundId, volume)`

3. **Extend GameDefinition for Audio Manifest**
   - Modify `shared/src/types/GameDefinition.ts`:
     ```typescript
     export interface SoundAsset {
       url: string;
       type: 'sfx' | 'music';
       loop?: boolean;
       defaultVolume?: number; // 0-1
     }
     
     export interface GameDefinition {
       // ...existing fields
       sounds?: Record<string, SoundAsset>; // soundId -> asset
       music?: {
         background?: string; // soundId reference
         volume?: number;
       };
     }
     ```
   - Update Zod schemas in `shared/src/types/schemas.ts`
   - Update AI schemas in `api/src/ai/schemas.ts`
   - Update validator in `api/src/ai/validator.ts`

**Files:**
- NEW: `app/lib/audio/AudioManager.ts`
- NEW: `app/lib/audio/index.ts`
- MODIFY: `app/lib/game-engine/RulesEvaluator.ts`
- MODIFY: `app/lib/game-engine/GameRuntime.native.tsx`
- MODIFY: `shared/src/types/GameDefinition.ts`
- MODIFY: `shared/src/types/schemas.ts`
- MODIFY: `api/src/ai/schemas.ts`
- MODIFY: `api/src/ai/validator.ts`

**Acceptance Criteria:**
- Rules with `type: 'sound'` play audio via expo-av
- Missing sounds log warning but don't crash game
- Volume controls work (sfx, music, master, mute)

---

### Phase 2: Pre-made Sound Library Integration

**Goal:** Ship a base SFX pack so generated games have sound without AI costs.

**Tasks:**

1. **Add bundled SFX assets**
   - Create `app/assets/sounds/` directory
   - Add royalty-free sounds:
     - `jump.wav` - Jump/hop sound
     - `hit.wav` - Collision/impact
     - `score.wav` - Point collected
     - `win.wav` - Victory fanfare
     - `lose.wav` - Game over
     - `shoot.wav` - Projectile launch
     - `destroy.wav` - Object destroyed
   - Create `app/lib/audio/AudioLibrary.ts`:
     ```typescript
     export const DEFAULT_SOUNDS: Record<string, string> = {
       jump: require('../../assets/sounds/jump.wav'),
       hit: require('../../assets/sounds/hit.wav'),
       score: require('../../assets/sounds/score.wav'),
       win: require('../../assets/sounds/win.wav'),
       lose: require('../../assets/sounds/lose.wav'),
       shoot: require('../../assets/sounds/shoot.wav'),
       destroy: require('../../assets/sounds/destroy.wav'),
     };
     ```

2. **Update game generator defaults**
   - Modify `api/src/ai/templates.ts`:
     - Add `sounds` field to each template
     - Reference default sound IDs in rules
   - Modify `api/src/ai/generator.ts`:
     - Update system prompt to include sound actions in rules
     - Example: "Add sound actions to rules (e.g., jump, hit, score)"

**Files:**
- NEW: `app/assets/sounds/*.wav`
- NEW: `app/lib/audio/AudioLibrary.ts`
- MODIFY: `api/src/ai/templates.ts`
- MODIFY: `api/src/ai/generator.ts`

**Acceptance Criteria:**
- Generated games include sound actions with default sound IDs
- Default sounds play correctly in runtime
- No external API calls or generation costs

---

### Phase 3: AI SFX Generation (ElevenLabs)

**Goal:** Generate custom SFX for each game based on theme/style.

**Tasks:**

1. **Create SoundService** (`api/src/ai/sounds.ts`)
   - Create ElevenLabs client:
     ```typescript
     interface ElevenLabsSoundParams {
       prompt: string;
       duration?: number; // seconds
     }
     
     class SoundService {
       async generateSound(params: ElevenLabsSoundParams): Promise<ArrayBuffer>
       async uploadToR2(buffer: ArrayBuffer, key: string): Promise<string>
       async createSoundRecord(soundId, prompt, r2Key): Promise<void>
     }
     ```
   - Implement ElevenLabs API integration (text-to-sound-effect)
   - Upload generated audio to R2 under `generated/sound/<hash>.mp3`
   - Store metadata in D1

2. **Add D1 sounds table**
   - Modify `api/schema.sql`:
     ```sql
     CREATE TABLE sounds (
       id TEXT PRIMARY KEY,
       type TEXT NOT NULL, -- 'sfx' or 'music'
       prompt TEXT NOT NULL,
       prompt_hash TEXT NOT NULL,
       r2_key TEXT NOT NULL,
       url TEXT NOT NULL,
       duration REAL, -- seconds
       created_at INTEGER NOT NULL DEFAULT (unixepoch())
     );
     
     CREATE INDEX idx_sounds_prompt_hash ON sounds(prompt_hash);
     ```
   - Run migration: `pnpm --filter @clover/api db:push`

3. **Add tRPC routes** (`api/src/trpc/routes/sounds.ts`)
   ```typescript
   sounds.generate - Generate single sound
   sounds.generateBatch - Generate multiple sounds
   sounds.list - List all sounds
   sounds.get - Get sound by ID
   ```
   - Wire to `api/src/trpc/index.ts`
   - Add tests: `api/src/trpc/routes/sounds.test.ts`

4. **Update AI prompt for sound generation**
   - Modify `api/src/ai/generator.ts`:
     - Add to system prompt:
       ```
       For each game, suggest 5-8 sound effects that match the theme.
       Include short descriptions for generation (e.g., "cartoonish jump boing", "metallic collision clang").
       Add sound actions to appropriate rules.
       ```
   - After game generation, call `sounds.generateBatch` with descriptions
   - Update game definition with generated sound URLs

**Files:**
- NEW: `api/src/ai/sounds.ts`
- NEW: `api/src/trpc/routes/sounds.ts`
- NEW: `api/src/trpc/routes/sounds.test.ts`
- MODIFY: `api/schema.sql`
- MODIFY: `api/src/trpc/index.ts`
- MODIFY: `api/src/ai/generator.ts`

**Acceptance Criteria:**
- API generates sounds from text prompts via ElevenLabs
- Sounds stored in R2 with public URLs
- Metadata persisted in D1
- Game generator includes sound generation step
- Caching prevents regeneration of identical prompts

---

### Phase 4: Background Music (Mubert or Pre-made)

**Goal:** Add looping background music to games.

**Tasks:**

1. **Add music config to GameDefinition**
   - Already covered in Phase 1 schema updates
   - Ensure `music.background` references a soundId

2. **Music playback in AudioManager**
   - Modify `app/lib/audio/AudioManager.ts`:
     - Implement `playMusic(soundId, loop, volume)` with looping support
     - Ensure music persists across rule executions
   - Modify `app/lib/game-engine/GameRuntime.native.tsx`:
     - Start music on game start: `audioManager.playMusic(definition.music.background)`
     - Stop music on game end

3. **Option A: Pre-made music loops** (recommended for MVP)
   - Add royalty-free loops to `app/assets/music/`
   - Reference in templates

4. **Option B: Mubert integration** (future)
   - Add Mubert API client to SoundService
   - Generate music based on genre/mood/duration
   - Store in R2 like SFX

**Files:**
- MODIFY: `app/lib/audio/AudioManager.ts`
- MODIFY: `app/lib/game-engine/GameRuntime.native.tsx`
- NEW (if Option A): `app/assets/music/*.mp3`
- MODIFY (if Option B): `api/src/ai/sounds.ts`

**Acceptance Criteria:**
- Background music loops continuously during gameplay
- Music volume independent from SFX volume
- Music stops when game ends
- Smooth transitions (fade in/out optional)

---

### Phase 5: Polish & Optimization

**Goal:** Production-ready sound system with caching, preloading, and error handling.

**Tasks:**

1. **Sound preloading**
   - Modify `GameRuntime.native.tsx`:
     - Preload all sounds from `definition.sounds` during loading state
     - Show loading progress for audio assets
   - Implement progressive loading: critical sounds first, music later

2. **Cache management**
   - Implement LRU cache eviction in AudioManager
   - Limit: 50 sounds or 50MB, whichever first
   - Unload sounds when game ends

3. **Error handling improvements**
   - Retry failed loads with exponential backoff
   - Fallback to default sounds if custom generation fails
   - User-visible error: "Some sounds unavailable" (non-blocking)

4. **Performance optimization**
   - Use `Audio.Sound.createAsync` with `shouldPlay: false` for preload
   - Reuse Audio.Sound instances where possible
   - Measure and optimize cold start latency

**Files:**
- MODIFY: `app/lib/audio/AudioManager.ts`
- MODIFY: `app/lib/game-engine/GameRuntime.native.tsx`

**Acceptance Criteria:**
- Sounds preload during game loading screen
- No audio-related crashes or freezes
- Graceful degradation on network errors
- Memory usage stays reasonable (< 100MB audio cache)

---

## File Structure Summary

### New Files
```
app/lib/audio/
├── AudioManager.ts          # expo-av wrapper
├── AudioLibrary.ts          # Default sound mappings
└── index.ts                 # Exports

app/assets/sounds/           # Bundled SFX
├── jump.wav
├── hit.wav
├── score.wav
├── win.wav
├── lose.wav
├── shoot.wav
└── destroy.wav

app/assets/music/            # Optional: bundled music loops
└── ambient-loop.mp3

api/src/ai/sounds.ts         # SoundService (ElevenLabs + R2)
api/src/trpc/routes/sounds.ts      # tRPC mutations/queries
api/src/trpc/routes/sounds.test.ts # Tests
```

### Modified Files
```
shared/src/types/GameDefinition.ts  # Add sounds & music fields
shared/src/types/schemas.ts         # Zod schemas
shared/src/types/rules.ts           # (already has sound type)
app/lib/game-engine/RulesEvaluator.ts       # Implement case 'sound'
app/lib/game-engine/GameRuntime.native.tsx  # Wire AudioManager
api/src/ai/generator.ts             # Add sound generation step
api/src/ai/schemas.ts               # Update AI schemas
api/src/ai/validator.ts             # Validate sound fields
api/src/ai/templates.ts             # Add sound references
api/schema.sql                      # Add sounds table
api/src/trpc/index.ts               # Register sounds router
```

---

## API Examples

### GameDefinition with Sounds
```json
{
  "meta": {
    "name": "Space Shooter",
    "description": "Shoot alien ships"
  },
  "sounds": {
    "shoot": {
      "url": "https://assets.clover.app/generated/sound/laser-blast.mp3",
      "type": "sfx",
      "defaultVolume": 0.7
    },
    "hit": {
      "url": "https://assets.clover.app/generated/sound/explosion.mp3",
      "type": "sfx",
      "defaultVolume": 0.9
    },
    "bgm": {
      "url": "https://assets.clover.app/generated/music/space-ambient.mp3",
      "type": "music",
      "loop": true,
      "defaultVolume": 0.5
    }
  },
  "music": {
    "background": "bgm",
    "volume": 0.5
  },
  "rules": [
    {
      "id": "shoot_sound",
      "trigger": { "type": "event", "eventName": "player_shoot" },
      "actions": [
        { "type": "sound", "soundId": "shoot", "volume": 0.8 }
      ]
    },
    {
      "id": "enemy_destroyed_sound",
      "trigger": {
        "type": "collision",
        "entityATag": "enemy",
        "entityBTag": "projectile"
      },
      "actions": [
        { "type": "sound", "soundId": "hit" }
      ]
    }
  ]
}
```

### AI System Prompt Addition
```
## Sound Effects
Include a `sounds` object mapping sound IDs to metadata.
For each sound, provide a short generation prompt (e.g., "cartoonish jump boing", "8-bit coin collect").

Add sound actions to appropriate rules:
- Player actions (jump, shoot)
- Collisions (hit, destroy)
- Score events (collect, bonus)
- Game state (win, lose)

Example:
{
  "sounds": {
    "jump": { "prompt": "cartoonish boing jump", "type": "sfx" },
    "hit": { "prompt": "8-bit collision beep", "type": "sfx" }
  }
}
```

### tRPC API Usage
```typescript
// Generate batch of sounds for a game
const sounds = await trpc.sounds.generateBatch.mutate({
  sounds: [
    { id: 'jump', prompt: 'cartoonish boing jump', duration: 0.5 },
    { id: 'hit', prompt: '8-bit collision beep', duration: 0.3 },
    { id: 'score', prompt: 'happy chime collect', duration: 0.4 }
  ]
});

// Returns:
// [
//   { id: 'jump', url: 'https://...', assetId: '...' },
//   { id: 'hit', url: 'https://...', assetId: '...' },
//   ...
// ]
```

---

## Success Criteria (By Phase)

| Phase | Success Criteria |
|-------|------------------|
| **Phase 1** | Sound actions in rules play audio via expo-av; no crashes on missing sounds |
| **Phase 2** | Generated games include bundled sounds; all default sounds play correctly |
| **Phase 3** | AI generates custom SFX from prompts; sounds stored in R2 and referenced in game definition |
| **Phase 4** | Background music loops with volume control; independent from SFX volume |
| **Phase 5** | Sounds preload during loading screen; graceful error handling; memory-efficient |

---

## Roadmap Integration

### Placement in Roadmap
- **MVP:** Phase 1-2 only (bundled sounds, no AI generation)
- **MVP+1:** Phase 3 (AI-generated SFX via ElevenLabs)
- **Future:** Phase 4 (Mubert music), Phase 5 (polish)

### Dependencies
- expo-av library
- R2 bucket configured for audio MIME types (`audio/mpeg`, `audio/wav`)
- ElevenLabs API key in Cloudflare Worker secrets
- D1 migrations run (sounds table)

### Estimated Timeline
- **Phase 1:** 3-4 days (AudioManager + integration)
- **Phase 2:** 2-3 days (bundled sounds + templates)
- **Phase 3:** 5-7 days (SoundService + tRPC + AI integration)
- **Phase 4:** 2-3 days (music playback)
- **Phase 5:** 3-4 days (polish + optimization)

**Total: 2-3 weeks** (15-21 days)

---

## Alternative: Hybrid Approach (Recommended for MVP)

Instead of full AI generation immediately, use a **hybrid approach**:

1. **Bundled sounds** (Phase 2) for MVP - ships immediately
2. **Sound style override** (Phase 3 lite) - let AI pick from pre-made sound packs (e.g., "8-bit", "cartoon", "realistic")
3. **Full AI generation** (Phase 3 complete) - add later as premium feature

**Benefits:**
- Faster to ship (no API integration initially)
- Lower costs (no per-game generation fees)
- Better reliability (no API failures)
- Still themed (sound packs match game style)

**Implementation:**
- Create 3-4 sound packs (8-bit, cartoon, realistic, fantasy)
- Each pack has jump, hit, score, win, lose sounds
- AI selects pack based on game theme
- No external API calls, no R2 storage needed initially

---

_Last updated: January 2026_
