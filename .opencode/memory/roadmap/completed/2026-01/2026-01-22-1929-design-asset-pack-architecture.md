---
title: "Design asset pack architecture"
agent: oracle
created: 2026-01-22T19:29:32.253Z
session_id: ses_418d28a60ffe0lonIP1t5mI6lX
duration: 1m 37s
---

# Design asset pack architecture

**Bottom line**
Model “asset packs” as lightweight *mappings* from `templateId -> assetId (+ placement)` and make “assets” first-class, reusable records. Store prompt data at the *generation event* level (components + compiled prompt) so you can reproduce, audit, and regenerate, while keeping the runtime contract dead simple: entities resolve to a single `assetId`.

**Action plan**
1. Introduce first-class `Asset` records (generated or uploaded) and make packs reference them by ID (packs don’t embed asset data).
2. Move scale/offset into a “usage/binding” object (pack entry or entity override), not the `Asset` itself.
3. Unify batch + single generation as a `GenerationJob` with per-template `GenerationTask` rows; persist status/errors for partial failure + retries.
4. Update `GameDefinition` to store only: `activeAssetPackId` + optional per-entity `assetOverride` references; keep all heavy metadata in DB.
5. Migrate existing embedded `assetPacks` into DB: create `asset_packs`, `assets`, and `asset_pack_entries` rows; rewrite `GameDefinition`.

**Effort estimate**
Medium (1–2d) for schema + model + migration + basic endpoints; Large (3d+) if you add robust UI flows, retries/cancel, and export/import.

---

## Core concepts

- **Game**: owns templates + entities; selects an active pack for default visuals.
- **EntityTemplate**: the “slot” that needs an asset (player, enemy, platform).
- **Asset**: a reusable image resource (generated or uploaded). Independent identity.
- **AssetPack**: a named collection of per-template selections: `templateId -> AssetBinding`.
- **AssetBinding**: “use this asset like this” (placement/scale/crop, etc.) in a specific context.
- **GenerationJob**: a request to generate N assets (batch) or 1 asset (single) with shared theme/styling.
- **GenerationTask**: per-template generation record; tracks partial failures and final produced `assetId`.

Key relationship summary:
- Game 1—N AssetPacks
- AssetPack 1—N AssetPackEntries (each entry targets one `templateId`)
- AssetPackEntry N—1 Asset
- Asset can be referenced by many packs/games (subject to your ownership rules)

---

## Data model (TypeScript interfaces)

### Runtime-facing (minimal, what the engine needs)
```ts
type Id = string;

interface GameDefinitionV2 {
  templates: Record<Id, EntityTemplate>;
  entities: GameEntity[];

  assetSystem?: {
    activeAssetPackId?: Id;

    // Optional per-entity override (mix-and-match across packs)
    entityAssetOverrides?: Record<Id /*entityId*/, AssetBindingRef>;
  };
}

interface AssetBindingRef {
  assetId: Id;

  // Usage-level transforms (not asset-level)
  placement?: AssetPlacement;
}

interface AssetPlacement {
  scale?: number;
  offsetX?: number;
  offsetY?: number;

  // room for future: anchor, rotation, crop, nine-slice, etc.
}
```

### Editor/storage model
```ts
type AssetSource = "generated" | "uploaded";
type GenerationStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

interface Asset {
  id: Id;
  ownerGameId?: Id;          // optional: allow truly shared/global assets if unset
  source: AssetSource;

  imageUrl: string;          // or storage key; keep URL if that’s what you already use
  width?: number;
  height?: number;

  // optional dedupe / caching
  contentHash?: string;

  createdAt: string;
  deletedAt?: string;
}

interface AssetPack {
  id: Id;
  gameId: Id;

  name: string;
  description?: string;

  // Pack-level defaults for prompt composition
  promptDefaults?: PromptDefaults;

  createdAt: string;
  deletedAt?: string;
}

interface AssetPackEntry {
  id: Id;
  packId: Id;

  templateId: Id;            // “slot” in the game
  assetId: Id;               // selected asset

  placement?: AssetPlacement;

  // Optional: store last generation info per entry for “Regenerate this slot”
  lastGeneration?: GenerationResultSnapshot;
}

interface PromptDefaults {
  themePrompt?: string;      // game/pack theme (“forest adventure game”)
  styleOverride?: string;    // e.g. “pixel art, 16-bit”
  modelId?: string;
  aspectRatio?: string;
  negativePrompt?: string;
}

interface PromptComponents {
  themePrompt?: string;      // resolved at the time of generation (snapshot)
  entityPrompt: string;      // e.g. “player character”
  styleOverride?: string;
  negativePrompt?: string;
}

interface GenerationJob {
  id: Id;
  gameId: Id;

  // If you’re generating a new pack, tie it here.
  packId?: Id;

  status: GenerationStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;

  // Snapshotted defaults used for the job
  promptDefaults: PromptDefaults;
}

interface GenerationTask {
  id: Id;
  jobId: Id;

  templateId: Id;
  status: GenerationStatus;

  prompt: {
    components: PromptComponents;
    compiledPrompt: string;      // exact string sent to Scenario.com
    compiledNegativePrompt?: string;
    modelId?: string;
    aspectRatio?: string;
    seed?: string;
  };

  scenarioRequestId?: string;    // whatever Scenario returns for tracking
  assetId?: Id;                  // filled on success

  errorCode?: string;
  errorMessage?: string;

  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

interface GenerationResultSnapshot {
  generationJobId: Id;
  generationTaskId: Id;
  compiledPrompt: string;
  createdAt: string;
}
```

Design choice: prompts live primarily on `GenerationTask` (truth), with an optional `lastGeneration` snapshot on the pack entry for convenience.

---

## Database schema (tables / columns)

Minimal relational shape (Postgres-style, but generic):

### `games`
- `id` (pk)
- `definition_json` (jsonb) — stores `GameDefinitionV2` (templates/entities + asset refs)
- `created_at`, `updated_at`

### `assets`
- `id` (pk)
- `owner_game_id` (nullable fk -> games.id)
- `source` (enum: generated/uploaded)
- `image_url` (text)
- `width` (int, nullable), `height` (int, nullable)
- `content_hash` (text, nullable)
- `created_at`
- `deleted_at` (nullable)

### `asset_packs`
- `id` (pk)
- `game_id` (fk -> games.id)
- `name` (text)
- `description` (text, nullable)
- `prompt_defaults_json` (jsonb, nullable) — `PromptDefaults`
- `created_at`
- `deleted_at` (nullable)

### `asset_pack_entries`
- `id` (pk)
- `pack_id` (fk -> asset_packs.id)
- `template_id` (text) — matches template ids in `definition_json`
- `asset_id` (fk -> assets.id)
- `placement_json` (jsonb, nullable) — `AssetPlacement`
- `last_generation_json` (jsonb, nullable) — `GenerationResultSnapshot`
- Unique index: (`pack_id`, `template_id`) to enforce “one slot per template per pack”

### `generation_jobs`
- `id` (pk)
- `game_id` (fk -> games.id)
- `pack_id` (nullable fk -> asset_packs.id)
- `status` (enum)
- `prompt_defaults_json` (jsonb)
- `created_at`, `started_at`, `finished_at`

### `generation_tasks`
- `id` (pk)
- `job_id` (fk -> generation_jobs.id)
- `template_id` (text)
- `status` (enum)
- `prompt_components_json` (jsonb)
- `compiled_prompt` (text)
- `compiled_negative_prompt` (text, nullable)
- `model_id` (text, nullable)
- `aspect_ratio` (text, nullable)
- `seed` (text, nullable)
- `scenario_request_id` (text, nullable)
- `asset_id` (nullable fk -> assets.id)
- `error_code` (text, nullable)
- `error_message` (text, nullable)
- `created_at`, `started_at`, `finished_at`
- Unique index: (`job_id`, `template_id`)

Deletion semantics:
- Deleting a pack sets `asset_packs.deleted_at` and removes/soft-deletes entries.
- Assets are not deleted automatically; optionally garbage-collect unreferenced assets later.

---

## API design (key endpoints)

Keep it boring and composable:

### Packs
- `POST /games/:gameId/asset-packs`
  - body: `{ name, description?, promptDefaults?, mode: "manual" | "generate" }`
  - if `generate`: returns `packId` + `generationJobId`
- `GET /games/:gameId/asset-packs`
- `GET /asset-packs/:packId` (includes entries + coverage status)
- `PATCH /asset-packs/:packId` (rename, description, promptDefaults)
- `DELETE /asset-packs/:packId` (soft delete)

### Pack entries (mix & match)
- `PUT /asset-packs/:packId/entries/:templateId`
  - body: `{ assetId, placement? }`
- `DELETE /asset-packs/:packId/entries/:templateId`

### Assets
- `POST /assets/upload` (multipart)
  - returns `{ assetId, imageUrl }`
- `GET /assets/:assetId`
- `DELETE /assets/:assetId` (soft delete; reject if referenced unless `force=true`)

### Generation (batch + single)
- `POST /generation-jobs`
  - body: `{ gameId, packId?, templateIds: string[], promptDefaults, overridesByTemplateId?: Record<templateId, Partial<PromptComponents>> }`
- `GET /generation-jobs/:jobId` (job + tasks; progress)
- `POST /generation-jobs/:jobId/cancel`
- `POST /generation-jobs/:jobId/retry-failed`

Important: when a task succeeds, you can automatically upsert the corresponding `asset_pack_entries` row if the job is tied to a pack.

---

## Prompt hierarchy (composition + storage)

### Recommendation
Store both:
1) **Components** (theme/entity/style/negative/settings) on `GenerationTask` for editability and audit.
2) **Compiled prompt string** (exact payload) on `GenerationTask` for reproducibility.

### Composition rule (simple and explicit)
At generation time:
- `theme = override.themePrompt ?? pack.promptDefaults.themePrompt ?? game.defaultThemePrompt (optional)`
- `style = override.styleOverride ?? pack.promptDefaults.styleOverride`
- `entity = templatePrompt || user override entityPrompt`
- compiled prompt example:
  - `"{theme}. {entity}. {style}."` (skip missing parts; keep ordering stable)
- negative prompt similarly composed (or only from defaults unless overridden)

This keeps “single is batch of one” literally true: you always create a job with one task.

---

## UI implications (what this enables)

- Asset Packs list: shows coverage bar (“12/15 templates have assets”), last updated, active indicator.
- Pack detail grid: one row per template with thumbnail, status (missing/generated/uploaded), edit placement, regenerate slot.
- Generation modal:
  - Pack-level fields: theme prompt + style override + model/aspect ratio
  - Per-template overrides (optional): entity prompt tweaks for problematic assets
  - Progress view: per-template task status with retry on failed items
- Entity inspector:
  - “Use active pack default” (no override)
  - Override picker: choose any `assetId` (from any pack) + adjust placement
- Asset library:
  - Upload image -> produces `assetId` -> can be assigned into any pack slot or entity override

---

## Migration path (from current structure)

1. Add new tables (`assets`, `asset_packs`, `asset_pack_entries`, `generation_jobs`, `generation_tasks`).
2. For each existing `GameDefinition.assetPacks[packId]`:
   - Create `asset_packs` row (carry over name/description/style -> `promptDefaults.styleOverride` if you want).
   - For each `assets[templateId]`:
     - If `imageUrl` exists: create `assets` row (`source=generated|uploaded` based on `source`)
     - Create `asset_pack_entries` row with `templateId`, `assetId`, and placement from `scale/offsetX/offsetY`
3. Rewrite game JSON:
   - Replace embedded `assetPacks` with `assetSystem.activeAssetPackId`
   - Optionally add `entityAssetOverrides` only if you already had per-entity overrides (sounds new)
4. Keep a backward-compat reader for a while:
   - If `assetSystem` missing but old `assetPacks` present, run on-load migration and persist.

---

## Why this approach (key trade-offs)

- Keeps the runtime contract perfect: resolution ends in `assetId`.
- Prevents prompt data from becoming ambiguous: prompts belong to generation events, not “the asset” (assets can be reused, but the prompt that created them is historical truth).
- Makes deletion safe: deleting a pack doesn’t nuke assets that might be reused elsewhere.
- Supports mixing packs naturally: default comes from active pack; overrides reference assets directly.

---

## Watch out for

- **Where to put transforms**: keep them on bindings (pack entry / entity override). If you put scale/offset on the asset, reuse becomes painful.
- **Template IDs stability**: pack entries key off `templateId`; renaming template IDs needs a migration step (or store a stable template UUID).
- **Asset ownership rules**: decide if assets are game-scoped by default (`ownerGameId`) and only “global” when explicitly copied/shared.
- **Partial failures**: don’t “fail the pack”; mark tasks failed and let the pack exist with missing slots (matches your definition).

---

## Escalation triggers (when to go more complex)

- You need sprite sheets/animations, multi-resolution variants, or per-platform formats → introduce `asset_variants` table keyed by `asset_id`.
- You need collaborative workflows with approvals/versioning → add immutable pack versions (pack snapshots) and “published” pointers.
- You need offline export/import as a first-class feature → define a portable bundle format (game JSON + asset manifests + image files) and add import reconciliation logic.

**Alternative sketch (advanced path)**
Immutable “PackVersion” snapshots where each publish creates a frozen mapping; entities reference either “active draft pack” or “published version”. Only worth it once you have sharing/collaboration or “don’t break my shipped build” requirements.
