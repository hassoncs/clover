# Game Migration Inventory

**Date:** 2026-01-29

## Summary

As part of the game bundle system migration, 28 test games have been archived to make room for 5 launch games with bundled assets.

## Launch Games (Migrated to Bundle Format)

These 5 games are active and have been migrated to use the bundle format:

| Game ID | Status | Bundle Location |
|---------|--------|-----------------|
| ballSort | ✅ Active | games/ballSort/.bundle/ |
| breakoutBouncer | ✅ Active | games/breakoutBouncer/.bundle/ |
| flappyBird | ✅ Active | games/flappyBird/.bundle/ |
| gemCrush | ✅ Active | games/gemCrush/.bundle/ |
| slopeggle | ✅ Active | games/slopeggle/.bundle/ |

## Archived Games (Pending Migration)

The following 28 games have been moved to the archive folder and their status updated to `"archived"`:

| Game ID | Status | Original Location |
|---------|--------|-------------------|
| angryBurns | Archived | archive/angryBurns/ |
| blockDrop | Archived | archive/blockDrop/ |
| bubbleShooter | Archived | archive/bubbleShooter/ |
| catsFallingObjects | Archived | archive/catsFallingObjects/ |
| catsPlatformer | Archived | archive/catsPlatformer/ |
| connect4 | Archived | archive/connect4/ |
| dominoChain | Archived | archive/dominoChain/ |
| dropPop | Archived | archive/dropPop/ |
| dungeonCrawler | Archived | archive/dungeonCrawler/ |
| endlessScrollPlayground | Archived | archive/endlessScrollPlayground/ |
| game2048 | Archived | archive/game2048/ |
| iceSlide | Archived | archive/iceSlide/ |
| imageNoPhysicsTest | Archived | archive/imageNoPhysicsTest/ |
| imageWithPhysicsTest | Archived | archive/imageWithPhysicsTest/ |
| memoryMatch | Archived | archive/memoryMatch/ |
| physicsStacker | Archived | archive/physicsStacker/ |
| pinballLite | Archived | archive/pinballLite/ |
| puyoPuyo | Archived | archive/puyoPuyo/ |
| renderTest | Archived | archive/renderTest/ |
| rpgProgressionDemo | Archived | archive/rpgProgressionDemo/ |
| simplePlatformer | Archived | archive/simplePlatformer/ |
| slotMachine | Archived | archive/slotMachine/ |
| sportsProjectile | Archived | archive/sportsProjectile/ |
| stackMatch | Archived | archive/stackMatch/ |
| tictactoe | Archived | archive/tictactoe/ |
| tipScale | Archived | archive/tipScale/ |
| towerDefense | Archived | archive/towerDefense/ |
| zoneTest | Archived | archive/zoneTest/ |

## Changes Made

1. **Archive Folder Created:** `app/lib/test-games/archive/`
2. **Games Moved:** All 28 non-launch games moved from `lib/test-games/games/` to `lib/test-games/archive/`
3. **Status Updated:** Each archived game's `metadata.status` updated to `"archived"` in their game.ts file
4. **Registry Generator Updated:** Modified `app/scripts/generate-registry.mjs` to skip the `archive/` directory when scanning for test games

## Verification Steps Completed

- [x] Archive folder created
- [x] 28 games moved to archive
- [x] All game.ts files updated with `status: "archived"`
- [x] Registry generator updated to exclude archive folder
- [x] `tsc --noEmit` passes
- [x] Registry generator shows only 5 launch games for testGames

## Notes

- Archived games remain in the codebase for reference but are not included in the active test games registry
- To restore an archived game, move it back from `archive/` to `games/` and update its status if needed
- The registry generator automatically excludes directories named "archive"
