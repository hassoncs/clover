# Platform-Specific Modules Migration Plan

## Context
We fixed a runtime bug where `useKinematicDrag` wasn't exported from `index.web.ts` but was from `index.native.ts`. TypeScript didn't catch this at compile time because each file was valid on its own.

## Solution Implemented (for physics2d)
1. Created `index.shared.ts` - single source of truth for platform-agnostic exports
2. Created `index.verify.ts` - compile-time verification using TypeScript
3. Updated `index.web.ts` and `index.native.ts` to re-export from shared

### Key Files Created
- `app/lib/physics2d/index.shared.ts` - shared exports
- `app/lib/physics2d/index.verify.ts` - type verification
- `docs/shared/reference/platform-specific-modules.md` - full documentation

### Verification Pattern (index.verify.ts)
```typescript
import type * as Native from './index.native';
import type * as Web from './index.web';

type NativeKeys = keyof typeof Native;
type WebKeys = keyof typeof Web;

type MissingInWeb = Exclude<NativeKeys, WebKeys>;
type MissingInNative = Exclude<WebKeys, NativeKeys>;

type AssertNever<T extends never> = T;

type _CheckWebComplete = AssertNever<MissingInWeb>;
type _CheckNativeComplete = AssertNever<MissingInNative>;

export {};
```

## USER'S NEXT REQUEST
Apply this same solution to ALL platform-specific files in the repository AND add a lint check to enforce it going forward.

## Locations Needing Migration
From the docs file, these need the pattern applied:

### app/lib/physics2d/ ✅ DONE
- index.ts, index.web.ts, index.native.ts

### app/lib/physics/ (LEGACY)
- index.ts, index.web.ts, index.native.ts
- Physics.ts, Physics.web.ts, Physics.native.ts

### app/lib/auth/
- storage.ts, storage.web.ts, storage.native.ts

### app/lib/supabase/
- auth.ts, auth.web.ts, auth.native.ts

### app/lib/trpc/
- installId.ts, installId.web.ts, installId.native.ts

### app/lib/game-engine/
- GameRuntime.tsx, GameRuntime.native.tsx (Note: missing .web.tsx?)

### packages/physics/src/physics2d/
- index.ts, index.web.ts, index.native.ts
- createPhysics2D.ts, createPhysics2D.web.ts, createPhysics2D.native.ts
- usePhysicsLoop.ts, usePhysicsLoop.web.ts, usePhysicsLoop.native.ts
- usePhysicsWorld.ts, usePhysicsWorld.web.ts, usePhysicsWorld.native.ts

### packages/ui/src/SortableList/
- index.ts, index.web.ts, index.native.ts
- SortableList.tsx, SortableList.web.tsx, SortableList.native.tsx

## Lint Rule Approach
Create an ESLint rule or script that:
1. Finds all files matching `*.web.ts` or `*.native.ts`
2. For each, checks that a corresponding `*.verify.ts` exists
3. Alternatively: runs tsc on all verify files as part of CI

## Implementation Strategy
1. Create a script to auto-generate verify files
2. Apply shared pattern to each location
3. Add CI check to run verification
