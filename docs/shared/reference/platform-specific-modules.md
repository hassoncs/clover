# Platform-Specific Module Pattern

This document describes the type-safe pattern for modules with platform-specific implementations (`.web.ts`, `.native.ts`).

## The Problem

When a module has platform-specific implementations:
```
lib/physics2d/
├── index.ts          # Default (usually native)
├── index.web.ts      # Web-specific
└── index.native.ts   # Native-specific
```

**The danger**: If you add an export to `index.native.ts` but forget `index.web.ts`, TypeScript won't catch it. You only discover the error at runtime when the web build fails with "X is not a function".

## The Solution: Contract + Verification

### Pattern Overview

```
lib/physics2d/
├── index.contract.ts    # 1. Defines the public API interface
├── index.shared.ts      # 2. Platform-agnostic exports
├── index.web.ts         # 3. Web implementation + shared
├── index.native.ts      # 4. Native implementation + shared
├── index.ts             # 5. Default entry (re-exports native)
└── index.verify.ts      # 6. Type-level verification (compile-time only)
```

### Step 1: Define the Contract

The contract defines what the module MUST export. This is the source of truth.

```typescript
// index.contract.ts
import type { Physics2D } from './Physics2D';
import type { BodyId, Vec2 } from './types';

// Define function signatures
export type CreatePhysics2D = () => Promise<Physics2D>;
export type UsePhysicsWorld = (options: UsePhysicsWorldOptions) => PhysicsWorldState;
export type UseForceDrag = (
  physicsRef: React.RefObject<Physics2D | null>,
  options: ForceDragOptions
) => ForceDragHandlers;

// The complete module interface
export interface ModuleContract {
  createPhysics2D: CreatePhysics2D;
  usePhysicsWorld: UsePhysicsWorld;
  useForceDrag: UseForceDrag;
  useKinematicDrag: UseKinematicDrag;
  useDrag: UseDrag;
  // ... all required exports
}
```

### Step 2: Create Shared Exports

Platform-agnostic code goes in `index.shared.ts`:

```typescript
// index.shared.ts
export { useDragInteraction } from './useDragInteraction';
export { useForceDrag } from './useForceDrag';
export { useKinematicDrag } from './useKinematicDrag';
export { useDrag } from './drag/useDrag';
// ... all platform-agnostic exports

export * from './types';
```

### Step 3: Platform Implementations

Each platform file exports platform-specific code + re-exports shared:

```typescript
// index.web.ts
export { createPhysics2D } from './createPhysics2D.web';
export { usePhysicsWorld } from './usePhysicsWorld.web';
export { usePhysicsLoop, useSimplePhysicsLoop } from './usePhysicsLoop.web';

export * from './index.shared';
```

```typescript
// index.native.ts
export { createPhysics2D } from './createPhysics2D.native';
export { usePhysicsWorld } from './usePhysicsWorld.native';
export { usePhysicsLoop, useSimplePhysicsLoop } from './usePhysicsLoop.native';

export * from './index.shared';
```

### Step 4: Type-Level Verification

Create a verification file that TypeScript checks but is never imported at runtime:

```typescript
// index.verify.ts
// This file is ONLY for type-checking. Never import it.
// If this file has type errors, your platform exports are out of sync.

import type * as Native from './index.native';
import type * as Web from './index.web';

type NativeKeys = keyof typeof Native;
type WebKeys = keyof typeof Web;

// These types will be 'never' if all exports match, or the missing key names if not
type MissingInWeb = Exclude<NativeKeys, WebKeys>;
type MissingInNative = Exclude<WebKeys, NativeKeys>;

// This utility type causes a compile error if T is not 'never'
type AssertNever<T extends never> = T;

// These lines will error if any exports are missing
// Error will say: Type '"missingExportName"' does not satisfy the constraint 'never'
type _CheckWebComplete = AssertNever<MissingInWeb>;
type _CheckNativeComplete = AssertNever<MissingInNative>;

export {};
```

**Example error output when `useKinematicDrag` is missing from web:**
```
index.verify.ts(21,38): error TS2344: Type '"useKinematicDrag"' does not satisfy the constraint 'never'.
```

### Step 5: Default Entry

The default `index.ts` picks one platform as default (usually native for React Native projects):

```typescript
// index.ts
export * from './index.native';
```

## Adding New Exports

When adding a new export:

1. **Add to `index.shared.ts`** if platform-agnostic
2. **Add to BOTH platform files** if platform-specific
3. **Run `tsc --noEmit`** - verification file will catch mismatches

## Simplified Pattern (Recommended for Most Cases)

For modules where most code is platform-agnostic, use this simpler pattern:

```
lib/module/
├── index.shared.ts      # All shared exports (ADD NEW STUFF HERE)
├── index.web.ts         # Platform-specific + export * from './index.shared'
├── index.native.ts      # Platform-specific + export * from './index.shared'
├── index.ts             # export * from './index.native'
└── index.verify.ts      # Type verification
```

This way, you only need to add exports to ONE file (`index.shared.ts`) for platform-agnostic code.

---

## Locations With Verification (All Migrated)

All platform-specific modules now have `.verify.ts` files for compile-time export validation:

### app/lib/physics2d/
- `index.verify.ts`, `createPhysics2D.verify.ts`, `usePhysicsLoop.verify.ts`, `usePhysicsWorld.verify.ts`

### app/lib/physics/ (Legacy)
- `index.verify.ts`, `Physics.verify.ts`

### app/lib/auth/
- `storage.verify.ts`

### app/lib/supabase/
- `auth.verify.ts`

### app/lib/trpc/
- `installId.verify.ts`

### app/lib/game-engine/
- Uses default pattern (single `GameRuntime.tsx` with `.native.tsx` override) - no web-specific file, so verify pattern not applicable

### packages/physics/src/physics2d/
- `index.verify.ts`, `createPhysics2D.verify.ts`, `usePhysicsLoop.verify.ts`, `usePhysicsWorld.verify.ts`

### packages/ui/src/SortableList/
- `index.verify.ts`, `SortableList.verify.ts`

---

## CI Integration

Run the verification script to catch platform sync issues:

```bash
# Verify all platform exports are in sync
npx tsx scripts/verify-platform-exports.ts

# Strict mode - fail if any modules lack verify files
npx tsx scripts/verify-platform-exports.ts --strict
```

The script will:
1. Find all `.web.ts`/`.native.ts` file pairs
2. Check for corresponding `.verify.ts` files
3. Run TypeScript type checking to detect export mismatches
4. Report any missing exports with the exact export name
