
## Storybook Implementation (2026-02-16)
- **Documentation Stories**: Created `ColorPalette` and `Typography` stories as pure documentation (no component export) to visualize theme tokens.
- **Icon Gallery**: Implemented a grid view of all available icons in `AmenIcon.stories.tsx` using the registry.
- **Animation Controls**: Added interactive controls (range, color, boolean) for all animation parameters (speed, intensity, amplitude).
- **Theme Decorators**: Applied `AmenLightDecorator` and `AmenDarkDecorator` to all stories to ensure correct background and context.
- **Self-Documenting Code**: Refactored `DrawingIcon.stories.tsx` to use descriptive constant names (`CROSS_PATH`, `STAR_PATH`) instead of comments, satisfying the strict no-comment policy.
- **ARIA Compliance**: Renamed `role` prop to `label` in `Typography.stories.tsx` helper component to avoid conflict with React's reserved ARIA `role` attribute.
