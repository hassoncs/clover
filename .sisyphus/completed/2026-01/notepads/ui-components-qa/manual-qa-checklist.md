# UI Component Generation - Manual QA Checklist

**Status**: Ready for manual testing
**Date**: 2026-01-25

## Prerequisites

- [ ] API server running: `pnpm dev`
- [ ] Godot project open: `godot godot_project/project.godot`
- [ ] Test scene ready: `godot_project/scenes/test_ui_components.tscn`

## Test Themes

Generate checkboxes with these 3 themes:

### Theme 1: Medieval Fantasy
```bash
curl -X POST http://localhost:8787/trpc/uiComponents.generateUIComponent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gameId": "test-game",
    "componentType": "checkbox",
    "theme": "medieval fantasy with stone textures",
    "states": ["normal", "hover", "pressed", "disabled"]
  }'
```

### Theme 2: Futuristic Sci-Fi
```bash
curl -X POST http://localhost:8787/trpc/uiComponents.generateUIComponent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gameId": "test-game",
    "componentType": "checkbox",
    "theme": "futuristic sci-fi with neon glows",
    "states": ["normal", "hover", "pressed", "disabled"]
  }'
```

### Theme 3: Cartoon Style
```bash
curl -X POST http://localhost:8787/trpc/uiComponents.generateUIComponent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gameId": "test-game",
    "componentType": "checkbox",
    "theme": "cartoon style with bright colors",
    "states": ["normal", "hover", "pressed", "disabled"]
  }'
```

## Verification Steps (Per Theme)

### API Response
- [ ] Status 200
- [ ] Response contains `r2Keys` array (4 items)
- [ ] Response contains `publicUrls` array (4 items)
- [ ] Response contains `metadataUrl`
- [ ] Generation time < 60 seconds

### File Verification
- [ ] Check R2 storage: `.wrangler/state/v3/r2/slopcade-assets-dev/generated/test-game/checkbox/`
- [ ] Files exist: `normal.png`, `hover.png`, `pressed.png`, `disabled.png`, `metadata.json`
- [ ] Metadata JSON has correct structure (componentType, states, ninePatchMargins)

### Godot Visual Test
- [ ] Load test scene: `godot_project/scenes/test_ui_components.tscn`
- [ ] Update metadata URL in scene to point to generated assets
- [ ] Run scene (F6)
- [ ] All 4 checkboxes render with themed backgrounds
- [ ] Backgrounds look consistent with theme
- [ ] Checkmarks appear on checked boxes

### Interaction Test
- [ ] Hover over checkbox → background changes to hover state
- [ ] Click checkbox → toggles between checked/unchecked
- [ ] Disabled checkbox shows greyed-out appearance

### Nine-Patch Stretch Test
- [ ] Test at 24x24 pixels
- [ ] Test at 32x32 pixels (default)
- [ ] Test at 48x48 pixels
- [ ] Test at 64x64 pixels
- [ ] Verify: borders don't distort, center stretches correctly

## Screenshots Required

For each theme (3 themes × 8 screenshots = 24 total):
1. Normal state
2. Hover state
3. Pressed state
4. Disabled state
5. Checked state
6. 24px size
7. 48px size
8. 64px size (showing stretch quality)

## Performance Metrics

| Theme | Generation Time | File Sizes | Load Time |
|-------|----------------|------------|-----------|
| Medieval | ? | ? | ? |
| Sci-Fi | ? | ? | ? |
| Cartoon | ? | ? | ? |

## Issues Found

Document any issues here:
- [ ] Visual inconsistencies
- [ ] Nine-patch artifacts
- [ ] State transition problems
- [ ] Performance issues
- [ ] API errors

## Final Assessment

- [ ] POC Complete: All features work as expected
- [ ] POC Needs Fixes: Issues found (document above)

## Next Steps

After QA completion:
1. Update `.sisyphus/plans/ui-component-generation.md` - mark Task 11 complete
2. Create `poc-results.md` with findings and screenshots
3. Commit: `docs: add UI component POC QA results`
