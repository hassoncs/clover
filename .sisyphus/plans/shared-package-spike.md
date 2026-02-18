# Spike: Shared Package with Metro Platform Resolution

## Goal

Prove that we can extract code into a shared workspace package (`@slopcade/shared-ui`) that:
1. Contains platform-split files (`.web.ts` / `.native.ts`)
2. Is consumed by the existing Expo app via `workspace:*`
3. Metro correctly resolves the platform-specific files
4. TypeScript is happy (types resolve, no errors)
5. The web and native builds both pick up the correct implementation

## Success Criteria

- [x] A new `packages/shared-ui/` package exists with a simple component
- [x] That component has `.web.tsx` and `.native.tsx` variants  
- [x] The existing `app/` imports from `@slopcade/shared-ui`
- [x] `pnpm web` serves the web variant
- [x] `pnpm ios` (or Metro bundler check) serves the native variant
- [x] `tsc -b` passes with no errors
- [x] The component renders differently on web vs native (proves correct resolution)

## Non-Goals

- Don't extract real engine code yet — just prove the pattern
- Don't set up Turborepo — that's a later optimization
- Don't create the second Expo app yet — just prove packages work with the current app

## Implementation

### Step 1: Create the shared package

```
packages/shared-ui/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── PlatformBadge.tsx          # Re-exports from platform files
    ├── PlatformBadge.web.tsx      # Shows "Running on Web"
    └── PlatformBadge.native.tsx   # Shows "Running on Native"
```

### Step 2: Wire up package.json

```json
{
  "name": "@slopcade/shared-ui",
  "version": "0.0.1",
  "main": "src/index.ts",
  "react-native": "src/index.ts",
  "types": "src/index.ts",
  "peerDependencies": {
    "react": "*",
    "react-native": "*"
  }
}
```

### Step 3: Wire up tsconfig

Reference from root `tsconfig.json` and set up paths in `app/tsconfig.json`.

### Step 4: Add dependency to app

```json
"@slopcade/shared-ui": "workspace:*"
```

### Step 5: Import and render in a test route

Add `<PlatformBadge />` to an existing screen and verify it renders the correct platform text.

### Step 6: Verify

- `pnpm build:types` passes
- Web shows "Running on Web"
- Native shows "Running on Native"

## What This Proves

If this works, we know the pattern for extracting the game engine, shared components, auth, etc. into workspace packages that both `apps/slopcade` and `apps/amen` can consume.
