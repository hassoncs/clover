# Ball Sort Game Freeze Debugging

## Problem
The ball sort game freezes when clicking the "Play" button. Other games work fine.

## Symptoms
- Game loads correctly (game definition fetched from API)
- Assets load (balls, background visible)
- Clicking "Play" causes complete freeze - no further logs
- Last log before freeze: `[GameLoop Effect] shouldRun=false - stopping`

## Architecture Change (2026-02-03)

**DELETED `api/dev-test-games.json`** - No more bundling step!

Games are now loaded directly from TypeScript source files via dynamic imports:
- `api/src/dev/templateLoader.ts` - Uses `import()` to load games from `app/lib/test-games/games/`
- Changes to game.ts files take effect immediately (no restart needed)
- To add a new game, add an entry to `GAME_REGISTRY` in templateLoader.ts

---

## Test Results

### Test 1: Minimal Ball Sort (no advanced features)
- **MINIMAL_DEBUG = true** in `app/lib/test-games/games/ballSort/game.ts`
- Removed: persistence, hoverHighlight, stateMachines, conditionalBehaviors, all rules, containers, complex variables
- Kept: basic entities (tubes, balls), simple templates, background, only `currentLevel` variable
- Result: ✅ **WORKS** - No freeze on Play

### Test 2: All features EXCEPT persistence
- **MINIMAL_DEBUG = false**, **SKIP_PERSISTENCE = true**
- Added back: hoverHighlight, stateMachines, containers, conditionalBehaviors, rules, all variables
- Still removed: persistence only
- Result: ✅ **WORKS** - No freeze on Play

---

## Confirmed NOT the Cause

| Feature | Status | Notes |
|---------|--------|-------|
| `hoverHighlight` | ✅ NOT the cause | Works when enabled |
| `stateMachines` | ✅ NOT the cause | Works when enabled |
| `containers` | ✅ NOT the cause | Works when enabled |
| `conditionalBehaviors` | ✅ NOT the cause | Works when enabled |
| `rules` | ✅ NOT the cause | Works when enabled |
| `variables` (all 18) | ✅ NOT the cause | Works when enabled |
| `ui` config | ✅ NOT the cause | Works when enabled |

## Root Cause Found

| Feature | Status | Notes |
|---------|--------|-------|
| `persistence.schema` | ✅ **FIXED** | Zod schema was serialized as plain object via JSON, causing `safeParse()` to fail |

### The Fix
In `GameProgressManager.ts`, added check for valid Zod schema before calling `safeParse()`:
```typescript
if (!this.config.schema || typeof this.config.schema.safeParse !== 'function') {
  // Skip validation, use data directly
}
```

## Level Progression Issue (Separate)

After fixing the freeze, level progression wasn't working:
- Beating level 1 → shows "Level unknown" → goes back to level 1

### Cause
- Game definition is fetched once with level 1's puzzle baked in
- "Next Level" saved progress but reloaded same definition

### Fix
- API now accepts `level` parameter: `getPublic({ id, level })`
- `templateLoader` calls `createBallSortGame(level)` for level-specific puzzles
- Test games page tracks `currentLevel` state and re-fetches on level change

---

## Files Modified

- `api/src/dev/templateLoader.ts` - Now dynamically imports from TypeScript source
- `app/lib/test-games/games/ballSort/game.ts` - TypeScript source (THE source of truth)

## Notes

- Games load directly from TypeScript source via API dynamic imports
- Changes take effect on next API request (may need page refresh)
- The tube.png 404 was fixed (using ball0.png temporarily in game.ts)
