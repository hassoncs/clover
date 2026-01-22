# Legacy Control System Purge - Remaining Tasks

The following tasks are required to complete the migration from legacy `controlType` behaviors to the new Rules-based system.

## 1. Refactor Test Games
The following test games in `app/lib/test-games/games/` still contain legacy `controlType` behaviors in their templates or entities and need to be updated.

For each file:
1.  **Remove** the `control` behavior from the relevant template or entity.
2.  **Add** a corresponding Rule to the `rules` array.

### Pending Files:

*   **`bumperArena.ts`**
    *   Target: `playerBot` template.
    *   Action: Remove `tilt_to_move`. Add Rule: `trigger: tilt`, `action: apply_force` (direction: `tilt_direction`).

*   **`dominoChain.ts`**
    *   Target: `pusher` entity (or template).
    *   Action: Remove `drag_to_aim`. Add Rule: `trigger: drag (end)`, `action: apply_impulse` (direction: `drag_direction`).

*   **`fallingObjects.ts`**
    *   Target: `catcher` (or player) template.
    *   Action: Remove `drag_to_move`. Add Rule: `trigger: drag (move)`, `action: move` (direction: `toward_touch_x`).

*   **`pendulumSwing.ts`**
    *   Target: `player` (or anchor/bob) template.
    *   Action: Remove `tap_to_jump`. Add Rule: `trigger: tap`, `action: apply_impulse` (y: negative).

*   **`pinballLite.ts`**
    *   Target: `flipper` template.
    *   Action: Remove `tap_to_flip`. Add Rule: `trigger: tap`, `action: apply_impulse` (target: `flipper`, y: negative).

*   **`simplePlatformer.ts`**
    *   Target: `player` template.
    *   Action: Remove `tap_to_jump` and `tilt_to_move`. Add Rules: `trigger: tap` -> `apply_impulse` (jump), `trigger: tilt` -> `move`.

*   **`slingshotDestruction.ts`**
    *   Target: `projectile` (or launcher) template.
    *   Action: Remove `drag_to_aim`. Add Rule: `trigger: drag (end)`, `action: apply_impulse`.

## 2. Verification
After refactoring the games, run the following commands to ensure all legacy types are gone and the codebase is type-safe:

```bash
pnpm --filter slopcade exec tsc --noEmit
pnpm --filter @slopcade/api exec tsc --noEmit
```

## 3. Cleanup (Optional)
*   Double check `shared/src/gallery/items/behaviors.ts` if it exists and remove any `control` behavior definitions there.
*   Review documentation in `docs/game-maker/` to ensure no references to `controlType` remain (except in migration guides).
