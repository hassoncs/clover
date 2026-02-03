# Asset System Architecture Refactor

## TL;DR

> **Quick Summary**: Refactor asset system to cleanly separate game engine JSON (the what: templates, physics, mechanics) from asset packs (the how: theming, prompting, image URLs). Remove hardcoded `ASSET_BASE` from all test games and use database-backed asset packs with runtime resolution.
> 
> **Deliverables**:
> - Updated TypeScript types with `whatDescription` field and deprecated `imageUrl`
> - Database-integrated runtime resolution hook with React Query caching
> - All 6 active test games migrated to new pattern
> - Final cleanup: remove deprecated `imageUrl` from visual types
> 
> **Estimated Effort**: Large (11 tasks)
> **Parallel Execution**: YES - 5 waves (6 games migrate in parallel)
> **Critical Path**: Task 1 → Task 2 (Types) → Task 3 (Runtime) → Task 4-9 (Migrations) → Task 10 (Verify) → Task 11 (Cleanup)

---

## Context

### Original Request
Refactor the asset system to create a clean separation between:
- **Game Engine JSON** = "the what" (templates, physics, mechanics, IDs, whatDescription)
- **Asset Pack** = "the artistic side" (theming, prompting, image URLs)

Remove `assetBase` from all game definitions. All images on CDN, nothing bundled. Plan for future offline mode (not building yet).

### Interview Summary
**Key Discussions**:
- Asset packs stored in database (always fetch at runtime, not embedded)
- Strict reconciliation - error if pack missing required asset
- `whatDescription` required on all templates with `visual.type: 'image'`
- Image dimensions: visual can define, falls back to collider, pack CANNOT override
- Move from enum styles to hierarchical string-based prompting
- Verification: TypeScript compilation + manual testing

**Research Findings**:
- **6 active test games** with `ASSET_BASE` pattern (verified via `glob **/test-games/games/*/game.ts`):
  - `ballSort`, `flappyBird`, `slopeggle`, `breakoutBouncer`, `breakoutScripted`, `gemCrush`
  - Note: `scriptDemo/` directory exists but is EMPTY (no game.ts file)
- **3 archived games** (OUT OF SCOPE): `tictactoe`, `bubbleShooter`, `pinballLite`
- Database infrastructure already exists (`asset_packs`, `asset_pack_entries`, `game_assets` tables)
- Dual-field `ImageField` pattern exists (`imageUrl` legacy + `assetRef` new)
- `useAssetResolution.ts` hook exists but test games bypass it - currently embedded-pack-only
- tRPC client at `@/lib/trpc/client` (direct) and `@/lib/trpc/react` (React Query)
- This is **completing a partial migration**, not greenfield

### Metis Review
**Identified Gaps** (addressed):
- Need caching strategy for `useAssetResolution` → Use React Query (existing pattern)
- Need backward compatibility → Mark `imageUrl` as deprecated, don't remove
- Need `whatDescription` format defined → Plain string, no length limit
- Need error handling defined → Hard error with clear message including template ID
- Need to validate database schema → Add verification step in Task 1

---

## Work Objectives

### Core Objective
Decouple game engine definitions from asset URL management. Games declare what templates they need; asset packs provide the images.

### Concrete Deliverables
- `shared/src/types/asset-system.ts` - Remove enum `style`, add `theme` string
- `shared/src/types/entity.ts` - Add `whatDescription` to templates
- `shared/src/types/visual.ts` - Make `imageUrl` optional with deprecation
- `app/lib/game-engine/hooks/useAssetResolution.ts` - Database integration with caching
- 9 test game files - Remove `ASSET_BASE`, add `whatDescription`, set `activeAssetPackId`
- Database entries - Asset packs for each test game referencing existing R2 URLs

### Definition of Done
- [ ] `tsc --noEmit` passes with zero errors
- [ ] All 9 test games render correctly in browser
- [ ] No `ASSET_BASE` constants remain in test games (verified via grep)
- [ ] Each template with `visual.type: 'image'` has `whatDescription`
- [ ] Missing pack asset throws clear error with template ID

### Must Have
- Clean separation: game JSON knows nothing about CDN URLs
- All templates with images have `whatDescription`
- Database-backed asset pack resolution
- Strict error on missing pack asset
- Final cleanup: remove deprecated `imageUrl` after migration complete (Task 14)

### Must NOT Have (Guardrails)
- DO NOT change game physics or mechanics
- DO NOT build pack management UI (out of scope)
- DO NOT add asset pack versioning (future feature)
- DO NOT support fuzzy template ID matching (strict 1:1 only)
- DO NOT change AI generation pipeline
- DO NOT modify database schema (use existing)
- DO NOT remove `imageUrl` UNTIL Task 14 (after full migration verified)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (TypeScript compilation, manual game testing)
- **User wants tests**: Type Safety + Manual
- **Framework**: TypeScript compiler + browser testing

### Verification Approach

Each TODO includes:
1. **TypeScript Verification**: `pnpm tsc --noEmit` must pass
2. **Manual Browser Testing**: Run game via `pnpm dev`, verify visuals render
3. **Grep Verification**: Confirm no regressions via search patterns

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation):
├── Task 1: Validate database schema
└── Task 2: Update TypeScript types

Wave 2 (Runtime):
└── Task 3: Update useAssetResolution hook (depends: 2)

Wave 3 (Migrations - Parallel, 6 games):
├── Task 4: Migrate ballSort (depends: 3)
├── Task 5: Migrate flappyBird (depends: 3)
├── Task 6: Migrate slopeggle (depends: 3)
├── Task 7: Migrate breakoutBouncer (depends: 3)
├── Task 8: Migrate breakoutScripted (depends: 3)
└── Task 9: Migrate gemCrush (depends: 3)

Wave 4 (Verification):
└── Task 10: Final verification and documentation (depends: 4-9)

Wave 5 (Final Cleanup):
└── Task 11: Remove deprecated imageUrl field (depends: 10)

Critical Path: Task 1 → Task 2 → Task 3 → Task 4 → Task 10 → Task 11
Parallel Speedup: ~50% faster than sequential (6 games can migrate in parallel)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2 | None (must be first) |
| 2 | 1 | 3 | None |
| 3 | 2 | 4-9 | None |
| 4-9 | 3 | 10 | Each other (all 6 parallel) |
| 10 | 4-9 | 11 | None |
| 11 | 10 | None | None (final cleanup) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | Sequential - foundation work |
| 2 | 3 | Single agent - runtime hook |
| 3 | 4-9 | **Parallel dispatch** - 6 independent migrations |
| 4 | 10 | Single agent - verification |
| 5 | 11 | Single agent - final cleanup |

---

## TODOs

- [ ] 1. Validate Database Schema and Existing Infrastructure

  **What to do**:
  - Use tRPC to verify database connectivity and schema:
    ```typescript
    // In a test file or REPL, use the tRPC client:
    import { trpc } from '@/lib/trpc/client';
    
    // List packs for any existing game (verifies asset_packs table works)
    const packs = await trpc.assetSystem.listPacks.query({ gameId: 'ballSort' });
    console.log('Packs found:', packs.length);
    
    // If pack exists, verify getPack returns entries (verifies asset_pack_entries + game_assets)
    if (packs[0]) {
      const pack = await trpc.assetSystem.getPack.query({ id: packs[0].id });
      console.log('Entries:', pack.entries.length);
      console.log('Sample URL:', pack.entries[0]?.imageUrl);
    }
    ```
  - Verify R2 URLs work by checking a known URL in browser:
    `https://slopcade-api.hassoncs.workers.dev/assets/generated/ballSort/ball0.png`
  - Document findings: Do packs exist? Do entries exist? Are URLs accessible?

  **Must NOT do**:
  - Modify database schema
  - Create new tables
  - Delete existing data

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple database verification, no code changes
  - **Skills**: [`slopcade-documentation`]
    - `slopcade-documentation`: Understanding database schema context

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `api/schema.sql:148-224` - Database schema definitions for asset tables
  - `api/src/trpc/routes/asset-system.ts:352-379` - `getPack` procedure showing exact query pattern
  - `api/src/trpc/routes/asset-system.ts:381-399` - `listPacks` procedure
  - `app/lib/trpc/client.ts` - tRPC client setup

  **Execution Environment**:
  - Start the dev server: `pnpm dev`
  - Navigate to any page in browser (e.g., `http://localhost:8085`)
  - Open DevTools console (F12 → Console tab)
  - The tRPC client is available via window context after importing
  - **OR**: Create a temporary test script and run via `npx tsx`

  **Expected Outcomes**:
  - If packs exist: Document pack IDs and entry counts
  - If NO packs exist: This is **EXPECTED** for test games - proceed to pack creation (see below)
  - If database connection fails: Follow failure handling steps

  **If Database Connection Fails**:
  1. Verify API is running: `pnpm svc:status` → check `api` service shows "running"
  2. If not running: `pnpm dev` to start all services, wait for "API ready" message
  3. Retry verification
  4. If still failing: Check `api/.dev.vars` exists with `DB_URL` or database credentials
  5. If all else fails: This is a **BLOCKER** - investigate API logs via `npx devmux attach api`

  **Database Pack Creation Workflow** (use if packs don't exist):
  
  ```typescript
  // Create a pack for each game using tRPC:
  // 1. Create the pack
  const pack = await trpc.assetSystem.createPack.mutate({
    gameId: 'ballSort',           // Must match game ID in games table
    name: 'ballSort-default',     // Human-readable name (becomes activeAssetPackId)
    description: 'Default candy factory theme',
    promptDefaults: {
      themePrompt: 'whimsical candy factory',
    },
  });
  
  // 2. For each template, create an entry mapping to existing R2 URL
  // First, you need to know the asset IDs - either:
  //   a) Query game_assets table for existing assets
  //   b) Create new assets by uploading to R2
  
  // If assets already exist in R2 (from previous generation):
  await trpc.assetSystem.setPackEntry.mutate({
    packId: pack.id,
    templateId: 'ball0',        // Template ID from game definition
    assetId: 'uuid-from-game-assets',  // ID from game_assets table
    placement: { scale: 1, offsetX: 0, offsetY: 0 },
  });
  
  // API Reference:
  // - createPack: api/src/trpc/routes/asset-system.ts:401-436
  // - setPackEntry: api/src/trpc/routes/asset-system.ts:484-500
  ```
  
  **Note**: For this refactor, packs may already exist from previous asset generation runs. Verify first before creating new ones.

  **Acceptance Criteria**:
  - [ ] Dev server running (`pnpm dev` → Metro on 8085, API on 8789)
  - [ ] tRPC calls execute without network/auth errors
  - [ ] R2 URL check: Open `https://slopcade-api.hassoncs.workers.dev/assets/generated/ballSort/ball0.png` in browser → HTTP 200
  - [ ] Findings documented: pack exists (with ID) OR "needs pack creation"

  **Commit**: NO (verification only)

---

- [ ] 2. Update TypeScript Types for New Asset Model

  **Type Changes with BEFORE/AFTER**:

  **A) `shared/src/types/asset-system.ts` - PromptDefaults**:
  ```typescript
  // BEFORE (current, lines 49-55):
  export interface PromptDefaults {
    themePrompt?: string;
    styleOverride?: string;  // ← DEPRECATE THIS
    modelId?: string;
    negativePrompt?: string;
    customPrompts?: Record<string, string>;
  }
  
  // Also mark DEFAULT_STYLES (lines 19-24) as deprecated:
  /** @deprecated Use themePrompt string instead of enum-based styling */
  export const DEFAULT_STYLES = ['pixel', 'cartoon', '3d', 'flat'] as const;
  
  // AFTER (migrated):
  export interface PromptDefaults {
    themePrompt?: string;
    /** @deprecated Use themePrompt for hierarchical string-based styling */
    styleOverride?: string;
    theme?: string;  // ← NEW: replaces enum-based styling
    modelId?: string;
    negativePrompt?: string;
    customPrompts?: Record<string, string>;
  }
  ```

  **B) `shared/src/types/entity.ts` - BaseEntityTemplate**:
  ```typescript
  // BEFORE (current, lines 79-93):
  export interface BaseEntityTemplate {
    id: string;
    description?: string;  // ← This is for developers, not AI
    archetype?: EntityArchetype;
    visual?: VisualComponent;
    // ...
  }
  
  // AFTER (migrated):
  export interface BaseEntityTemplate {
    id: string;
    description?: string;
    /**
     * Short description of WHAT this entity is, used for AI asset generation.
     * Format: lowercase, with article (e.g., "a bouncing ball", "a glass tube container")
     * This describes the functional nature, NOT the visual style (style comes from pack theme).
     */
    whatDescription?: string;  // ← NEW FIELD
    archetype?: EntityArchetype;
    visual?: VisualComponent;
    // ...
  }
  ```

  **C) `shared/src/types/visual.ts` - ImageVisualComponent**:
  ```typescript
  // BEFORE (current, lines 50-56):
  export interface ImageVisualComponent extends BaseVisualComponent {
    type: 'image';
    imageUrl: string;  // ← Currently REQUIRED
    tint?: string;
    imageWidth?: number;
    imageHeight?: number;
  }
  
  // AFTER (migrated):
  export interface ImageVisualComponent extends BaseVisualComponent {
    type: 'image';
    /**
     * @deprecated Image URL now comes from asset pack at runtime.
     * Keep only for backward compatibility during migration.
     * Will be removed in Task 11 after all games are migrated.
     */
    imageUrl?: string;  // ← Make OPTIONAL with deprecation
    tint?: string;
    imageWidth?: number;
    imageHeight?: number;
  }
  ```

  **Must NOT do**:
  - Remove `imageUrl` field entirely (that's Task 11)
  - Change non-asset-related types
  - Modify physics or collider types
  - Add new required fields that break existing games

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type definition changes, straightforward modifications
  - **Skills**: [`verification-before-completion`]
    - `verification-before-completion`: TypeScript compilation check

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `shared/src/types/asset-system.ts` - Current asset system types
  - `shared/src/types/entity.ts:79-93` - `BaseEntityTemplate` definition
  - `shared/src/types/visual.ts:50-56` - `ImageVisualComponent` definition
  - `shared/src/types/GameDefinition.ts:10-22` - `ImageField` dual-field pattern

  **Acceptance Criteria**:
  - [ ] `pnpm tsc --noEmit` passes in `packages/shared`
  - [ ] `style` enum removed or deprecated with JSDoc
  - [ ] `whatDescription` added to `BaseEntityTemplate`
  - [ ] `imageUrl` marked optional with `@deprecated` JSDoc
  - [ ] `theme` string added to pack types

  **Commit**: YES
  - Message: `refactor(shared): update asset system types for engine/pack separation`
  - Files: `shared/src/types/asset-system.ts`, `shared/src/types/entity.ts`, `shared/src/types/visual.ts`, `shared/src/types/GameDefinition.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 3. Update Runtime Asset Resolution Hook

  **Complete Implementation** (add to `app/lib/game-engine/hooks/useAssetResolution.ts`):

  ```typescript
  import { useMemo } from 'react';
  import { trpcReact } from '@/lib/trpc/react';
  import type { RuntimeEntity } from '../types';
  import type { AssetPack, AssetConfig, AssetPlacement, GameDefinition, EntityTemplate, ColliderComponent } from '@slopcade/shared';
  
  // === NEW: Database pack fetching with React Query caching ===
  
  interface DatabasePackEntry {
    templateId: string;
    imageUrl: string | null;
    assetWidth: number | null;
    assetHeight: number | null;
    placement?: { scale?: number; offsetX?: number; offsetY?: number };
  }
  
  interface DatabasePack {
    id: string;
    name: string;
    entries: DatabasePackEntry[];
  }
  
  function useAssetPackFromDatabase(packId: string | undefined) {
    return trpcReact.assetSystem.getPack.useQuery(
      { id: packId! },
      { 
        enabled: !!packId,
        staleTime: 5 * 60 * 1000, // 5 minutes - packs don't change often
        gcTime: 30 * 60 * 1000,   // 30 minutes cache retention
      }
    );
  }
  
  // === NEW: Convert database pack format to embedded pack format ===
  
  function convertDbPackToEmbedded(dbPack: DatabasePack): AssetPack {
    const assets: Record<string, AssetConfig> = {};
    
    for (const entry of dbPack.entries) {
      if (entry.imageUrl) {
        assets[entry.templateId] = {
          imageUrl: entry.imageUrl,
          source: 'generated' as const,
          scale: entry.placement?.scale ?? 1,
          offsetX: entry.placement?.offsetX ?? 0,
          offsetY: entry.placement?.offsetY ?? 0,
        };
      }
    }
    
    return {
      id: dbPack.id,
      name: dbPack.name,
      assets,
    };
  }
  
  // === NEW: Strict validation that pack covers all required templates ===
  
  function validatePackCoverage(
    templates: Record<string, EntityTemplate>,
    pack: AssetPack
  ): void {
    const imageTemplates = Object.entries(templates)
      .filter(([_, t]) => t.visual?.type === 'image')
      .map(([id]) => id);
    
    const missingAssets = imageTemplates.filter(id => !pack.assets[id]?.imageUrl);
    
    if (missingAssets.length > 0) {
      throw new Error(
        `Asset pack "${pack.id}" missing required assets for templates: ${missingAssets.join(', ')}. ` +
        `Each template with visual.type='image' must have a corresponding entry in the asset pack.`
      );
    }
  }
  
  // === NEW: Derive visual dimensions from collider if not specified ===
  
  function getDimensionsFromCollider(collider: ColliderComponent): { width: number; height: number } | null {
    switch (collider.shape) {
      case 'box': return { width: collider.width, height: collider.height };
      case 'circle': return { width: collider.radius * 2, height: collider.radius * 2 };
      case 'capsule': return { width: collider.radius * 2, height: collider.height };
      case 'polygon': return null; // Cannot derive, needs explicit visual dimensions
    }
  }
  
  // === MODIFIED: useAssetResolution with database support ===
  
  export function useAssetResolution(
    entities: RuntimeEntity[],
    definition: GameDefinition
  ): Map<string, ResolvedAsset | null> {
    const activePackId = definition.assetSystem?.activeAssetPackId ?? definition.activeAssetPackId;
    
    // Try database pack first (new path)
    const { data: dbPack, isLoading: isLoadingDbPack } = useAssetPackFromDatabase(activePackId);
    
    return useMemo(() => {
      // If actively loading database pack, return empty map
      // Caller should check isLoading and show loading state
      if (activePackId && isLoadingDbPack && !definition.assetPacks?.[activePackId]) {
        return new Map();
      }
      
      // Determine effective packs: database pack takes precedence
      let effectivePacks = definition.assetPacks;
      if (dbPack && activePackId) {
        effectivePacks = {
          ...definition.assetPacks,
          [activePackId]: convertDbPackToEmbedded(dbPack),
        };
      }
      
      // Validate pack coverage if we have an active pack
      if (activePackId && effectivePacks?.[activePackId] && definition.templates) {
        validatePackCoverage(definition.templates, effectivePacks[activePackId]);
      }
      
      // Build resolution context
      const context: AssetResolutionContext = {
        activePackId,
        assetPacks: effectivePacks,
        entityAssetOverrides: definition.assetSystem?.entityAssetOverrides,
      };
      
      // Resolve assets for each entity
      const resolutionMap = new Map<string, ResolvedAsset | null>();
      for (const entity of entities) {
        resolutionMap.set(entity.id, resolveAssetForEntity(entity, context));
      }
      
      return resolutionMap;
    }, [entities, activePackId, dbPack, isLoadingDbPack, definition]);
  }
  
  // === MODIFIED: resolveAssetForEntity with dimension derivation ===
  
  export function resolveAssetForEntity(
    entity: RuntimeEntity,
    context: AssetResolutionContext,
    template?: EntityTemplate
  ): ResolvedAsset | null {
    const { activePackId, assetPacks, entityAssetOverrides } = context;
    
    // ... existing override logic ...
    
    const packIdToUse = entity.assetPackId ?? activePackId;
    if (!packIdToUse || !assetPacks?.[packIdToUse]) {
      return null;
    }
    
    const pack = assetPacks[packIdToUse];
    const templateId = entity.template;
    
    if (!templateId || !pack.assets[templateId]) {
      return null;
    }
    
    const assetConfig = pack.assets[templateId];
    if (!assetConfig.imageUrl || assetConfig.source === 'none') {
      return null;
    }
    
    // NEW: Derive dimensions from collider if visual doesn't specify
    let width = entity.visual?.imageWidth;
    let height = entity.visual?.imageHeight;
    
    if ((width === undefined || height === undefined) && template?.collider) {
      const derived = getDimensionsFromCollider(template.collider);
      if (derived) {
        width = width ?? derived.width;
        height = height ?? derived.height;
      }
    }
    
    return {
      imageUrl: assetConfig.imageUrl,
      placement: {
        scale: assetConfig.scale ?? 1,
        offsetX: assetConfig.offsetX ?? 0,
        offsetY: assetConfig.offsetY ?? 0,
      },
      // NEW: Include derived dimensions
      dimensions: (width && height) ? { width, height } : undefined,
    };
  }
  ```

  **Error Handling Strategy**:
  
  The hook throws an error via `validatePackCoverage()` which will be caught by React's error boundary. Callers should:
  
  1. **Wrap the game component** in an error boundary to catch pack validation errors
  2. **Display a user-friendly message** like "Unable to load game assets. Please try again."
  3. **Log the error** for debugging (includes missing template IDs)
  
  ```tsx
  // Example usage in game component:
  function GameScreen() {
    const { entities, definition, templates } = useGameState();
    const assetMap = useAssetResolution(entities, definition, templates);
    
    // If pack is loading, show loading state
    if (assetMap.size === 0 && definition.activeAssetPackId) {
      return <LoadingSpinner />;
    }
    
    // If validation failed, error boundary catches it
    // Otherwise, render normally
    return <GameRenderer entities={entities} assets={assetMap} />;
  }
  
  // Wrap in error boundary at route level (app/play/[id].tsx)
  ```

  **Integration Points**:
  - `trpcReact` imported from `@/lib/trpc/react` (same as other hooks in app)
  - `DatabasePack` type matches response from `api/src/trpc/routes/asset-system.ts:352-379`
  - `validatePackCoverage` throws during memoization - caught by error boundary
  - `getDimensionsFromCollider` called in `resolveAssetForEntity` when visual dimensions missing
  - `ResolvedAsset` type extended with optional `dimensions` field

  **Components That Call This Hook** (may need updates):
  - `app/lib/game-engine/GameRenderer.tsx` - Main game rendering
  - `app/app/play/[id].tsx` - Game play screen
  - `app/app/editor/[id].tsx` - Game editor
  
  Verify each component handles:
  - Empty map during loading (show spinner)
  - Error thrown during validation (error boundary catches)

  **Must NOT do**:
  - Query database on every render frame (use React Query caching)
  - Block game startup synchronously (async with loading state)
  - Support fuzzy template ID matching (strict 1:1)
  - Remove existing embedded pack resolution (keep for backward compat until Task 11)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core runtime logic changes requiring careful implementation
  - **Skills**: [`verification-before-completion`, `systematic-debugging`]
    - `verification-before-completion`: Verify hook works before claiming complete
    - `systematic-debugging`: Debug any issues with resolution logic

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2)
  - **Blocks**: Tasks 4-9
  - **Blocked By**: Task 2

  **References**:
  - `app/lib/game-engine/hooks/useAssetResolution.ts` - Current hook (100 lines, full code shown above in context)
  - `app/lib/trpc/react.tsx:9` - `trpcReact` export for React Query hooks
  - `app/app/play/[id].tsx:227` - Example of `trpc.assetSystem.getPack.query()` usage
  - `api/src/trpc/routes/asset-system.ts:352-379` - `getPack` returns `{ ...pack, entries: [...] }`
  - `app/lib/trpc/react.tsx:67` - TRPCProvider wraps app with QueryClient

  **Acceptance Criteria**:
  - [ ] `useAssetPackFromDatabase` hook created with React Query caching
  - [ ] `useAssetResolution` supports both database and embedded packs
  - [ ] `validatePackCoverage` throws error listing all missing template IDs
  - [ ] Dimension derivation works for box, circle, capsule colliders
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] Manual test: Game with database pack loads correctly

  **Commit**: YES
  - Message: `feat(app): integrate database-backed asset resolution with caching`
  - Files: `app/lib/game-engine/hooks/useAssetResolution.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 4. Migrate Ball Sort Test Game

  **Migration Pattern** (apply to ALL game migrations):

  **BEFORE** (current code in `ballSort/game.ts`):
  ```typescript
  const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/ballSort";
  
  templates: {
    tube: {
      id: "tube",
      tags: ["tube"],
      visual: {
        type: "image",
        imageUrl: `${ASSET_BASE}/ball0.png`,  // ← REMOVE THIS
        imageWidth: TUBE_WIDTH,
        imageHeight: TUBE_HEIGHT,
      },
      collider: { shape: "box", width: TUBE_WIDTH, height: TUBE_HEIGHT },
    },
    ball0: {
      visual: {
        type: "image", 
        imageUrl: `${ASSET_BASE}/ball0.png`,  // ← REMOVE THIS
      },
    },
  }
  ```

  **AFTER** (migrated code):
  ```typescript
  // DELETE: const ASSET_BASE = "...";  ← REMOVE ENTIRE LINE
  
  templates: {
    tube: {
      id: "tube",
      tags: ["tube"],
      whatDescription: "a transparent glass cylinder tube container",  // ← ADD THIS
      visual: {
        type: "image",
        // imageUrl REMOVED - comes from pack at runtime
        imageWidth: TUBE_WIDTH,
        imageHeight: TUBE_HEIGHT,
      },
      collider: { shape: "box", width: TUBE_WIDTH, height: TUBE_HEIGHT },
    },
    ball0: {
      whatDescription: "a shiny red gumball candy",  // ← ADD THIS
      visual: {
        type: "image",
        // imageUrl REMOVED
      },
    },
  }
  
  // ADD at game definition root level:
  activeAssetPackId: "ballSort-default",
  ```

  **What to do**:
  1. Delete `const ASSET_BASE = "..."` line entirely
  2. For each template with `visual.type: 'image'`:
     - Add `whatDescription: "..."` (lowercase, article included, e.g., "a red gumball")
     - Remove `imageUrl` property from visual
     - Keep `imageWidth`/`imageHeight` if defined
  3. Add `activeAssetPackId: "ballSort-default"` at root of GameDefinition
  4. Verify/create database pack (may already exist from prior asset generation)

  **whatDescription Format**:
  - Lowercase, starts with article ("a", "an", "the")
  - Short but descriptive (5-15 words)
  - Describes the THING, not the style (style comes from pack theme)
  - Examples:
    - "a shiny red gumball candy" (not "a cartoon-style candy ball")
    - "a transparent glass cylinder tube" (not "a cute tube")
    - "a cannon that shoots balls" (functional description)

  **Must NOT do**:
  - Change game physics or mechanics
  - Modify puzzle generation logic
  - Change tube/ball behavior scripts
  - Remove templates entirely

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward file migration, pattern already established
  - **Skills**: [`verification-before-completion`]
    - `verification-before-completion`: Run game to verify after changes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5-9)
  - **Blocks**: Task 10
  - **Blocked By**: Task 3

  **References**:
  - `app/lib/test-games/games/ballSort/game.ts:11` - `ASSET_BASE` definition to remove
  - `app/lib/test-games/games/ballSort/game.ts:274-290` - `tube` template to migrate
  - `app/lib/test-games/games/ballSort/game.ts:405-420` - `ball{N}` template pattern
  - `api/scripts/game-configs/ballSort/assets.config.ts` - Asset descriptions for `whatDescription` ideas

  **Acceptance Criteria**:
  - [ ] `grep "ASSET_BASE" app/lib/test-games/games/ballSort/game.ts` returns no matches
  - [ ] All templates with `visual.type: 'image'` have `whatDescription`
  - [ ] No `imageUrl` in any template visual
  - [ ] `activeAssetPackId: "ballSort-default"` present
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] Manual: Game runs in browser (`pnpm dev`, open localhost:8085/examples/ballSort)

  **Commit**: YES (group with other migrations)
  - Message: `refactor(test-games): migrate ballSort to asset pack system`
  - Files: `app/lib/test-games/games/ballSort/game.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 5. Migrate Flappy Bird Test Game

  **What to do**: Same migration pattern as Task 4
  - Remove `ASSET_BASE` constant
  - Add `whatDescription` to templates: bird ("a small yellow bird"), pipeTop/pipeBottom ("a green pipe obstacle"), ground, ceiling
  - Remove `imageUrl` from visuals
  - Add `activeAssetPackId: "flappyBird-default"`

  **References**:
  - `app/lib/test-games/games/flappyBird/game.ts:5` - `ASSET_BASE` definition
  - `app/lib/test-games/games/flappyBird/game.ts:99-122` - bird template
  - `app/lib/test-games/games/flappyBird/game.ts:123-165` - pipe templates

  **Acceptance Criteria**:
  - [ ] `grep "ASSET_BASE" .../flappyBird/game.ts` returns no matches
  - [ ] All image templates have `whatDescription`
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] Game renders in browser

  **Parallelization**: YES - Wave 3 (with 4, 6-9)
  **Commit**: YES (group) - `refactor(test-games): migrate flappyBird to asset pack system`

---

- [ ] 6. Migrate Slopeggle Test Game

  **What to do**: Same migration pattern as Task 4
  - Remove `ASSET_BASE`
  - Add `whatDescription` to: ball, cannon, cannonBase, bluePeg, orangePeg, bucket, portalA, portalB
  - Add `activeAssetPackId: "slopeggle-default"`

  **References**:
  - `app/lib/test-games/games/slopeggle/game.ts:4` - `ASSET_BASE` definition
  - `app/lib/test-games/games/slopeggle/game.ts:140-345` - all templates

  **Acceptance Criteria**:
  - [ ] No `ASSET_BASE`, has `whatDescription`, `pnpm tsc --noEmit` passes, renders correctly

  **Parallelization**: YES - Wave 3
  **Commit**: YES (group)

---

- [ ] 7. Migrate Breakout Bouncer Test Game

  **What to do**: Same migration pattern as Task 4
  - Add `whatDescription` to: paddle, brickRed, brickBlue, brickGreen, brickYellow, background
  - Add `activeAssetPackId: "breakoutBouncer-default"`

  **References**:
  - `app/lib/test-games/games/breakoutBouncer/game.ts:4` - `ASSET_BASE`
  - `app/lib/test-games/games/breakoutBouncer/game.ts:125-224` - templates

  **Acceptance Criteria**:
  - [ ] No `ASSET_BASE`, has `whatDescription`, `pnpm tsc --noEmit` passes, renders correctly

  **Parallelization**: YES - Wave 3
  **Commit**: YES (group)

---

- [ ] 8. Migrate Breakout Scripted Test Game

  **What to do**: Same migration pattern as Task 4
  - Note: Uses same assets as breakoutBouncer (`breakout-bouncer` R2 path)
  - Add `whatDescription` to templates
  - Add `activeAssetPackId: "breakoutBouncer-default"` (shared pack)

  **References**:
  - `app/lib/test-games/games/breakoutScripted/game.ts:4` - `ASSET_BASE`

  **Acceptance Criteria**:
  - [ ] No `ASSET_BASE`, has `whatDescription`, `pnpm tsc --noEmit` passes, renders correctly

  **Parallelization**: YES - Wave 3
  **Commit**: YES (group)

---

- [ ] 9. Migrate Gem Crush Test Game

  **What to do**: Same migration pattern as Task 4
  - Add `whatDescription` to gem templates and background
  - Add `activeAssetPackId: "gemCrush-default"`

  **References**:
  - `app/lib/test-games/games/gemCrush/game.ts:9` - `ASSET_BASE`

  **Acceptance Criteria**:
  - [ ] No `ASSET_BASE`, has `whatDescription`, `pnpm tsc --noEmit` passes, renders correctly

  **Parallelization**: YES - Wave 3
  **Commit**: YES (group) - `refactor(test-games): migrate all test games to asset pack system`

---

- [ ] 10. Final Verification and Documentation Update

  **What to do**:
  - Run full TypeScript compilation: `pnpm tsc --noEmit`
  - Run each test game in browser (via `pnpm dev`):
    - ballSort, flappyBird, slopeggle
    - breakoutBouncer, breakoutScripted, gemCrush
  - Verify no `ASSET_BASE` remains:
    ```bash
    grep -r "ASSET_BASE" app/lib/test-games/games/
    # Expected: no output (archived games may still have it, that's OK)
    ```
  - Update `docs/architecture/asset-pack-system.md`:
    - Add section: "whatDescription Field" explaining its purpose and format
    - Update section 8 "Current State of Test Games" to reflect migration complete
    - Add note that `imageUrl` in templates is deprecated (removed in Task 11)
    - Document database-backed resolution as the primary path

  **Must NOT do**:
  - Skip any game verification
  - Leave outdated documentation

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation update focus
  - **Skills**: [`verification-before-completion`, `slopcade-documentation`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 4-9

  **References**:
  - `docs/architecture/asset-pack-system.md` - Architecture doc to update
  - All test game files from Tasks 4-9

  **Acceptance Criteria**:
  - [ ] `pnpm tsc --noEmit` passes
  - [ ] `grep -r "ASSET_BASE" app/lib/test-games/games/` returns empty
  - [ ] All 6 test games render correctly in browser
  - [ ] Documentation updated with `whatDescription` section
  - [ ] No TypeScript errors in IDE

  **Commit**: YES
  - Message: `docs: update asset pack architecture for database-backed resolution`
  - Files: `docs/architecture/asset-pack-system.md`

---

- [ ] 11. Remove Deprecated imageUrl Field (Final Cleanup)

  **IMPORTANT: Two Different imageUrl Fields**
  
  There are TWO `imageUrl` fields in the codebase - only ONE is being removed:
  
  | Field | Location | Action |
  |-------|----------|--------|
  | `ImageVisualComponent.imageUrl` | `shared/src/types/visual.ts` | **REMOVE** (templates) |
  | `AssetConfig.imageUrl` | `shared/src/types/GameDefinition.ts` | **KEEP** (packs) |
  
  **Pre-Removal Verification** (MUST complete before making changes):
  
  ```bash
  # 1. Verify template imageUrl (the one we're REMOVING) is not used in test games:
  grep -rn "visual.*imageUrl" app/lib/test-games/games/ --include="*.ts"
  grep -rn "imageUrl.*:" app/lib/test-games/games/ --include="*.ts" | grep -v "activeAssetPackId"
  # Expected: NO MATCHES (all migrated in Tasks 4-9)
  
  # 2. Verify pack imageUrl (the one we KEEP) still exists:
  grep -n "imageUrl" shared/src/types/GameDefinition.ts
  # Expected: MATCHES in AssetConfig interface - DO NOT REMOVE THESE
  
  # 3. Check for code that reads ImageVisualComponent.imageUrl:
  grep -rn "\.visual\.imageUrl" app/lib/ --include="*.ts" --include="*.tsx"
  grep -rn "visual?.imageUrl" app/lib/ --include="*.ts" --include="*.tsx"
  # Expected: NO MATCHES (or only in resolution code being updated)
  
  # 4. Check for code importing ImageVisualComponent:
  grep -rn "ImageVisualComponent" app/ packages/ --include="*.ts" --include="*.tsx"
  # Review each: ensure they don't access .imageUrl field
  ```

  **What to do** (only after verification passes):
  - In `shared/src/types/visual.ts`:
    ```typescript
    // BEFORE (deprecated in Task 2):
    export interface ImageVisualComponent extends BaseVisualComponent {
      type: 'image';
      /** @deprecated ... */
      imageUrl?: string;  // ← REMOVE THIS LINE
      tint?: string;
      imageWidth?: number;
      imageHeight?: number;
    }
    
    // AFTER (final):
    export interface ImageVisualComponent extends BaseVisualComponent {
      type: 'image';
      tint?: string;
      imageWidth?: number;
      imageHeight?: number;
    }
    ```
  - In `shared/src/types/GameDefinition.ts`:
    ```typescript
    // BEFORE:
    export type ImageField = {
      imageUrl?: string;  // ← REMOVE THIS
      assetRef?: string;
    };
    
    // AFTER (if assetRef still needed):
    export type ImageField = {
      assetRef?: string;
    };
    // OR remove ImageField entirely if no longer used
    ```
  - In `app/lib/game-engine/hooks/useAssetResolution.ts`:
    - Remove the embedded pack fallback path (lines 47-49 reference)
    - Database pack is now the ONLY source of image URLs
  - Run `pnpm tsc --noEmit` and fix ALL compilation errors
  - For each error: verify it's expected (code was using deprecated field) and fix

  **Rollback Strategy**:
  If removal causes unexpected breakage:
  1. `git revert HEAD` to undo Task 11 commit
  2. Investigate which code was still using `imageUrl`
  3. Fix that code first, then retry Task 11

  **Must NOT do**:
  - Remove `imageUrl` from `AssetConfig` (in asset-system.ts) - those are the actual URLs!
  - Break games that are now fully migrated
  - Leave any dangling references
  - Skip pre-removal verification

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Breaking change affecting multiple files, needs careful coordination
  - **Skills**: [`verification-before-completion`, `systematic-debugging`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (final cleanup)
  - **Blocks**: None
  - **Blocked By**: Task 10

  **References**:
  - `shared/src/types/visual.ts:50-56` - `ImageVisualComponent` to clean up
  - `shared/src/types/GameDefinition.ts:19-22` - `ImageField` to simplify
  - `app/lib/game-engine/hooks/useAssetResolution.ts` - Remove embedded pack fallback
  - `shared/src/types/asset-system.ts:82-89` - `AssetPackEntry` keeps imageUrl (DO NOT REMOVE)

  **Acceptance Criteria**:
  - [ ] Pre-removal verification completed with expected results
  - [ ] `imageUrl` removed from `ImageVisualComponent` type
  - [ ] `grep "imageUrl" shared/src/types/visual.ts` returns no matches
  - [ ] `grep "imageUrl" app/lib/test-games/games/` returns no matches
  - [ ] `pnpm tsc --noEmit` passes with zero errors
  - [ ] All 6 test games still render correctly (regression test)
  - [ ] No "@deprecated" markers remain in visual types

  **Commit**: YES
  - Message: `refactor(shared): remove deprecated imageUrl from visual types (pack-only resolution)`
  - Files: `shared/src/types/visual.ts`, `shared/src/types/GameDefinition.ts`, `app/lib/game-engine/hooks/useAssetResolution.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 2 | `refactor(shared): update asset system types for engine/pack separation` | Types |
| 3 | `feat(app): integrate database-backed asset resolution with caching` | Hook |
| 4-9 | `refactor(test-games): migrate [game-names] to asset pack system` | Per-game or grouped |
| 10 | `docs: update asset pack architecture for database-backed resolution` | Docs |
| 11 | `refactor(shared): remove deprecated imageUrl from visual types (pack-only)` | Types, Hook |

**Parallel Migration Safety (Tasks 4-9)**:

Since Tasks 4-9 run in parallel, commit strategy depends on outcome:

- **All succeed**: Group into single commit listing all games
  - `refactor(test-games): migrate ballSort, flappyBird, slopeggle, breakoutBouncer, breakoutScripted, gemCrush to asset pack system`
  
- **Some fail**: Commit ONLY successful migrations, note failures
  - `refactor(test-games): migrate ballSort, slopeggle, gemCrush to asset pack system`
  - Add note: "breakoutBouncer, breakoutScripted, flappyBird migrations pending - [reason]"
  
- **Rollback if needed**: If a committed migration breaks production:
  1. `git revert <commit-hash>` for the migration commit
  2. Investigate the specific game that failed
  3. Fix and recommit only that game

**Detection of partial migration state**:
```bash
# Check which games are migrated (no ASSET_BASE):
for game in ballSort flappyBird slopeggle breakoutBouncer breakoutScripted gemCrush; do
  if grep -q "ASSET_BASE" "app/lib/test-games/games/$game/game.ts" 2>/dev/null; then
    echo "$game: NOT migrated"
  else
    echo "$game: migrated"
  fi
done
```

---

## Success Criteria

### Verification Commands
```bash
# TypeScript compilation
pnpm tsc --noEmit
# Expected: No errors

# Check no ASSET_BASE remaining
grep -r "ASSET_BASE" app/lib/test-games/
# Expected: No matches

# Start dev server
pnpm dev
# Expected: Metro starts on :8085

# Open browser and test each game manually
# Expected: All games render with correct images
```

### Final Checklist
- [ ] All "Must Have" present:
  - Clean separation (games don't know URLs)
  - `whatDescription` on all image templates
  - Database-backed resolution with React Query caching
  - Strict error on missing assets
  - `imageUrl` removed from visual types (Task 11 complete)
- [ ] All "Must NOT Have" absent:
  - No changed physics
  - No pack management UI
  - No pack versioning
  - No fuzzy matching
- [ ] All TypeScript compilation passes (`pnpm tsc --noEmit`)
- [ ] All 6 test games render correctly in browser
- [ ] No deprecated code remaining (clean codebase)
- [ ] `grep -r "ASSET_BASE" app/lib/test-games/games/` returns empty
