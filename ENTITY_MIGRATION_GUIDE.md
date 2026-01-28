# Entity Component Migration Guide

## Conversion Pattern

### OLD FORMAT:
```typescript
{
  sprite: {
    type: "rect",
    width: 1,
    height: 1,
    color: "#FF0000"
  },
  physics: {
    bodyType: "dynamic",
    shape: "box",
    width: 1,
    height: 1,
    density: 1,
    friction: 0.5,
    restitution: 0.2
  }
}
```

### NEW FORMAT:
```typescript
{
  visual: {
    type: "rect",
    width: 1,
    height: 1,
    color: "#FF0000"
  },
  physics: {
    bodyType: "dynamic",
    density: 1
  },
  collider: {
    shape: "box",
    width: 1,
    height: 1,
    friction: 0.5,
    restitution: 0.2
  }
}
```

## Rules:

1. **sprite** → **visual** (simple rename)

2. **physics with shape** → **physics** (body only) + **collider** (shape/material)
   - physics keeps: bodyType, density, mass, gravityScale, linearDamping, angularDamping, fixedRotation, ccd
   - collider gets: shape, width, height, radius, vertices, friction, restitution, isSensor

3. **Zone templates with sprite** → change to visual
   - Zones with `type: "zone"` still work, just rename sprite to visual

## Property Mapping:

| Old Property | New Location |
|--------------|--------------|
| sprite | visual |
| physics.bodyType | physics.bodyType |
| physics.density | physics.density |
| physics.mass | physics.mass |
| physics.gravityScale | physics.gravityScale |
| physics.linearDamping | physics.linearDamping |
| physics.angularDamping | physics.angularDamping |
| physics.fixedRotation | physics.fixedRotation |
| physics.bullet | physics.ccd |
| physics.shape | collider.shape |
| physics.width | collider.width |
| physics.height | collider.height |
| physics.radius | collider.radius |
| physics.vertices | collider.vertices |
| physics.friction | collider.friction |
| physics.restitution | collider.restitution |
| physics.isSensor | collider.isSensor |

## Files to Convert:

### Test Games (app/lib/test-games/games/):
1. ballSort/game.ts
2. blockDrop/game.ts
3. breakoutBouncer/game.ts
4. bubbleShooter/game.ts
5. catsFallingObjects/game.ts
6. catsPlatformer/game.ts
7. connect4/game.ts
8. dominoChain/game.ts
9. dropPop/game.ts
10. dungeonCrawler/game.ts
11. endlessScrollPlayground/game.ts
12. flappyBird/game.ts
13. game2048/game.ts
14. gemCrush/game.ts
15. iceSlide/game.ts
16. memoryMatch/game.ts
17. physicsStacker/game.ts
18. pinballLite/game.ts
19. puyoPuyo/game.ts
20. renderTest/game.ts
21. rpgProgressionDemo/game.ts
22. simplePlatformer/game.ts
23. slopeggle/game.ts
24. slotMachine/game.ts
25. sportsProjectile/game.ts
26. stackMatch/game.ts
27. tetris/game.ts
28. tipScale/game.ts
29. towerDefense/game.ts

### Examples (app/examples/):
30. draggable_cubes.tsx
31. dynamic_images.tsx
32. dynamic_shader.tsx
33. font_test.tsx
34. shader_test.tsx
35. spinning_wheel.tsx
36. vfx_showcase.tsx

### Core Engine:
37. app/lib/game-engine/rules/actions/SetEntitySizeActionExecutor.ts
38. app/lib/game-engine/rules/utils.ts
39. app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts
40. app/lib/game-engine/systems/Match3GameSystem.ts

### Editor:
41-50. components/editor/* (multiple files)

## Verification Steps:

After converting a file:
1. Check that all `sprite:` are now `visual:`
2. Check that physics objects have both `physics` and `collider`
3. Ensure no `physics.shape` remains (should be in collider)
4. Run `npx tsc --noEmit` to verify no type errors
5. Check that the game still loads and runs
