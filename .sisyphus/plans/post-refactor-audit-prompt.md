# Post-Refactor Audit Prompt

Use this prompt to start a new session. Paste it verbatim.

---

## Context

We just completed a multi-session refactor of the Slopcade monorepo. The main work:
1. Categorized all packages into PURE (no native deps) vs NATIVE (react-native deps)  
2. Migrated `apps/slopcade/` tests from Vitest → Jest + jest-expo  
3. Fixed the barrel-import / nativewind babel transform interaction that broke all tests  
4. Got 5 of 9 test files passing; 4 still in-progress

**Goal of this session**: Full post-refactor audit. Validate every part of the system is clean, organized, tested, and building correctly. Identify tech debt and either fix it immediately or file it as a tracked issue.

---

## Monorepo Map

### Apps (in `apps/`)
| App | Purpose |
|-----|---------|
| `slopcade` | Main game builder + engine playground (Metro port 8085) |
| `amen` | Christian-themed party game player (port 8086) |
| `slopbox` | Secular party game player (port 8087) |
| `shader-editor` | Visual shader/effects editor (port 8088) |
| `admin` | Internal admin tooling (web) |
| `landing-slopcade` / `landing-amen` | Marketing landing pages |
| `storybook` | Component development |

### Packages (in `packages/`)
| Package | Category | Purpose | Has Tests |
|---------|----------|---------|-----------|
| `@slopcade/shared` | PURE | Core types, validators, game definitions, schemas | ✅ 1,238 tests (Vitest) |
| `@slopcade/economy-engine` | PURE | Machinations-style resource graph engine | ✅ 84 tests (Vitest) |
| `@slopcade/content-pipeline` | PURE | Game content processing pipeline | ✅ 61 tests (Vitest) |
| `@slopcade/brands` | PURE | Brand tokens/config | ❌ |
| `@slopcade/codemirror-lang-glsl` | PURE | CodeMirror GLSL language plugin | ❌ |
| `@slopcade/game-bundler` | PURE | Game bundle compilation | ❌ |
| `@slopcade/game-inspector-mcp` | PURE | MCP server for game debugging | ❌ |
| `@slopcade/theme` | PURE | Design tokens / NativeWind theme | ❌ |
| `@slopcade/ui` | NATIVE | Core UI components (MicButton, GameHall, etc.) | partial (via app tests) |
| `@slopcade/editor` | NATIVE | In-app game editor (dockview, panels, AI chat) | partial (via app tests) |
| `@slopcade/editor-ai` | NATIVE | AI chat interface for editor | ❌ |
| `@slopcade/app-lib` | NATIVE | Shared app utilities (auth, storage, camera) | ❌ |
| `@slopcade/game-runtime` | NATIVE | Game execution engine (LivePreview, WorldOps) | ✅ 4 files (Vitest?) |
| `@slopcade/godot-bridge` | NATIVE | TypeScript ↔ Godot communication | via e2e tests |
| `@slopcade/party` | NATIVE | Party game UI components | ❌ |
| `@slopcade/social` | NATIVE | Social feed components | ❌ |
| `@slopcade/shared-ui` | NATIVE | Cross-platform shared UI primitives | ❌ |
| `@slopcade/reggie` | UNKNOWN | Needs investigation | ❌ |
| `react-native-reanimated-mock` | SPECIAL | pnpm override mock for reanimated | N/A |

Also: `shared/` at repo root (separate from `packages/shared`? needs confirmation).

### Test Files in `apps/slopcade/` (the ones we've been working on)
```
components/create-game/ChatTextArea.test.tsx       ✅ PASSES (6 tests)
components/editor/__tests__/DesignCanvasHitTest.test.ts  ✅ PASSES (30 tests)
components/editor/__tests__/EditorProvider.test.ts  🔄 in-progress
components/editor/__tests__/useDesignDocument.test.ts   🔄 in-progress
components/editor/panels/WireframePanel.test.tsx    🔄 in-progress
components/ui/__tests__/MicButton.test.tsx          ✅ PASSES (6/8, 2 skipped)
components/ui/__tests__/debug-mic.test.tsx          ✅ PASSES (1 test)
lib/speech/__tests__/useSpeechToText.test.ts        🔄 in-progress (9/19 pass)
lib/utils/__tests__/featureFlags.test.ts            ✅ PASSES (4 tests)
```

---

## Known Issues Going Into This Audit

### Test Infrastructure (Critical)
1. **`transformIgnorePatterns: []`** in `apps/slopcade/jest.config.js` — transpiles ALL of node_modules on every test run. This is why tests take 30-60s each. Root cause: RN packages ship non-standard JS that needs transpiling. Fix: build the `@slopcade/*` packages to dist/ first so Jest only needs to transpile external RN packages, not our source.

2. **`--runInBand`** being used to work around OOM — eliminates parallelism. Root cause: `jest.requireActual("@slopcade/editor")` loads the entire barrel (74 exports) which explodes memory. Fix: break barrel imports in tests; mock at the boundary; or pre-build packages.

3. **4 still-failing test files**: `EditorProvider.test.ts`, `useDesignDocument.test.ts`, `WireframePanel.test.tsx`, `useSpeechToText.test.ts` — all related to either (a) barrel-import memory explosion or (b) Jest fake timer / async flushing issues.

4. **nativewind babel transform** disabled in test mode (`NODE_ENV=test`) as a workaround — verify this doesn't break app builds.

5. **Pure packages** (`shared`, `economy-engine`, `content-pipeline`) still on Vitest — this is correct and intentional. Don't change these.

### Package Organization (Potential Issues)
1. **`@slopcade/reggie`** — unknown purpose, needs investigation
2. **`shared/` at root** vs **`packages/`** — is `shared/` the same as `@slopcade/shared`? Clarify.
3. **`@slopcade/shared-ui`** vs **`@slopcade/ui`** — both are "shared UI". What's the distinction?
4. **`@slopcade/editor-ai`** vs **`@slopcade/editor`** — editor-ai is a barrel dependency of editor. Should it be a sub-package or merged?
5. **`react-native-reanimated-mock`** package with name `react-native-reanimated` — this is a pnpm override trick. Document why.
6. **Tests in `packages/game-runtime/src/`** — 4 test files. What framework? Are they passing?
7. **Tests in `scripts/__tests__/`** — 3 test files. Are these integrated into CI?
8. **Tests in `tests/e2e/bridge/`** — 4 bridge test files. Are these running?

### Build System
1. Verify all 4 Expo apps start clean: `pnpm dev`, `pnpm ios`, `pnpm web`
2. Verify TypeScript compiles cleanly: `tsc --noEmit` in each app
3. Verify API starts: `pnpm dev:api` or equivalent
4. Check if `turbo` pipeline is correctly configured for the new package structure

---

## Audit Tasks

### Phase 1: Inventory & Validation (do first)
1. **Clarify `shared/` vs `packages/`**: Are these the same? What's `@slopcade/shared` pointing to?
2. **Investigate `@slopcade/reggie`**: What is it? Who uses it?
3. **Confirm all packages build**: `pnpm -r build` or turbo build — any failures?
4. **Run full test suite**: 
   - `pnpm --filter @slopcade/shared test` → should be 1,238 ✅
   - `pnpm --filter @slopcade/economy-engine test` → 84 ✅  
   - `pnpm --filter @slopcade/content-pipeline test` → 61 ✅
   - `cd apps/slopcade && npx jest` → get current pass/fail count
   - `cd packages/game-runtime && pnpm test` → are these passing?
5. **TypeScript audit**: Run `tsc --noEmit` from each package root. Count errors. Prioritize fixing any that are ours (not upstream types).

### Phase 2: Fix Remaining 4 Failing Test Files
The 4 files still failing in `apps/slopcade/`:

**A. `useSpeechToText.test.ts`** (10 of 19 failing)
- Issue: `jest.advanceTimersByTime()` doesn't flush async microtasks (WebSocket.onopen callbacks, Promise resolutions)
- Fix: Use `await jest.runAllTimersAsync()` inside `act()`, or `jest.runAllTicks()` + `await Promise.resolve()` chain
- Constraint: Test must remain synchronous-timer-based (no real timers)

**B. `EditorProvider.test.ts`** (OOM crash)
- Issue: `@slopcade/editor` barrel import loads entire dependency chain (game-runtime → trpc client → supabase → 4GB+)
- Current state: Added `jest.mock("@/lib/trpc/client")`, `jest.mock("@/lib/supabase/client")`, `jest.mock("@/lib/auth/token")` — verify if this fixes OOM
- If still OOM: Find additional heavy transitive deps and mock them too

**C. `useDesignDocument.test.ts`** (same OOM root cause as B)
- Same fix pattern as EditorProvider

**D. `WireframePanel.test.tsx`** (same OOM + possible rendering issue)
- Same fix pattern + verify WireframePanel actually renders "WIREFRAME" text when wrapped in proper EditorProvider + EditorConfigProvider

### Phase 3: Test Performance Overhaul
The goal: get `apps/slopcade` tests from ~2 minutes to under 30 seconds.

**Option A (Recommended): Selective transformIgnorePatterns**
Instead of `transformIgnorePatterns: []` (transpile everything), use a targeted pattern that only transpiles what actually needs it. The standard jest-expo pattern:
```js
transformIgnorePatterns: [
  'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@slopcade/.*)'
]
```
This transpiles: react-native, expo, @slopcade/* packages, and other known-ESM packages.
This SKIPS: pure node_modules that already ship CJS (lodash, zod, etc.) → huge speedup.

**Option B: Pre-build @slopcade/* packages**
If packages have `dist/` builds (tsc output), Jest can import from dist instead of src. Then `@slopcade/*` packages don't need transpiling. Requires a build step before `jest`.

**Option C: jest --workers=4 (parallel)**
Remove `--runInBand` once OOM is fixed by mocking the heavy deps. Jest parallelizes test files across workers.

**Recommendation**: Do Option A first (config change, no code change), then Option C.

### Phase 4: App Validation
Test each of the 4 Expo apps:

**slopcade (port 8085)**
- `pnpm web` → opens in browser without console errors
- `pnpm ios` (or simulator) → launches without crash
- Navigate to: game list, game editor, AI chat → basic smoke test

**amen (port 8086)**  
- `pnpm web:amen` → opens without errors
- Party join flow works

**slopbox (port 8087)**
- `pnpm web:slopbox` → opens without errors

**shader-editor (port 8088)**
- `pnpm web:shader` → opens without errors

For each: check browser console, Metro console, and TypeScript errors.

### Phase 5: Package Architecture Review
Answer these questions for each package:

1. **Does it have a single clear responsibility?** If a package does two unrelated things, split it.
2. **Does it have any tests?** If it contains business logic and no tests, add them.
3. **Does it export only what's needed?** Check `index.ts` barrel — anything exported that's only used internally?
4. **Are there any circular dependencies?** Run `npx madge --circular packages/` if available.
5. **Is it documented?** Each package should have a `README.md` or equivalent skill doc.

**Specific questions to answer:**
- What is `@slopcade/reggie`?
- What is in `packages/shared-ui` and how does it differ from `packages/ui`?
- Does `packages/editor-ai` have any logic of its own, or is it just a re-export barrel?
- Should `packages/game-runtime`'s pure logic (WorldOps, SequenceManager) be split into `@slopcade/game-logic` (PURE) separate from the RN runtime (NATIVE)?

### Phase 6: Tech Debt Cleanup
For any issues found that can't be fixed in this session, file them as GitHub issues with:
- Title
- Package affected  
- Severity (P1/P2/P3)
- Estimated effort

Known tech debt going in:
- [ ] `transformIgnorePatterns: []` is slow — optimize (Phase 3 above)
- [ ] 2 skipped tests in MicButton.test.tsx (`onPressIn`/`onPressOut`) need a DOM event fix
- [ ] `apps/slopcade` vitest.config.mjs should be deleted (old config)
- [ ] Vitest devDependencies in `apps/slopcade/package.json` should be removed
- [ ] SCRATCHPAD.md at repo root should be cleaned up or deleted
- [ ] `apps/slopcade/__mocks__/native-noop.js` — is this still needed?

---

## Definition of Done for This Audit

- [ ] All 9 `apps/slopcade` tests pass (or explicitly skipped with TODO)
- [ ] `pnpm --filter @slopcade/shared test` → 1,238 ✅
- [ ] `pnpm --filter @slopcade/economy-engine test` → 84 ✅
- [ ] `pnpm --filter @slopcade/content-pipeline test` → 61 ✅
- [ ] `apps/slopcade` jest runs in < 60s total (down from ~2 min)
- [ ] All 4 Expo apps start without TypeScript errors
- [ ] `pnpm web` (slopcade) loads in browser without console errors
- [ ] Every package has a clear documented purpose (even if just a comment in package.json)
- [ ] No circular dependencies between packages
- [ ] All tech debt is either fixed or filed as a GitHub issue
- [ ] SCRATCHPAD.md cleaned up and committed

---

## Key Files for Reference

```
apps/slopcade/jest.config.js        — Jest config (transformIgnorePatterns: [] is the perf killer)
apps/slopcade/babel.config.js       — nativewind disabled in NODE_ENV=test (new workaround)
apps/slopcade/jest.setup.ts         — Global mocks
apps/slopcade/__mocks__/            — Module mocks directory
packages/editor/src/index.ts        — 74-line barrel (source of OOM on requireActual)
shared/src/                         — Core types and validators (confirm this = @slopcade/shared)
SCRATCHPAD.md                       — Work log from this refactor session
```

## Skills to Load

For this session, load these skills:
- `testing-patterns` — test infrastructure patterns for this project
- `editor-system` — if working on editor-related tests
- `game-authoring` — if investigating game-runtime package
- `storage-ops` — if investigating D1/R2 related packages
- `verification-before-completion` — before claiming anything is done

---

## How to Start

1. Run the full test suite first to establish baseline: what passes, what fails, how long it takes
2. Do Phase 1 (inventory) in parallel while tests run
3. Fix the 4 failing test files (Phase 2) — these are well-understood, just need execution  
4. Implement transformIgnorePatterns optimization (Phase 3) — should be a config-only change
5. Smoke-test the 4 apps (Phase 4)
6. Do the architecture review questions (Phase 5)
7. File any remaining issues and clean up (Phase 6)

Don't try to do everything at once. Prioritize in order: tests passing → tests fast → apps working → architecture clean.
