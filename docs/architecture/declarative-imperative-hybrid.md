# Declarative-Imperative Hybrid Game Engine Architecture

## Problem Statement

Building an AI-powered game maker requires a game engine that can be both:
1. **Declarative** - Easy for AI to generate, compose, and reason about
2. **Imperative** - Flexible enough for complex game-specific logic

Currently, our game engine uses a Script-First model where game logic is implemented in JavaScript modules.

## The Tension

### Pure Declarative (What We Want for AI)
```typescript
// AI can generate this easily
prefabs: {
  candy: {
    visual: { type: "circle", color: "#ff0000" }
  }
}
```
**Pros:** Composable, AI-friendly, no code needed
**Cons:** Limited expressiveness, can't handle complex algorithms

### Pure Imperative (What Complex Games Need)
```typescript
// Match detection algorithm - must be code
private findMatches(): Match[] {
  // Complex board scanning logic
}
```
**Pros:** Full flexibility, any algorithm possible
**Cons:** AI can't generate, hard to compose, mixes concerns

## The Insight

**Different concerns have different needs:**

| Concern | Best Approach | Example |
|---------|---------------|---------|
| Visual feedback | Scripted | "Selected things glow and pulse" |
| Input response | Scripted | "When tapped, add 'selected' tag" |
| Game algorithms | Scripted | Match-3 detection, pathfinding |
| Board management | Scripted | Grid state, cascades, spawning |

## Final Architecture: Script-First (Feb 2026)

The engine uses a full **Script-First** architecture. 

### Key Components:
1. **Modules**: All logic (including visual state management) is handled in JavaScript modules.
2. **`scriptRef`**: Prefabs and entities explicitly point to these modules.
3. **Sandbox Execution**: Logic runs in a `ScriptSandbox` (QuickJS/Eval) with full engine access via `ScriptContext`.

### Patterns in Script-First:
- **Visual Feedback**: Managed by scripts calling `ctx.animateEntity()` or `ctx.setSpriteEffect()`.
- **Game Logic**: Pure JS functions responding to `onUpdate`, `onCollision`, etc.
- **State**: Managed via game variables and entity tags.
