# Sound & Audio Generation

> **Skill for AI Agents**: ElevenLabs SFX, audio assets, GameDefinition sounds, Godot AudioManager

## When to Use This Skill

Load when working on: sound, audio, SFX, music, ElevenLabs, sound effects, AudioManager, playSound, sound generation, game audio

## Key Concepts

- **ElevenLabs** generates SFX from text prompts (no music generation yet)
- **Audio Storage**: R2 for production, `godot_project/sounds/` for development
- **GameDefinition**: Sounds referenced in `sounds` record as `SoundAsset` objects
- **Rule-Based Triggers**: `sound` action type in rules system plays sounds on events
- **Godot Playback**: `AudioManager.gd` handles caching, playback, and pitch shifting

## Sound Generation (ElevenLabs)

```bash
# Generate a sound effect
hush run -- npx tsx api/scripts/generate-sound.ts \
  --text "short bouncy rubber ball bounce" \
  --duration 1.5 \
  --prompt-influence 0.5
```

- API endpoint: `https://api.elevenlabs.io/v1/sound-generation`
- Output: MP3 file
- Always prefix with `hush run --` (needs `ELEVENLABS_API_KEY`)

## GameDefinition Integration

### Sound Asset Definition
```typescript
interface SoundAsset {
  url: string;
  type: "sfx" | "music";
  loop?: boolean;
  defaultVolume?: number;
}

// In GameDefinition:
sounds: {
  bounce: { url: "https://...", type: "sfx" },
  bgm: { url: "https://...", type: "music", loop: true, defaultVolume: 0.5 }
}
```

### Sound Action in Rules
```typescript
interface SoundAction {
  type: "sound";
  soundId: string;       // References key in GameDefinition.sounds
  volume?: number;       // 0.0 - 1.0
  pitch?: number;        // 0.5 - 2.0 (runtime pitch shifting)
}
```

Example: Play bounce sound with escalating pitch on combos:
```json
{
  "type": "sound",
  "soundId": "bounce",
  "pitch": 1.0
}
```

## Godot Implementation

### AudioManager.gd
- **Global SFX**: `AudioStreamPlayer` nodes
- **Spatial SFX**: `AudioStreamPlayer2D` via `play_sound_at_position`
- **Caching**: `AudioStream` objects cached after first load
- **Pitch**: Dynamic `pitch_scale` adjustment on player nodes
- **Cleanup**: Players auto-free on `finished` signal

### Music
- Separate `AudioStreamPlayer` for background music
- Supports looping via `loop` property in `SoundAsset`
- Volume controlled independently from SFX

## Gotchas

- Always use `hush run --` for generation scripts (API key required)
- ElevenLabs is SFX only — no music generation capability yet
- Music files must be manually sourced or use royalty-free libraries
- Pitch range is 0.5-2.0; values outside this sound distorted
- Sound assets are preloaded on game start — large files delay load time
- `godot_project/sounds/` is for dev only; production sounds live on R2

## File References

| File | Purpose |
|------|---------|
| `api/scripts/generate-sound.ts` | ElevenLabs SFX generation CLI |
| `shared/src/types/GameDefinition.ts` | SoundAsset schema |
| `shared/src/types/rules.ts` | SoundAction definition |
| `godot_project/scripts/audio/AudioManager.gd` | Engine-side playback |
| `app/lib/audio/AudioManager.ts` | Web-side audio preloading |

## Related Skills

- [ecs-architecture](ecs-architecture.md) — Rules system triggers sounds
- [asset-pack-generation](asset-pack-generation.md) — Visual asset pipeline (parallel to audio)
- [godot-engine](godot-engine.md) — Godot scene tree where AudioManager lives
