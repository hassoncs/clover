# Container System Design

> **Status**: Approved  
> **Last Updated**: 2026-01-26  
> **Author**: Sisyphus + hassoncs  
> **Related**: [Dynamic Mechanics Roadmap](../roadmap/dynamic-mechanics-roadmap.md), [Behavior Extensions ADR](../decisions/behavior-extensions.md)

## Problem Statement

Container-based games (Ball Sort, Connect4, Stack Match, Gem Crush) share a common pattern: entities belong to spatial containers (tubes, columns, grids, slots), and game logic depends on container state (count, top item, occupancy).

**Current approach** maintains this state imperatively:
- Manual variable tracking (`tube0_count`, `tube0_topColor`)
- Manual tag management (`in-tube-0`, `in-tube-1`)
- Manual position calculations when items move
- Validation logic scattered across executors

**This causes bugs** (see Ball Sort validation bug, 2026-01-26):
- Dual state (entity tags + cached variables) can desync
- Complex pickup/drop logic must manually maintain consistency
- Each game reimplements the same patterns differently
- Hard to test container logic in isolation

---

## Solution: Declarative Container System

A first-class container abstraction where:
1. **Membership is the source of truth** - computed from entity tags, never cached
2. **Derived state is automatic** - count, topItem, isEmpty computed on demand
3. **Actions are declarative** - `container_push`, `container_pop`, `container_transfer`
4. **Validation is declarative** - `container_can_accept` with match rules

---

## Container Types

### 1. Stack Container

**Use cases**: Ball Sort tubes, Connect4 columns, card piles, Hanoi towers

```typescript
interface StackContainer {
  type: "stack";
  id: string;
  capacity: number;              // Max items (e.g., 4 balls per tube)
  layout: {
    direction: "vertical" | "horizontal";
    spacing: number;             // Distance between items (world units)
    basePosition: { x: number; y: number };  // Bottom/left position
  };
  // Derived state (computed, never stored)
  // - count: number of items
  // - topItem: entity at top (or null)
  // - isFull: count >= capacity
  // - isEmpty: count === 0
  // - items: ordered array of entity IDs (bottom to top)
}
```

**Operations**:
- `push(item)` - Add item to top
- `pop()` - Remove and return top item
- `peek()` - Return top item without removing
- `canAccept(item, matchRule?)` - Check if item can be pushed

**Auto-behaviors**:
- Adds tag `in-{containerId}` when item pushed
- Removes tag when item popped
- Positions item based on slot index

### 2. Grid Container

**Use cases**: Gem Crush, Connect4 board, chess/checkers, Minesweeper

```typescript
interface GridContainer {
  type: "grid";
  id: string;
  rows: number;
  cols: number;
  cellSize: number;
  origin: { x: number; y: number };  // Top-left or center
  originAnchor: "top-left" | "center";
  // Derived state
  // - isOccupied(row, col): boolean
  // - getCell(row, col): entity | null
  // - findMatches(minLength, direction): Match[]
  // - getColumn(col): entity[] (for gravity)
  // - getRow(row): entity[]
}
```

**Operations**:
- `place(row, col, item)` - Place item at cell
- `remove(row, col)` - Remove item from cell
- `swap(cellA, cellB)` - Swap two items
- `move(from, to)` - Move item between cells
- `applyGravity()` - Drop items to fill empty cells below

**Auto-behaviors**:
- Adds tags `in-{gridId}`, `row-{n}`, `col-{n}`
- Positions item at cell center
- Match detection via tags (e.g., `gem_red`, `color-0`)

### 3. Slot Container

**Use cases**: Choice tiles, card hands, inventory slots, hotbar

```typescript
interface SlotContainer {
  type: "slots";
  id: string;
  count: number;                 // Number of slots
  layout: {
    direction: "horizontal" | "vertical";
    spacing: number;
    basePosition: { x: number; y: number };
  };
  allowEmpty: boolean;           // Can slots be empty?
  // Derived state
  // - selectedIndex: number | null
  // - occupiedCount: number
  // - getSlot(index): entity | null
  // - isSlotEmpty(index): boolean
}
```

**Operations**:
- `select(index)` - Mark slot as selected
- `deselect()` - Clear selection
- `place(index, item)` - Put item in slot
- `remove(index)` - Remove item from slot
- `swap(indexA, indexB)` - Swap items between slots

---

## Schema Definition

### GameDefinition Extension

```typescript
interface GameDefinition {
  // ... existing fields ...
  
  containers?: {
    [id: string]: StackContainer | GridContainer | SlotContainer;
  };
}
```

### Example: Ball Sort with Containers

```typescript
const game: GameDefinition = {
  containers: {
    tube0: {
      type: "stack",
      id: "tube0",
      capacity: 4,
      layout: {
        direction: "vertical",
        spacing: 1.1,
        basePosition: { x: -4.57, y: -3.0 },
      },
    },
    tube1: { /* ... */ },
    // ... tubes 2-5
  },
  
  // NO MORE manual variables:
  // variables: { tube0_count, tube0_topColor, ... }  // DELETED
  
  variables: {
    heldBallId: "",      // Still needed for pickup state
    sourceTubeIndex: -1,
  },
  
  entities: [
    // Balls declare their container membership
    {
      id: "ball-0",
      template: "ball0",
      tags: ["ball", "color-0"],
      container: { id: "tube0", index: 0 },  // NEW: declarative membership
    },
    // ...
  ],
};
```

---

## Declarative Actions

### Container Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `container_push` | Add item to container | `container`, `item`, `position?` |
| `container_pop` | Remove top/selected item | `container`, `storeAs?` |
| `container_transfer` | Move item between containers | `from`, `to`, `item` |
| `container_swap` | Swap two items | `containerA`, `indexA`, `containerB`, `indexB` |
| `container_clear` | Remove all items | `container`, `destroy?` |

### Container Conditions

| Condition | Description | Parameters |
|-----------|-------------|------------|
| `container_is_empty` | Container has no items | `container` |
| `container_is_full` | Container at capacity | `container` |
| `container_has_item` | Container contains specific item | `container`, `itemTag` |
| `container_can_accept` | Item can be added | `container`, `item`, `match?` |
| `container_count` | Compare item count | `container`, `comparison`, `value` |

### Match Rules for Validation

```typescript
interface MatchRule {
  // Tag-based matching (Ball Sort: same color)
  tag?: string;          // e.g., "color-*" - matches color-0, color-1, etc.
  
  // Value-based matching
  property?: string;     // e.g., "colorIndex"
  
  // Empty container always accepts
  allowEmpty?: boolean;  // default: true
  
  // Custom expression
  expr?: string;         // e.g., "topItem.colorIndex == item.colorIndex"
}
```

---

## Rule Examples

### Ball Sort: Pickup Ball

**Before** (imperative, ~30 lines in executor):
```typescript
// BallSortActionExecutor.ts
private pickupBall(tubeIndex: number) {
  const balls = this.getBallsInTube(tubeIndex);
  if (balls.length === 0) return;
  
  const topBall = balls[balls.length - 1];
  const color = this.getBallColor(topBall);
  
  // Remove from tube
  topBall.removeTag(`in-tube-${tubeIndex}`);
  
  // Update cached state (BUG SOURCE!)
  this.variables.set(`tube${tubeIndex}_count`, balls.length - 1);
  this.variables.set(`tube${tubeIndex}_topColor`, this.getNewTopColor(tubeIndex));
  
  // Store held state
  this.variables.set('heldBallId', topBall.id);
  this.variables.set('heldBallColor', color);
  this.variables.set('sourceTubeIndex', tubeIndex);
  
  // Visual feedback
  topBall.addTag('held');
  // ... position ball above tube ...
}
```

**After** (declarative, ~10 lines in rules):
```typescript
{
  id: "pickup_ball",
  trigger: { type: "tap", target: "tube" },
  conditions: [
    { type: "state", machine: "gameFlow", state: "idle" },
    { type: "container_is_empty", container: "tubes[$input.tubeIndex]", negate: true },
  ],
  actions: [
    { 
      type: "container_pop", 
      container: "tubes[$input.tubeIndex]",
      storeAs: "heldBall",
    },
    { type: "set_variable", name: "sourceTubeIndex", value: "$input.tubeIndex" },
    { type: "add_tag", target: "$heldBall", tag: "held" },
    { type: "move_to", target: "$heldBall", position: "lifted" },
    { type: "event", eventName: "ball_picked" },
  ],
}
```

### Ball Sort: Drop Ball (Valid)

```typescript
{
  id: "drop_ball_valid",
  trigger: { type: "tap", target: "tube" },
  conditions: [
    { type: "state", machine: "gameFlow", state: "holding" },
    { 
      type: "container_can_accept", 
      container: "tubes[$input.tubeIndex]",
      item: "$heldBall",
      match: { tag: "color-*", allowEmpty: true },
    },
  ],
  actions: [
    { 
      type: "container_push", 
      container: "tubes[$input.tubeIndex]",
      item: "$heldBall",
    },
    { type: "remove_tag", target: "$heldBall", tag: "held" },
    { type: "set_variable", name: "moveCount", operation: "add", value: 1 },
    { type: "event", eventName: "ball_dropped" },
  ],
}
```

### Ball Sort: Drop Ball (Invalid)

```typescript
{
  id: "drop_ball_invalid",
  trigger: { type: "tap", target: "tube" },
  conditions: [
    { type: "state", machine: "gameFlow", state: "holding" },
    { 
      type: "container_can_accept", 
      container: "tubes[$input.tubeIndex]",
      item: "$heldBall",
      match: { tag: "color-*", allowEmpty: true },
      negate: true,  // NOT can_accept
    },
  ],
  actions: [
    { type: "add_tag", target: "$heldBall", tag: "invalid" },
    { type: "delay", duration: 0.3 },
    { type: "remove_tag", target: "$heldBall", tag: "invalid" },
  ],
}
```

---

## Implementation Architecture

### ContainerSystem

```typescript
// app/lib/game-engine/systems/ContainerSystem.ts

class ContainerSystem {
  private containers: Map<string, ContainerInstance>;
  private entityManager: EntityManager;
  
  // Core API
  getContainer(id: string): ContainerInstance;
  
  // Stack operations
  push(containerId: string, entityId: string): void;
  pop(containerId: string): string | null;
  peek(containerId: string): string | null;
  
  // Grid operations  
  place(containerId: string, row: number, col: number, entityId: string): void;
  remove(containerId: string, row: number, col: number): string | null;
  swap(containerId: string, cellA: GridCell, cellB: GridCell): void;
  
  // Slot operations
  select(containerId: string, index: number): void;
  deselect(containerId: string): void;
  
  // Derived state (computed on demand)
  getCount(containerId: string): number;
  getTopItem(containerId: string): RuntimeEntity | null;
  isEmpty(containerId: string): boolean;
  isFull(containerId: string): boolean;
  canAccept(containerId: string, entityId: string, match?: MatchRule): boolean;
  
  // Internal
  private getMembershipTag(containerId: string): string;
  private computePosition(container: ContainerInstance, index: number): Vector2;
  private findEntityIndex(containerId: string, entityId: string): number;
}
```

### Membership via Tags

The container system uses entity tags as the source of truth:

```
Entity "ball-3" tags:
  - ball
  - color-2
  - in-tube-1     <- Container membership tag (auto-managed)
```

**Computing container contents**:
```typescript
getItems(containerId: string): RuntimeEntity[] {
  const tag = `in-${containerId}`;
  return this.entityManager.getEntitiesByTag(tag);
}
```

**No cached counts** - always computed:
```typescript
getCount(containerId: string): number {
  return this.getItems(containerId).length;
}
```

---

## Migration Plan

### Phase 1: Core Infrastructure (Week 1)

| Task | File | Est. |
|------|------|------|
| Container type definitions | `shared/src/types/container.ts` | 0.5d |
| ContainerSystem class | `app/lib/game-engine/systems/ContainerSystem.ts` | 1d |
| Stack container implementation | (same file) | 1d |
| Grid container implementation | (same file) | 1d |
| Slot container implementation | (same file) | 0.5d |
| Unit tests for ContainerSystem | `app/lib/game-engine/__tests__/ContainerSystem.test.ts` | 1d |

### Phase 2: Action & Condition Integration (Week 2)

| Task | File | Est. |
|------|------|------|
| Container actions schema | `shared/src/types/actions.ts` | 0.5d |
| Container conditions schema | `shared/src/types/conditions.ts` | 0.5d |
| Action executor: container_push | `app/lib/game-engine/rules/actions/` | 0.5d |
| Action executor: container_pop | (same) | 0.5d |
| Action executor: container_transfer | (same) | 0.5d |
| Condition evaluator: container_can_accept | `app/lib/game-engine/rules/conditions/` | 0.5d |
| Condition evaluator: container_is_empty/full | (same) | 0.5d |
| Integration tests | Tests for rules using containers | 1d |

### Phase 3: Game Refactoring (Week 3)

| Game | Complexity | Container Types | Est. |
|------|------------|-----------------|------|
| Ball Sort | Medium | 6x Stack | 1d |
| Connect4 | Medium | 7x Stack + 1x Grid | 1d |
| Stack Match | Low | 1x Grid + 1x Slots | 0.5d |
| Gem Crush | Low | Already uses Match3 system | 0.5d |
| Puyo Puyo | Medium | 1x Grid | 0.5d |
| 2048 | Medium | 1x Grid | 0.5d |

**Total: 11.5 days (~2.5 weeks)**

---

## Game Refactoring Details

### Ball Sort Refactoring

**Remove**:
- `tube0_count`, `tube1_count`, ... variables
- `tube0_topColor`, `tube1_topColor`, ... variables
- `BallSortActionExecutor.ts` (entire file)

**Add**:
- Container definitions in `game.ts`
- Declarative rules for pickup/drop
- Keep only: `heldBallId`, `sourceTubeIndex` variables

**Lines of code change**:
- Current: ~200 lines in executor + ~100 lines in game
- After: ~0 lines in executor + ~150 lines in game (all declarative)

### Connect4 Refactoring

**Current state**:
- 7 column height variables (`col0Height`, `col1Height`, ...)
- 7 tap rules (one per column)
- 7 drop handlers (one per column)
- No actual disc spawning (just state changes)

**After**:
- 7 Stack containers (columns)
- 1 Grid container (for win detection)
- 1 generic tap rule with `$input.columnIndex`
- Win detection via `grid.findMatches(4)`

### Stack Match Refactoring

**Current state**:
- Manual position calculations for grid slots
- Manual selection state tracking
- No actual tile placement system

**After**:
- 1 Grid container (5x5)
- 1 Slots container (3 choices)
- Selection via `slots.select()`
- Placement via `grid.place()`

---

## Benefits Summary

| Before | After |
|--------|-------|
| ~30 lines imperative per operation | ~5 lines declarative per rule |
| Dual state (tags + variables) can desync | Single source of truth (tags) |
| Game-specific executors | Reusable ContainerSystem |
| Hard to test container logic | Unit-testable system |
| Each game implements differently | Consistent patterns |
| Manual position calculations | Auto-positioning |
| Easy to introduce bugs | Compile-time validation |

---

## Future Extensions

### Match Detection

```typescript
interface GridContainer {
  // ...
  matchDetection?: {
    minLength: 3;
    directions: ["horizontal", "vertical", "diagonal"];
    matchTag: "color-*";  // Tag pattern for matching
  };
}
```

### Gravity/Fall

```typescript
interface GridContainer {
  // ...
  gravity?: {
    direction: "down" | "up" | "left" | "right";
    fallSpeed: number;      // World units per second
    refillFrom?: "top" | "spawn";
  };
}
```

### Animation Hooks

```typescript
interface ContainerConfig {
  // ...
  animations?: {
    onPush?: { type: "slide_in", duration: 0.2 };
    onPop?: { type: "pop_out", duration: 0.15 };
    onSwap?: { type: "slide", duration: 0.2 };
  };
}
```

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-26 | Use tags for membership, not separate data structure | Tags are already synced with Godot, no new sync needed |
| 2026-01-26 | Compute derived state on demand, never cache | Eliminates desync bugs (the original problem) |
| 2026-01-26 | Start with Stack containers (Ball Sort) | Most common pattern, immediate value |
| 2026-01-26 | Keep Match3 system separate (Gem Crush) | Already works well, different interaction model |

---

## References

- [Ball Sort Bug Analysis](../../../app/lib/test-games/games/ballSort/game.ts) - Original bug that motivated this design
- [Behavior Extensions ADR](../decisions/behavior-extensions.md) - Related system extensions
- [Dynamic Mechanics Roadmap](../roadmap/dynamic-mechanics-roadmap.md) - Overall engine evolution plan
