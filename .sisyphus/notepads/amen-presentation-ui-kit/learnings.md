
## Amen Brand Foundation (2026-02-16)
- **CSS Variables**: Shifted Amen brand from Navy-primary to Gold-primary (#C9A84C) in light mode. Dark mode retains Gold-primary.
- **Grainient Palettes**: Added `amen` (Gold/Cream) and `amenWarm` (Amber/Yellow) palettes to the grainient system.
- **Tailwind Integration**: Exposed new palettes via `grainient-amen-*` and `grainient-amenWarm-*` CSS variables.
- **Utility Colors**: Added `amen.glow`, `amen.warmWhite`, `amen.softYellow`, and `amen.golden` to Tailwind theme extensions.
- **Storybook**: Created `AmenLightDecorator` and `AmenDarkDecorator` for consistent component testing in the Amen context.

## Amen Icon System
- Implemented `AmenIcon` component wrapping `MaterialCommunityIcons` from `@expo/vector-icons`.
- Created a registry mapping semantic names (e.g., `cross`, `dove`) to specific icon glyphs.
- Used `@expo/vector-icons` which was already available in `packages/ui`.
- Added basic glow effect prop (visual only, no animation yet).

## Typography Implementation
- Downloaded Lora fonts (Regular, Medium, SemiBold, Bold, Italic) to `app/assets/fonts/`.
- Configured global font loading in `app/app/_layout.tsx` using `expo-font`'s `useFonts` hook.
- Created `app/lib/brand/typography.ts` with `getBrandFont` and `useBrandFont` helpers to resolve fonts based on the active brand manifest.
- Verified that `activeBrand.theme.fontFamily` is used to determine the font family.
