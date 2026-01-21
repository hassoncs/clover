# AI Integration

This document describes how AI generates games from natural language prompts and how the system ensures quality output.

---

## Overview

The AI integration has three main functions:

1. **Game Generation**: Transform natural language into complete GameDefinition JSON
2. **Asset Generation**: Create sprite images from entity descriptions
3. **Refinement**: Modify existing games based on user feedback

```
User Prompt                    AI Backend                     Frontend App
     │                             │                              │
     │  "Make a game where        │                              │
     │   cats catch falling       │                              │
     │   fish for points"         │                              │
     │────────────────────────────>│                              │
     │                             │                              │
     │                             │ 1. Analyze prompt            │
     │                             │ 2. Select game type          │
     │                             │ 3. Generate entities         │
     │                             │ 4. Add behaviors             │
     │                             │ 5. Set rules                 │
     │                             │ 6. Generate sprites          │
     │                             │                              │
     │                             │<─────────────────────────────│
     │                             │  GameDefinition + Assets     │
     │                             │─────────────────────────────>│
     │                             │                              │
     │                             │                              │ Load & Play
     │<────────────────────────────────────────────────────────────│
     │             Playable Game                                  │
```

---

## Prompt Analysis

### Understanding User Intent

The AI must classify the user's prompt into:

1. **Game Type**: Which category does this fit? (projectile, platformer, falling objects, etc.)
2. **Core Mechanic**: What is the primary interaction? (launch, catch, jump, balance, etc.)
3. **Theme/Aesthetics**: What visual style? (cats, space, medieval, etc.)
4. **Win Condition**: How does the player succeed?
5. **Difficulty Level**: Simple toy or challenging game?

### Prompt Classification Examples

| User Prompt | Game Type | Core Mechanic | Theme |
|-------------|-----------|---------------|-------|
| "Launch birds at pigs" | Projectile | drag_to_aim | Birds/pigs |
| "Jump on platforms to get coins" | Platformer | tap_to_jump | Generic/coins |
| "Stack blocks as high as possible" | Stacking | tap_to_drop | Blocks |
| "Roll a ball through a maze" | Balance | tilt_to_move | Ball/maze |
| "Car driving over hills" | Vehicle | accelerate/brake | Car |
| "Cut ropes to feed candy to monster" | Rope Physics | tap_to_cut | Candy/monster |

---

## System Prompt for Game Generation

The AI backend uses a structured system prompt:

```
You are a game designer AI that creates 2D physics-based mobile games.

Given a user's game description, generate a complete GameDefinition JSON that can be immediately played.

## Available Game Types
- Projectile: Launch objects at targets (Angry Birds style)
- Platformer: Jump between platforms, collect items
- Falling Objects: Objects fall and stack or are caught
- Vehicle: Drive wheeled vehicles over terrain
- Balance: Tilt to balance or roll objects
- Rope Physics: Swing, cut, or climb ropes
- Pinball: Ball bounces off bumpers and flippers

## Available Behaviors
- move: Linear movement in direction or toward target
- rotate: Continuous rotation
- control: User input (tap_to_jump, drag_to_aim, tilt_to_move, etc.)
- spawn_on_event: Create entities on tap, timer, or collision
- destroy_on_collision: Remove entity when colliding with tags
- score_on_collision: Award points on collision
- oscillate: Back-and-forth movement
- timer: Delayed or repeated actions

## Available Physics Features
- Body types: static, dynamic, kinematic
- Shapes: box, circle, polygon
- Joints: revolute (hinges), distance (ropes)
- Properties: density, friction, restitution (bounciness)

## Output Format
Return a valid GameDefinition JSON with:
1. meta: name, description
2. settings: world size, gravity, background color
3. templates: reusable entity definitions
4. entities: all game objects with positions
5. rules: scoring, spawning, game events
6. winCondition: how to win
7. loseCondition: how to lose

## Guidelines
- Keep it simple: 5-15 entities maximum
- Use clear entity names and IDs
- Include at least one interactive element (player control)
- Set reasonable physics values (density 0.5-2, friction 0.1-0.8, restitution 0-0.9)
- Include win AND lose conditions
- Use tags consistently for rules (e.g., "player", "enemy", "collectible")
```

---

## Generation Pipeline

### Step 1: Intent Extraction

```typescript
interface GameIntent {
  gameType: GameType;
  theme: string;
  playerAction: string;
  targetAction: string;
  winConditionType: WinConditionType;
  difficulty: 'easy' | 'medium' | 'hard';
  specialRequests: string[];
}

// Example extraction
// Input: "Make a game where I sling cats at towers of boxes"
// Output:
{
  gameType: 'projectile',
  theme: 'cats',
  playerAction: 'sling',
  targetAction: 'knock down towers',
  winConditionType: 'destroy_all',
  difficulty: 'medium',
  specialRequests: []
}
```

### Step 2: Template Selection

Based on game type, select a base template:

```typescript
const GAME_TEMPLATES: Record<GameType, Partial<GameDefinition>> = {
  projectile: {
    settings: {
      gravity: { x: 0, y: 9.8 },
      worldWidth: 20,
      worldHeight: 12
    },
    templates: {
      projectile: { /* slingshot projectile */ },
      target: { /* destructible target */ },
      ground: { /* static ground */ }
    },
    // ... base rules for projectile games
  },
  // ... other templates
};
```

### Step 3: Entity Generation

Populate entities based on theme and requirements:

```typescript
// For "cats knocking down towers":
const entities = [
  // Launcher
  {
    id: "launcher",
    template: "launcher",
    transform: { x: 2, y: 8 },
    behaviors: [
      { type: "control", controlType: "drag_to_aim", force: 15 },
      { type: "spawn_on_event", event: "release", entityTemplate: "cat" }
    ]
  },
  // Tower blocks (generated procedurally)
  ...generateTower({ x: 12, y: 8, width: 3, height: 5, blockTemplate: "box" }),
  // Enemy targets
  { id: "target_1", template: "target", transform: { x: 12, y: 6 }, tags: ["enemy"] },
  { id: "target_2", template: "target", transform: { x: 14, y: 7 }, tags: ["enemy"] },
  // Ground
  { id: "ground", template: "ground", transform: { x: 10, y: 11 } }
];
```

### Step 4: Asset Description Generation

Generate prompts for image generation:

```typescript
interface AssetRequest {
  entityId: string;
  prompt: string;
  style: string;
  size: { width: number; height: number };
}

// For the cat projectile:
{
  entityId: "cat",
  prompt: "cute cartoon cat, angry expression, flying through air, side view, simple design, no background",
  style: "2D cartoon, bright colors, clean lines",
  size: { width: 128, height: 128 }
}
```

### Step 5: Validation

Before returning, validate the game definition:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateGame(game: GameDefinition): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!game.meta?.name) errors.push("Missing game name");
  if (!game.entities?.length) errors.push("No entities defined");
  if (!game.winCondition) warnings.push("No win condition - game may not end");
  
  // Entity validation
  for (const entity of game.entities || []) {
    if (!entity.id) errors.push("Entity missing ID");
    if (!entity.transform) errors.push(`Entity ${entity.id} missing transform`);
    
    // Template reference check
    if (entity.template && !game.templates?.[entity.template]) {
      errors.push(`Entity ${entity.id} references undefined template: ${entity.template}`);
    }
  }
  
  // Physics validation
  for (const entity of game.entities || []) {
    if (entity.physics) {
      if (entity.physics.density < 0) errors.push(`Entity ${entity.id} has negative density`);
      if (entity.physics.restitution > 1) warnings.push(`Entity ${entity.id} restitution > 1 may cause instability`);
    }
  }
  
  // Rule validation
  for (const rule of game.rules || []) {
    if (rule.trigger.type === 'collision') {
      const trigger = rule.trigger as CollisionTrigger;
      const hasTagA = game.entities?.some(e => e.tags?.includes(trigger.entityATag));
      const hasTagB = game.entities?.some(e => e.tags?.includes(trigger.entityBTag));
      if (!hasTagA) warnings.push(`Rule ${rule.id} references non-existent tag: ${trigger.entityATag}`);
      if (!hasTagB) warnings.push(`Rule ${rule.id} references non-existent tag: ${trigger.entityBTag}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## Refinement Pipeline

When users request modifications, use a focused prompt:

```
You are modifying an existing game based on user feedback.

Current Game Definition:
{current_game_json}

User Request: "{user_modification_request}"

## Instructions
1. Identify what needs to change (entities, behaviors, rules, physics)
2. Make minimal changes to satisfy the request
3. Preserve all unrelated parts of the game
4. Ensure the game still validates after changes

## Common Modifications
- "Make X bigger/smaller" → Adjust sprite/physics size
- "Make X faster/slower" → Adjust speed in move behavior
- "More bouncy" → Increase restitution
- "Add more enemies" → Duplicate and reposition entities
- "Make it easier/harder" → Adjust physics, timing, quantities

Return the complete modified GameDefinition JSON.
```

### Modification Examples

| User Request | AI Action |
|--------------|-----------|
| "Make the ball bouncier" | Increase `physics.restitution` on ball entity |
| "Add more enemies" | Duplicate enemy entities with new positions |
| "Make jumping higher" | Increase `force` in jump control behavior |
| "Slow down the platforms" | Decrease `speed` in platform move behaviors |
| "Change the cat to a dog" | Update sprite description, regenerate asset |
| "Make it a night theme" | Update `backgroundColor`, adjust sprite colors |

---

## Asset Generation

### Sprite Generation Prompt Template

```
Create a 2D game sprite:

Subject: {entity_description}
Style: {game_style} (cartoon, pixel art, realistic, etc.)
View: {view_angle} (side view, top-down, isometric)
Background: Transparent (PNG with alpha)
Size: {width}x{height} pixels

Requirements:
- Simple, clear silhouette
- Suitable for mobile game
- No text or watermarks
- Consistent with other game assets
```

### Style Consistency

Maintain style across all game assets:

```typescript
interface GameStyle {
  artStyle: 'cartoon' | 'pixel' | 'flat' | 'realistic';
  colorPalette: string[];  // Hex colors
  outlineStyle: 'none' | 'thin' | 'thick';
  shadingStyle: 'flat' | 'soft' | 'cel';
}

// Extract style from first asset, apply to all subsequent
function generateConsistentAssets(entities: GameEntity[], style: GameStyle): AssetRequest[] {
  return entities.map(entity => ({
    entityId: entity.id,
    prompt: buildAssetPrompt(entity, style),
    style: `${style.artStyle}, ${style.shadingStyle} shading, ${style.outlineStyle} outline`,
    // ...
  }));
}
```

---

## Error Handling

### Generation Failures

```typescript
interface GenerationResult {
  success: boolean;
  game?: GameDefinition;
  assets?: AssetMap;
  error?: GenerationError;
}

interface GenerationError {
  code: 'INVALID_PROMPT' | 'GENERATION_FAILED' | 'VALIDATION_FAILED' | 'ASSET_FAILED';
  message: string;
  suggestions?: string[];
}

// Handle failures gracefully
async function generateGame(prompt: string): Promise<GenerationResult> {
  try {
    const intent = await analyzeIntent(prompt);
    
    if (!intent.gameType) {
      return {
        success: false,
        error: {
          code: 'INVALID_PROMPT',
          message: "Couldn't understand what kind of game you want",
          suggestions: [
            "Try being more specific about the gameplay",
            "Example: 'A game where I launch balls at targets'",
            "Example: 'A platformer where a cat collects fish'"
          ]
        }
      };
    }
    
    const game = await generateGameDefinition(intent);
    const validation = validateGame(game);
    
    if (!validation.valid) {
      // Attempt self-correction
      const correctedGame = await correctGame(game, validation.errors);
      const revalidation = validateGame(correctedGame);
      
      if (!revalidation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: "Generated game has issues",
            suggestions: ["Try a simpler game description"]
          }
        };
      }
      
      game = correctedGame;
    }
    
    const assets = await generateAssets(game);
    
    return { success: true, game, assets };
    
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'GENERATION_FAILED',
        message: "Something went wrong during generation",
        suggestions: ["Try again", "Simplify your request"]
      }
    };
  }
}
```

---

## Quality Metrics

Track generation quality:

```typescript
interface GenerationMetrics {
  promptId: string;
  timestamp: Date;
  
  // Generation metrics
  generationTimeMs: number;
  validationPassed: boolean;
  errorsFound: number;
  warningsFound: number;
  selfCorrectionAttempts: number;
  
  // Game metrics
  entityCount: number;
  behaviorCount: number;
  ruleCount: number;
  
  // User feedback (collected later)
  userPlayed: boolean;
  playDurationSeconds?: number;
  userRating?: number;  // 1-5
  userModified: boolean;
}
```

---

## Prompt Examples Library

Provide users with example prompts:

```typescript
const EXAMPLE_PROMPTS = [
  {
    category: "Projectile",
    prompts: [
      "A game where I sling birds at pig towers",
      "Launch basketballs into hoops for points",
      "Throw paper airplanes at targets"
    ]
  },
  {
    category: "Platformer", 
    prompts: [
      "A cat jumping on clouds to collect stars",
      "A robot hopping between platforms avoiding spikes",
      "Jump on enemies to defeat them and reach the flag"
    ]
  },
  {
    category: "Falling Objects",
    prompts: [
      "Catch falling fruit in a basket",
      "Stack blocks as high as possible",
      "Drop balls into colored buckets for points"
    ]
  },
  {
    category: "Vehicle",
    prompts: [
      "Drive a monster truck over bumpy hills",
      "Race a car and collect coins",
      "Balance a motorcycle on ramps"
    ]
  },
  {
    category: "Physics Toys",
    prompts: [
      "A sandbox where I drop bouncy balls",
      "Ragdoll characters that I can throw around",
      "Dominoes that I can set up and knock down"
    ]
  }
];
```
