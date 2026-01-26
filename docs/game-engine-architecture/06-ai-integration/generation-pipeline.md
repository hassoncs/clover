# AI Game Generation Pipeline

**Consolidated**: 2026-01-26  
**Sources**: `ai-integration.md` + `game-types.md`  
**Status**: Production System

---

## Overview

The AI transforms natural language prompts into complete, playable games through a multi-stage pipeline:

```
User Prompt
    ↓
Intent Classification → Game Type + Theme + Mechanics
    ↓
Template Selection → Base structure for game type
    ↓
Entity Generation → Populate with themed entities
    ↓
Asset Description → Prepare sprite generation prompts
    ↓
Validation → Ensure game is playable
    ↓
GameDefinition JSON + Asset Requests
```

---

## Prompt Analysis

### Extracting Intent

AI classifies prompts into:

| Component | Purpose | Example |
|-----------|---------|---------|
| **Game Type** | Core mechanical pattern | `projectile`, `platformer`, `falling_objects` |
| **Theme** | Visual style/setting | `cats`, `space`, `medieval` |
| **Player Action** | Primary verb | `launch`, `catch`, `jump`, `balance` |
| **Target Action** | What affects targets | `destroy`, `collect`, `avoid` |
| **Win Condition** | Success criteria | `destroy_all`, `score`, `survive_time` |
| **Difficulty** | Challenge level | `easy`, `medium`, `hard` |

**Example Prompt**: "Make a game where cats catch falling fish for points"

**Extracted Intent**:
```json
{
  "gameType": "falling_objects",
  "theme": "underwater cats",
  "playerAction": "catch",
  "targetAction": "fall",
  "winConditionType": "score",
  "difficulty": "medium"
}
```

---

## 8 Supported Game Types

| Type | Description | Examples | Template Tier |
|------|-------------|----------|---------------|
| **projectile** | Launch objects to hit targets | Angry Birds, Cannon | Tier 2 |
| **platformer** | Jump and navigate obstacles | Mario, Doodle Jump | Tier 2 |
| **falling_objects** | Catch/avoid falling items | Fruit Ninja (catching) | Tier 1 |
| **vehicle** | Drive/control vehicle physics | Hill Climb Racing | Tier 2 |
| **balance** | Keep things balanced | Tipping scales, Jenga | Tier 2 |
| **rope** | Rope/chain physics | Cut the Rope | Tier 2 |
| **pinball** | Ball bouncing with flippers | Pinball | Tier 2 |
| **endless_runner** | Auto-scrolling obstacle course | Subway Surfers | Tier 1 |

**Tier 1** = AI can generate complete game reliably (90%+ success)  
**Tier 2** = Requires tuning or careful level design (70-85% success)

---

## Generation Pipeline

### Step 1: Template Selection

Each game type has a **partial GameDefinition template**:

```typescript
const FALLING_OBJECTS_TEMPLATE = {
  world: { gravity: { x: 0, y: 15 }, pixelsPerMeter: 50 },
  camera: { type: 'fixed', zoom: 1 },
  ui: { showScore: true, showLives: true },
  loseCondition: { type: 'lives_zero' },
  winCondition: { type: 'score', score: 100 },
  // ... base structure
};
```

AI fills in the blanks based on theme.

### Step 2: Entity Generation

For each game type, AI knows which entities are needed:

**Falling Objects Game Needs**:
- Catcher (player-controlled)
- Falling item (falls + destroys on catch)
- Bad item (falls + damages on catch)
- Ground (lose if items hit ground)
- Walls (boundaries)

AI generates entity templates with:
- Appropriate physics (dynamic/static/kinematic)
- Themed descriptions (`"cute cat with catching basket"`)
- Correct behaviors (`move`, `destroy_on_collision`, etc.)

### Step 3: Asset Description Generation

For each entity, generate sprite prompt:

```typescript
{
  entityId: 'catcher',
  entityType: 'character',
  description: 'a cute cartoon cat with a woven wicker basket, standing upright with a cheerful expression, soft orange fur with white belly, whiskers',
  style: 'cartoon',
  size: { width: 100, height: 150 },
}
```

These go to Scenario.com for image generation.

### Step 4: Validation

Check generated game for:
- Required fields present
- Entity templates referenced by entities
- Physics parameters valid (density > 0 for dynamic, etc.)
- Tags exist where referenced
- Win/lose conditions defined
- At least one control method

If validation fails, AI attempts **self-correction** (1 retry).

---

## System Prompt (Key Excerpts)

### Available Behaviors

```markdown
You can use these behaviors:
- `move`: Continuous movement (left, right, up, down, toward_target)
- `rotate`: Continuous rotation
- `control`: Player input (tap_to_jump, drag_to_move, tilt_to_move, buttons)
- `spawn_on_event`: Spawn entities on triggers (tap, timer, collision)
- `destroy_on_collision`: Remove on collision with tag
- `score_on_collision`: Award points on collision
- `oscillate`: Wave motion
- `timer`: Timed actions
- `draggable`: Touch/mouse dragging
```

### Guidelines

```markdown
- Limit to 5-15 entities max
- Use clear, semantic names (not "entity1", "entity2")
- Every interactive element needs a control behavior
- Set reasonable physics values (density 0.1-10, restitution 0-1)
- Always provide BOTH win AND lose conditions
- Use tags consistently (don't mix "enemy" and "bad_guy")
```

### Output Format

```json
{
  "metadata": { "id": "...", "title": "...", "description": "..." },
  "world": { "gravity": {...}, "bounds": {...} },
  "templates": { ... },
  "entities": [ ... ],
  "rules": [ ... ],
  "winCondition": { ... },
  "loseCondition": { ... }
}
```

---

## Refinement Pipeline

When user requests changes:

```
"Make the ball faster"
    ↓
AI identifies what to change:
- Locate ball entity
- Find speed/velocity parameter
- Increase by reasonable amount
    ↓
Generate minimal modification:
{ "templates": { "ball": { "behaviors": [{ "type": "maintain_speed", "speed": 15 }] }}}
    ↓
Merge with existing definition
    ↓
Validate
    ↓
Return modified game
```

### Modification Examples

| User Request | AI Action |
|-------------|-----------|
| "Make it bouncier" | Increase `restitution` |
| "Add more enemies" | Duplicate enemy template + spawn rules |
| "Higher jump" | Increase `force` in jump behavior |
| "Slow down" | Decrease `speed` values |
| "Change cat to dog" | Update sprite descriptions, regenerate |
| "Night theme" | Update `backgroundColor`, adjust colors |

---

## Error Handling

### Generation Result

```typescript
interface GenerationResult {
  success: boolean;
  game?: GameDefinition;
  assets?: AssetRequest[];
  error?: GenerationError;
}

interface GenerationError {
  code: 'INVALID_PROMPT' | 'GENERATION_FAILED' | 'VALIDATION_FAILED' | 'ASSET_FAILED';
  message: string;
  suggestions?: string[];
}
```

### Self-Correction

If generation fails validation:
1. AI receives validation errors
2. Attempts to fix (1 retry max)
3. If still fails, returns error with suggestions

---

## Quality Metrics

AI generation tracks:

```typescript
interface GenerationMetrics {
  generationTimeMs: number;
  validationPassed: boolean;
  errorsFound: string[];
  selfCorrectionAttempts: number;
  gameMetrics: {
    entityCount: number;
    behaviorCount: number;
    ruleCount: number;
  };
  userFeedback?: {
    userPlayed: boolean;
    playDurationSeconds: number;
    userRating?: 1 | 2 | 3 | 4 | 5;
    userModified: boolean;
  };
}
```

**Target Metrics**:
- Generation time: <5 seconds
- Validation pass rate: >95%
- Play rate: >80%
- Average rating: >3.5/5

---

## Integration with Variables & Tunables

AI should generate variables for all numeric gameplay parameters:

```json
{
  "variables": {
    "enemySpeed": {
      "value": 10,
      "tuning": { "min": 3, "max": 20, "step": 1 },
      "category": "gameplay",
      "label": "Enemy Speed"
    },
    "spawnInterval": {
      "value": 2,
      "tuning": { "min": 0.5, "max": 5, "step": 0.5 },
      "category": "gameplay",
      "label": "Spawn Rate"
    }
  }
}
```

Then reference in behaviors:
```json
{
  "behaviors": [
    { "type": "move", "speed": { "expr": "enemySpeed" } }
  ]
}
```

---

## Future: Integration with Hierarchy

When hierarchy system is implemented, AI can generate nested structures:

```json
{
  "templates": {
    "boss": {
      "children": [
        { "name": "LeftArm", "template": "bossArm", "slot": "leftArm" },
        { "name": "RightArm", "template": "bossArm", "slot": "rightArm" }
      ]
    }
  }
}
```

This will unlock complex multi-part entity generation.

---

## Related Documentation

- [Entity System](../01-core-concepts/entity-system.md)
- [Behavior System](../01-core-concepts/behavior-system.md)
- [Rules System](../01-core-concepts/rules-system.md)
- [Variables & Tuning](../../IMPLEMENTATION-SPEC-002-VARIABLE-TUNING.md)
- [Tier 1 Templates](./tier-1-templates.md)
