# Learnings — generative-ui-builder

## [2026-03-09] Session Init — Atlas Context Gathering

### File Locations (CRITICAL — plan paths were wrong)
- `PenEntityBaseShape` is in `shared/src/types/pen.ts` (NOT `packages/shared/src/types/pen.ts`)
- `MultiplayerOverlay.tsx` is at `packages/design-canvas/src/panels/MultiplayerOverlay.tsx` ✅
- `designChatOps.ts` is at `apps/pencil/lib/designChatOps.ts` ✅
- `FrameNode.tsx` is at `packages/design-canvas/src/pen/render/nodes/FrameNode.tsx` ✅
- `PenRenderer.tsx` is at `packages/design-canvas/src/pen/render/PenRenderer.tsx` ✅
- Tests: `apps/pencil/lib/designChatOps.test.ts`

### Schema Structure (pen.ts)
- `PenEntityBaseShape` is a plain const object with Zod schema fields (not exported)
- It is spread into every entity schema: `PenRectangleSchema`, `PenFrameSchema`, etc.
- `PenFrame` and `PenGroup` are interfaces (not Zod types) to handle mutual recursion
- Adding `createdAt?: number` to `PenEntityBaseShape` will propagate to ALL node types automatically

### Existing AiGeneratingBorder (reference pattern)
- Already implemented in `FrameNode.tsx` using `DashPathEffect` from `@shopify/react-native-skia`
- Uses `useState + requestAnimationFrame` loop (plan wants us to NOT use setState for 60fps)
- The border triggers on `node.aiGenerating` flag
- New `createdAt`-based approach should use Reanimated shared values instead

### Node Creation Patterns (designChatOps.ts)
- `createElementNode()` returns `PenNode | null` with inline object literals — needs `createdAt: Date.now()`
- `addFrame` op creates PenFrame inline (line ~257) — needs `createdAt: Date.now()`
- Multiple node types: text, circle/ellipse, image, effect, rectangle (default)
- All created node objects need `createdAt` added

### MultiplayerOverlay
- Uses React Native `Animated` (spring: friction=5, tension=80)
- `AnimatedCursor` component handles position animation
- Plan wants: ripple effect (`<Animated.View>` scale 1→2, opacity 1→0) on arrival

### Skia Import Pattern
```
import { DashPathEffect, Group, Paint, Rect, RoundedRect } from "@shopify/react-native-skia";
```

### Build/Test Commands
- TypeScript check: `cd shared && bun run build` (or check if tsc command exists)
- Tests: `bun test apps/pencil/lib/designChatOps.test.ts`
- Pencil dev server: port 8089

### Package Alias
- `@slopcade/shared` maps to `shared/` package (NOT `packages/shared/`)
- 2026-03-09: Added createdAt field to PenEntityBaseShape (shared/src/types/pen.ts) - optional number for backward compatibility with existing .pen files
