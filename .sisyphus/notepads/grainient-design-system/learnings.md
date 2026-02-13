
## Task 1.2: GrainOverlay Primitive

### Implementation Details
Created `GrainOverlay` component with platform-specific implementations:
- **Web**: Uses SVG `<filter>` with `feTurbulence` and `feColorMatrix`. Applied via CSS `filter` and `mix-blend-mode`.
- **Native**: Stub implementation returning `null` (waiting for Skia in Task 1.4).
- **Shared**: `types.ts` defining `GrainOverlayProps` with defaults from `grainient` tokens.

### Key Decisions
- Used `react-native-web`'s `View` for container to maintain consistency but used `svg` primitive for the filter.
- Used `useId` for unique filter IDs to prevent collisions.
- Added `aria-hidden="true"` to SVG for accessibility (purely decorative).
- Used `mixBlendMode` style prop (casted to `any` as it's not in standard RN types but works on web).

### Files Created
- `packages/ui/src/Grainient/types.ts`
- `packages/ui/src/Grainient/GrainOverlay.web.tsx`
- `packages/ui/src/Grainient/GrainOverlay.native.tsx`
- `packages/ui/src/Grainient/index.ts` (and platform variants)
- `packages/ui/src/Grainient/GrainOverlay.stories.tsx`

## Task 1.3: GradientFill Primitive

### Implementation Details
Created `GradientFill` component for Grainient backgrounds:
- **Web**: Uses CSS `radial-gradient` with multiple color stops to create a soft, blob-like effect.
- **Native**: Stub implementation returning `null` (waiting for Skia).
- **Shared**: `types.ts` updated with `GradientFillProps` accepting `readonly string[]` for token compatibility.

### Key Decisions
- Used 4-point radial gradient positioning (corners/edges) to create a rich, multidimensional look.
- Applied `transparent 70%` stops for soft blending between blobs.
- Used `@ts-expect-error` for `backgroundImage` style prop on web implementation as it's not in RN types.

### Files Created/Modified
- `packages/ui/src/Grainient/GradientFill.web.tsx`
- `packages/ui/src/Grainient/GradientFill.native.tsx`
- `packages/ui/src/Grainient/GradientFill.stories.tsx`
- `packages/ui/src/Grainient/index.ts` (and platform variants)
- `packages/ui/src/Grainient/types.ts`

## Task 2.1: GrainientButton Types and Variants

### Implementation Details
Defined types and CVA variants for `GrainientButton`:
- **Variants**: `grainient` (default), `glass`, `solid`, `outline`, `ghost`.
- **Sizes**: `sm`, `md`, `lg`.
- **Structure**: Separated types (`types.ts`) and variant definitions (`variants.ts`) for cleaner imports.
- **Styling**: Used `class-variance-authority` (CVA) with Tailwind/NativeWind classes.
- **Props**: Extended `Pressable` props via `ComponentPropsWithoutRef`.

### Key Decisions
- Kept `types.ts` explicit about `ButtonVariant` union types to match plan requirements exactly.
- Used `cva` for both container (`buttonVariants`) and text (`buttonTextVariants`) to ensure consistent typography scaling.
- Default variant is `grainient` with `md` size.

### Files Created
- `packages/ui/src/Grainient/Button/types.ts`
- `packages/ui/src/Grainient/Button/variants.ts`

## Task 2.2: GrainientButton Component

### Implementation Details
Implemented `GrainientButton` component with advanced interactions and styling:
- **Core**: Wrapped `Pressable` with `Animated` from `react-native-reanimated`.
- **Styling**: Composed `GradientFill` (for `grainient` variant) and `GrainOverlay` (for texture) using absolute positioning behind content.
- **Animation**: Added press scale (0.97) and opacity (0.9) using `useSharedValue` and `withTiming`.
- **Grain Logic**: 
  - `grainient`, `glass`: Always visible.
  - `solid`: Very subtle (0.05 opacity).
  - `outline`: Only visible on press (animated opacity).
- **Props**: Added support for `iconLeft`, `iconRight`, `loading` (spinner), and `palette` selection.

### Key Decisions
- **Animation**: Used `Animated.createAnimatedComponent(Pressable)` for performant native driver animations.
- **Layering**: Stacked views: Container -> GradientFill -> GrainOverlay -> Content (z-10).
- **Color Logic**: Implemented `getSpinnerColor` helper to ensure contrast based on variant (white for dark backgrounds, zinc for light/outline).
- **Safe Imports**: Used `../../lib/cn` for class merging utility.
- **Storybook**: Created comprehensive stories showing all variants, sizes, and palettes in a grid layout.

### Files Created/Modified
- `packages/ui/src/Grainient/Button/GrainientButton.tsx`
- `packages/ui/src/Grainient/Button/index.ts`
- `packages/ui/src/Grainient/Button/types.ts` (updated with new props)
- `packages/ui/src/Grainient/Button/GrainientButton.stories.tsx`

## Export Pattern for Grainient Components

**Date**: 2026-02-13

### Pattern
When exporting grainient components from `packages/ui/src/index.ts`, use **named exports** to avoid conflicts with existing Button exports:

```typescript
export {
  GradientFill,
  GrainientButton,
  GrainOverlay,
  Surface,
  WithCanvasKit,
} from "./Grainient";
```

**Why**: Both `Button.tsx` and `Grainient/Button` export `ButtonProps` and `buttonVariants`. Using `export *` causes TypeScript error TS2308 (duplicate exports).

### Package.json Exports
Added granular export paths for direct imports:
- `./Grainient` → main grainient index
- `./GrainientButton` → direct button import
- `./Surface` → direct surface import
- `./GrainOverlay` → overlay component
- `./GradientFill` → gradient fill component

This allows both:
```typescript
import { GrainientButton } from '@slopcade/ui';
import { GrainientButton } from '@slopcade/ui/GrainientButton';
```

### Pre-existing Issue
`WithCanvasKit.tsx` has a missing dependency error for `@shopify/react-native-skia/lib/module/web`. This is not caused by the export changes and should be addressed separately.
