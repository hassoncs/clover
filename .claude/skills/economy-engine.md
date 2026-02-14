---
description: "Machinations-inspired economy graph engine for games. Covers resource pools, flows, converters, drains, and economy simulation. Use when adding economy systems, resource flows, or currency mechanics to games."
---

# Economy Engine

> **Skill for AI Agents**: Building and integrating economy systems using the Machinations-inspired graph engine
> **Version**: 1.0
> **Last Updated**: 2026-02-11
> **Source Docs**: docs/economy/ENGINE_GUIDE.md, packages/economy-engine/

## When to Use This Skill

Load when working on:
- Adding an economy system to a game
- Defining resource flows, pools, and converters
- Creating economy-driven game mechanics
- Debugging economy simulation issues
- Integrating economy with game scripts

## Key Concepts

### Economy Graph Structure

Economies are directed graphs with nodes (resources) and edges (flows):

```
Source ──► Pool ──► Drain
   │         │
   ▼         ▼
Converter  Gate
```

**Nodes**:
- **Source**: Generates resources each tick
- **Pool**: Stores resources with capacity  
- **Drain**: Consumes resources
- **Gate**: Routes probabilistically or conditionally
- **Converter**: Transforms one resource to another

**Edges**: Define resource flow between nodes with rate expressions

### Integration Flow

```
Authoring (TypeScript) → Validation (API) → Runtime (Godot)
     │                        │                  │
     ▼                        ▼                  ▼
 makeGraph()           validateGraph()    EconomyRuntimeSystem
 EffectGraphSpec       Simulation Jobs    Rules Bridge
```

### Runtime System

`EconomyRuntimeSystem` automatically:
- Initializes when `definition.economy` is present
- Runs at 1 tick/second (configurable)
- Emits events: `economy:pool_full`, `economy:pool_empty`, `economy:transfer`
- Accessible from game scripts via ScriptContext

## Common Patterns

### Basic Economy Setup

```typescript
import { makeGraph, makeSource, makePool, makeDrain, makeResourceEdge } from "@slopcade/economy-engine";

const economy = makeGraph(
  [
    makeSource("gold-mine", "gold"),
    makePool("treasury", "gold", 100),
    makeDrain("shop", "gold"),
  ],
  [
    makeResourceEdge("mine-to-treasury", "gold-mine", "treasury", "5"),
    makeResourceEdge("treasury-to-shop", "treasury", "shop", "2"),
  ],
  ["gold"]  // valid resource types
);
```

### Game Definition Integration

```typescript
const game: GameDefinition = {
  metadata: { title: "My Game" },
  economy: {
    id: "my-economy",
    resourceTypes: ["gold", "gems"],
    nodes: [
      { id: "mine", type: "source", label: "Gold Mine", resourceType: "gold" },
      { id: "wallet", type: "pool", label: "Wallet", resourceType: "gold", initialValue: 0, capacity: 100 },
    ],
    edges: [
      { id: "income", from: "mine", to: "wallet", resourceType: "gold", expression: "10" },
    ],
  },
  // ... rest of game
};
```

### Economy Actions in Rules

Transfer resources:
```json
{
  "type": "economy_transfer",
  "fromPool": "treasury",
  "toPool": "player-wallet",
  "amount": 10
}
```

Set pool value:
```json
{
  "type": "economy_set_value",
  "poolId": "score",
  "value": 100
}
```

Emit custom event:
```json
{
  "type": "economy_emit_event",
  "eventType": "bonus_activated",
  "data": { "multiplier": 2 }
}
```

### Economy Conditions in Rules

Check pool value:
```json
{
  "type": "economy_pool_above",
  "poolId": "gold",
  "threshold": 50
}
```

## Gotchas & Warnings

- **Deadlocks**: Check for cycles in resource flow. Ensure sources exist for all consumed resources. Use `validateEconomyGraph()` to detect issues.

- **Invalid expressions**: Edge expressions must evaluate to valid numbers. Use simple arithmetic or references to pool values.

- **Resource type mismatch**: All nodes in a flow must use the same resourceType. Converters are the exception (they transform types).

- **Pool capacity**: Pools reject overflow by default. Use gates or drains to handle excess resources.

- **Determinism**: The economy is deterministic given a seed. Random gates use the simulation's RNG for reproducibility.

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| `E_MISSING_NODE_REF` | Edge references non-existent node | Check node IDs match exactly |
| `E_DUPLICATE_NODE_ID` | Two nodes with same ID | Use unique IDs for each node |
| `E_SELF_LOOP` | Edge from node to itself | Add an intermediate pool |
| `E_INVALID_GATE_PROBABILITY` | Gate probabilities sum > 1 | Normalize probabilities |
| Resources not flowing | Deadlock or blocked drain | Check for cycles, ensure outputs exist |
| Pool not filling | Source rate is 0 or expression invalid | Check source expression evaluates to > 0 |

## Quick Reference

| Task | Solution |
|------|----------|
| Validate graph | `validateEconomyGraph(graph)` — returns `{ valid, errors[] }` |
| Simulate economy | `new EconomySimulator(graph, seed)` then `.run(ticks)` or `.tick()` |
| Get current state | `simulator.getState()` — returns `EconomyState` with `nodeValues`, `tick` |
| Debug economy | Check `economy:pool_*` events in game logs |

## Node Type Reference

| Type | Purpose | Key Fields |
|------|---------|------------|
| `source` | Generate resources | `resourceType`, `expression` (rate) |
| `pool` | Store resources | `resourceType`, `initialValue`, `capacity` |
| `drain` | Consume resources | `resourceType` |
| `gate` | Route probabilistically | `resourceType`, `mode: "probabilistic" \| "conditional"` |
| `converter` | Transform resources | `inputResourceType`, `outputResourceType`, `rate` |

## Related Skills

- `game-authoring.md` — Economy is part of GameDefinition
- `ecs-architecture.md` — Economy accessible from scripts

## Changelog

- 2026-02-11: Created from ENGINE_GUIDE.md
