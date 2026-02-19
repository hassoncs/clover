# App Consolidation (Remaining Work) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the consolidation of duplicated code between `apps/amen/` and `apps/slopcade/` into shared packages, eliminating all unnecessary duplication while preserving brand-specific theming.

**Architecture:** Three-layer approach: (1) extract shared lib modules into `@slopcade/shared` using re-export wrappers to avoid `@/` import rewrites, (2) move remaining components to `@slopcade/ui` using prop injection for app-specific dependencies, (3) port Amen-only features to shared packages so Slopcade gets feature parity for free.

**Tech Stack:** React Native, Expo Router, TypeScript, NativeWind, pnpm workspaces, `@slopcade/shared`, `@slopcade/ui`

**Prior Work:** 40 identical components already moved to `@slopcade/ui`. `BrandConfig` + `BrandProvider` created. `PartyContext` unified. See commit `3a70ef5e`.

---

## Task 1: Create App-Level Dependency Providers

The 15 deferred components and 83 identical lib files can't move directly because they import app-specific modules via `@/` paths. Rather than rewriting all imports, we create **provider hooks** that inject app-specific deps into shared components.

**Files:**
- Create: `packages/ui/src/providers/AppDepsProvider.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/slopcade/app/_layout.tsx`
- Modify: `apps/amen/app/_layout.tsx`

**Step 1: Create the dependency provider**

Create `packages/ui/src/providers/AppDepsProvider.tsx`:

```tsx
import { createContext, type ReactNode, useContext } from "react";

export interface AppDeps {
  trpc: {
    useQuery: (path: string[], opts?: unknown) => unknown;
    useMutation: (path: string[]) => unknown;
  };
  env: {
    apiUrl: string;
    resolveAssetUrl: (path: string) => string;
  };
  toast: {
    show: (message: string, type?: "success" | "error" | "info") => void;
  };
}

const AppDepsContext = createContext<AppDeps | null>(null);

export function AppDepsProvider({ deps, children }: { deps: AppDeps; children: ReactNode }) {
  return <AppDepsContext.Provider value={deps}>{children}</AppDepsContext.Provider>;
}

export function useAppDeps(): AppDeps {
  const deps = useContext(AppDepsContext);
  if (!deps) throw new Error("useAppDeps must be used within AppDepsProvider");
  return deps;
}
```

**Step 2: Wire into both app layouts**

In each app's `_layout.tsx`, create the `AppDeps` object from app-specific modules and wrap with `<AppDepsProvider>` alongside `<BrandProvider>`.

**Step 3: Export from `packages/ui/src/index.ts`**

```typescript
export * from "./providers/AppDepsProvider";
```

**Step 4: Commit**

```bash
git add packages/ui/src/providers/ apps/*/app/_layout.tsx
git commit -m "feat: add AppDepsProvider for injecting app-specific deps into shared components"
```

---

## Task 2: Move 15 Deferred Components to @slopcade/ui

With `AppDepsProvider` in place, refactor each component to use `useAppDeps()` instead of `@/` imports.

**Files:**
- Modify+Move: 15 components listed below
- Modify: `packages/ui/src/index.ts` (barrel exports)

**Components and their `@/` dependencies:**

| Component | `@/` Import | Replace With |
|-----------|------------|-------------|
| `DownloadForOfflineButton` | `@/lib/offline/download-manager`, `@/lib/config/env` | Accept as props |
| `EntityAssetList` | `@/lib/config/env` | `useAppDeps().env` |
| `ParallaxAssetPanel` | `@/lib/config/env` | `useAppDeps().env` |
| `SignupCodeGate` | `@/lib/trpc/react` | `useAppDeps().trpc` or accept `trpc` as prop |
| `BuyGemsModal` | `@/lib/trpc/react` | `useAppDeps().trpc` |
| `BuySparksModal` | `@/lib/trpc/react` | `useAppDeps().trpc` |
| `CostPreview` | `@/lib/trpc/react` | `useAppDeps().trpc` |
| `CreditBalance` | `@/lib/trpc/react` | `useAppDeps().trpc` |
| `PromoCodeInput` | `@/lib/trpc/react` | `useAppDeps().trpc` |
| `SparksPurchaseSheet` | `@/lib/trpc/react` | `useAppDeps().trpc` |
| `DevToolbar` | `@/lib/contexts/DevToolsContext` | Accept `devTools` as optional prop |
| `ThemeEditorModal` | `@/lib/trpc/client` | `useAppDeps().trpc` |
| `ToastHost` | `@/lib/toast/store` | `useAppDeps().toast` |
| `MicButton` | `@/lib/speech/types` | Move type to `@slopcade/shared` |
| `MicButton.test.tsx` | `@/lib/speech/types` | Same as above |

**For each component:**

1. Read the file, identify `@/` imports
2. For simple type imports (like `SpeechToTextError`): move the type to `@slopcade/shared`
3. For runtime imports (like `trpc`): use either `useAppDeps()` hook or accept as prop
4. Copy to `packages/ui/src/{category}/`
5. Replace app files with re-export stubs
6. Run `lsp_diagnostics` to verify

**Step N: Commit after each batch of 3-5 components**

---

## Task 3: Move 83 Identical Lib Files Using Re-Export Wrappers

**Strategy:** Rather than moving lib files to a shared package (which would break the `@/` import chain), create a **shared lib package** that both apps can re-export from. The key insight: many of these lib files DON'T import other `@/lib/` files — they only import from npm packages or `@slopcade/shared`.

**Files:**
- Create: `packages/app-lib/package.json` (new package)
- Create: `packages/app-lib/src/` with moved files
- Modify: Both apps' `lib/` files → re-export from `@slopcade/app-lib`

**Lib file categories (by `@/` import complexity):**

| Category | Files | Has `@/` Imports | Strategy |
|----------|-------|-----------------|----------|
| `lib/camera/` | 8 files | No | Move directly |
| `lib/haptics/` | 3 files | No | Move directly |
| `lib/viewport/` | 4 files | No | Move directly |
| `lib/physics2d/` | 2 files | No | Move directly |
| `lib/scripting/` | 9 files | Some | Move safe ones, wrapper for rest |
| `lib/speech/` | 6 files | Some | Move types, wrapper for runtime |
| `lib/toast/` | 4 files | No | Move directly |
| `lib/notifications/` | 3 files | Some | Check each |
| `lib/chat/` | 5 files | 1 has it | Move 4, wrapper for ChatStreamProvider |
| `lib/assets/` | 4 files | No | Move directly |
| `lib/hooks/` | 2 files | Check | Move if safe |
| `lib/supabase/` | 4 files | Check | Move if safe |
| `lib/auth/` | 4 files | 1 has it | Move 3, wrapper for token.ts |
| `lib/party/` | 16 files | Most do | Already unified, keep in apps |
| `lib/trpc/` | 2 files | Check | Likely app-specific, keep |
| `lib/config/` | 1 file | App-specific | Keep in apps |
| Others | ~5 files | Various | Check each |

**Step 1: Create `packages/app-lib/`**

```json
{
  "name": "@slopcade/app-lib",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

**Step 2: Move zero-dependency lib directories first**

These directories have NO `@/` imports — pure move:
- `lib/camera/` → `packages/app-lib/src/camera/`
- `lib/haptics/` → `packages/app-lib/src/haptics/`
- `lib/viewport/` → `packages/app-lib/src/viewport/`
- `lib/physics2d/` → `packages/app-lib/src/physics2d/`
- `lib/toast/` → `packages/app-lib/src/toast/`
- `lib/assets/` → `packages/app-lib/src/assets/`

For each:
1. `mkdir -p packages/app-lib/src/{dir}`
2. `cp apps/amen/lib/{dir}/* packages/app-lib/src/{dir}/`
3. Verify no `@/` imports in copied files
4. Create `packages/app-lib/src/{dir}/index.ts` barrel
5. Replace each app file with: `export * from "@slopcade/app-lib/{dir}";`

**Step 3: Move partially-safe directories**

For dirs like `lib/chat/` where 4/5 files are safe:
1. Move the safe files
2. Keep the one with `@/` import in the app
3. Update the app file to import shared stuff from `@slopcade/app-lib`

**Step 4: Skip app-specific directories**

These stay in the apps:
- `lib/config/` (env.ts — different API URLs per brand)
- `lib/trpc/` (client setup — different per app)
- `lib/party/` (already unified, but uses `@/lib/config/env`)

**Step 5: Commit after each directory batch**

---

## Task 4: Consolidate Browse Components

Three browse components exist in both apps but differ significantly. Strategy: take the better version (usually Slopcade's) and make it brand-configurable.

**Files:**
- Modify+Move: `components/browse/GameDetailPanel.tsx`
- Modify+Move: `components/browse/GameCard.tsx`
- Modify+Move: `components/browse/FilterBar.tsx`
- Create: Amen-only components moved to shared

### 4A: GameDetailPanel → Shared

Slopcade version (163L) is more feature-complete. Diff is mostly colors.

1. Read both versions, identify differences (colors, icons)
2. Refactor Slopcade version to use `useBrandConfig()` for colors
3. Move to `packages/ui/src/browse/GameDetailPanel.tsx`
4. Replace both app files with re-exports
5. Verify

### 4B: GameCard → Shared

Slopcade version (234L) has pagination and status badges. Amen version (131L) is simpler.

1. Read both versions
2. Keep Slopcade's version as the base
3. Make brand-specific elements configurable via `useBrandConfig()`
4. Move to `packages/ui/src/browse/GameCard.tsx`
5. Replace both app files
6. Verify

### 4C: FilterBar → Use Slopcade's Version

Slopcade (244L) has full filtering; Amen (35L) is just a search bar. Keep Slopcade's as the shared version since it's strictly a superset.

1. Move Slopcade's FilterBar to `packages/ui/src/browse/FilterBar.tsx`
2. Replace both app files
3. Amen may not use all filter features but the component handles missing props gracefully
4. Verify

### 4D: Port Amen-Only Browse Components

- `GameMetaBadge.tsx` (25L, no `@/` imports) → move to shared
- `TutorialPager.tsx` (135L) → move to shared
- `TutorialStep.tsx` (56L) → move to shared

**Commit after each sub-task**

---

## Task 5: Port Amen-Only Party Features to Shared

Amen has 11 party components that Slopcade doesn't have. Most have zero `@/` imports and can move directly.

**Files to move to `packages/ui/src/party/`:**

| File | Lines | `@/` Imports | Action |
|------|-------|-------------|--------|
| `AvatarPicker.tsx` | 76 | None | Move directly |
| `CaptionOverlay.tsx` | 40 | None | Move directly |
| `LobbyCountdown.tsx` | 59 | None | Move directly |
| `PlayerChip.tsx` | 50 | None | Move directly |
| `ConfettiOverlay.tsx` | 130 | None | Move directly |
| `ShareScoreCard.tsx` | 113 | None | Move directly |
| `GameSettingsSheet.tsx` | 188 | 1 (`@/lib/party/types`) | Refactor import |
| `AnswerRevealSequence.tsx` | 79 | 1 (`@/lib/party/types`) | Refactor import |
| `FinalPodium.tsx` | 173 | 1 (`@/lib/party/types`) | Refactor import |
| `RoundScoreBoard.tsx` | 106 | 1 (`@/lib/party/types`) | Refactor import |
| `VoteTally.tsx` | 111 | 1 (`@/lib/party/types`) | Refactor import |

**Step 1: Move 6 zero-dependency components**

```bash
cp apps/amen/components/party/AvatarPicker.tsx packages/ui/src/party/
cp apps/amen/components/party/CaptionOverlay.tsx packages/ui/src/party/
cp apps/amen/components/party/LobbyCountdown.tsx packages/ui/src/party/
cp apps/amen/components/party/PlayerChip.tsx packages/ui/src/party/
mkdir -p packages/ui/src/party/results
cp apps/amen/components/party/results/ConfettiOverlay.tsx packages/ui/src/party/results/
cp apps/amen/components/party/results/ShareScoreCard.tsx packages/ui/src/party/results/
```

Update barrel exports. Create re-export stubs in Amen. Create NEW files in Slopcade (these didn't exist there before).

**Step 2: Move 5 components with `@/lib/party/types` import**

These all import party types which are re-exported from `@slopcade/shared/types/party`. Refactor each to import from `@slopcade/shared` instead of `@/lib/party/types`:

```typescript
// Before:
import type { GameConfig } from "@/lib/party/types";
// After:
import type { GameConfig } from "@slopcade/shared/types/party";
```

Then move to `packages/ui/src/party/` and create stubs.

**Step 3: Update Slopcade's party host page to use the new shared components**

Wire `PlayerChip`, `LobbyCountdown`, `GameSettingsSheet` into Slopcade's `app/party/host.tsx` (it currently has a simpler layout).

**Step 4: Commit**

```bash
git add packages/ui/src/party/ apps/*/components/party/
git commit -m "feat: port Amen party features to shared (avatars, results, settings, countdown)"
```

---

## Task 6: Content Generation Completion

The content generators are running in tmux sessions but may have stopped. Verify and fill remaining gaps.

**Step 1: Check current content counts**

```bash
cd api && npx wrangler d1 execute slopcade-db --local --command="
SELECT brand_id, content_type, COUNT(*) as cnt
FROM party_content WHERE deleted_at IS NULL
GROUP BY brand_id, content_type ORDER BY brand_id, cnt DESC;"
```

**Step 2: For any game type below target, run fill-to-target**

```bash
curl -s --max-time 120 'http://localhost:8789/trpc/partyContent.generateContent' \
  -X POST -H 'Authorization: Bearer dev-token' -H 'Content-Type: application/json' \
  -d '{"brandId":"slopcade","gameType":"trivia","batchSize":30}'
```

Repeat in a loop until `done: true` for each brand/gameType combo.

**Targets:**
- quip: 511
- trivia: 5000
- drawing: 200
- fibbage: 500
- headsup: 500
- ranking: 150
- dilemma: 150
- wager: 500
- history: 350

**Step 3: Verify both brands meet targets**

**Step 4: Commit any new migration or config changes**

---

## Task 7: Final Verification

**Step 1: Run TypeScript check for both apps**

```bash
cd apps/slopcade && npx tsc --noEmit
cd apps/amen && npx tsc --noEmit
```

**Step 2: Start both web servers and verify with agent-browser**

```bash
# Slopcade
agent-browser open http://localhost:8085/browse
agent-browser snapshot -i  # Should show 13 game buttons
# Click a game, verify detail panel
# Click PLAY, verify host page shows slopcade.com

# Amen (if web server available)
agent-browser open http://localhost:8086/browse
agent-browser snapshot -i  # Should show game buttons
```

**Step 3: Verify no cross-brand contamination**

```bash
# In Slopcade app
grep -rn "amen\.games\|Amen Games" apps/slopcade/ --include="*.tsx" --include="*.ts" | grep -v node_modules
# Should return ZERO results

# In Amen app
grep -rn "slopcade\.com\|Slopcade" apps/amen/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v "import.*@slopcade"
# Should return ZERO results (ignoring package imports)
```

**Step 4: Push**

```bash
git pull --rebase && git push && git status
```

---

## Execution Order & Dependencies

```
Task 1 (AppDepsProvider) ─────→ Task 2 (15 deferred components)
                                     ↓
Task 3 (83 lib files) ────────→ Task 7 (verification)
                                     ↑
Task 4 (browse components) ───→ Task 7
                                     ↑
Task 5 (Amen-only features) ──→ Task 7
                                     ↑
Task 6 (content generation) ──→ Task 7
```

Tasks 3, 4, 5, 6 are independent of each other and can run in parallel after Task 1+2.

## Parallelization Opportunities

| Wave | Tasks | Can Parallelize? |
|------|-------|-----------------|
| Wave A | Task 1 (AppDepsProvider) | Solo — everything depends on this |
| Wave B | Task 2 (15 components) | Solo — uses AppDepsProvider |
| Wave C | Tasks 3 + 4 + 5 + 6 | All four in parallel |
| Wave D | Task 7 (verification) | Solo — after everything else |
