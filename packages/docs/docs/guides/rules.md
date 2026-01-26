---
sidebar_position: 6
---

# Game Rules

Rules define what happens when events occur. They're the logic engine of your game.

## What are Rules?

Rules have three parts:
1. **Trigger** - When does this rule activate?
2. **Conditions** - Additional checks (optional)
3. **Actions** - What happens when triggered?

```typescript
{
  trigger: { type: "collision", entityATag: "ball", entityBTag: "brick" },
  actions: [
    { type: "destroy", targetTag: "brick" },
    { type: "add_score", amount: 10 },
  ],
}
```

## Triggers

### Collision

When two entities collide:

```typescript
{
  type: "collision",
  entityATag: "projectile",
  entityBTag: "enemy",
}
```

### Timer

After a delay:

```typescript
{
  type: "timer",
  time: 5, // seconds
  repeat: true,
}
```

### Score

When score reaches a threshold:

```typescript
{
  type: "score",
  threshold: 100,
  comparison: "gte", // gte, lte, eq
}
```

### Entity Count

When entity count changes:

```typescript
{
  type: "entity_count",
  tag: "enemy",
  count: 0,
  comparison: "eq",
}
```

### Tap

When player taps:

```typescript
{
  type: "tap",
  target: "screen", // screen, self, or entity id
}
```

### Button

When player presses a button:

```typescript
{
  type: "button",
  button: "jump", // left, right, up, down, jump, action
  state: "pressed", // pressed, released, held
}
```

### Game Start

When game begins:

```typescript
{
  type: "gameStart",
}
```

## Actions

### Add Score

```typescript
{
  type: "add_score",
  amount: 10,
}
```

### Destroy

```typescript
{
  type: "destroy",
  targetTag: "brick",
}
```

### Spawn

```typescript
{
  type: "spawn",
  templateId: "projectile",
  offset: { x: 0, y: 1 },
}
```

### Apply Force

```typescript
{
  type: "apply_force",
  targetTag: "ball",
  force: { x: 10, y: 0 },
}
```

### Play Sound

```typescript
{
  type: "play_sound",
  sound: "collision",
}
```

### Set Variable

```typescript
{
  type: "set_variable",
  name: "level",
  value: 2,
}
```

## Common Patterns

### Breakout Brick Collision

```typescript
rules: [
  {
    trigger: { type: "collision", entityATag: "ball", entityBTag: "brick" },
    actions: [
      { type: "destroy", targetTag: "brick" },
      { type: "add_score", amount: 10 },
      { type: "play_sound", sound: "brick_hit" },
    ],
  },
]
```

### Flappy Bird Scoring

```typescript
rules: [
  {
    trigger: { type: "collision", entityATag: "bird", entityBTag: "pipe_gap" },
    actions: [
      { type: "add_score", amount: 1 },
      { type: "play_sound", sound: "score" },
    ],
  },
]
```

### Enemy Spawning

```typescript
rules: [
  {
    trigger: { type: "timer", time: 2, repeat: true },
    actions: [
      {
        type: "spawn",
        templateId: "enemy",
        offset: { x: 5, y: 5 },
      },
    ],
  },
]
```

### Win Condition

```typescript
rules: [
  {
    trigger: { type: "entity_count", tag: "brick", count: 0, comparison: "eq" },
    actions: [
      { type: "set_game_state", state: "won" },
      { type: "play_sound", sound: "victory" },
    ],
  },
]
```

### Lose Condition

```typescript
rules: [
  {
    trigger: { type: "collision", entityATag: "ball", entityBTag: "bottom" },
    actions: [
      { type: "add_lives", amount: -1 },
      { type: "play_sound", sound: "lose_life" },
    ],
  },
]
```

### Player Jump

```typescript
rules: [
  {
    trigger: { type: "button", button: "jump", state: "pressed" },
    actions: [
      {
        type: "apply_force",
        targetTag: "player",
        force: { x: 0, y: 20 },
      },
    ],
  },
]
```

## Win/Lose Conditions

Define how the game ends:

```typescript
winCondition: {
  type: "score",
  score: 1000,
},
loseCondition: {
  type: "lives_zero",
},
```

### Win Types

- `score` - Reach a score
- `entity_count` - Destroy all of a type
- `time_up` - Survive until time runs out
- `none` - No win condition

### Lose Types

- `lives_zero` - Run out of lives
- `time_up` - Time runs out
- `collision` - Hit something bad
- `none` - No lose condition

## Tips

- **Keep rules simple** - One trigger, 2-3 actions
- **Use tags** - Tag entities for easy rule targeting
- **Test collisions** - Verify collision pairs work
- **Order matters** - Rules execute in order
- **Avoid infinite loops** - Don't spawn entities that trigger themselves

## Next Steps

- **[Complete Game Tutorial](./creating-a-game.md)** - Build a full game
- **[Rules Reference](/api-reference/type-aliases/GameRule)** - Full API docs
