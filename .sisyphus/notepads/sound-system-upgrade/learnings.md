
## Task 2: Type System Updates (Completed)

### Files Modified
1. `shared/src/types/rules.ts` - Added `pitch?: number` to `SoundAction`
2. `app/lib/godot/types.ts` - Updated `GodotBridge` interface:
   - `playSound(resourcePath: string, volume?: number, pitch?: number): void`
   - `playMusic(resourcePath: string, volume?: number, loop?: boolean): void`
   - `stopMusic(): void`
3. `app/lib/game-engine/rules/types.ts` - Updated `RuleContext.playSound` signature
4. `app/lib/game-engine/BehaviorContext.ts` - Updated `BehaviorContext.playSound` signature

### Type Safety Verification
- All parameters are optional for backward compatibility
- TypeScript correctly identifies missing implementations in:
  - `GodotBridge.native.ts`
  - `GodotBridge.web.ts`
- Pre-existing errors in shared package (AssetSystemConfig) are unrelated

### Key Findings
- `playSound` appears in 13 files across the codebase
- Main usage points:
  - `SoundActionExecutor.ts` - Executes sound actions from rules
  - `BehaviorExecutorRuntimeSystem.ts` - Provides playSound to behaviors
  - `RulesSystem.ts` - Provides playSound to rule actions
- All changes are additive (optional params) - no breaking changes


## generate-sound.ts CLI Script (Task 1)

- Existing prototype existed at `scripts/generate-sound-effect.mjs` — used positional args and preset system
- New script at `api/scripts/generate-sound.ts` follows `generate-assets.ts` pattern with `parseArgs` from `util`
- ElevenLabs API contract: `POST https://api.elevenlabs.io/v1/sound-generation` with `?output_format=mp3_44100_128` query param
- Headers: `xi-api-key` (not `Authorization: Bearer`)
- Body: `{ text, duration_seconds, prompt_influence }` — duration and prompt_influence are optional
- Response is raw `audio/mpeg` binary — use `arrayBuffer()` then `Buffer.from()` to write
- Output dir: `godot_project/sounds/` (confirmed `thud.mp3` exists there)
- Run via: `hush run -- npx tsx api/scripts/generate-sound.ts --text="..." --output="..."`

## Task 3: Godot UIManager.gd + GameBridge.gd Updates (Completed)

### Files Modified
1. `godot_project/scripts/bridge/UIManager.gd`:
   - Added `_current_music_player: AudioStreamPlayer = null` member variable
   - Updated `_js_play_sound` to parse 3rd arg as pitch (default 1.0)
   - Updated `play_sound(resource_path, volume, pitch)` with pitch_scale and clamp [0.1, 4.0]
   - Added `_js_play_music`, `play_music`, `_js_stop_music`, `stop_music`
   - Music player is persistent (not auto-freed) unlike sound effects

2. `godot_project/scripts/GameBridge.gd`:
   - Registered `play_music` and `stop_music` in overrides dict
   - Updated `_get_method_owner()` for music methods

### Key Patterns
- Godot 4 loop modes differ by stream type: WAV uses `loop_mode`, OggVorbis/MP3 use `loop = true`
- `pitch_scale` on AudioStreamPlayer handles pitch (1.0 = normal)
- `clampf()` is the GDScript float clamp function
- JS bridge auto-converts snake_case to camelCase (`play_music` → `playMusic`)

## Bridge Integration (2026-02-11)

Successfully wired bridge logic and game engine executors for sound system upgrade:

### Files Updated
1. **GodotBridge.web.ts**: Window declaration + implementation for `playSound(volume, pitch)`, `playMusic`, `stopMusic`
2. **GodotBridge.native.ts**: Native bridge calls with default values (`volume ?? 1.0`, `pitch ?? 1.0`, `loop ?? true`)
3. **SoundActionExecutor.ts**: Passes `action.pitch` to `context.playSound`
4. **BehaviorExecutorRuntimeSystem.ts**: `playSound` callback accepts and forwards volume/pitch
5. **RulesSystem.ts**: `playSound` callback accepts and forwards volume/pitch

### Pattern Observations
- Native bridge uses `callGameBridge("play_sound", ...)` with snake_case (auto-converted by JS bridge)
- Web bridge uses `getGodotBridge()?.playSound(...)` with camelCase
- All optional parameters use `??` defaults in native bridge for GDScript compatibility
- Window type declaration must be updated separately from implementation in web bridge

### Verification
- `pnpm tsc --noEmit` passes cleanly
- LSP diagnostics clean on all modified files
- All signatures match interface definitions in `types.ts`
