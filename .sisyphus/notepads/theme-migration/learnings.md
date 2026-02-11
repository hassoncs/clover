
## Theme Migration
- Migrated editor components to use semantic theme tokens/classes.
- Used `theme-*` classes from `NativeWind` which map to `tokens.semantic.colors`.
- Converted `StyleSheet` styles to `NativeWind` classes in several components (`StageArea`, `FileViewer`, `Sidebar`, etc.) to better support dynamic theming and reduce boilerplate.
- Key components updated: `EditorTopBar`, `StageArea`, `FileViewer`, `Sidebar`, `HierarchyPanel`, `PropertiesPanel`, `DebugPanel`, `GenerationModal`, `AssetGalleryPanel`, `EditorToolbar`, `BottomDock`.
- Verified with `tsc`.

## Storybook & Landing Alignment
- Storybook preview config (`.storybook/preview.ts`) can import tokens directly from `@slopcade/theme/tokens`.
- `moduleResolution: "bundler"` in `tsconfig.json` is required for resolving `exports` in monorepo packages correctly.
- `nativewind/preset` is required in `tailwind.config.js` for Storybook (React Native Web) but should be avoided in shared presets if consumed by non-NativeWind apps (like Landing).
- Landing page uses standard Tailwind classes mapped to semantic tokens.
- `text-text-inverse` or `text-white` should be used on dark backgrounds (`bg-secondary`) for better contrast.
- `landing` package does not depend on `nativewind`, so shared Tailwind presets must not include `nativewind/preset`.
- Shared Package: Duplicate exports in `index.ts` (e.g. `PackageManifest` from both `types` and `effects`) cause build failures in `tsc -b`. Renaming exports (aliasing) in `index.ts` resolves these conflicts. `tsc -b --clean` is useful when build artifacts get out of sync.

## Task 8: Anti-Regression Guardrails

### Implementation
- Created `scripts/check-hardcoded-colors.sh` - shell script that scans for hardcoded hex colors
- Added `check:colors` npm script to root package.json
- Script uses grep with regex pattern `#[0-9a-fA-F]{3,8}\b` to detect hex colors

### Scoped Paths (where hardcoded colors are NOT allowed)
- `app/components/`
- `app/app/`
- `apps/storybook/`
- `landing/src/`

### Allowed Exceptions (excluded from checks)
- `packages/theme/` - token definitions may contain hex values
- `*.test.*` and `*.spec.*` files - test fixtures may use hardcoded colors
- `node_modules/` - third-party code
- `lib/game-engine/` and `lib/godot/` - game engine internals
- Game definition files (`*.game.json`, `game-definitions/`)

### Verification
- Script successfully detects existing violations (many found in legacy code)
- Script correctly catches new hex color additions
- Exit code 1 when violations found, 0 when clean
- Can be run via `pnpm check:colors`

### Future Integration
- Script is ready for CI integration when `.github/workflows` is set up
- Currently serves as a local development guardrail
- Informational only - does not block existing code

