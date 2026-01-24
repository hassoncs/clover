# Today's MVP Plan: Playable Demo Games with Asset Customization

**Date: 2026-01-24**

## Goal

Make demo games fully playable with all input methods, forkable, and customizable with regenerated asset packs.

---

## Current State Summary

### ✅ What Already Works

| Feature | Status | Notes |
|---------|--------|-------|
| Fork game API | ✅ | `games.fork` mutation creates copy with new ID |
| VirtualButtonsOverlay | ✅ | Full component implementation |
| VirtualJoystickOverlay | ✅ | Full component implementation |
| Keyboard input | ✅ | WASD/Arrows (web only) |
| Mouse/Touch Tap & Drag | ✅ | Web + native |
| Asset generation CLI | ✅ | `api/scripts/generate-game-assets.ts` |
| Game schema | ✅ | Supports `assetPacks` and `activeAssetPackId` |
| ControlBehaviorSchema | ✅ | `buttons`, `tap_to_jump`, `drag_to_aim`, etc. |

### ❌ What's Missing

| Feature | Status | Notes |
|---------|--------|-------|
| Virtual controls in games | ❌ | Not wired into `definition.input` |
| Tap zones | ❌ | Schema exists, no implementation |
| Accelerometer/tilt | ❌ | Behaviors defined, not implemented |
| Asset packs DB table | ❌ | Only in-memory configs |
| Fork UI | ❌ | No button on game detail |
| Regenerate assets UI | ❌ | No modal for theme change |
| Asset pack selection | ❌ | Can't choose pack when playing |
| Demo games in DB | ❌ | Static examples, not database games |

---

## Work Streams

### Stream 1: Input Methods (Priority: HIGH)

**Goal:** All demo games work with all input methods on web/native

| ID | Task | Duration | Dependencies | Status |
|----|------|----------|--------------|--------|
| 1.1 | Wire VirtualButtonsOverlay into GameRuntime | 2-3h | None | ⏳ |
| 1.2 | Wire VirtualJoystickOverlay into GameRuntime | 2h | 1.1 | ⏳ |
| 1.3 | Implement TapZoneOverlay component | 2h | None | ⏳ |
| 1.4 | Add accelerometer/tilt support | 3h | None | ⏳ |
| 1.5 | Create 3 demo games with different inputs | 4h | 1.1-1.4 | ⏳ |

**Details:**

**1.1 - VirtualButtonsOverlay:**
- Check if `definition.input?.virtualButtons` exists
- Render overlay in GameRuntime
- Wire button press to `buttonsRef`

**1.2 - VirtualJoystickOverlay:**
- Check if `definition.input?.virtualJoystick` exists
- Render overlay
- Wire output to `joystickRef`

**1.3 - TapZoneOverlay:**
- New component using existing `TapZoneSchema`
- Map screen regions to button inputs

**1.4 - Accelerometer:**
- Use React Native's `DeviceMotion`
- Map device orientation to `buttonsRef` or custom tilt input

**1.5 - Demo Games:**
1. Platformer with virtual D-pad/jump
2. Slingshot game with joystick
3. Tap-zone runner

---

### Stream 2: Game Database & Fork Flow (Priority: HIGH)

**Goal:** Demo games in DB, forkable, proper ownership

| ID | Task | Duration | Dependencies | Status |
|----|------|----------|--------------|--------|
| 2.1 | Create `asset_packs` DB table | 1h | None | ⏳ |
| 2.2 | API: `assetPacks.create` | 2h | 2.1 | ⏳ |
| 2.3 | API: `assetPacks.listByUser` | 1h | 2.2 | ⏳ |
| 2.4 | API: `games.updateAssetPack` | 1h | None | ⏳ |
| 2.5 | Seed 5 demo games into DB | 2h | None | ⏳ |
| 2.6 | Add Fork button to game detail UI | 1h | None | ⏳ |

**Schema for `asset_packs`:**

```sql
CREATE TABLE asset_packs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT,
  name TEXT NOT NULL,
  definition TEXT NOT NULL,  -- JSON
  style TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
```

---

### Stream 3: Asset Regeneration Flow (Priority: HIGH)

**Goal:** Fork game → change theme → regenerate assets → play with new graphics

| ID | Task | Duration | Dependencies | Status |
|----|------|----------|--------------|--------|
| 3.1 | Create "Regenerate Assets" UI modal | 2h | None | ⏳ |
| 3.2 | API: `games.generateAssets` | 3h | Stream 2 | ⏳ |
| 3.3 | Implement asset pack creation pipeline | 4h | None | ⏳ |
| 3.4 | Wire Regenerate to create new pack | 2h | 3.2, 3.3 | ⏳ |
| 3.5 | Progress indicator for generation | 1h | 3.2 | ⏳ |

**Asset Generation Flow:**

```
User clicks "Change Theme"
    ↓
Enters "cyberpunk neon city"
    ↓
API creates background job
    ↓
Pipeline runs:
  - buildPrompt (with theme + entity context)
  - Scenario img2img for each entity
  - Background removal
  - Upload to R2
    ↓
New AssetPack saved to DB
    ↓
Game.updated with activeAssetPackId
    ↓
Game re-renders with new sprites ✓
```

---

### Stream 4: Game Pack Selection UI (Priority: MEDIUM)

**Goal:** When playing, choose which asset pack to use

| ID | Task | Duration | Dependencies | Status |
|----|------|----------|--------------|--------|
| 4.1 | Asset pack gallery UI | 2h | 2.2 | ⏳ |
| 4.2 | "Play with" dropdown on game detail | 2h | None | ⏳ |
| 4.3 | Runtime pack switching | 3h | None | ⏳ |
| 4.4 | LocalStorage for preference | 1h | 4.3 | ⏳ |

---

### Stream 5: Demo Game Quality (Priority: HIGH)

**Goal:** All seeded games bug-free with working win conditions

| ID | Task | Duration | Dependencies | Status |
|----|------|----------|--------------|--------|
| 5.1 | Audit 8 examples for bugs | 2h | None | ⏳ |
| 5.2 | Add win/lose conditions | 3h | None | ⏳ |
| 5.3 | Entity cleanup verification | 1h | None | ⏳ |
| 5.4 | Restart/pause standardization | 2h | None | ⏳ |
| 5.5 | Test on iOS/Android/Web | 2h | 5.1-5.4 | ⏳ |

---

## Parallel Work Schedule

### Recommended: Run in Parallel

| Track | Focus | Tasks |
|-------|-------|-------|
| **Track A** | Frontend + UI | 1.1, 2.6, 3.1 |
| **Track B** | Backend + Data | 2.1, 2.2, 2.4, 2.5 |
| **Track C** | Asset Pipeline | 3.2, 3.3, 3.4 |

---

## File Changes Required

| File | Change |
|------|--------|
| `api/src/migrations/` | Add `asset_packs` table migration |
| `api/src/trpc/routes/asset-packs.ts` | New file - pack CRUD |
| `api/src/trpc/routes/games.ts` | Add `updateAssetPack` mutation |
| `api/src/ai/pipeline/generate-for-game.ts` | New - API version of CLI |
| `app/lib/game-engine/GameRuntime.godot.tsx` | Wire virtual controls, joystick |
| `app/lib/game-engine/TapZoneOverlay.tsx` | New component |
| `app/components/game/AssetPackSelector.tsx` | New - pack picker UI |
| `app/components/game/ThemeEditor.tsx` | New - regenerate modal |
| `app/app/library/[id].tsx` | Add fork/regenerate buttons |

---

## Completion Criteria

**MVP is DONE when:**

- [ ] 5 demo games seeded in DB with win conditions
- [ ] All 5 games work on web with keyboard
- [ ] All 5 games work on native with virtual D-pad/jump
- [ ] Can fork a game (creates new DB entry)
- [ ] Can change theme on forked game (regenerates assets)
- [ ] Can choose which asset pack to play a game with
- [ ] No console errors on iOS/Android/Web

---

## Notes

- Asset sheet architecture from `.sisyphus/notepads/asset-variations-plan/` can inform prompt building
- Platform-specific module pattern documented in `docs/ARCHITECTURE.md`
- Input event flow documented in `docs/ARCHITECTUREURE.md`
