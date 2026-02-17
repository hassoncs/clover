
## Learnings
- **Panel Registration**: Adding a new panel requires updates in 4 places:
  1. Create the component in `app/components/editor/panels/`
  2. Register lazy import and definition in `app/components/editor/panels/registry.ts`
  3. Add to default layout in `app/components/editor/panels/defaultLayout.ts`
  4. Add icon to `app/components/editor/ActivityBar.tsx` (either `ACTIVITY_ITEMS` or `BOTTOM_ITEMS`)
- **Styling**: Used `useTheme()` hook for consistent editor styling.
- **Accessibility**: Added `accessibilityLabel` and `accessibilityRole` to interactive elements.
