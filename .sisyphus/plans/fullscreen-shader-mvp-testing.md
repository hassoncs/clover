# Fullscreen Shader MVP — Manual Testing Guide

## What Was Changed

### Fix 1: Re-enabled screen-scoped effects in Godot
**File:** `godot_project/scripts/bridge/GameBridgeEffects.gd:454-463`

Uncommented the screen-scope code path that was disabled for debugging. When a screen-scoped `CompiledPlan` is sent via `bridge.applyGraph()`, it now:
1. Sets up a game capture viewport
2. Applies the plan to `_screen_executor`
3. Creates a `CanvasLayer` overlay (layer 100) with a `TextureRect`
4. Updates the overlay texture each frame from the executor's output

### Fix 2: Custom GLSL support in effect graph compiler
**File:** `shared/src/effects/compiler.ts:212-220`

Extended `resolveShaderSource()` to check `node.params.shaderSource` for inline GLSL before falling back to the built-in shader library. This allows effect graph nodes with `type: "custom"` (or any type) to carry their own GLSL.

### Fix 3: Auto-wrap standalone shaders into CompiledPlan
**Files:**
- `shared/src/effects/compiler.ts` — added `wrapShadersAsPlan()` function
- `app/lib/game-engine/GameLoader.ts:213-225` — initial load now wraps standalone shaders into a screen-scoped plan instead of calling `hotSwapShader()` directly
- `app/lib/game-engine/live/tag-handlers/effects-handler.ts` — both `hotSwap()` and `fullReload()` now auto-wrap standalone shaders when no graph exists

### Fix 4: effects.json format mismatch
**File:** `app/lib/game-engine/live/TagPayloadResolver.ts:259-286`

Fixed `parseEffectsJson()` to handle both formats:
- `Record<string, string>` (raw GLSL strings)
- `Record<string, { filename, glsl }>` (the format used in effects.json/definition.json)

### Other: Deleted chat tab stub
- Removed `app/app/(tabs)/chat.tsx` (was a "Coming Soon" placeholder)
- Removed the `<Tabs.Screen name="chat">` from `app/app/(tabs)/_layout.tsx`

### Sample game created
**Location:** `r2/games/shaderFullscreen/`

A rainbow swirl shader that fills the entire screen. No entities, no physics — pure shader output. Uses Godot Shading Language (`shader_type canvas_item`) with HSV-to-RGB color conversion and polar coordinate math for the swirl pattern.

---

## Testing Plan

### Test 1: Load the new shaderFullscreen game
**Goal:** Verify standalone shaders get auto-wrapped into a CompiledPlan and render full-screen.

1. Start the dev server: `pnpm dev`
2. Open the app (web or iOS)
3. Navigate to the shaderFullscreen game (may need to trigger build-games sync first: check if the game shows up in browse)
4. The game should show an animated rainbow swirl filling the entire screen
5. No entities, no physics — just the shader

**If the game doesn't appear in browse:**
- Run `pnpm build:games` from the repo root to sync r2/ → embedded-games
- Or load it directly if the editor supports game ID lookup

**What to watch for:**
- Console logs from `[GameLoader]` — should NOT see "Failed to apply standalone shaders"
- Console warnings from `[GameBridgeEffects]` — should NOT see "Screen-scope effects temporarily disabled"
- The rainbow swirl animation should be smooth and continuous

### Test 2: Verify existing shader games still work
**Goal:** Confirm the changes don't break existing shader games.

1. Load `shaderRainbow` — should now show rainbow wave effect on the cubes/circles (previously the shader wasn't applied)
2. Load `shaderCRT` — should show CRT scanline/vignette effect on the breakout game
3. Load `shaderMulti` — should show pulse glow, dissolve, and holographic shaders

**NOTE:** These games previously had their shaders defined but they never actually rendered (the `hotSwapShader` calls failed silently). With this fix, they should now work for the first time. The shaders will render as **screen-scoped overlays**, which means they'll process the entire screen (background + entities) rather than individual entities.

### Test 3: Hot-reload shader changes (editor flow)
**Goal:** Verify live editing works when the AI agent writes shader code.

1. Open any game in the editor with chat enabled
2. The game should already have some shader or effect
3. In the workspace, modify a `.gdshader` file (or the `effects.json` shaders section)
4. The effects-handler should detect the change and hot-swap the shader
5. The visual should update in real-time without reloading the game

**What to watch for:**
- Effects-handler console logs showing shader changes detected
- Bridge `hot_swap_shader` calls succeeding (pass exists in `_pass_index`)
- Visual update happening within 1-2 seconds of the file change

### Test 4: AI agent writes a shader via chat
**Goal:** End-to-end MVP — user chats with AI, AI writes shader, user sees it live.

1. Create a new game (or use shaderFullscreen)
2. Open the editor with chat
3. Tell the AI: "Write a full-screen shader with a cool rainbow swirl effect"
4. AI should use `writeFile` to create a `.gdshader` file in the workspace
5. The LivePreviewController should detect the file change
6. The effects-handler should build a CompiledPlan from the new shader
7. The shader should render full-screen in the preview

---

## Architecture Reference (for debugging)

### Data flow: Standalone shader → screen rendering

```
definition.json
  └── effects.shaders.rainbow_swirl = { filename, glsl }

GameLoader.applyEffects()
  └── wrapShadersAsPlan({ rainbow_swirl: glsl })
      └── CompiledPlan { scope: "screen", passes: [{ id: "rainbow_swirl", shaderSource: { glsl } }] }
          └── bridge.applyGraph(plan)

Godot: GameBridgeEffects.apply_plan()
  └── scope == "screen"
      └── _setup_game_capture_viewport()
      └── _screen_executor.apply_plan(plan_dict)
          └── _setup_single_pass() → creates ColorRect + ShaderMaterial
      └── _create_screen_overlay()
          └── CanvasLayer (layer 100) + TextureRect

Godot: _process() loop
  └── _screen_overlay_rect.texture = _screen_executor.get_output_texture()
```

### Data flow: Live hot-reload

```
AI agent calls writeFile("effects/rainbow.gdshader", glsl)
  └── Git commit in workspace

LivePreviewController polls every 1s
  └── Detects revision change
      └── TagPayloadResolver.resolveEffects()
          └── Reads .gdshader files → { shaders: { rainbow: glsl } }

HotReloadOrchestrator
  └── effectsHandler.hotSwap(oldPayload, newPayload)
      └── No graph → wrapShadersAsPlan()
      └── hasStructuralPlanChange() → true (first time) or false (glsl change only)
      └── If structural: bridge.applyGraph(newPlan)
      └── If shader-only: bridge.hotSwapShader(shaderId, source)
```

### Key files reference

| Component | Path |
|-----------|------|
| Godot screen effects | `godot_project/scripts/bridge/GameBridgeEffects.gd:454-463` |
| Graph executor | `godot_project/scripts/effects/EffectsGraphExecutor.gd` |
| Compiler + wrapShadersAsPlan | `shared/src/effects/compiler.ts` |
| GameLoader | `app/lib/game-engine/GameLoader.ts:195-225` |
| Effects handler | `app/lib/game-engine/live/tag-handlers/effects-handler.ts` |
| Tag payload resolver | `app/lib/game-engine/live/TagPayloadResolver.ts:259-286` |
| Sample game | `r2/games/shaderFullscreen/definition.json` |
| Chat tools (writeFile) | `api/src/chat/chat-tools.ts` |
| Stream handler | `api/src/chat/stream-handler.ts` |
| Live preview controller | `app/lib/game-engine/live/LivePreviewController.ts` |

---

## Known Risks / Things That Might Not Work

1. **Screen capture viewport setup** — `_setup_game_capture_viewport()` was disabled alongside the screen scope. It reparents the game root into a SubViewport for capture. This might cause visual glitches or missing content if the reparenting has stale assumptions.

2. **Generator shaders vs post-process shaders** — The sample shader ignores `TEXTURE` and generates output purely from `UV`/`TIME`. The screen overlay infrastructure expects to process screen content via `TEXTURE`. A generator shader should still work (it just won't use the texture input) but verify the ColorRect provides valid UV coordinates.

3. **Empty entity list** — The game has zero entities. Verify Godot doesn't error or skip initialization when there are no entities to load.

4. **Hot-swap after wrap** — When standalone shaders are first wrapped into a plan, the pass IDs match the shader IDs. Subsequent `hotSwapShader()` calls should find these IDs in `_pass_index`. Verify the ID mapping is consistent.

5. **effects.json vs definition.json** — Both contain the shader data. The workspace system reads `effects.json` first, falling back to `.gdshader` files. For embedded games, `GameLoader` reads from `definition.json`. Make sure both paths produce the same result.
