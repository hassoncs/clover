# Decision: Theme vs Style in Asset Generation

## Current State

The asset generation system has three conceptual layers that describe "what an asset looks like":

### 1. Entity Description (`whatDescription`)
Defined per-prefab in `definition.json`. Describes *what* the thing is.
```
"whatDescription": "a shiny red gumball candy"
"whatDescription": "a transparent glass cylinder tube container"
```
This is the most specific input — it comes from the game designer (human or AI).

### 2. Theme (`themes` table → `prompt_modifier`)
A mood/aesthetic applied across an entire asset pack. Stored in the DB.
```
name: "Candy Kingdom"
prompt_modifier: "Sweet candy land with lollipop trees, gumdrop bushes, chocolate rivers,
                  cotton candy clouds, and gingerbread structures. Bright pastel colors..."

name: "Synthwave Arcade"
prompt_modifier: "Retro 80s synthwave aesthetic with neon pink and cyan grid lines,
                  chrome metallic surfaces..."
```
Themes already encode *visual style* implicitly — "Synthwave Arcade" implies neon pixel art, "Candy Kingdom" implies glossy cartoon textures.

### 3. Style (`SpriteStyle` — broken)
A hardcoded enum: `'pixel' | 'cartoon' | '3d' | 'flat'`. Was meant to add rendering-style keywords to prompts via `STYLE_DESCRIPTORS`. Currently:
- `SpriteStyle` type is imported in `executor.ts` and `prompt-builder.ts` but **not exported** from `types.ts`
- `STYLE_DESCRIPTORS` is imported in `prompt-builder.ts` but **doesn't exist** — runtime crash
- `AssetRun.meta` type doesn't include `style` — it's passed through but TypeScript doesn't know about it
- `GameAssetConfig` doesn't have a `style` field but `executeGameAssets` references `config.style`
- The `generation_jobs` DB table has a `style TEXT` column
- The `generate-assets.ts` CLI accepts `--style` but it crashes at the build-prompt stage

**Bottom line: Style is half-removed and fully broken.** Nothing in production uses it successfully right now.

---

## The Two Code Paths

There are **two separate prompt-building code paths**, which complicates things:

| Path | Used By | Theme Handling | Style Handling |
|------|---------|----------------|----------------|
| `prompt-builder.ts` → `buildEntityPrompt` | Pipeline executor (`executeAsset`) | Appends `Theme: ${theme}` as a line | References `STYLE_DESCRIPTORS[style]` — crashes |
| `service.ts` → `buildStructuredPrompt` | tRPC routes (live generation) | Weaves `themePrompt` into subject description | **No style concept at all** |

The service.ts path is more mature — it uses `visualDescription` (mapped from `whatDescription`) and weaves the theme naturally into the prompt. The pipeline path is simpler but broken.

### Bug in `generate-assets.ts`
The CLI script sets `description: prefabId` (line 132) instead of using the prefab's `whatDescription`. So even if the pipeline worked, prompts would say "tube for a video game" instead of "a transparent glass cylinder tube container for a video game."

---

## Options

### Option A: Merge Style into Theme (Recommended)

**Remove `SpriteStyle` entirely.** Themes already implicitly include stylistic information. Make them explicitly do so.

**How it works:**
- Theme `prompt_modifier` is the single source of aesthetic direction
- Theme authors write modifiers that include stylistic cues: "pixel art style, 8-bit aesthetic" or "3D rendered, smooth shading, volumetric lighting"
- No separate style enum to maintain, no style × theme combinatorial explosion

**Changes needed:**
1. Delete `STYLE_DESCRIPTORS`, `SpriteStyle` type, and all references
2. Remove `--style` from `generate-assets.ts` CLI (or repurpose as a theme shorthand)
3. Remove `style` column from `generation_jobs` table (or leave as deprecated)
4. Fix `buildEntityPrompt` to not reference style descriptors
5. Optionally: seed a few "style-focused" themes like "Pixel Art", "3D Rendered", "Flat Vector"

**Pros:**
- Eliminates broken code immediately
- Simpler mental model: one knob (theme) instead of two (theme + style)
- Themes are already free-text — they can express any style
- No combinatorial explosion (5 themes × 4 styles = 20 combos to reason about)
- The service.ts code path (the more mature one) already works this way

**Cons:**
- Users who want "the same theme but in pixel art vs 3D" would need two separate themes
- Slightly less discoverable — new users might not think to include style cues in their theme

---

### Option B: Fix Style as a Separate Axis

**Restore `SpriteStyle` as a working, separate concept.** Style = rendering technique, Theme = mood/setting.

**How it works:**
- Style controls *how* things are rendered: pixel art, cartoon, 3D, flat vector
- Theme controls *what* the aesthetic feels like: spooky, candy, cyberpunk
- Both are injected into prompts independently

**Changes needed:**
1. Re-add `SpriteStyle` type and `STYLE_DESCRIPTORS` to `types.ts`
2. Add `style` to `AssetRun.meta` type
3. Fix `GameAssetConfig` to include `style`
4. Ensure both code paths handle style consistently

**Pros:**
- Clean separation of concerns (rendering technique vs aesthetic mood)
- Users can mix-and-match: "Halloween" + "pixel art" or "Halloween" + "3D"
- More options for users with less theme authoring effort

**Cons:**
- Combinatorial complexity — some theme + style combos won't look good
- Two things to maintain, test, and explain
- The AI doesn't always respect style modifiers cleanly (e.g., "pixel art" + "3D rendered" confusion)
- Adds complexity to an already-complex prompt construction system
- The service.ts code path would need a style concept added

---

### Option C: Style as Theme Tags/Categories

**Remove the enum, but add optional tags to themes.** A middle ground.

**How it works:**
- Themes get a `tags` array: `["pixel", "retro"]` or `["3d", "realistic"]`
- The UI can filter/group themes by tag
- No separate style selector — the tag is informational/organizational only
- The `prompt_modifier` still does all the heavy lifting

**Changes needed:**
1. Add `tags TEXT` column to `themes` table (JSON array)
2. Delete `SpriteStyle` enum and `STYLE_DESCRIPTORS`
3. Update theme seeding to include tags
4. Update UI to show tag-based filtering

**Pros:**
- Themes remain the single prompt-building concept
- Better discoverability via tags ("show me all pixel-art themes")
- No combinatorial explosion — each theme is self-contained
- Extensible (tags can be anything: "dark", "cute", "retro", "holiday")

**Cons:**
- Still need to author separate themes for each style variant
- Tags are metadata only — they don't affect generation

---

## Decision: Style as Free-Text with Presets (Modified Option B)

**Chosen approach:** Theme and Style remain separate axes, but Style is a **free-text string** — not a locked enum. A `STYLE_PRESETS` map provides convenience shortcuts for common rendering styles.

### Prompt hierarchy (all layers combined at generation time)

```
What:   "a shiny red gumball candy"              ← prefab.whatDescription
Theme:  "spooky Halloween with jack-o-lanterns"   ← themes table or --theme flag
Style:  "3D rendered, smooth shading"             ← preset key or free text
Game:   "Ball Sort"                               ← game title (context)
```

### How style resolution works

```typescript
// Built-in presets (convenience shortcuts)
STYLE_PRESETS = {
  '3d':             '3D rendered, smooth shading, volumetric lighting, soft shadows',
  'pixel':          'pixel art, 8-bit aesthetic, crisp edges, limited color palette',
  'cartoon':        'cartoon illustration, bold outlines, vibrant flat colors, cel-shaded',
  'photorealistic': 'photorealistic, highly detailed, natural lighting',
  ...
}

// resolveStyle("3d") → expands preset
// resolveStyle("oil painting with thick brushstrokes") → used as-is
```

### What was implemented

1. **Deleted** the broken `SpriteStyle` enum and `STYLE_DESCRIPTORS`
2. **Added** `STYLE_PRESETS` map and `resolveStyle()` in `types.ts`
3. **Added** `style?: string` to `AssetRun.meta`, `GameAssetConfig`, and `executeAsset` meta
4. **Updated** `buildEntityPrompt` to accept a `PromptContext { theme?, style? }` and layer all four dimensions
5. **Fixed** `generate-assets.ts` to use `whatDescription` from prefabs (was using `prefabId`)
6. **Restored** `--style` CLI flag as free-text string
7. **Updated** error messages to mention `hush run`
8. **Added** hush documentation to `AGENTS.md`

### Future work
- Add style support to the `service.ts` → `buildStructuredPrompt` code path
- Consider a `styles` DB table if user-created styles become needed
- Option C (theme tags) can still be layered on for discoverability
