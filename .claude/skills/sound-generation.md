---
name: sound-generation
description: "Sound and audio generation pipeline. Covers Scenario.com audio (SFX, voice, music), ElevenLabs fallback, audio assets, GameDefinition sound configuration, Godot AudioManager, and sound playback. Use when generating sound effects, voice lines, music, adding audio to games, or working with the audio pipeline."
---

# Sound & Audio Generation

> Scenario.com audio (SFX, voice, music), ElevenLabs fallback, GameDefinition sounds, Godot AudioManager

## When to Use This Skill

Load when working on: sound, audio, SFX, music, voice, TTS, text-to-speech, ElevenLabs, Scenario audio, sound effects, AudioManager, playSound, sound generation, game audio, announcer, brand voice

## Architecture

### Provider Hierarchy

| Audio Type | Primary Provider | Fallback Provider |
|-----------|-----------------|-------------------|
| **SFX** | Scenario.com (`ScenarioAudioClient`) | ElevenLabs (`ElevenLabsService`) |
| **Voice/TTS** | Scenario.com (`ScenarioAudioClient`) | ElevenLabs (`ElevenLabsService`) |
| **Music** | Scenario.com (`ScenarioAudioClient`) | None (Scenario only) |

### Key Files

| File | Purpose |
|------|---------|
| `api/src/ai/providers/scenario/audio.ts` | `ScenarioAudioClient` — music, SFX, voice via Scenario.com |
| `api/src/ai/providers/scenario/client.ts` | `ScenarioClient` base — HTTP, auth, job polling, asset download |
| `api/src/ai/providers/elevenlabs/client.ts` | `ElevenLabsService` — direct ElevenLabs API (SFX + voice) |
| `api/src/trpc/routes/admin-tools.ts` | tRPC routes: `generateSound`, `generateVoice`, `generateMusic` |
| `api/scripts/generate-audio.ts` | CLI batch generation (SFX, voice, music) |
| `shared/src/constants/audio-sfx-models.ts` | SFX model definitions (Scenario model IDs) |
| `shared/src/constants/audio-voice-models.ts` | Voice model definitions + Scenario voice presets |
| `shared/src/constants/audio-music-models.ts` | Music model definitions (Scenario model IDs) |
| `shared/src/constants/audio-sfx-prompts.ts` | SFX prompt catalog |
| `shared/src/constants/audio-announcer-lines.ts` | Announcer voice line catalog |
| `shared/src/constants/voice-presets.ts` | ElevenLabs voice presets + brand voice config |
| `api/src/routes/audio.ts` | Hono routes for runtime audio generation (game editor) |
| `api/src/chat/chat-tools.ts` | Chat tool audio generation (still uses ElevenLabs) |

## Scenario.com Audio Generation

All Scenario audio goes through `ScenarioAudioClient`, which wraps `ScenarioClient` base:

```typescript
const base = createScenarioClient({ SCENARIO_API_KEY, SCENARIO_SECRET_API_KEY });
const audio = new ScenarioAudioClient(base);

// SFX
const jobId = await audio.createSfxJob({
  modelId: "model_elevenlabs-sound-effects-v2",
  text: "bouncy rubber ball bounce",
  durationSeconds: 2,
  promptInfluence: 0.3,
  outputFormat: "mp3_44100_128",
});
const assetIds = await base.pollJobUntilComplete(jobId);
const { buffer } = await base.downloadAsset(assetIds[0]);

// Voice
const voiceJobId = await audio.createVoiceJob({
  modelId: "model_elevenlabs-tts-v3",
  text: "Welcome to the game!",
  voice: "George",
  stability: 0.5,
  similarityBoost: 0.75,
});

// Music
const musicJobId = await audio.createMusicJob({
  modelId: "model_beatoven-music-generation",
  prompt: "upbeat arcade game background music",
  durationSeconds: 120,
});
```

### Available Models

**SFX**: `elevenlabs` (0.5-22s), `beatoven` (1-35s)
**Voice**: `elevenlabs-v3` (highest quality), `elevenlabs-turbo` (low latency), `minimax-hd`, `minimax-turbo`
**Music**: `beatoven` (150s), `minimax` (240s, lyrics), `musicgen` (30s), `lyria` (30s), `reve` (240s, lyrics)

### Scenario Voice Presets

Scenario uses named voices (not IDs). Mapping in `PRESET_TO_SCENARIO_VOICE`:
narrator → George, friendly → Sarah, announcer → Roger, guide → River

## ElevenLabs Direct (Fallback)

```typescript
import { ElevenLabsService } from "@/ai/providers/elevenlabs";
const service = new ElevenLabsService(apiKey);
const sfx = await service.generateSFX({ text, durationSeconds, outputFormat: "mp3_44100_128" });
const voice = await service.generateVoice({ text, voiceId, modelId: "eleven_multilingual_v2", stability: 0.5, similarityBoost: 0.75, style: 0 });
```

## tRPC Routes (MCP-accessible)

All admin audio routes support `provider: "scenario" | "elevenlabs"` (default: `"scenario"`):
- `adminTools.generateSound` — SFX generation
- `adminTools.generateVoice` — Voice/TTS generation
- `adminTools.generateMusic` — Music generation (Scenario only)

## CLI Batch Generation

```bash
hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --provider scenario --sample
hush run -- npx tsx api/scripts/generate-audio.ts --type voice --brand amen --generate-all
hush run -- npx tsx api/scripts/generate-audio.ts --type music --model beatoven --sample
```

## GameDefinition Integration

```typescript
// In GameDefinition:
sounds: {
  bounce: { url: "https://...", type: "sfx" },
  bgm: { url: "https://...", type: "music", loop: true, defaultVolume: 0.5 }
}
```

Play in script: `ctx.playSound("bounce", { volume: 1.0, pitch: 1.2 });`

## Gotchas

- Scenario audio uses the same job polling pattern as image generation — `pollJobUntilComplete()` then `downloadAsset()`
- Scenario voice uses **named voices** ("George", "Aria") not voice IDs — different from ElevenLabs
- Brand voices (`BRAND_VOICES` in `voice-presets.ts`) still use ElevenLabs voice IDs for the direct fallback path
- SFX max duration varies by model: ElevenLabs SFX = 22s, Beatoven SFX = 35s
- Music always goes through Scenario (no ElevenLabs music generation)
- `chat-tools.ts` and `routes/audio.ts` still use ElevenLabs directly (not yet migrated to Scenario)
- Pitch range for Godot playback is 0.5-2.0; values outside this sound distorted

## Related Skills

- [ecs-architecture](ecs-architecture.md) — Entity management
- [game-authoring/scripting-api-reference](game-authoring/scripting-api-reference.md) — `ctx.playSound()` API
- [asset-pack-generation](asset-pack-generation.md) — Visual asset pipeline (parallel to audio)
- [godot-engine](godot-engine.md) — Godot AudioManager
