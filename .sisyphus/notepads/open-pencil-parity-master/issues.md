# Issues — open-pencil-parity-master

## [2026-03-04T08:23:28Z] Session Start: Known TypeScript Errors

### design-canvas TypeScript Errors
1. `src/camera/useDesignCamera.ts(1,15)`: `DesignFrame` missing from `@slopcade/shared`
2. `src/pen/fig/fig-codec.ts(45,20)` and `(100,19)`: `CompiledFigSchema` cast issue
3. `src/pen/fig/fig-codec.ts(129,2)`: `SharedArrayBuffer` not assignable to `ArrayBuffer`
4. `src/pen/fig/fig-export.ts(246,36)`: padding tuple type mismatch
5. `src/pen/runtime/__tests__/orphan.test.ts(1,10)`: `beforeEach` not exported from vitest
6. `src/pen/runtime/__tests__/roundtrip.test.ts(10,10)`: `beforeEach` not exported from vitest
7. `src/pen/runtime/__tests__/yoga-layout.test.ts(1,10)`: `afterEach` not exported from vitest
8. `src/pen/runtime/adapters.ts(382,33)` and `(426,33)`: `wrap` not in layout union type
9. `src/pen/runtime/adapters.ts(389,39)` and `(541,3)`: padding tuple type issues

### pencil-app TypeScript Errors
1. `lib/trpc/client.tsx(29,8)`: tRPC `createClient` collision (useContext router name)
2. Inherits design-canvas errors

### game-inspector-mcp TypeScript Errors
1. `src/tools/pencil-v2-components.ts(176,38)`: `error` variable not found (should be `Error`)
