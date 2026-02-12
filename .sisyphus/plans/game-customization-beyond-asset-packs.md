# Design: Game Customization Beyond Asset Packs

## Context

Slopcade evolved from a single-JSON ECS game engine where asset packs (themed image sets) were the primary way to reskin a game. The platform has since grown into a generic AI code editor supporting 2D games, 3D, shaders, effects graphs, and arbitrary file-based workspaces. The asset pack abstraction — "swap images for a specific game" — no longer matches the breadth of what's customizable.

This document explores replacing asset packs with a two-tier customization model: **lightweight config tweaking** and **deep forking**.

---

## What Exists Today

### Asset Packs
- **Data model**: `asset_packs` table in D1, keyed by `base_game_id`. Contains `pack_entries` mapping template IDs to generated image assets.
- **Scope**: Image-only. Each pack replaces `visual.type: "image"` assets in prefabs. Applied at runtime via `mergeAssetsIntoPrefabs()`.
- **Lineage**: Packs are shared across a fork family via `base_game_id`. Fork a game → you see all packs from the root lineage.
- **Generation**: AI pipeline (Scenario.com) generates silhouette → img2img → background removal → PNG per template.
- **UX**: Game detail page shows "Themes" section with pack cards. Each has a "PLAY" button. In-game modal allows switching or generating new packs.

### Variables & Tuning (already built)
- `VariableWithTuning` type: value + `tuning: { min, max, step }` + category + label.
- `TuningPanel` component auto-renders sliders for tunable variables.
- Overrides persisted to `localStorage` per game.
- Shader uniforms follow a similar `paramsSchema` pattern.

### Constants
- `constants.json` in the workspace, resolved at compile time via `{ "const": "NAME" }`.
- `editor.json` can define UI metadata (label, range) for constants.

### Forking
- `games.fork` mutation: copies `definition.json` to new R2 prefix, creates new DB row with `forked_from_id` + `base_game_id`.
- Fork gets a new ID, is private by default, fully editable.
- Workspace files are NOT deep-copied today (only `definition.json`).

---

## The Problem

Asset packs only cover one axis of customization (images) for one type of game (ECS with image prefabs). They don't address:

| Game Type | What You'd Actually Want to Customize |
|-----------|---------------------------------------|
| ECS physics game (Breakout, Flappy) | Images, physics tuning, difficulty, sounds |
| Shader / visual toy | Uniforms (colors, speeds, patterns) — no images at all |
| Script-heavy game (Snake, Ball Sort) | Difficulty, grid size, level count, timing |
| 3D game | Models, textures, lighting, camera — totally different from 2D images |
| Effect graph | Node parameters, blend modes, timing |

Asset packs are too narrow for ECS games and completely irrelevant for shaders/effects.

---

## Proposal: Two Customization Tiers

### Tier 1: "Remix" (lightweight, no new game ID)

A **Remix** is a named configuration that changes how a game looks, feels, or plays — without touching the code. It's the spiritual successor to asset packs, but generalized.

A Remix is a JSON blob of overrides that the runtime applies on top of the game's defaults:

```typescript
interface Remix {
  id: string;
  gameId: string;            // The game this remix applies to (uses base_game_id for sharing)
  name: string;
  description?: string;
  creatorUserId: string;
  createdAt: number;

  // What the remix overrides (all optional, mix and match):
  overrides: {
    variables?: Record<string, GameVariableValue>;   // Runtime variable overrides
    constants?: Record<string, number | string | boolean>;  // Compile-time constant overrides
    assets?: Record<string, AssetOverride>;          // Image/sound replacements (= today's asset pack)
    shaderParams?: Record<string, unknown>;          // Uniform overrides for effect graphs
    theme?: {                                        // Metadata for AI generation
      prompt: string;
      style?: string;
    };
  };
}

interface AssetOverride {
  // Replaces a specific prefab's image or sound
  templateId: string;
  assetUrl: string;
  placement?: { scale: number; offsetX: number; offsetY: number };
}
```

**Key properties:**
- A Remix does NOT get a new game ID. The game stays the same game.
- Remixes are shared across the fork lineage (same `base_game_id` rule as today's packs).
- A Remix can override *any combination* of: images, sounds, variables, constants, shader params.
- The game author defines what's remixable by:
  - Adding `tuning` metadata to variables (already exists).
  - Exposing constants with editor metadata (already exists).
  - Using `visual.type: "image"` with `whatDescription` for AI-generated assets (already exists).
  - Defining `paramsSchema` for shader uniforms (already exists).

**UX on the game detail page:**
- Where "Themes" currently shows asset pack cards, show **Remix** cards instead.
- Each Remix card shows a preview + name + what it changes (e.g., "Halloween skin + harder difficulty").
- "Create Remix" opens a multi-tab editor:
  - **Look** tab: generate/upload images, pick sounds (≈ today's asset pack flow)
  - **Feel** tab: sliders for exposed variables (≈ today's TuningPanel)
  - **Shader** tab: uniform sliders (only shown for games with effects)
- Playing with a Remix: `/play/:gameId?remixId=:remixId`

**Why this works for every game type:**

| Game Type | What a Remix Contains |
|-----------|----------------------|
| ECS physics game | Asset overrides + variable tweaks |
| Shader / visual toy | Shader param overrides only |
| Script-heavy game | Variable overrides (difficulty, timing) |
| 3D game | Asset overrides (model URLs, texture URLs) |
| Effect graph | Effect node param overrides |

### Tier 2: "Fork" (deep, gets a new game ID)

A **Fork** is what exists today, with one important enhancement: **full workspace copy**.

Currently, forking copies only `definition.json`. For the fork model to be the "deep customization" path, it needs to copy the entire workspace:

```
Source: games/{originalId}/workspace/
  manifest.json, constants.json, prefabs/, entities/, rules/, scripts/, assets/

Fork: games/{newId}/workspace/
  (exact copy of all files)
```

After forking, the user owns a completely independent game. They can:
- Edit any file (code, assets, config)
- Change the game's fundamental behavior
- Publish as their own creation
- The fork retains lineage (`forked_from_id`) for attribution

**Fork is for**: "I want to make this game into something meaningfully different."
**Remix is for**: "I want to play this game with a different vibe."

---

## Migration Path from Asset Packs

### Phase 1: Remixes subsume asset packs
- Create a `remixes` table that includes all the fields of `asset_packs` plus the new override fields.
- Migrate existing asset packs to remixes where `overrides.assets` contains the pack entries. All other override fields are empty.
- Update the game detail page to show "Remixes" instead of "Themes".
- The AI generation flow stays the same but creates a Remix instead of a pack.

### Phase 2: Add variable/constant overrides to Remix UI
- When creating a Remix, show exposed tunable variables alongside the image generation.
- A Remix can now be "just images", "just tuning", or both.

### Phase 3: Add shader param overrides
- For games with effects/shaders, the Remix UI shows uniform sliders.

### Phase 4: Deprecate asset pack tables
- Once all data is migrated and the new system is stable, drop `asset_packs`, `pack_entries`, etc.

---

## Open Questions

### 1. Should Remixes recompile constants?

Constants are resolved at compile time. If a Remix overrides constants, we'd either need to:
- **(A) Recompile** the bundle with the overridden constants (expensive, produces a new artifact).
- **(B) Convert constants to runtime variables** so overrides are applied without recompilation.
- **(C) Keep constants out of Remixes** — only runtime variables and assets are remixable.

**Recommendation**: Option **(C)** for v1. Constants are a developer-time concept. Remixes should only touch runtime-resolvable values. If a game author wants something to be remixable, they should use a `variable` with tuning metadata, not a constant.

### 2. Should Remix overrides be validated against a schema?

A game could define a "remix schema" — what's overridable and what the valid ranges are. This would prevent Remixes from setting `gravity` to 999999 or `ballRadius` to 0.

The `VariableWithTuning` already has `min`/`max`/`step` which serves as implicit validation. We could enforce this at Remix creation time.

**Recommendation**: Yes, validate. The `tuning` metadata IS the schema. If a variable has `tuning: { min: 1, max: 10, step: 1 }`, the Remix value must be within [1, 10].

### 3. Should Remixes compose?

Can you apply multiple Remixes? E.g., one person's "Halloween skin" + another person's "Hard mode" tuning?

**Recommendation**: No, not for v1. One Remix at a time. Composition adds significant complexity (merge conflicts, ordering) for minimal UX benefit. A user who wants "Halloween + Hard" can create a single Remix that combines both.

### 4. What happens to Remixes when a game updates?

If a game author adds a new variable or changes a template ID, existing Remixes may reference stale keys.

**Recommendation**: Graceful degradation. Apply what matches, ignore what doesn't. Show a "⚠ This remix was made for an older version" indicator if any overrides fail to apply.

### 5. Do Remixes need thumbnails/previews?

Asset packs today don't have automatic preview images. For Remixes to look good on the detail page, they'd need some kind of visual representation.

**Recommendation**: Auto-generate a preview by taking a screenshot of the game running with the Remix applied. This could be done lazily (first time someone views the detail page) or eagerly (at Remix creation time).

---

## Data Model Sketch

```sql
CREATE TABLE remixes (
  id TEXT PRIMARY KEY,
  base_game_id TEXT NOT NULL,        -- Shared across fork lineage
  name TEXT NOT NULL,
  description TEXT,
  creator_user_id TEXT NOT NULL,
  
  -- Override blobs (nullable = not overridden)
  variable_overrides_json TEXT,      -- JSON: Record<string, value>
  asset_overrides_json TEXT,         -- JSON: Record<templateId, { assetUrl, placement }>
  shader_param_overrides_json TEXT,  -- JSON: Record<paramName, value>
  sound_overrides_json TEXT,         -- JSON: Record<soundId, { url }>
  
  -- Generation metadata
  theme_id TEXT,
  theme_prompt TEXT,
  style TEXT,
  
  -- Housekeeping
  is_complete INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER,
  
  FOREIGN KEY (base_game_id) REFERENCES games(id)
);
```

This replaces both `asset_packs` and `pack_entries` — pack entries become `asset_overrides_json`.

---

## Summary

| | Asset Pack (today) | Remix (proposed) | Fork (enhanced) |
|---|---|---|---|
| New game ID? | No | No | Yes |
| What changes? | Images only | Images, sounds, variables, shader params | Anything (full code) |
| Shared in lineage? | Yes (base_game_id) | Yes (base_game_id) | No (independent) |
| AI-generated? | Yes | Yes (for the asset portion) | N/A (manual edits) |
| Editable after creation? | Limited | Yes (reopen Remix editor) | Yes (full editor) |
| Game author controls? | Which templates have images | Which variables are tunable, which assets are overridable | N/A |
| Use case | Reskin a 2D game | Customize look & feel of any game type | Build something new from a starting point |

The core insight: **a Remix is a named set of overrides, not just an image set.** This naturally generalizes asset packs to work for shaders, 3D, effects, and gameplay tuning while keeping the "lightweight customization without changing the game" mental model intact.
