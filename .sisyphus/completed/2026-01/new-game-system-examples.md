# New Game System Examples

## Context

### Original Request
User wants to create illustrative examples for new game systems that were added earlier but don't have working examples yet. Specifically mentioned: path following, grid systems, and "all sorts of stuff".

### Interview Summary
**Key Discussions**:
- **Format**: Mixed approach - simple systems get minimal demos, complex ones get fuller examples
- **Combination**: Realistic combinations showing how systems work together in practice
- **Location**: All in `app/lib/test-games/games/` for consistency with existing examples
- **Visual style**: Mixed - simple demos use colored shapes, fuller examples get AI-generated assets
- **Grouping**: Proposed 4 example games combining the 10 new systems

**Research Findings**:
- Discovered 11 new game systems in `shared/src/systems/`: path, grid, checkpoint, progression, inventory, state-machine, combo, wave, spatial-query, dynamic-collider, match3
- Match3 already has example (`candyCrush.ts`) ✅
- Remaining 10 systems need examples
- Existing test games follow pattern: TestGameMeta export + GameDefinition default export
- Systems registered in GameSystemRegistry with actions, behaviors, expression functions

### Metis Review
**Critical Finding**: New systems exist as type definitions but most are NOT yet integrated into GameDefinition schema. Only `match3` has a top-level config field. This means examples must use systems via rule actions and expression functions, not declarative top-level configs.

**Identified Gaps** (addressed):
1. ~~Schema integration unclear~~ → Will use actions-based approach (systems via rules)
2. ~~Asset generation scope~~ → Default to colored shapes with comments for future asset integration
3. ~~Expression function usage~~ → Examples will demonstrate both basic actions and expression integration
4. ~~Complexity calibration~~ → Target 150-250 lines for simple, 300-400 for complex (based on existing games)
5. ~~Systems auto-registration~~ → Will add TODO to verify system registration in game engine initialization

---

## Work Objectives

### Core Objective
Create 4 illustrative example games demonstrating all 10 new game systems through realistic gameplay scenarios.

### Concrete Deliverables
1. `app/lib/test-games/games/comboFighter.ts` - Combo + Dynamic Collider + Checkpoint systems
2. `app/lib/test-games/games/rpgProgressionDemo.ts` - Progression + Inventory (resources) systems
3. `app/lib/test-games/games/dungeonCrawler.ts` - Grid + Inventory (items) + State Machine systems
4. `app/lib/test-games/games/towerDefense.ts` - Wave + Spatial Query + Path systems

### Definition of Done
- [ ] All 4 GameDefinition files created with proper TypeScript types
- [ ] Each file exports `metadata: TestGameMeta` and `default: GameDefinition`
- [ ] `pnpm generate:registry` runs successfully and discovers all 4 games
- [ ] `tsc --noEmit` passes with no type errors in shared/ or app/
- [ ] Each game demonstrates its target systems through rules/actions/expressions
- [ ] Manual QA confirms each game is playable and demonstrates system features

### Must Have
- TypeScript type safety (all actions, expressions, configs properly typed)
- TestGameMeta export for registry auto-discovery
- Inline comments explaining system usage
- Win/lose conditions demonstrating system integration
- Realistic gameplay that shows why systems are useful together

### Must NOT Have (Guardrails)
- **No schema field invention** - Don't add top-level config fields for systems not in GameDefinition
- **No asset generation** - Use colored shapes; add comments for future asset integration
- **No test automation** - Manual QA only
- **No documentation files** - Code comments are sufficient
- **No more than 4 files** - Exactly 4 example games, no extras
- **No systems outside the 10** - Don't use match3 (has example), don't add unrelated features

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **User wants tests**: Manual QA only
- **Framework**: N/A
-**Approach**: Manual verification via Expo dev client

### Manual QA Procedures

**For ALL examples:**

1. **Registry Discovery**
   ```bash
   pnpm generate:registry
   ```
   - Expected: No errors
   - Expected: All 4 games appear in generated/testGames.ts

2. **Type Safety**
   ```bash
   pnpm tsc --noEmit
   ```
   - Expected: 0 errors

3. **Runtime Loading**
   - Start dev server: `pnpm dev`
   - Navigate to game in app
   - Expected: Game loads without crashes
   - Expected: All entities render (colored shapes visible)

**Game-Specific Verification:**

| Game | Actions to Verify | Expected Outcomes |
|------|-------------------|-------------------|
| **Combo Fighter** | Tap moving targets 5 times in a row | Player grows larger, combo count increases, multiplier applies |
|  | Hit checkpoint after combo | Checkpoint activates (visual feedback) |
|  | Die and respawn | Combo resets, size returns to normal |
| **RPG Progression** | Collect 10 XP orbs | Level up from 1 to 2, score increases |
|  | Collect 50 gold gems | Resource count shows 50 gold |
|  | Reach level 3 | "Speedster" achievement unlocks |
| **Dungeon Crawler** | Press arrow buttons | Player moves on grid (snaps to cells) |
|  | Collect key | Inventory shows 1 key, key disappears |
|  | Approach enemy | Enemy changes from patrol to chase (red color) |
|  | Use key at door | Door opens (disappears), key consumed |
| **Tower Defense** | Watch initial wave | 5 enemies spawn and follow path |
|  | Place tower | Tower appears, rotates toward nearest enemy |
|  | Enemy reaches end of path | Lose 1 life |
|  | Defeat all enemies in wave | Wave 2 starts |

**Evidence Required** (for each game):
- Screenshot of game loaded
- Terminal output showing no errors
- Brief description of verified behavior (e.g., "Combo increased to 5x, player doubled in size")

---

## Task Flow

```
Task 0 (schema integration check)
   ↓
Task 1 (Combo Fighter - simplest) ─┐
Task 2 (RPG Demo)                   ├─ Can run in parallel
Task 3 (Dungeon Crawler)            │
Task 4 (Tower Defense - complex)   ─┘
   ↓
Task 5 (registry generation + QA)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1, 2, 3, 4 | All independent GameDefinition files |

| Task | Depends On | Reason |
|------|------------|--------|
| 5 | 0, 1, 2, 3, 4 | Requires all files to exist for registry generation |

---

## TODOs

- [ ] 0. Verify System Schema Integration

  **What to do**:
  - Check `shared/src/types/GameDefinition.ts` for system config fields beyond match3
  - Check `shared/src/types/rules.ts` for action type definitions
  - Verify systems are auto-registered in game engine initialization
  - Document which approach to use: top-level configs OR actions-only

  **Must NOT do**:
  - Don't invent new schema fields if they don't exist
  - Don't modify GameDefinition without explicit user approval
  - Don't assume systems work without verification

  **Parallelizable**: NO (all tasks depend on this)

  **References**:
  - `shared/src/types/GameDefinition.ts:313-341` - GameDefinition interface showing available top-level fields
  - `shared/src/types/rules.ts` - Action type definitions used in rules
  - `shared/src/systems/GameSystemRegistry.ts` - System registration mechanism
  - `shared/src/systems/*/index.ts` - Each system's exported action types and expression functions
  - `app/lib/test-games/games/candyCrush.ts:59-71` - Example of match3 top-level config

  **Acceptance Criteria**:
  - [ ] Documented: Which systems have top-level GameDefinition fields (currently: only match3)
  - [ ] Documented: All available action types from `shared/src/types/rules.ts`
  - [ ] Verified: Systems export their action types (e.g., `export const pathSystem: GameSystemDefinition`)
  - [ ] Verified: Expression functions are accessible (check registry initialization)
  - [ ] Decision made: Use actions-based approach for systems without top-level configs

  **Manual Execution Verification**:
  - [ ] Read GameDefinition.ts lines 313-341
  - [ ] Output: List of top-level fields available (match3, input, world, camera, etc.)
  - [ ] Grep for `export const` in shared/src/systems/*/index.ts
  - [ ] Output: Confirm all 10 systems export their GameSystemDefinition
  - [ ] Read rules.ts to find GameRule["actions"] union type
  - [ ] Output: List of available action types (including new system actions)

  **Commit**: NO (no code changes, investigation only)

---

- [ ] 1. Create Combo Fighter Example

  **What to do**:
  - Create `app/lib/test-games/games/comboFighter.ts`
  - Export `metadata: TestGameMeta` with title/description
  - Export `default: GameDefinition` with:
    - **Combo System**: Use `combo_increment` action on target hits, `combo_reset` on miss
    - **Dynamic Collider**: Use `set_entity_size` action to grow player based on combo tier
    - **Checkpoint System**: Use `checkpoint_activate` and `checkpoint_save` actions
    - Expression integration: Use `comboMultiplier()` for score, `comboTier()` for size scaling
  - Keep it simple: ~200 lines, colored shapes only
  - Include inline comments explaining system actions

  **Implementation Details**:
  ```typescript
  // Combo system: Track consecutive hits
  rules: [
    {
      id: "target_hit",
      trigger: { type: "collision", entityATag: "projectile", entityBTag: "target" },
      actions: [
        { type: "combo_increment", comboId: "main_combo" },
        { type: "score", operation: "add", value: { expr: "10 * comboMultiplier('main_combo')" } },
        { type: "set_entity_size", target: { type: "by_tag", tag: "player" }, width: { expr: "1 + comboTier('main_combo') * 0.3" } }
      ]
    },
    {
      id: "checkpoint_save_combo",
      trigger: { type: "collision", entityATag: "player", entityBTag: "checkpoint" },
      actions: [
        { type: "checkpoint_activate", checkpointId: "cp1", entityId: "checkpoint-1" },
        { type: "checkpoint_save", checkpointId: "cp1" }
      ]
    }
  ]
  ```

  **Game Loop**:
  - Player auto-shoots projectiles
  - Hit moving targets to build combo (5 tiers: 1x, 2x, 3x, 5x, 10x)
  - Player grows larger with each tier
  - Miss a target or timeout → combo resets, player shrinks
  - Reach checkpoint to save combo state
  - Win: Reach 10,000 score
  - Lose: Combo times out 3 times (lives system)

  **Must NOT do**:
  - Don't create top-level `combos:` config field (doesn't exist in schema)
  - Don't use AI assets (colored shapes only)
  - Don't add unrelated systems

  **Parallelizable**: YES (with 2, 3, 4)

  **References**:
  - `shared/src/systems/combo/index.ts` - Combo system definition with action types and expression functions
  - `shared/src/systems/combo/types.ts` - ComboDefinition and ComboState types
  - `shared/src/systems/dynamic-collider/index.ts` - set_entity_size action and entityWidth/entityHeight functions
  - `shared/src/systems/checkpoint/index.ts` - checkpoint_activate, checkpoint_save, checkpoint_restore actions
  - `app/lib/test-games/games/slopeggle.ts:392-397` - Example of using set_variable with multiplier expressions
  - `app/lib/test-games/games/simplePlatformer.ts:1-258` - Example of TestGameMeta export and GameDefinition structure

  **Acceptance Criteria**:
  - [ ] File created: `app/lib/test-games/games/comboFighter.ts`
  - [ ] Exports: `metadata: TestGameMeta` and `default: GameDefinition`
  - [ ] Combo actions used: `combo_increment`, `combo_reset`
  - [ ] Dynamic collider action used: `set_entity_size` with expression using `comboTier()`
  - [ ] Checkpoint actions used: `checkpoint_activate`, `checkpoint_save`
  - [ ] Expression functions used: `comboMultiplier()`, `comboTier()`, `comboTimeLeft()`
  - [ ] Win/lose conditions: score threshold and lives-based timeout
  - [ ] Inline comments explaining each system's role

  **Manual Execution Verification**:
  - [ ] Start dev server: `pnpm dev`
  - [ ] Navigate to game in Expo app
  - [ ] Verify: Game loads without crashes
  - [ ] Action: Tap/shoot moving targets 5 times consecutively
  - [ ] Expected: Combo counter increases (1→2→3→5→10), player entity grows visibly, score multiplies
  - [ ] Action: Miss a target or wait for timeout
  - [ ] Expected: Combo resets to 0, player shrinks to original size
  - [ ] Action: Move player to checkpoint entity
  - [ ] Expected: Checkpoint visual feedback (glow effect or color change)
  - [ ] Screenshot: Save evidence of combo at tier 3+ with enlarged player
  - [ ] Terminal output: No errors or warnings

  **Commit**: YES
  - Message: `feat(examples): add Combo Fighter demonstrating combo, dynamic collider, checkpoint systems`
  - Files: `app/lib/test-games/games/comboFighter.ts`
  - Pre-commit: `pnpm tsc --noEmit` (ensure type safety)

---

- [ ] 2. Create RPG Progression Demo

  **What to do**:
  - Create `app/lib/test-games/games/rpgProgressionDemo.ts`
  - Export `metadata: TestGameMeta` with title/description
  - Export `default: GameDefinition` with:
    - **Progression System**: Use `progression_add_xp` on orb collection, level-up at thresholds
    - **Inventory System (resources)**: Use `resource_modify` for gold/gems
    - Expression integration: Use `progressionLevel()`, `resourceCurrent()` in UI displays
  - Keep it simple: ~180 lines, colored shapes only

  **Implementation Details**:
  ```typescript
  // Progression: XP and levels
  rules: [
    {
      id: "collect_xp_orb",
      trigger: { type: "collision", entityATag: "player", entityBTag: "xp_orb" },
      actions: [
        { type: "progression_add_xp", progressionId: "player_progress", xp: 50 },
        { type: "destroy", target: { type: "by_collision", side: "b" } }
      ]
    },
    {
      id: "level_up_reward",
      trigger: { type: "frame" },
      conditions: [
        { type: "expression", expr: "progressionLevel('player_progress') == 2 && resourceCurrent('gold') < 100" }
      ],
      actions: [
        { type: "resource_modify", resourceId: "gold", amount: 100 }
      ],
      fireOnce: true
    }
  ]
  
  ui: {
    variableDisplays: [
      { name: "progressionXP('player_progress')", label: "XP", color: "#3B82F6" },
      { name: "progressionLevel('player_progress')", label: "Level", color: "#10B981" },
      { name: "resourceCurrent('gold')", label: "Gold", color: "#FBBF24" }
    ]
  }
  ```

  **Game Loop**:
  - Move player to collect XP orbs (colored circles)
  - XP bar fills → level up (1→2→3→4→5)
  - Collect gold/gem resources (displayed in UI)
  - Achievements unlock at milestones (100 gold, level 3, 50 gems)
  - Win: Reach level 5
  - Lose: Time limit (2 minutes)

  **Must NOT do**:
  - Don't create top-level `progression:` or `inventories:` config fields
  - Don't use discrete item inventory (use resources only)
  - Don't add combat or enemies (keep focused on progression)

  **Parallelizable**: YES (with 1, 3, 4)

  **References**:
  - `shared/src/systems/progression/index.ts` - progression_add_xp, progression_unlock actions
  - `shared/src/systems/progression/types.ts` - ProgressionDefinition with XP curves and achievements
  - `shared/src/systems/inventory/index.ts` - resource_modify, resource_spend actions
  - `shared/src/systems/inventory/types.ts` - ResourceDefinition with current/max/regen
  - `app/lib/test-games/games/slopeggle.ts:104-117` - Example of variableDisplays in UI config
  - `app/lib/test-games/games/simplePlatformer.ts:126-143` - Example of collectible entities with behaviors

  **Acceptance Criteria**:
  - [ ] File created: `app/lib/test-games/games/rpgProgressionDemo.ts`
  - [ ] Exports: `metadata: TestGameMeta` and `default: GameDefinition`
  - [ ] Progression actions used: `progression_add_xp`, `progression_unlock` (for achievements)
  - [ ] Resource actions used: `resource_modify` for gold and gems
  - [ ] Expression functions used: `progressionLevel()`, `progressionXP()`, `resourceCurrent()`, `resourcePercent()`
  - [ ] UI displays: XP bar, level number, gold count via variableDisplays
  - [ ] Achievements: At least 3 (e.g., "Rich" for 100 gold, "Experienced" for level 3)
  - [ ] Win/lose conditions: level threshold and time limit

  **Manual Execution Verification**:
  - [ ] Start dev server: `pnpm dev`
  - [ ] Navigate to game in Expo app
  - [ ] Verify: Game loads, UI shows "Level 1, XP: 0, Gold: 0"
  - [ ] Action: Move player to collect 3 XP orbs (50 XP each = 150 total)
  - [ ] Expected: UI updates "Level 2, XP: 150" (assuming 100 XP per level)
  - [ ] Action: Collect 10 gold gem entities
  - [ ] Expected: UI shows "Gold: 100" (10 gems × 10 gold each)
  - [ ] Action: Continue collecting until level 5
  - [ ] Expected: Win condition triggers, game ends
  - [ ] Screenshot: Save evidence of level 3+ with achievement unlocked
  - [ ] Terminal output: No errors

  **Commit**: YES
  - Message: `feat(examples): add RPG Progression Demo demonstrating progression and resource inventory systems`
  - Files: `app/lib/test-games/games/rpgProgressionDemo.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 3. Create Dungeon Crawler Example

  **What to do**:
  - Create `app/lib/test-games/games/dungeonCrawler.ts`
  - Export `metadata: TestGameMeta` with title/description
  - Export `default: GameDefinition` with:
    - **Grid System**: Use `grid_place`, `grid_move` for tile-based movement
    - **Inventory System (items)**: Use `inventory_add`, `inventory_remove` for keys/potions
    - **State Machine System**: Use `state_transition` for enemy AI (patrol, chase, attack states)
    - Expression integration: Use `gridIsOccupied()`, `inventoryHas()`, `stateCurrent()` in conditions
  - Moderate complexity: ~350 lines, colored shapes with labels

  **Implementation Details**:
  ```typescript
  // Grid: Tile-based movement
  rules: [
    {
      id: "move_up",
      trigger: { type: "button", button: "up", state: "pressed" },
      conditions: [
        { type: "expression", expr: "!gridIsOccupied('dungeon_grid', entityGridRow('player') - 1, entityGridCol('player'))" }
      ],
      actions: [
        { type: "grid_move", gridId: "dungeon_grid", entityId: "player", direction: "up" }
      ]
    },
    {
      id: "collect_key",
      trigger: { type: "collision", entityATag: "player", entityBTag: "key" },
      actions: [
        { type: "inventory_add", inventoryId: "player_inventory", itemId: "key", count: 1 },
        { type: "destroy", target: { type: "by_collision", side: "b" } }
      ]
    },
    {
      id: "unlock_door",
      trigger: { type: "collision", entityATag: "player", entityBTag: "locked_door" },
      conditions: [
        { type: "expression", expr: "inventoryHas('player_inventory', 'key')" }
      ],
      actions: [
        { type: "inventory_remove", inventoryId: "player_inventory", itemId: "key", count: 1 },
        { type: "destroy", target: { type: "by_collision", side: "b" } }
      ]
    }
  ]
  
  // State Machine: Enemy AI
  behaviors: [
    {
      type: "state_machine_behavior", // hypothetical
      machineId: "enemy_ai",
      states: {
        patrol: { onUpdate: [{ type: "oscillate", axis: "x", amplitude: 2 }] },
        chase: { onUpdate: [{ type: "move_toward", target: "player", speed: 3 }] },
        attack: { onEnter: [{ type: "apply_impulse", direction: "toward_entity", targetId: "player" }] }
      },
      transitions: [
        { from: "patrol", to: "chase", condition: { expr: "distance(entityPos('player'), entityPos('enemy')) < 3" } },
        { from: "chase", to: "patrol", condition: { expr: "distance(entityPos('player'), entityPos('enemy')) > 5" } }
      ]
    }
  ]
  ```

  **Game Loop**:
  - Player starts on 8×8 grid dungeon
  - Use arrow buttons to move tile-by-tile
  - Collect keys (inventory shows count)
  - Unlock doors with keys (consumed from inventory)
  - Enemies patrol → chase when player is close → patrol when far
  - Collect potion to restore health (resource)
  - Win: Reach exit tile
  - Lose: Health reaches 0 (from enemy collisions)

  **Must NOT do**:
  - Don't create complex grid rendering (use simple cell entities)
  - Don't add combat system (focus on movement + inventory + states)
  - Don't overcomplicate state machine (3 states max)

  **Parallelizable**: YES (with 1, 2, 4)

  **References**:
  - `shared/src/systems/grid/index.ts` - grid_place, grid_move, grid_swap actions
  - `shared/src/systems/grid/types.ts` - GridDefinition with rows/cols/cellSize/origin
  - `shared/src/systems/inventory/index.ts` - inventory_add, inventory_remove, inventory_transfer actions
  - `shared/src/systems/inventory/types.ts` - InventoryDefinition with slots, InventoryState with items
  - `shared/src/systems/state-machine/index.ts` - state_transition, state_send_event actions
  - `shared/src/systems/state-machine/types.ts` - StateMachineDefinition with states and transitions
  - `app/lib/test-games/games/candyCrush.ts:9-24` - Example of grid coordinate conversion (cellToWorld)
  - `app/lib/test-games/games/simplePlatformer.ts:213-231` - Example of button triggers for movement

  **Acceptance Criteria**:
  - [ ] File created: `app/lib/test-games/games/dungeonCrawler.ts`
  - [ ] Exports: `metadata: TestGameMeta` and `default: GameDefinition`
  - [ ] Grid actions used: `grid_move` for player movement (4 directions)
  - [ ] Grid functions used: `gridIsOccupied()` in movement conditions, `gridCellToWorld()` for entity placement
  - [ ] Inventory actions used: `inventory_add` (keys/potions), `inventory_remove` (key consumption)
  - [ ] Inventory functions used: `inventoryHas()` in unlock door condition
  - [ ] State machine actions used: `state_transition` for enemy AI state changes
  - [ ] State machine functions used: `stateCurrent()`, `stateIs()` for conditional logic
  - [ ] At least 3 enemy states: patrol, chase, flee OR attack
  - [ ] UI shows inventory counts and current enemy states

  **Manual Execution Verification**:
  - [ ] Start dev server: `pnpm dev`
  - [ ] Navigate to game in Expo app
  - [ ] Verify: 8×8 grid visible with player, enemies, doors, keys
  - [ ] Action: Press UP button
  - [ ] Expected: Player moves up one grid cell (snaps to grid)
  - [ ] Action: Move player to key entity
  - [ ] Expected: Key disappears, UI shows "Keys: 1"
  - [ ] Action: Move player near enemy (within 3 tiles)
  - [ ] Expected: Enemy changes color (indicating "chase" state), moves toward player
  - [ ] Action: Move player to locked door with key in inventory
  - [ ] Expected: Door disappears, UI shows "Keys: 0"
  - [ ] Action: Move player to exit tile
  - [ ] Expected: Win condition triggers
  - [ ] Screenshot: Save evidence of grid movement and state change
  - [ ] Terminal output: No errors

  **Commit**: YES
  - Message: `feat(examples): add Dungeon Crawler demonstrating grid, inventory, and state machine systems`
  - Files: `app/lib/test-games/games/dungeonCrawler.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 4. Create Tower Defense Example

  **What to do**:
  - Create `app/lib/test-games/games/towerDefense.ts`
  - Export `metadata: TestGameMeta` with title/description
  - Export `default: GameDefinition` with:
    - **Wave System**: Use `waves_start`, `waves_next` to spawn enemy waves
    - **Spatial Query System**: Use `target_nearest` for tower targeting
    - **Path System**: Use path definitions for enemy movement along waypoints
    - Expression integration: Use `waveCurrent()`, `waveEnemiesRemaining()` in UI and conditions
  - Full complexity: ~400 lines, colored shapes with labels

  **Implementation Details**:
  ```typescript
  // Wave system: Spawn enemies in waves
  rules: [
    {
      id: "start_first_wave",
      trigger: { type: "timer", seconds: 2 },
      actions: [
        { type: "waves_start", waveDefId: "main_waves" }
      ],
      fireOnce: true
    },
    {
      id: "next_wave_on_clear",
      trigger: { type: "frame" },
      conditions: [
        { type: "expression", expr: "waveIsActive('main_waves') && waveEnemiesRemaining('main_waves') == 0" }
      ],
      actions: [
        { type: "waves_next", waveDefId: "main_waves", delay: 3 }
      ]
    }
  ]
  
  // Path system: Enemies follow waypoints
  behaviors: [
    {
      type: "follow_path",
      pathId: "enemy_path",
      speed: 2,
      loop: false,
      onComplete: [
        { type: "lives", operation: "subtract", value: 1 },
        { type: "destroy", target: { type: "self" } }
      ]
    }
  ]
  
  // Spatial Query: Tower targeting
  rules: [
    {
      id: "tower_shoot",
      trigger: { type: "timer", seconds: 1, repeat: true },
      actions: [
        { type: "target_nearest", sourceTag: "tower", targetTag: "enemy", range: 5, storeIn: "nearest_enemy" },
        {
          type: "spawn",
          template: "projectile",
          position: { type: "at_entity_tag", tag: "tower" },
          applyImpulse: { direction: "toward_stored_entity", storedEntityVar: "nearest_enemy", force: 8 }
        }
      ]
    }
  ]
  ```

  **Game Loop**:
  - Wave 1: 5 enemies spawn at path start, follow waypoints to end
  - Player can tap to place towers (limited currency)
  - Towers auto-target nearest enemy in range, shoot projectiles
  - Enemy reaches path end → lose 1 life
  - All enemies defeated → next wave starts (harder: more enemies, faster)
  - Win: Survive 5 waves
  - Lose: Lives reach 0

  **Must NOT do**:
  - Don't add tower upgrade system (scope creep)
  - Don't create complex pathfinding (use predefined waypoint path)
  - Don't add special enemy types (keep simple)

  **Parallelizable**: YES (with 1, 2, 3)

  **References**:
  - `shared/src/systems/wave/index.ts` - waves_start, waves_next, waves_pause actions
  - `shared/src/systems/wave/types.ts` - WaveDefinition with waves array, spawn groups
  - `shared/src/systems/spatial-query/index.ts` - target_nearest, target_all_in_radius actions
  - `shared/src/systems/path/index.ts` - Path system with linear/catmull-rom/bezier interpolation
  - `shared/src/systems/path/types.ts` - PathDefinition with points, type, speed, loop
  - `app/lib/test-games/games/slopeggle.ts:264-267` - Example of oscillate behavior (similar pattern for follow_path)
  - `app/lib/test-games/games/physicsStacker.ts` - Example of spawn_on_event pattern
  - `docs/game-templates/02-TOWER-DEFENSE.md` - Tower Defense design reference

  **Acceptance Criteria**:
  - [ ] File created: `app/lib/test-games/games/towerDefense.ts`
  - [ ] Exports: `metadata: TestGameMeta` and `default: GameDefinition`
  - [ ] Wave actions used: `waves_start`, `waves_next`
  - [ ] Wave functions used: `waveCurrent()`, `waveTotal()`, `waveEnemiesRemaining()` in UI and conditions
  - [ ] Spatial query action used: `target_nearest` with range parameter and storeIn variable
  - [ ] Path behavior: Enemies have `follow_path` behavior with onComplete actions
  - [ ] Path functions used: `pathLength()`, `pathPointAt()` for progress tracking
  - [ ] At least 3 waves with increasing difficulty (more enemies or faster speed)
  - [ ] Tower placement mechanic via tap/click
  - [ ] UI displays: current wave, enemies remaining, lives

  **Manual Execution Verification**:
  - [ ] Start dev server: `pnpm dev`
  - [ ] Navigate to game in Expo app
  - [ ] Verify: Path visible as line or waypoint markers
  - [ ] Action: Wait 2 seconds for wave 1 to start
  - [ ] Expected: 5 enemies spawn at path start, begin moving along path
  - [ ] Action: Tap on map to place a tower
  - [ ] Expected: Tower entity appears at tap location
  - [ ] Action: Wait for enemy to enter tower range
  - [ ] Expected: Tower rotates toward enemy, shoots projectile
  - [ ] Action: Let an enemy reach path end
  - [ ] Expected: Enemy despawns, lives decrease by 1, UI updates
  - [ ] Action: Defeat all enemies in wave 1
  - [ ] Expected: UI shows "Wave 2", new enemies spawn (more or faster)
  - [ ] Screenshot: Save evidence of wave 2 with towers targeting enemies
  - [ ] Terminal output: No errors

  **Commit**: YES
  - Message: `feat(examples): add Tower Defense demonstrating wave, spatial query, and path systems`
  - Files: `app/lib/test-games/games/towerDefense.ts`
  - Pre-commit: `pnpm tsc --noEmit`

---

- [ ] 5. Registry Generation and Final QA

  **What to do**:
  - Run `pnpm generate:registry` to discover new test games
  - Run `pnpm tsc --noEmit` to verify type safety across all files
  - Manually test each game in Expo dev client
  - Verify all 10 systems are demonstrated across the 4 games
  - Document any issues found

  **Must NOT do**:
  - Don't skip manual testing (no automation available)
  - Don't commit if type errors exist
  - Don't proceed if any game crashes on load

  **Parallelizable**: NO (depends on tasks 1, 2, 3, 4)

  **References**:
  - `scripts/generate-registry.mjs` - Registry generation script
  - `app/lib/registry/generated/testGames.ts` - Generated registry output (verify 4 new games appear)
  - `app/AGENTS.md` - Development workflow documentation

  **Acceptance Criteria**:
  - [ ] Registry generation: `pnpm generate:registry` completes without errors
  - [ ] Type checking: `pnpm tsc --noEmit` shows 0 errors
  - [ ] Registry file: `app/lib/registry/generated/testGames.ts` contains all 4 new games
  - [ ] Manual QA: All 4 games load and run in Expo dev client
  - [ ] System coverage: All 10 target systems are demonstrated (verified via code review)

  **Manual Execution Verification**:
  - [ ] Command: `pnpm generate:registry`
  - [ ] Expected: "Generated testGames.ts with X games" (X includes 4 new games)
  - [ ] Command: `pnpm tsc --noEmit`
  - [ ] Expected: Exit code 0, no error messages
  - [ ] Command: `pnpm dev`
  - [ ] Expected: Metro bundler starts on port 8085
  - [ ] For each game (comboFighter, rpgProgressionDemo, dungeonCrawler, towerDefense):
    - [ ] Navigate to game in app
    - [ ] Verify: Loads without crash
    - [ ] Verify: Systems work as expected (see game-specific QA above)
    - [ ] Screenshot: Save evidence of gameplay
  - [ ] System coverage verification:
    - [ ] Combo: ✅ comboFighter
    - [ ] Dynamic Collider: ✅ comboFighter
    - [ ] Checkpoint: ✅ comboFighter
    - [ ] Progression: ✅ rpgProgressionDemo
    - [ ] Inventory (resources): ✅ rpgProgressionDemo
    - [ ] Grid: ✅ dungeonCrawler
    - [ ] Inventory (items): ✅ dungeonCrawler
    - [ ] State Machine: ✅ dungeonCrawler
    - [ ] Wave: ✅ towerDefense
    - [ ] Spatial Query: ✅ towerDefense
    - [ ] Path: ✅ towerDefense

  **Commit**: NO (verification only, no code changes)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(examples): add Combo Fighter demonstrating combo, dynamic collider, checkpoint systems` | `app/lib/test-games/games/comboFighter.ts` | `pnpm tsc --noEmit` |
| 2 | `feat(examples): add RPG Progression Demo demonstrating progression and resource inventory systems` | `app/lib/test-games/games/rpgProgressionDemo.ts` | `pnpm tsc --noEmit` |
| 3 | `feat(examples): add Dungeon Crawler demonstrating grid, inventory, and state machine systems` | `app/lib/test-games/games/dungeonCrawler.ts` | `pnpm tsc --noEmit` |
| 4 | `feat(examples): add Tower Defense demonstrating wave, spatial query, and path systems` | `app/lib/test-games/games/towerDefense.ts` | `pnpm tsc --noEmit` |

---

## Success Criteria

### Verification Commands
```bash
# Generate registry
pnpm generate:registry

# Type check
pnpm tsc --noEmit

# Start dev server
pnpm dev
```

### Final Checklist
- [ ] All 4 GameDefinition files created
- [ ] All files export TestGameMeta and GameDefinition
- [ ] Registry discovers all 4 games
- [ ] No TypeScript errors
- [ ] All 10 systems demonstrated across games
- [ ] Manual QA passed for each game
- [ ] All commits follow conventional format
- [ ] No AI asset generation attempted (colored shapes only)
