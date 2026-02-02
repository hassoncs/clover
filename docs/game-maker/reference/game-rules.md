# Game Rules System

The rules system defines how games progress, how players win or lose, and what triggers game events. Rules are evaluated each frame after physics and behavior updates.

---

## Rule Structure

```typescript
interface GameRule {
  id: string;                    // Unique identifier
  name?: string;                 // Human-readable name
  enabled?: boolean;             // Can be toggled (default: true)
  
  // When does this rule trigger?
  trigger: RuleTrigger;
  
  // What conditions must be met?
  conditions?: RuleCondition[];
  
  // What happens when triggered?
  actions: RuleAction[];
  
  // How often can this rule fire?
  fireOnce?: boolean;            // Only trigger once per game
  cooldown?: number;             // Minimum seconds between triggers
}
```

---

## Triggers

Triggers define WHEN a rule is evaluated.

> **Note**: `ScoreTrigger` is deprecated. Use `FrameTrigger` with an expression condition instead.

```typescript
type RuleTrigger =
  | CollisionTrigger
  | TimerTrigger
  | ScoreTrigger (deprecated)
  | EntityCountTrigger
  | EventTrigger
  | FrameTrigger;

// When two entities collide
interface CollisionTrigger {
  type: 'collision';
  entityATag: string;            // Tag of first entity
  entityBTag: string;            // Tag of second entity
}

// After elapsed time
interface TimerTrigger {
  type: 'timer';
  time: number;                  // Seconds since game start
  repeat?: boolean;              // Trigger repeatedly at interval
}

// When score reaches threshold
interface ScoreTrigger {
  type: 'score';
  threshold: number;
  comparison: 'gte' | 'lte' | 'eq';  // >=, <=, ==
}

// When entity count changes
interface EntityCountTrigger {
  type: 'entity_count';
  tag: string;                   // Tag to count
  count: number;                 // Target count
  comparison: 'gte' | 'lte' | 'eq' | 'zero';
}

// When custom event fires
interface EventTrigger {
  type: 'event';
  eventName: string;
}

// Every frame (use sparingly!)
interface FrameTrigger {
  type: 'frame';
}
```

---

## Conditions

Conditions provide additional filtering beyond the trigger.

> **Note**: `ScoreCondition` is deprecated. Use `ExpressionCondition` instead.

```typescript
type RuleCondition =
  | ScoreCondition (deprecated)
  | TimeCondition
  | EntityExistsCondition
  | EntityCountCondition
  | RandomCondition
  | ExpressionCondition;

interface ExpressionCondition {
  type: 'expression';
  expr: string;                  // e.g., "score >= 100"
}

interface TimeCondition {
  type: 'time';
  min?: number;                  // Minimum elapsed seconds
  max?: number;                  // Maximum elapsed seconds
}

interface EntityExistsCondition {
  type: 'entity_exists';
  entityId?: string;
  entityTag?: string;
}

interface EntityCountCondition {
  type: 'entity_count';
  tag: string;
  min?: number;
  max?: number;
}

interface RandomCondition {
  type: 'random';
  probability: number;           // 0-1
}
```

---

## Actions

Actions define WHAT happens when a rule triggers.

> **Note**: `ScoreAction` is deprecated. Use `SetVariableAction` instead.

```typescript
type RuleAction =
  | SpawnAction
  | DestroyAction
  | ScoreAction (deprecated)
  | GameStateAction
  | SoundAction
  | EventAction
  | ModifyAction
  | SetVariableAction;

// ...

// Modify variable (replaces ScoreAction)
interface SetVariableAction {
  type: 'set_variable';
  name: string;                  // e.g., "score"
  operation: 'set' | 'add' | 'subtract' | 'multiply';
  value: number | string | boolean;
}


type SpawnPosition =
  | { type: 'fixed'; x: number; y: number }
  | { type: 'random'; bounds: Bounds }
  | { type: 'at_entity'; entityId: string }
  | { type: 'at_collision' };    // Where collision occurred

// Destroy entities
interface DestroyAction {
  type: 'destroy';
  target: DestroyTarget;
}

type DestroyTarget =
  | { type: 'by_id'; entityId: string }
  | { type: 'by_tag'; tag: string; count?: number }
  | { type: 'collision_entities' }  // Both entities in collision
  | { type: 'all' };

// Modify score
interface ScoreAction {
  type: 'score';
  operation: 'add' | 'subtract' | 'set' | 'multiply';
  value: number;
}

// Change game state
interface GameStateAction {
  type: 'game_state';
  state: 'win' | 'lose' | 'pause' | 'restart' | 'next_level';
  delay?: number;                // Delay before state change
}

// Play sound
interface SoundAction {
  type: 'sound';
  soundId: string;
  volume?: number;
}

// Fire custom event
interface EventAction {
  type: 'event';
  eventName: string;
  data?: Record<string, any>;
}

// Modify entity property
interface ModifyAction {
  type: 'modify';
  target: { type: 'by_id'; entityId: string } | { type: 'by_tag'; tag: string };
  property: string;              // Dot notation: "physics.velocity.x"
  operation: 'set' | 'add' | 'multiply';
  value: number;
}
```

---

## Win/Lose Conditions

Special rules that end the game.

> **Note**: Dedicated `score` and `lives` conditions are deprecated. Use `expr` (expressions) for all win/lose conditions.

```typescript
interface WinCondition {
  type?: WinConditionType;       // Optional if using expr
  expr?: string;                 // e.g., "score >= 100"
  
  // Type-specific parameters (deprecated)
  score?: number;
  tag?: string;
  time?: number;
  entityId?: string;
}

// ...

interface LoseCondition {
  type?: LoseConditionType;      // Optional if using expr
  expr?: string;                 // e.g., "lives <= 0"
  
  // Type-specific parameters (deprecated)
  tag?: string;
  time?: number;
  entityId?: string;
  score?: number;
}


type WinConditionType =
  | 'score'                      // Reach score threshold
  | 'destroy_all'                // Destroy all entities with tag
  | 'survive_time'               // Survive for duration
  | 'reach_entity'               // Player reaches target entity
  | 'collect_all'                // Collect all entities with tag
  | 'custom';                    // Use custom rule

interface LoseCondition {
  type: LoseConditionType;
  
  // Type-specific parameters
  tag?: string;                  // For 'entity_destroyed', 'entity_exits_screen'
  time?: number;                 // For 'time_up'
  entityId?: string;             // For 'entity_destroyed'
  score?: number;                // For 'score_below'
}

type LoseConditionType =
  | 'entity_destroyed'           // Specific entity or tag destroyed
  | 'entity_exits_screen'        // Entity leaves screen bounds
  | 'time_up'                    // Time limit exceeded
  | 'score_below'                // Score drops below threshold
  | 'lives_zero'                 // Out of lives
  | 'custom';                    // Use custom rule
```

---

## Common Rule Patterns

### Angry Birds-Style: Destroy All Enemies

```json
{
  "winCondition": {
    "type": "destroy_all",
    "tag": "enemy"
  },
  "loseCondition": {
    "type": "entity_destroyed",
    "tag": "projectile_source"
  },
  "rules": [
    {
      "id": "enemy_hit",
      "trigger": { "type": "collision", "entityATag": "projectile", "entityBTag": "enemy" },
      "actions": [
        { "type": "set_variable", "name": "score", "operation": "add", "value": 100 },
        { "type": "sound", "soundId": "hit" },
        { "type": "destroy", "target": { "type": "collision_entities" } }
      ]
    }
  ]
}
```

### Platformer: Collect All Coins

```json
{
  "winCondition": {
    "type": "collect_all",
    "tag": "coin"
  },
  "loseCondition": {
    "type": "entity_destroyed",
    "tag": "player"
  },
  "rules": [
    {
      "id": "collect_coin",
      "trigger": { "type": "collision", "entityATag": "player", "entityBTag": "coin" },
      "actions": [
        { "type": "set_variable", "name": "score", "operation": "add", "value": 10 },
        { "type": "sound", "soundId": "coin" },
        { "type": "destroy", "target": { "type": "by_tag", "tag": "coin", "count": 1 } }
      ]
    },
    {
      "id": "player_hit_enemy",
      "trigger": { "type": "collision", "entityATag": "player", "entityBTag": "enemy" },
      "actions": [
        { "type": "destroy", "target": { "type": "by_id", "entityId": "player" } }
      ]
    }
  ]
}
```

### Survival: Survive for 60 Seconds

```json
{
  "winCondition": {
    "type": "survive_time",
    "time": 60
  },
  "loseCondition": {
    "type": "entity_destroyed",
    "tag": "player"
  },
  "rules": [
    {
      "id": "spawn_enemies",
      "trigger": { "type": "timer", "time": 2, "repeat": true },
      "actions": [
        { 
          "type": "spawn", 
          "template": "enemy",
          "position": { "type": "random", "bounds": { "minX": 0, "maxX": 10, "minY": 0, "maxY": 1 } }
        }
      ]
    },
    {
      "id": "increase_difficulty",
      "trigger": { "type": "timer", "time": 20 },
      "actions": [
        { "type": "event", "eventName": "speed_up" }
      ],
      "fireOnce": true
    }
  ]
}
```

### High Score: Reach Target Score

```json
{
  "winCondition": {
    "type": "score",
    "score": 1000
  },
  "loseCondition": {
    "type": "time_up",
    "time": 120
  },
  "rules": [
    {
      "id": "hit_target",
      "trigger": { "type": "collision", "entityATag": "ball", "entityBTag": "target" },
      "actions": [
        { "type": "set_variable", "name": "score", "operation": "add", "value": 50 }
      ]
    },
    {
      "id": "bonus_target",
      "trigger": { "type": "collision", "entityATag": "ball", "entityBTag": "bonus_target" },
      "actions": [
        { "type": "set_variable", "name": "score", "operation": "add", "value": 200 },
        { "type": "destroy", "target": { "type": "collision_entities" } },
        { "type": "spawn", "template": "bonus_target", "position": { "type": "random", "bounds": { "minX": 2, "maxX": 8, "minY": 2, "maxY": 8 } } }
      ]
    }
  ]
}
```

---

## Rules System Implementation

The `RulesSystem` is a unified class that handles rule evaluation, win/lose conditions, and state machines. It implements the `RuntimeSystem` interface and is managed by the `GameSystemRunner`.

```typescript
class RulesSystem implements RuntimeSystem, IGameStateMutator {
  // ...
  
  // Called each frame by GameSystemRunner
  update(ctx: UpdateContext, state: RulesSystemState): void {
    // 1. Build EvalContext
    // 2. Check Win/Lose conditions (expressions)
    // 3. Evaluate Triggers
    // 4. Evaluate Conditions
    // 5. Execute Actions
    // 6. Process State Machines
  }
}
```

---

## Rule Priority and Ordering

Rules are evaluated in the order they are defined. For complex interactions:

1. **Scoring rules** should come before **destroy rules** (so points are awarded before entity is removed)
2. **Spawn rules** should come after **destroy rules** (so replacements appear after removal)
3. **Game state rules** (win/lose) are evaluated separately and take precedence

```json
{
  "rules": [
    { "id": "score_first", "trigger": "...", "actions": [{ "type": "set_variable", "name": "score", "operation": "add", "value": 100 }] },
    { "id": "then_destroy", "trigger": "...", "actions": [{ "type": "destroy", "target": "..." }] },
    { "id": "then_spawn", "trigger": "...", "actions": [{ "type": "spawn", "template": "..." }] }
  ]
}
```
