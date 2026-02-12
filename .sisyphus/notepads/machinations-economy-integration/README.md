# Economy Engine Documentation

## Overview

The Slopcade Economy Engine provides deterministic, graph-based resource flow simulation for games. It enables designers to model complex economic systems using Machinations-inspired node graphs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Economy Engine Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AI Generation    API Validation    Runtime Simulation       │
│       │                │                    │               │
│       ▼                ▼                    ▼               │
│  ┌─────────┐     ┌─────────┐     ┌─────────────────────┐   │
│  │ Schemas │────▶│ Validate│────▶│ EconomyRuntimeSystem│   │
│  └─────────┘     └─────────┘     └─────────────────────┘   │
│       │                │                    │               │
│       ▼                ▼                    ▼               │
│  ┌─────────┐     ┌─────────┐     ┌─────────────────────┐   │
│  │ Generate│     │ Simulate│     │ Rules Bridge        │   │
│  │ Economy │     │ Jobs    │     │ (Actions/Conditions)│   │
│  └─────────┘     └─────────┘     └─────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Define an Economy Graph

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
  ["gold"]
);
```

### 2. Add to Game Definition

```json
{
  "metadata": { "title": "My Game" },
  "economy": {
    "id": "my-economy",
    "resourceTypes": ["gold"],
    "nodes": [...],
    "edges": [...]
  }
}
```

### 3. Runtime Integration (Automatic)

The `EconomyRuntimeSystem` automatically:
- Initializes when `definition.economy` is present
- Runs at 1 tick/second (configurable)
- Emits events: `economy:pool_full`, `economy:pool_empty`, etc.

## Node Types

### Source
Generates resources each tick.
```typescript
{ id: "mine", type: "source", label: "Gold Mine", resourceType: "gold" }
```

### Pool
Stores resources with capacity.
```typescript
{ id: "wallet", type: "pool", label: "Wallet", resourceType: "gold", initialValue: 0, capacity: 100 }
```

### Drain
Consumes resources.
```typescript
{ id: "shop", type: "drain", label: "Shop", resourceType: "gold" }
```

### Gate
Routes resources probabilistically or conditionally.
```typescript
{ id: "luck", type: "gate", label: "Luck Gate", resourceType: "gold", mode: "probabilistic" }
```

### Converter
Transforms one resource type to another.
```typescript
{ id: "forge", type: "converter", label: "Forge", inputResourceType: "ore", outputResourceType: "ingot", rate: 2 }
```

## Rules Integration

### Actions

Transfer resources between pools:
```json
{
  "type": "economy_transfer",
  "fromPool": "treasury",
  "toPool": "player-wallet",
  "amount": 10
}
```

Set pool value directly:
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

### Conditions

Check pool value:
```json
{
  "type": "economy_pool_above",
  "poolId": "gold",
  "threshold": 50
}
```

## API Endpoints

### Validate Economy Graph
```bash
POST /trpc/economyGraph.validateGraph
{ "graph": { ... } }
```

### Run Simulation
```bash
POST /trpc/economyGraph.simulate
{
  "graph": { ... },
  "ticks": 100,
  "seed": 42
}
```

## Testing

Run all economy tests:
```bash
./.sisyphus/scripts/run-economy-tests.sh
```

Capture evidence:
```bash
./.sisyphus/scripts/capture-evidence.sh
```

## Rollout Flags

The economy system is **opt-in** via game definition:
- Games without `economy` field work unchanged
- Economy validation runs only when `economy` is present
- Runtime system initializes only when `definition.economy` exists

## Troubleshooting

### Deadlocks
- Check for cycles in resource flow
- Ensure sources exist for all consumed resources
- Use `validateEconomyGraph()` to detect issues

### Invalid Graph Errors
Common validation errors:
- `E_MISSING_NODE_REF`: Edge references non-existent node
- `E_DUPLICATE_NODE_ID`: Two nodes with same ID
- `E_SELF_LOOP`: Edge from node to itself
- `E_INVALID_GATE_PROBABILITY`: Gate probabilities sum > 1

### Performance
- Max simulation ticks: 1000 per request
- Tick rate: Default 1 tick/second
- Use `run(ticks)` for batch simulation

## Module Reference

| Module | Purpose |
|--------|---------|
| `@slopcade/economy-engine` | Core types, schemas, simulator |
| `EconomyRuntimeSystem` | Runtime integration |
| `Economy*ActionExecutor` | Rules actions |
| `EconomyPoolConditionEvaluator` | Rules conditions |
| `economy-graph.ts` | API routes |

## See Also

- [Integration Tests](../../packages/economy-engine/src/__tests__/integration.test.ts)
- [Fixtures](../../.sisyphus/fixtures/economy/)
- [Test Scripts](../../.sisyphus/scripts/)
