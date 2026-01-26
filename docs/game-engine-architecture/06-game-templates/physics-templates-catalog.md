# Physics Game Templates Catalog

Complete reference for all 10 game templates in the Slopcade game maker. Each template defines a fixed identity (core gameplay) with customizable layers (theme, tuning, content).

---

## Quick Reference Table

| # | Template | Tier | Primary Verb | Perspective | Core Loop | AI-Ready |
|---|----------|------|--------------|-------------|-----------|----------|
| 1 | Slingshot Destruction | 2 | drag_to_aim | Side | Aim, launch, destroy targets | ⚠️ Needs tuning |
| 2 | Rope Physics | 2 | tap_to_cut | Portrait | Cut ropes, swing object to goal | ⚠️ Needs tuning |
| 3 | Endless Runner | 1 | tap_to_jump | Side | Auto-run, jump obstacles, collect | ✅ Full AI |
| 4 | Hill-Climb Vehicle | 1-2 | tilt_to_move | Side | Drive terrain, manage fuel/balance | ✅ Full AI |
| 5 | Physics Platformer | 2 | tap_to_jump | Side | Jump platforms, collect, reach goal | ⚠️ Needs tuning |
| 6 | Breakout Bouncer | 1 | drag_to_move | Portrait | Bounce ball, break bricks | ✅ Full AI |
| 7 | Pinball Lite | 2 | tap_to_flip | Portrait | Flip ball, hit bumpers, score | ⚠️ Needs tuning |
| 8 | Bumper Arena | 1 | tilt_to_move | Top-down | Bump enemies off arena | ✅ Full AI |
| 9 | Physics Stacker | 1 | tap_to_drop | Portrait | Drop blocks, stack high | ✅ Full AI |
| 10 | Ragdoll Goal Shot | 1 | drag_to_aim | Side/Portrait | Aim, launch, score in goal | ✅ Full AI |

---

## Template Details

### 1. Slingshot Destruction (Tier 2)

**Identity:** Drag-to-aim slingshot with limited shots. Destroy all targets to win.

**Required Entities:**
- Launcher (slingshot with drag_to_aim control)
- Projectile (dynamic circle, bullet physics)
- Destructible blocks (dynamic, destroy_on_collision)
- Targets/enemies (dynamic, destroy_on_collision + score)
- Ground (static)

**Key Behaviors:**
- `control` (drag_to_aim): Slingshot aiming
- `spawn_on_event`: Create projectile on release
- `destroy_on_collision`: Remove blocks/targets
- `score_on_collision`: Award points
- `timer`: Auto-destroy projectile

**Physics Config:**
- Gravity: 5-20 (default 9.8)
- Projectile force: 8-30 (default 15)
- Projectile density: 0.5-5 (default 2)
- Block density: 0.2-2 (default 0.5)

**Win/Lose:**
- Win: Destroy all targets
- Lose: Shots exhausted with targets remaining

**Customization:**
- L1: Theme pack, projectile skin, block textures
- L2: Launch power, heaviness, block strength, gravity, shots
- L3: Level layout, block types, special projectiles, modifiers

---

### 2. Rope Physics (Tier 2)

**Identity:** Tap-to-cut ropes. Swing object into target zone. Collect optional stars.

**Required Entities:**
- Delivery object (dynamic circle)
- Rope anchors (static)
- Rope segments (dynamic, connected by distance joints)
- Target zone (static sensor)
- Collectible stars (static sensor, rotate + destroy)

**Key Behaviors:**
- `control` (tap_to_cut): Cut rope on tap
- `rotate`: Spinning stars
- `destroy_on_collision`: Collect stars
- `score_on_collision`: Award points
- `gravity_zone`: Air bubbles/fans

**Physics Config:**
- Gravity: 5-20 (default 9.8)
- Rope stiffness: 2-30 (default 10)
- Rope damping: 0-2 (default 0.5)
- Rope segments: 1-10 (default 4)
- Deliverable density: 0.5-3 (default 1)

**Win/Lose:**
- Win: Reach target zone
- Lose: Object exits screen

**Customization:**
- L1: Theme (candy/monster, space, magic), deliverable skin
- L2: Fall speed, rope tightness, swing slowdown, rope length, star count
- L3: Rope placement, star placement, obstacles, moving elements, multiple ropes

---

### 3. Endless Runner (Tier 1) ✅

**Identity:** Auto-scrolling character. Tap to jump. Survive as long as possible.

**Required Entities:**
- Runner (dynamic, fixedRotation)
- Ground segments (kinematic, move left)
- Obstacles (kinematic, move left)
- Coins (kinematic, rotate + destroy + score)
- Spawner (creates obstacles/coins)

**Key Behaviors:**
- `control` (tap_to_jump): Player jump
- `move`: World scrolling
- `spawn_on_event` (timer): Create obstacles
- `destroy_on_collision`: Death, collection
- `score_on_collision`: Coin pickup
- `rotate`: Spinning coins

**Physics Config:**
- Gravity: 8-25 (default 15)
- Jump force: 6-20 (default 12)
- Scroll speed: 4-20 (default 8)
- Obstacle interval: 0.5-5 (default 2)
- Speed multiplier: 1-3 (default 1)

**Win/Lose:**
- Win: None (endless)
- Lose: Player destroyed by obstacle

**Customization:**
- L1: Character skin, theme, obstacle style, collectible type
- L2: Jump power, fall speed, game speed, obstacle frequency, speed increase
- L3: Obstacle patterns, power-ups, terrain variation, difficulty curve

---

### 4. Hill-Climb Vehicle (Tier 1-2)

**Identity:** Wheeled vehicle on hilly terrain. Balance and fuel management.

**Required Entities:**
- Vehicle chassis (dynamic)
- Wheels (dynamic, connected by revolute joints with motors)
- Terrain (static polygon)
- Fuel cans (static sensor)
- Coins (static sensor, rotate + destroy + score)

**Key Behaviors:**
- `control` (tilt_to_move): Accelerate/brake via motor speed
- `rotate`: Spinning coins
- `destroy_on_collision`: Pickup collection
- `score_on_collision`: Coin points

**Physics Config:**
- Gravity: 5-20 (default 9.8)
- Motor torque: 15-120 (default 50)
- Wheel friction: 0.4-1.0 (default 0.9)
- Chassis density: 0.3-3 (default 1)
- Wheel density: 0.2-1 (default 0.5)

**Win/Lose:**
- Win: Reach finish line (optional)
- Lose: Flip over or out of fuel

**Customization:**
- L1: Vehicle skin, terrain theme, collectible style, background
- L2: Engine power, grip, gravity, fuel use, vehicle weight
- L3: Vehicle type (2WD/4WD), terrain design, fuel placement, boost pads, hazards

**Vehicle Presets:** Jeep (balanced), Monster Truck (big), Motorcycle (fast)

---

### 5. Physics Platformer (Tier 2)

**Identity:** Jump between platforms. Collect items. Reach goal or collect all.

**Required Entities:**
- Player (dynamic, fixedRotation, linearDamping)
- Platforms (static)
- Moving platforms (kinematic, oscillate)
- Coins (static sensor, rotate + oscillate + destroy + score)
- Enemies (kinematic, move with patrol)
- Spike hazards (static sensor)
- Goal flag (static sensor)

**Key Behaviors:**
- `control` (tap_to_jump): Player jump
- `control` (tilt_to_move): Horizontal movement
- `oscillate`: Moving platforms, bobbing items
- `move` (patrol): Enemy movement
- `rotate`: Spinning collectibles
- `destroy_on_collision`: Death, collection
- `score_on_collision`: Points

**Physics Config:**
- Gravity: 6-25 (default 12)
- Jump force: 5-18 (default 10)
- Move speed: 3-12 (default 6)
- Platform friction: 0.5-1.0 (default 0.8)
- Linear damping: 0-2 (default 0.5)

**Win/Lose:**
- Win: Reach goal OR collect all coins
- Lose: Hit hazard, destroyed, exit screen, time up

**Customization:**
- L1: Character skin, platform style, collectible type, background, enemy appearance
- L2: Jump power, run speed, gravity, enemy speed, time limit
- L3: Level layout, enemy placement, coin positions, moving platforms, win type, power-ups

---

### 6. Breakout Bouncer (Tier 1) ✅

**Identity:** Ball bounces. Move paddle to keep in play. Break all bricks.

**Required Entities:**
- Ball (dynamic, restitution=1, bullet)
- Paddle (kinematic, drag_to_move)
- Bricks (static, destroy_on_collision + score)
- Tough bricks (static, multi-hit)
- Walls (static)
- Death zone (static sensor)
- Power-ups (dynamic sensor, destroy + effect)

**Key Behaviors:**
- `control` (drag_to_move): Paddle movement
- `destroy_on_collision`: Break bricks, collect power-ups
- `score_on_collision`: Award points
- `spawn_on_event`: Drop power-ups

**Physics Config:**
- Ball speed: 4-18 (default 8)
- Ball restitution: 0.95-1.05 (default 1)
- Paddle width: 1-4 (default 2)
- Paddle restitution: 0.9-1.1 (default 1)

**Win/Lose:**
- Win: Destroy all bricks
- Lose: Lives reach zero

**Customization:**
- L1: Ball appearance, paddle style, brick colors, background, sound theme
- L2: Ball speed, paddle size, lives, brick rows, power-up frequency
- L3: Brick patterns, brick types, power-up types, ball behavior, moving bricks, boss brick

**Brick Patterns:** Standard grid, pyramid, heart, wave

---

### 7. Pinball Lite (Tier 2)

**Identity:** Ball rolls under gravity. Tap flippers. Hit bumpers for points.

**Required Entities:**
- Ball (dynamic, density=2, restitution=0.6)
- Flippers (dynamic, revolute joints with motors)
- Bumpers (static, restitution=1.5, score)
- Slingshots (static, restitution=1.3, score)
- Score targets (static sensor, score once)
- Drain zone (static sensor)
- Plunger (drag_to_aim, spawn_on_event)

**Key Behaviors:**
- `control` (tap_to_flip): Flipper activation
- `control` (drag_to_aim): Ball launch
- `spawn_on_event`: Launch new ball
- `score_on_collision`: Award points

**Physics Config:**
- Gravity: 4-15 (default 8)
- Ball density: 1-4 (default 2)
- Flipper torque: 30-150 (default 100)
- Bumper restitution: 1.0-2.0 (default 1.5)
- Ball restitution: 0.4-0.8 (default 0.6)

**Win/Lose:**
- Win: Reach score target (optional)
- Lose: Lives reach zero

**Customization:**
- L1: Table theme, ball appearance, bumper colors, sound effects
- L2: Table tilt, flipper power, bumper bounciness, ball count, bumper score
- L3: Table layout, mission system, bonus features, scoring multipliers, special features

---

### 8. Bumper Arena (Tier 1) ✅

**Identity:** Top-down arena. Bump opponents off edge. Last one standing wins.

**Required Entities:**
- Player (dynamic circle, tilt_to_move)
- Enemy AI (dynamic circle, move toward_target)
- Arena platform (static circle)
- Arena edge/death zone (static sensor)
- Power-ups (static sensor, rotate + destroy)
- Obstacles (kinematic, rotate)

**Key Behaviors:**
- `control` (tilt_to_move): Player movement
- `move` (toward_target): AI chase
- `rotate`: Spinning obstacles
- `destroy_on_collision`: Collect power-ups

**Physics Config:**
- Player force: 8-30 (default 15)
- Max speed: 4-15 (default 8)
- Restitution: 0.3-1.5 (default 0.8)
- Linear damping: 0.5-4 (default 2)
- Density: 0.5-3 (default 1)

**Win/Lose:**
- Win: All enemies eliminated
- Lose: Player eliminated

**Customization:**
- L1: Player character, arena style, enemy appearance, power-up style
- L2: Push power, top speed, bounciness, enemy count, enemy speed
- L3: Arena shape, obstacles, power-up types, enemy AI, match mode, hazards

**Arena Layouts:** Classic circle, square, shrinking circle

---

### 9. Physics Stacker (Tier 1) ✅

**Identity:** Tap to drop blocks. Stack as high as possible without toppling.

**Required Entities:**
- Droppable blocks (dynamic)
- Moving block (kinematic, oscillate)
- Foundation (static)
- Fall zone (static sensor)
- Height marker (UI)

**Key Behaviors:**
- `oscillate`: Moving block before drop
- `control` (tap_to_drop): Release block
- `spawn_on_event`: Create next block
- `destroy_on_collision`: Detect fallen blocks

**Physics Config:**
- Gravity: 5-20 (default 9.8)
- Block density: 0.5-3 (default 1)
- Friction: 0.4-1 (default 0.8)
- Restitution: 0-0.3 (default 0.1)
- Oscillate frequency: 0.3-3 (default 1)

**Win/Lose:**
- Win: Reach height/block count target
- Lose: Tower collapses

**Customization:**
- L1: Block appearance, foundation style, background, theme
- L2: Block size, move speed, move distance, fall speed, grip
- L3: Block shapes, block sizes, challenges, bonus blocks, game mode

**Block Variations:** Rectangle, square, long plank, circle, triangle

---

### 10. Ragdoll Goal Shot (Tier 1) ✅

**Identity:** Drag-to-aim. Launch projectile. Score in goal.

**Required Entities:**
- Ball/projectile (dynamic)
- Launcher (drag_to_aim, spawn_on_event)
- Hoop/goal (static)
- Goal sensor (static sensor)
- Trash can (alternative goal)
- Obstacles (static)
- Moving goal (kinematic, oscillate)
- Bouncers (static, restitution=1.2)

**Key Behaviors:**
- `control` (drag_to_aim): Aiming mechanic
- `spawn_on_event`: Create ball on release
- `oscillate`: Moving goals
- `score_on_collision`: Award points
- `destroy_on_collision`: Ball cleanup

**Physics Config:**
- Gravity: 5-18 (default 10)
- Launch force: 6-25 (default 12)
- Ball restitution: 0.2-0.95 (default 0.7)
- Ball density: 0.5-3 (default 1)
- Max pull distance: 1.5-5 (default 3)

**Win/Lose:**
- Win: Reach score target
- Lose: Out of balls

**Customization:**
- L1: Ball type, goal type, theme, character
- L2: Throw power, bounciness, gravity, goal size, shots per round
- L3: Goal placement, obstacles, multi-goal, scoring modes, special balls

**Game Modes:** Basketball, paper toss, mini golf, moving target, trick shot

---

## Box2D Features by Template

| Template | Gravity | Joints | Motors | Sensors | Forces |
|----------|---------|--------|--------|---------|--------|
| Slingshot | Yes | Distance (sling) | No | Yes | Impulse |
| Rope Physics | Yes | Distance (rope) | No | Yes | No |
| Endless Runner | Yes | No | No | Yes | Velocity |
| Hill-Climb | Yes | Revolute | Yes | No | Motor |
| Platformer | Yes | Optional | Optional | Yes | Velocity |
| Breakout | No | No | No | No | Velocity |
| Pinball | Yes | Revolute | Yes | No | Impulse |
| Bumper Arena | No | No | No | Yes | Force |
| Stacker | Yes | No | No | No | No |
| Ragdoll Goal | Yes | No | No | Yes | Impulse |

---

## Physics Parameter Guardrails

### Universal Clamps

| Parameter | Min | Max | Reason |
|-----------|-----|-----|--------|
| gravity.y | 0 | 30 | Prevent floating/crushing |
| density | 0.1 | 10 | Prevent invisible/immovable |
| restitution | 0 | 1 | >1 causes instability |
| friction | 0 | 1 | Standard range |
| linearDamping | 0 | 5 | Prevent frozen objects |
| velocity | -50 | 50 | Prevent tunneling |

### Entity Count Limits

| Entity Type | Max Count | Reason |
|-------------|-----------|--------|
| Dynamic bodies | 100 | Performance |
| Static bodies | 200 | Performance |
| Joints | 50 | Complexity |
| Spawned per second | 10 | Performance |

### Rule Validation

- **Win reachability:** Simulate that win is possible
- **Timeout presence:** Games must have maximum duration
- **Spawn budget:** Prevent infinite spawning
- **No impossible goals:** Score targets must be achievable

---

## Customization Levels (All Templates)

### Level 1: Simple (Cosmetic)
*Target: Ages 6-9, instant gratification*

- Theme pack (sprites, background, sounds)
- Character/object skin
- Color scheme
- Game name

### Level 2: Medium (Tuning)
*Target: Ages 8-12, experimentation*

- Jump power, speed, bounciness
- Lives/attempts
- Difficulty (enemy count, obstacle density)
- Kid-readable sliders map to multiple physics params with clamps

### Level 3: Deep (Content + Bounded Rules)
*Target: Ages 10-14, game design*

- Level layout (obstacle/platform placement)
- Enemy patterns (patrol paths, spawn points)
- Win condition (score target, time survive, collect all)
- Power-ups (which types appear)
- Challenge modes (modifiers like wind zones)

**Guardrail:** Rules chosen from 2-3 presets per template, not freeform.

---

## AI Generation Reliability

### Tier 1: Fully AI-Generatable ✅
AI can generate complete, fun game from natural language prompt.

- **Endless Runner:** Procedural segments, survives imperfect design
- **Breakout Bouncer:** Pattern-based bricks, clear physics
- **Bumper Arena:** Simple arena, minimal content needed
- **Physics Stacker:** Straightforward drop mechanic
- **Ragdoll Goal Shot:** Single-screen, clear objective
- **Hill-Climb Vehicle:** Vehicle presets ensure stability

### Tier 2: Template + Tuning Required ⚠️
Requires careful level design or parameter tuning for optimal fun.

- **Slingshot Destruction:** Puzzle levels need validation
- **Rope Physics:** Timing-sensitive, level design critical
- **Physics Platformer:** Hand-authored levels matter
- **Pinball Lite:** Table feel requires iteration

---

## Common Patterns

### Scoring Mechanics
- **Distance-based:** Endless Runner, Hill-Climb (1 point per time unit)
- **Collision-based:** Slingshot, Breakout, Pinball (points on hit)
- **Collection-based:** Platformer, Stacker (points per item)
- **Accuracy-based:** Ragdoll Goal (points for success)

### Control Schemes
- **Drag-to-aim:** Slingshot, Breakout paddle, Ragdoll Goal, Pinball plunger
- **Tap-to-action:** Rope (cut), Runner (jump), Stacker (drop), Pinball (flip)
- **Tilt-to-move:** Hill-Climb, Bumper Arena, Platformer (optional)
- **Continuous:** Platformer (hold for movement)

### Physics Configurations
- **No gravity:** Breakout (0, 0), Bumper Arena (0, 0)
- **Standard gravity:** Most templates (9.8-15)
- **High gravity:** Stacker (fast drops), Pinball (ball rolls)
- **Low gravity:** Hill-Climb moon variant, Rope physics variant

---

## Navigation

**Individual Template Docs:**
- [01-slingshot-destruction.md](./01-slingshot-destruction.md)
- [02-rope-physics.md](./02-rope-physics.md)
- [03-endless-runner.md](./03-endless-runner.md)
- [04-hill-climb-vehicle.md](./04-hill-climb-vehicle.md)
- [05-physics-platformer.md](./05-physics-platformer.md)
- [06-breakout-bouncer.md](./06-breakout-bouncer.md)
- [07-pinball-lite.md](./07-pinball-lite.md)
- [08-bumper-arena.md](./08-bumper-arena.md)
- [09-physics-stacker.md](./09-physics-stacker.md)
- [10-ragdoll-goal.md](./10-ragdoll-goal.md)

**Related Docs:**
- [Entity System Reference](../entity-system.md)
- [Behavior Extensions](../decisions/behavior-extensions.md)
- [Template Philosophy](./INDEX.md)
