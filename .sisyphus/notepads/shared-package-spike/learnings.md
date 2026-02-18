## 2026-02-18 Spike: Shared Package with Metro Platform Resolution

### Pattern for platform-split workspace packages

The established codebase pattern (from `packages/ui/src/SortableList/`) uses:
- `Component.web.tsx` — web implementation
- `Component.native.tsx` — native implementation
- `Component.tsx` — TypeScript fallback (re-exports from `.native` as default)

Metro resolution order:
- **Web**: `Component.web.tsx` → `Component.tsx` (fallback)
- **Native (iOS)**: `Component.native.tsx` → `Component.ios.tsx` → `Component.tsx` (fallback)

TypeScript resolves `./Component` to `Component.tsx`, which re-exports from `Component.native.tsx`. This gives correct types at compile time.

### Workspace wiring checklist

1. Create `packages/{name}/package.json` with `"main": "./src/index.ts"` and `"react-native": "./src/index.ts"`
2. Create `packages/{name}/tsconfig.json` with `composite: true`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`
3. Add reference in root `tsconfig.json`: `{ "path": "./packages/{name}" }`
4. Add dependency in consumer: `"@slopcade/{name}": "workspace:*"`
5. Run `pnpm install` — `packages/*` glob in `pnpm-workspace.yaml` auto-discovers new packages

### Key findings

- `pnpm-workspace.yaml` already has `packages/*` glob — no modification needed for new packages
- The `react-jsx` JSX transform means `import React` is unnecessary in component files
- Web-specific files (using `<div>`) don't need DOM types in the package tsconfig — they're only loaded at runtime on web where DOM is available
- TypeScript checks the `.tsx` fallback file which re-exports from `.native.tsx` — this provides correct RN types for type checking
