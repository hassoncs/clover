# Game Engine Primitives Expansion Plan

## 1. Executive Summary
This document outlines the expansion of Slopcade's game engine primitives to enable more complex, procedural, and emergent gameplay while maintaining a "declarative first" approach that is accessible to children. By introducing composition (parent-child), sophisticated randomization, collection management, and advanced physics joints, we transform Slopcade from a basic "collision and response" engine into a versatile platform for building everything from RPG-style character customization to physics-based vehicle builders and card games.

## 2. Primitive Categories

### Category A: Randomization Primitives
These primitives allow for high replayability and "builder" style games where every playthrough looks different.

| Name | One Sentence Description | Child's Mental Model |
|------|---------------------------|----------------------|
| **Random Template** | Pick one entity from a list of options when spawning. | "Surprise box": you know it's a toy, but not which one until it opens. |
| **Choose Expression** | Pick a random value from a provided list of numbers or strings. | "Eenie meenie miney mo" for values. |
| **Random Int** | Pick a whole number between two values. | Rolling a dice with any number of sides. |
| **Weighted Choice** | Pick from a list where some things are rarer than others. | A claw machine where the big teddy is harder to get than the small ball. |
| **Bag/Shuffle** | A group of items where you can pick one without getting it again until the bag is refilled. | A bag of colored marbles; once you take the red one, it's gone. |

### Category B: Entity Query Primitives
These allow entities to "perceive" the world around them for smarter AI and stacking mechanics.

| Name | One Sentence Description | Child's Mental Model |
|------|---------------------------|----------------------|
| **Entity Count** | Check how many of a certain type of thing exist right now. | Counting how many blocks are on the floor. |
| **Entity Exists** | A simple yes/no check if even one of a thing is alive. | Checking if the "Boss" is still in the room. |
| **Stacking Queries** | Find the highest or lowest thing of a specific type. | Finding the top brick of a tower to add one more. |
| **Nearest Entity** | Find the closest thing with a specific tag. | Looking for the nearest cookie. |

### Category C: Composition Primitives
These primitives move away from "one sprite = one entity" towards complex, multi-part objects.

| Name | One Sentence Description | Child's Mental Model |
|------|---------------------------|----------------------|
| **Slots** | Named locations on an entity where other things can be plugged in. | LEGO studs or a doll's hand that can hold a sword. |
| **Attach To** | A behavior that makes one entity stick to another's slot. | Using glue to put wheels on a cardboard box. |
| **Children** | A group of entities that move and rotate together with a parent. | A mother duck followed by her ducklings. |
| **Layered Sprites** | Multiple images stacked on top of each other in a single entity. | Putting a hat and a scarf on a snowman. |

### Category D: Collection Primitives
Enables inventory systems, deck-building, and procedural sequences.

| Name | One Sentence Description | Child's Mental Model |
|------|---------------------------|----------------------|
| **Lists** | A variable that holds a "pile" of items instead of just one number. | A backpack or a deck of cards. |
| **Push/Pop** | Adding things to the end or taking them off the top of a pile. | Adding a plate to a stack or taking the top one. |
| **Contains** | Checking if a specific thing is currently in your pile. | Looking inside your backpack for a key. |
| **Deck Draw** | Drawing an item from a list and removing it so it's not picked again. | Drawing a card from a deck. |

### Category E: Physics Composition
Moving beyond simple collisions to mechanical systems.

| Name | One Sentence Description | Child's Mental Model |
|------|---------------------------|----------------------|
| **Revolute Joint** | A pin or hinge that lets parts spin around a point. | A clock hand or a car wheel. |
| **Distance Joint** | A stiff rod or a stretchy spring connecting two things. | A trailer hitch or a rubber band. |
| **Prismatic Joint** | A slider that lets things move back and forth in a straight line. | A drawer or a piston. |

---

## 3. Primitive Details

### Randomization (Category A)

#### `entityTemplate: string[]`
- **What it does**: Allows `spawn` actions and `spawn_on_event` behaviors to take an array of strings.
- **JSON syntax**:
  ```json
  {
    "type": "spawn",
    "template": ["red_slime", "blue_slime", "gold_slime"],
    "position": { "type": "at_collision" }
  }
  ```
- **Implementation notes**: Update `SpawnAction` and `SpawnOnEventBehavior` types in `rules.ts` and `behavior.ts`. Update game loop logic to call `Math.random()` when an array is detected.
- **Priority**: High | **Effort**: Easy

#### `choose(a, b, c, ...)` Expression
- **What it does**: Returns one of the arguments at random.
- **JSON syntax**: `"set_variable": { "name": "color", "value": "choose('red', 'green', 'blue')" }`
- **Implementation notes**: Add to `BUILTIN_FUNCTIONS` in `evaluator.ts`. Use `ctx.random()` for consistency.
- **Priority**: High | **Effort**: Easy

---

### Entity Queries (Category B)

#### `entityCount(tag)` Expression
- **What it does**: Returns the number of active entities with the given tag.
- **JSON syntax**: `"condition": "entityCount('enemy') < 5"`
- **Implementation notes**: Update `EvalContext` to include an `entityCount` helper. Add to `BUILTIN_FUNCTIONS` in `evaluator.ts`.
- **Priority**: Medium | **Effort**: Medium

#### `nearestEntity(tag)` Expression
- **What it does**: Returns an object containing the `x` and `y` of the closest entity with a tag.
- **JSON syntax**: `"apply_force": { "target": "self", "direction": "toward_entity", "entityPos": "nearestEntity('player')" }`
- **Implementation notes**: Requires spatial indexing or a simple loop over all entities in the evaluator.
- **Priority**: Low | **Effort**: Medium

---

### Composition (Category C)

#### `slots` on templates
- **What it does**: Defines named coordinate points relative to the entity center.
- **JSON syntax**:
  ```json
  "car_body": {
    "slots": {
      "front_wheel": { "x": 50, "y": 20 },
      "back_wheel": { "x": -50, "y": 20 }
    }
  }
  ```
- **Implementation notes**: Update `EntityTemplate` in `entity.ts`. Update renderer to optionally show slot helpers in debug mode.
- **Priority**: High | **Effort**: Medium

#### `attachTo` Behavior
- **What it does**: Forces an entity to follow a specific slot on a parent entity.
- **JSON syntax**:
  ```json
  {
    "type": "attachTo",
    "parentTag": "car_body",
    "slotName": "front_wheel"
  }
  ```
- **Implementation notes**: New behavior in `behavior.ts`. Physics engine must handle this by updating the child's transform every frame (non-physics) or creating a WeldJoint (physics).
- **Priority**: High | **Effort**: Hard

---

### Collections (Category D)

#### `lists` in Variables
- **What it does**: Variables can now be arrays `[]`.
- **JSON syntax**: `"set_variable": { "name": "inventory", "operation": "push", "value": "key_blue" }`
- **Implementation notes**: Update `SetVariableAction` and `VariableCondition`. Update `evaluator.ts` to handle array operations.
- **Priority**: Medium | **Effort**: Hard

---

### Physics (Category E)

#### `joints` in Game Definition
- **What it does**: Defines persistent connections between entities.
- **JSON syntax**:
  ```json
  "joints": [
    {
      "type": "revolute",
      "entityA": "car_body_1",
      "entityB": "wheel_1",
      "anchorA": { "x": 50, "y": 20 }
    }
  ]
  ```
- **Implementation notes**: Add `joints` array to `GameDefinition`. Update physics system to instantiate Box2D/LiquidFun joints during world setup.
- **Priority**: Medium | **Effort**: Hard

---

## 4. Implementation Phases

### Phase 1: Quick Wins (The "Random" Update)
*Focus: Enabling procedural variety without changing the architecture.*
- **Features**: `entityTemplate: string[]`, `choose()`, `randomInt()`, `entityCount()`.
- **Game Enabled**: **Slot Machine**. Three entities with `animate` behaviors. On `tap`, they set a variable `result = choose('cherry', 'bell', 'seven')`. A rule checks `if (r1 == r2 && r2 == r3) { win() }`.

### Phase 2: Core Expansion (The "Composition" Update)
*Focus: Building multi-part entities and simple AI.*
- **Features**: `slots`, `attachTo` (non-physics), `nearestEntity()`, `entityExists()`.
- **Game Enabled**: **Monster Mixer**. A "Body" spawns. It has slots for "Head" and "Legs". Buttons trigger `spawn` actions that pick random templates for those slots and `attachTo` the body.

### Phase 3: Advanced (The "Systems" Update)
*Focus: Physics-based builders and complex logic.*
- **Features**: `joints`, `lists`, `weightedChoice`, `Bag/Shuffle`.
- **Game Enabled**: **Random Car Builder**. Players pick wheels and bodies. The engine connects them with `revolute joints`. The player drives the car using `apply_torque` on the wheels.

---

## 5. Example Games Enabled (Deep Dive)

### 1. Random Doll Builder (Phase 2)
- **Mechanic**: Layered sprites on a base "Human" template.
- **Primitives**: `slots`, `attachTo`, `entityTemplate[]`.
- **Logic**: Tapping the "Hair" button destroys the old hair and spawns a random one from `["hair_curly", "hair_straight", "hair_bald"]` at the `head` slot.

### 2. Card Game / Blackjack (Phase 3)
- **Mechanic**: Drawing from a deck without replacement.
- **Primitives**: `lists`, `deck` draw operations, `entityCount`.
- **Logic**: A global variable `deck` starts as `[1, 2, ..., 52]`. `draw` operation picks one and removes it. UI updates using `entityCount` to show how many cards are left.

### 3. Procedural Dungeon (Phase 2)
- **Mechanic**: Rooms connecting to each other.
- **Primitives**: `entityTemplate[]` for room types, `spawn_on_event` (start).
- **Logic**: Each room has "Door" slots. When a room spawns, it spawns another random room at its door slots until a depth limit is reached.