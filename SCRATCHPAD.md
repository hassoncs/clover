# Package Architecture Work — Scratchpad

## Phase 0: Baseline
- [x] Editor panel files checked — no uncommitted scope-creep changes
- [x] Existing uncommitted changes: vitest config experiments, mocks, pnpm-lock.yaml
- [x] Typecheck results: (to run)
- [x] Passing tests confirmed:
  - shared/: 1,238 tests ✅
  - economy-engine/: 84 tests ✅
  - content-pipeline/: 61 tests ✅
- [x] Failing test errors recorded:
  - apps/slopcade: 6 files fail, 2 pass (27 tests pass, 2 fail)
  - Root causes: `SyntaxError: Unexpected token 'typeof'` (Flow syntax from react-native leaking through inlined @slopcade/* packages)
  - MicButton tests fail functionally (component renders without mic-button testid)

## Phase 1: Package Categorization
| Package | Category | Native Deps | Notes |
|---------|----------|-------------|-------|
| shared (root) | PURE | None | Already has Vite build step |
| brands | PURE | None | Already has tsc build step |
| codemirror-lang-glsl | PURE | None | CodeMirror plugin |
| content-pipeline | PURE | None | Already has tsc build step |
| economy-engine | PURE | None | Zod only |
| game-bundler | PURE | None | Node fs/path only |
| game-inspector-mcp | PURE | None | Already has tsc build step |
| theme | PURE | None | Design tokens |
| app-lib | NATIVE | react-native, expo-haptics, react-native-vision-camera, expo-file-system | Heavy native |
| editor-ai | NATIVE | react-native, @expo/vector-icons, @gorhom/bottom-sheet | Chat UI |
| editor | NATIVE | react-native, react-native-webview, @expo/vector-icons, react-native-reanimated, react-native-safe-area-context, expo-router, expo-audio | Heaviest native package |
| game-runtime | NATIVE | react-native, expo-font, expo-sensors | Runtime with pure logic core |
| godot-bridge | NATIVE | react-native, expo-file-system | Bridge layer |
| party | NATIVE | react-native, @expo/vector-icons, expo-haptics, @shopify/react-native-skia, react-native-reanimated | Party UI |
| shared-ui | NATIVE | react-native | Minimal native (PlatformBadge only) |
| social | NATIVE | react-native, @expo/vector-icons, @gorhom/bottom-sheet, expo-router | Social feed |
| ui | NATIVE | react-native, react-native-svg, @expo/vector-icons, react-native-safe-area-context, expo-router, react-native-reanimated, react-native-gesture-handler | Heavy UI components |
| react-native-reanimated-mock | SPECIAL | N/A | Workspace mock package pretending to be react-native-reanimated |

## Phase 2: Build Steps
| Package | tsup added | Builds clean | dist/ looks right | Notes |
|---------|-----------|-------------|-------------------|-------|

## Phase 3: Per-Package Testing
| Package | vitest.config added | Tests pass | Notes |
|---------|-------------------|-----------|-------|

## Phase 4: App Tests
| Test File | Status | Fix Applied | Notes |
|-----------|--------|-------------|-------|

## Phase 5: Barrel Exports
| Package | index.pure.ts created | Verified no native leak | Notes |
|---------|----------------------|----------------------|-------|

## Learnings / Gotchas
- `shared` is at repo root, not in `packages/`
- Root uses turbo for build/test orchestration
- `react-native-reanimated-mock` package uses name `react-native-reanimated` with version `0.0.0-mock` — pnpm overrides may interact with this
- slopcade vitest config has a complex `rnTestPlugin` that does string replacement of import paths AND resolveId for react-native → react-native-web
- Current vitest config inlines `/@slopcade\/.*/` which is the root cause of the "typeof" Flow syntax errors
