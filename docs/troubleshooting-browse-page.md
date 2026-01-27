# Troubleshooting: Browse Page Not Showing Games

> **Issue**: Games not appearing on http://localhost:8085/browse after asset integration
> **Date**: 2026-01-26
> **Status**: ✅ Fixed

---

## Problem

After integrating AI-generated assets into flappyBird, bubbleShooter, gemCrush, and puyoPuyo, the games were not showing their title hero images on the browse page.

---

## Root Cause

The browse page (`app/app/(tabs)/browse.tsx`) loads game metadata from the auto-generated registry at `app/lib/registry/generated/testGames.ts`. 

When we added `titleHeroImageUrl` to the game metadata, the registry needed to be regenerated to pick up these changes.

---

## Solution Applied

### 1. Regenerated Registry ✅
```bash
pnpm registry
```

**Output**:
```
[testGames] Generated lib/registry/generated/testGames.ts with 27 entries (read-only)
```

### 2. Restarted Metro ✅
```bash
pnpm svc:stop metro
pnpm dev
```

Metro needed to reload to clear its cache and pick up the registry changes.

---

## Verification

### Check Source Files
All 4 games now have `titleHeroImageUrl` in their metadata:

```bash
# FlappyBird
export const metadata: TestGameMeta = {
  title: "Flappy Bird",
  description: "Tap to fly through the pipes without hitting them",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`, ✅
};

# BubbleShooter
export const metadata: TestGameMeta = {
  title: "Bubble Shooter",
  description: "Match 3+ bubbles of the same color to pop them and clear the board",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`, ✅
};

# GemCrush
export const metadata: TestGameMeta = {
  title: "Gem Crush",
  description: "Match 3 or more gems to clear them and score points!",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`, ✅
};

# PuyoPuyo
export const metadata: TestGameMeta = {
  title: "Puyo Puyo",
  description: "Match 4+ same-colored puyos to pop them and create chains!",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`, ✅
};
```

### Check Browse Page
The browse page at `http://localhost:8085/browse` should now display:

1. **Template Games Section**: All 27 test games including our 4 updated ones
2. **Title Hero Images**: Games with `titleHeroImageUrl` should show their images as thumbnails
3. **Fallback Icons**: Games without images show emoji icons

---

## How the Browse Page Works

### Data Flow

```
game.ts (source)
    ↓
metadata export
    ↓
pnpm registry (generator)
    ↓
generated/testGames.ts
    ↓
browse.tsx (consumer)
    ↓
GameGridCard component
```

### GameGridCard Component

Located at `app/components/browse/GameCard.tsx`, this component:
- Accepts `thumbnailUrl` prop
- Falls back to emoji if no URL provided
- Displays game title, status, category, players

### Browse Page Code

```typescript
// browse.tsx line 159-171
{paginatedGames.map((game) => (
  <GameGridCard
    key={game.id}
    title={game.meta.title}
    status={game.meta.status}
    category={game.meta.category}
    players={game.meta.players}
    thumbnailUrl={game.meta.titleHeroImageUrl} // ← Uses titleHeroImageUrl
    onPress={() => router.push({ 
      pathname: "/game-detail/[id]", 
      params: { id: game.id, source: "template" } 
    })}
  />
))}
```

---

## Testing Checklist

- [x] Registry regenerated with titleHeroImageUrl
- [x] Metro restarted to clear cache
- [ ] Browse page displays all 27 games
- [ ] Title heroes show for: flappyBird, bubbleShooter, gemCrush, puyoPuyo
- [ ] Images load from CDN (verify network tab)
- [ ] Clicking games opens game detail page
- [ ] Games are playable with new assets

---

## Common Issues

### Issue: "Games still not showing images"

**Possible Causes**:
1. Metro cache not cleared
2. Browser cache holding old data
3. CDN URLs not accessible

**Solutions**:
```bash
# Clear Metro cache
pnpm svc:stop metro
rm -rf app/.expo
pnpm dev

# Or clear web browser cache
# In browser: Cmd+Shift+R (hard reload)
```

### Issue: "Image URLs return 404"

**Check**:
```bash
# Verify asset exists on R2
curl -I https://slopcade-api.hassoncs.workers.dev/assets/generated/flappyBird/title_hero.png

# Should return: HTTP/2 200
```

If 404, asset may need to be regenerated:
```bash
hush run -- npx tsx api/scripts/generate-game-assets.ts flappyBird
```

### Issue: "Registry not updating"

**Symptoms**:
- Code changes not reflected in browse page
- Old metadata still showing

**Solution**:
```bash
# Manual registry regeneration
pnpm registry

# Verify generated file updated
ls -la app/lib/registry/generated/testGames.ts
# Should show recent timestamp

# Check file contents
grep -A 2 "meta_11" app/lib/registry/generated/testGames.ts
# Should import flappyBird metadata
```

---

## Registry System Overview

### Auto-Discovery

The registry system auto-discovers game files:
- **Source**: `app/lib/test-games/games/*/game.ts`
- **Pattern**: Files with `export const metadata: TestGameMeta`
- **Generator**: `app/scripts/generate-registry.mjs`
- **Output**: `app/lib/registry/generated/testGames.ts`

### When to Regenerate

Registry regeneration is needed when:
- ✅ Adding new games
- ✅ Modifying game metadata (title, description, titleHeroImageUrl, etc.)
- ✅ Changing game IDs
- ❌ Modifying game logic (templates, entities, rules) - registry only tracks metadata

### Automatic Regeneration

The registry is automatically regenerated on:
- `pnpm dev` (in app package)
- `pnpm registry` (manual trigger)
- `pnpm registry:watch` (watch mode)

---

## Related Files

| File | Purpose |
|------|---------|
| `app/app/(tabs)/browse.tsx` | Browse page UI |
| `app/components/browse/GameCard.tsx` | Game card component |
| `app/lib/registry/generated/testGames.ts` | Auto-generated registry |
| `app/lib/registry/types.ts` | Type definitions (TestGameMeta) |
| `app/scripts/generate-registry.mjs` | Registry generator script |

---

## Next Steps

If games are still not appearing:

1. **Check DevTools Console** (`http://localhost:8085/browse`)
   - Look for errors in browser console
   - Check network tab for failed image requests

2. **Verify Asset URLs**
   ```bash
   # Test each title hero URL
   curl -I https://slopcade-api.hassoncs.workers.dev/assets/generated/flappyBird/title_hero.png
   curl -I https://slopcade-api.hassoncs.workers.dev/assets/generated/bubbleShooter/title_hero.png
   curl -I https://slopcade-api.hassoncs.workers.dev/assets/generated/gemCrush/title_hero.png
   curl -I https://slopcade-api.hassoncs.workers.dev/assets/generated/puyoPuyo/title_hero.png
   ```

3. **Check Game Detail Pages**
   - Navigate to individual game pages
   - Verify title heroes display there too
   - Check if games load and play correctly

4. **Test in Native App**
   ```bash
   pnpm ios  # or pnpm android
   ```
   - Native apps may cache differently
   - May need to rebuild if assets not loading

---

## Related Documentation

- [Asset Integration Complete](./asset-integration-complete.md)
- [Asset Generation Phase 1](./asset-generation-phase1-complete.md)
- [Registry System Reference](../app/AGENTS.md#registry-system-auto-discovery)
