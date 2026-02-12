# Effects System

> **Skill for AI Agents**: Working with the multi-pass shader effects system for visual effects
> **Version**: 1.0
> **Last Updated**: 2026-02-11
> **Source Docs**: docs/effects/EFFECTS_ARCHITECTURE.md

## When to Use This Skill

Load this skill when:
- Creating visual effects for games
- Writing shader graphs for post-processing
- Understanding how effects compile and execute
- Debugging effect rendering issues
- Working with ping-pong feedback buffers

## Key Concepts

### Three-Layer Architecture

```
Authoring (TypeScript)     Runtime (GDScript)
─────────────────────────────────────────────
EffectGraphSpec    ──▶    ResourceGraph
(nodes, edges)            (texture allocation)
                          │
CompiledPlan       ──▶    GraphExecutor
(passes, bindings)        (state machine)
                          │
                          ▼
                         PingPongManager
                         (feedback loops)
```

**Authoring Layer** (`EffectGraphSpec`):
- Node-based shader graph
- Nodes define shader operations
- Connections define data flow
- FeedbackEdges create temporal loops

**Runtime Layer** (GDScript):
- `ResourceGraph`: Manages texture allocation and binding
- `GraphExecutor`: Runs the state machine and per-frame loop
- `PingPongManager`: Handles SubViewport pairs for feedback

### Compilation Pipeline

```
EffectGraphSpec
    │
    ▼ validateGraph()       — structural checks (cycles, missing refs)
    │
    ▼ buildResourceGraph()  — allocate ResourceNodes, determine kinds
    │                         (screenColor, entityTexture, intermediate, feedback)
    │
    ▼ compileGraph()        — topological sort, build CompiledPass list
    │                         with inputBindings, feedbackPolicies
    │
    ▼ CompiledPlan          — JSON-serializable, sent to Godot
```

### Resource ID Conventions

| Pattern | Meaning | Example |
|---------|---------|---------|
| `__screenColor` | Screen's current render | Always available for screen-scoped |
| `{nodeId}:{bufferId}` | Intermediate buffer | `"fx:canvas"` |
| `__feedback:{from}->{to}` | Feedback connection | `"__feedback:fx->fx"` |
| `__pingpong:{passId}` | Internal ping-pong pair | Created by PingPongManager |

## Common Patterns

### Basic Effect Graph

```typescript
const spec: EffectGraphSpec = {
  nodes: [
    {
      id: "blur",
      type: "gaussian_blur",
      inputSlots: [{ id: "input", dataType: "texture" }],
      outputTarget: "blurOutput",
      params: { radius: 5 },
      flags: { stateful: false, fusible: true }
    },
    {
      id: "glow",
      type: "additive_glow",
      inputSlots: [
        { id: "base", dataType: "texture" },
        { id: "blur", dataType: "texture" }
      ],
      outputTarget: "final",
      params: { intensity: 0.5 }
    }
  ],
  connections: [
    { from: { nodeId: "blur", slotId: "output" }, to: { nodeId: "glow", slotId: "blur" } }
  ],
  feedbackEdges: []  // No temporal feedback
};
```

### Feedback/Ping-Pong Effect

```typescript
const feedbackSpec: EffectGraphSpec = {
  nodes: [
    {
      id: "trail",
      type: "motion_trail",
      inputSlots: [
        { id: "current", dataType: "texture" },
        { id: "previous", dataType: "texture" }  // From feedback
      ],
      outputTarget: "trailOutput",
      params: { decay: 0.9 },
      flags: { stateful: true }  // Participates in feedback
    }
  ],
  connections: [
    { from: { nodeId: "__screenColor" }, to: { nodeId: "trail", slotId: "current" } }
  ],
  feedbackEdges: [
    { fromNodeId: "trail", toNodeId: "trail", fromSlotId: "output", toSlotId: "previous" }
  ]
};
```

### Compiled Plan Structure

```typescript
const plan: CompiledPlan = {
  passes: [
    {
      shaderSource: "gaussian_blur.glsl",  // or builtin name
      requires: ["__screenColor"],          // input resources
      provides: ["blurOutput"],             // output resources
      params: {
        inputBindings: { "u_inputTexture": "__screenColor" },
        uniforms: { "u_radius": 5 }
      },
      persistence: "none"  // or "pingPong" for feedback
    }
  ],
  resourceMap: {
    "blurOutput": { kind: "intermediate", size: "viewport" },
    "__feedback:trail->trail": { kind: "feedback", policy: "pingPong" }
  },
  feedbackPolicies: {
    "trail": { type: "pingPong", blendMode: "additive" }
  }
};
```

## Gotchas & Warnings

- **Implicit input binding**: Unconnected input slots bind automatically based on `dataType` and graph scope. Screen-scoped graphs bind `texture` inputs to `__screenColor`. Entity-scoped graphs should declare inputs via `externalInputs`.

- **Ping-pong is not the only pattern**: Feedback edges create temporal loops, but ping-pong is just one implementation. The system also supports accumulation buffers and other persistence policies.

- **Resource ID collision**: Always prefix intermediate buffers with node ID (e.g., `"blur:output"`) to avoid collisions.

- **Shader compilation happens at runtime**: GLSL errors only surface when the effect is applied. Validate shaders offline when possible.

- **Viewport size affects all resources**: Intermediate buffers default to viewport size. Use explicit size for pixel-perfect effects.

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Black screen | Missing input binding | Check `requires` matches `inputBindings` |
| Effect not animating | Feedback edge missing | Add `feedbackEdges` for temporal persistence |
| Flickering | Ping-pong misconfigured | Check `persistence: "pingPong"` on pass |
| Validation error E_CYCLE | Circular dependency in graph | Remove cycles or use feedback edges |
| Validation error E_MISSING_REF | Connection references non-existent node/slot | Check node/slot IDs match |

## Quick Reference

| Task | Solution |
|------|----------|
| Validate effect graph | `validateGraph(spec)` — returns errors array |
| Compile to runtime plan | `compileGraph(spec)` — returns CompiledPlan |
| Apply effect | `bridge.applyEffectPlan(plan)` — sends to Godot |
| Debug resources | Log `resourceMap` to see allocated buffers |

## Related Skills

- `game-authoring.md` — Effects are part of GameDefinition.effects
- `bridge-development.md` — Effects use bridge dispatch
- `shaders.md` — Writing custom GLSL shaders for effects

## Changelog

- 2026-02-11: Created from EFFECTS_ARCHITECTURE.md
