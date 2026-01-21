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

```typescript
type RuleTrigger =
  | CollisionTrigger
  | TimerTrigger
  | ScoreTrigger
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

```typescript
type RuleCondition =
  | ScoreCondition
  | TimeCondition
  | EntityExistsCondition
  | EntityCountCondition
  | RandomCondition;

interface ScoreCondition {
  type: 'score';
  min?: number;
  max?: number;
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

```typescript
type RuleAction =
  | SpawnAction
  | DestroyAction
  | ScoreAction
  | GameStateAction
  | SoundAction
  | EventAction
  | ModifyAction;

// Create an entity
interface SpawnAction {
  type: 'spawn';
  template: string;
  position: SpawnPosition;
  count?: number;                // Spawn multiple
  spread?: number;               // Random spread radius
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

```typescript
interface WinCondition {
  type: WinConditionType;
  
  // Type-specific parameters
  score?: number;                // For 'score' type
  tag?: string;                  // For 'destroy_all', 'reach_entity'
  time?: number;                 // For 'survive_time'
  entityId?: string;             // For 'reach_entity', 'protect_entity'
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
        { "type": "score", "operation": "add", "value": 100 },
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
        { "type": "score", "operation": "add", "value": 10 },
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
        { "type": "score", "operation": "add", "value": 50 }
      ]
    },
    {
      "id": "bonus_target",
      "trigger": { "type": "collision", "entityATag": "ball", "entityBTag": "bonus_target" },
      "actions": [
        { "type": "score", "operation": "add", "value": 200 },
        { "type": "destroy", "target": { "type": "collision_entities" } },
        { "type": "spawn", "template": "bonus_target", "position": { "type": "random", "bounds": { "minX": 2, "maxX": 8, "minY": 2, "maxY": 8 } } }
      ]
    }
  ]
}
```

---

## Rules Evaluator Implementation

```typescript
class RulesEvaluator {
  private rules: GameRule[] = [];
  private winCondition: WinCondition | null = null;
  private loseCondition: LoseCondition | null = null;
  
  private gameState: 'playing' | 'won' | 'lost' = 'playing';
  private score: number = 0;
  private elapsedTime: number = 0;
  
  private firedOnce: Set<string> = new Set();
  private cooldowns: Map<string, number> = new Map();
  
  loadRules(rules: GameRule[]): void {
    this.rules = rules;
  }
  
  setWinCondition(condition: WinCondition): void {
    this.winCondition = condition;
  }
  
  setLoseCondition(condition: LoseCondition): void {
    this.loseCondition = condition;
  }
  
  // Called each frame
  update(dt: number, context: RuleContext): void {
    if (this.gameState !== 'playing') return;
    
    this.elapsedTime += dt;
    
    // Check win/lose conditions first
    if (this.checkWinCondition(context)) {
      this.gameState = 'won';
      return;
    }
    
    if (this.checkLoseCondition(context)) {
      this.gameState = 'lost';
      return;
    }
    
    // Evaluate each rule
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (rule.fireOnce && this.firedOnce.has(rule.id)) continue;
      
      const cooldown = this.cooldowns.get(rule.id);
      if (cooldown && this.elapsedTime < cooldown) continue;
      
      if (this.evaluateTrigger(rule.trigger, context)) {
        if (this.evaluateConditions(rule.conditions, context)) {
          this.executeActions(rule.actions, context);
          
          if (rule.fireOnce) {
            this.firedOnce.add(rule.id);
          }
          
          if (rule.cooldown) {
            this.cooldowns.set(rule.id, this.elapsedTime + rule.cooldown);
          }
        }
      }
    }
  }
  
  // Called when collision occurs
  handleCollision(entityA: Entity, entityB: Entity, context: RuleContext): void {
    // Find rules with collision triggers matching these entities
    for (const rule of this.rules) {
      if (rule.trigger.type !== 'collision') continue;
      
      const trigger = rule.trigger as CollisionTrigger;
      const matches = 
        (entityA.tags?.includes(trigger.entityATag) && entityB.tags?.includes(trigger.entityBTag)) ||
        (entityA.tags?.includes(trigger.entityBTag) && entityB.tags?.includes(trigger.entityATag));
      
      if (matches) {
        const collisionContext = { ...context, collisionEntityA: entityA, collisionEntityB: entityB };
        if (this.evaluateConditions(rule.conditions, collisionContext)) {
          this.executeActions(rule.actions, collisionContext);
        }
      }
    }
  }
  
  private checkWinCondition(context: RuleContext): boolean {
    if (!this.winCondition) return false;
    
    switch (this.winCondition.type) {
      case 'score':
        return this.score >= (this.winCondition.score || 0);
      case 'destroy_all':
        return context.entityManager.getEntitiesByTag(this.winCondition.tag || '').length === 0;
      case 'survive_time':
        return this.elapsedTime >= (this.winCondition.time || 0);
      // ... other conditions
      default:
        return false;
    }
  }
  
  private checkLoseCondition(context: RuleContext): boolean {
    if (!this.loseCondition) return false;
    
    switch (this.loseCondition.type) {
      case 'entity_destroyed':
        const tag = this.loseCondition.tag;
        return tag ? context.entityManager.getEntitiesByTag(tag).length === 0 : false;
      case 'time_up':
        return this.elapsedTime >= (this.loseCondition.time || 0);
      // ... other conditions
      default:
        return false;
    }
  }
  
  addScore(points: number): void {
    this.score += points;
  }
  
  getScore(): number {
    return this.score;
  }
  
  getGameState(): 'playing' | 'won' | 'lost' {
    return this.gameState;
  }
  
  getElapsedTime(): number {
    return this.elapsedTime;
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
    { "id": "score_first", "trigger": "...", "actions": [{ "type": "score", "operation": "add", "value": 100 }] },
    { "id": "then_destroy", "trigger": "...", "actions": [{ "type": "destroy", "target": "..." }] },
    { "id": "then_spawn", "trigger": "...", "actions": [{ "type": "spawn", "template": "..." }] }
  ]
}
```
