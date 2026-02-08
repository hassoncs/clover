# Effects V2 Architecture

## System Overview

The Effects V2 system is a graph-based shader pipeline designed for high-performance, AI-authorable visual effects. It separates the concerns of graph definition, validation, compilation, and runtime execution.

The system is divided into three main domains:

1.  **Authoring Domain**: Handles the creation and normalization of effect graphs, often from AI-generated JSON.
2.  **Catalog Domain**: Manages the storage, versioning, and discovery of shader packages.
3.  **Runtime Domain**: Executes the compiled shader plans on the target platform (Godot/WebGL).

## Data Flow

```text
AI Output (Raw JSON)
      │
      ▼
[Normalizer] ──► EffectGraphSpec (Standardized)
      │
      ▼
[Validator] ───► Validation Results (Errors/Warnings)
      │
      ▼
[Compiler] ────► CompiledPlan (Execution Order, Resource Map)
      │
      ▼
[Runtime] ─────► Shader Execution (Passes, Buffers)
```

## Key Types

- **EffectGraphSpec**: The high-level definition of an effect, containing nodes, connections, and feedback edges.
- **EffectNode**: An atomic unit in the graph (Generator, Filter, or Combiner).
- **CompiledPlan**: A platform-agnostic execution plan that the runtime can use to schedule passes and allocate buffers.
- **CompiledPass**: A single shader execution step within a plan.
- **ResourceRef**: A reference to a texture or buffer used by passes.

## Module Map

| File | Responsibility |
| :--- | :--- |
| `types.ts` | Core interface definitions for graphs and plans. |
| `registry.ts` | Node type registration and AI hint management. |
| `normalizer.ts` | Converts loose AI-generated JSON into strict `EffectGraphSpec`. |
| `validator.ts` | Checks for cycles, budget violations, and connectivity issues. |
| `compiler.ts` | Performs topological sort and resource allocation. |
| `resources.ts` | Manages buffer formats and resolution scaling. |
| `package.ts` | Handles versioning and publishing of shader packages. |
| `budget.ts` | Enforces performance constraints (draw calls, memory). |
| `feedback.ts` | Manages stateful ping-pong buffers for feedback loops. |

## Lifecycle State Machine

```text
[IDLE] ──(Load)──► [READY] ──(Start)──► [RUNNING]
                     ▲                    │
                     │                  (Pause)
                     │                    ▼
                     └──(Stop)──────── [PAUSED]
```

## Troubleshooting Matrix

| Error Code | Likely Cause | Recommended Fix |
| :--- | :--- | :--- |
| `E_GRAPH_CYCLE` | Circular dependency in data flow. | Use a `FeedbackEdge` for intentional cycles. |
| `E_RESOURCE_UNRESOLVED` | A node input is not connected to any output. | Ensure all required input slots have connections. |
| `E_BUDGET_EXCEEDED` | Too many passes or high-res buffers for the platform. | Reduce node count or lower resolution modes. |
| `E_GENERATOR_HAS_INPUT` | A generator node (e.g., Noise) has an input connection. | Generators should only have outputs. |
| `E_FEEDBACK_LIMIT` | Too many stateful feedback loops. | Consolidate feedback effects into fewer nodes. |
| `E_ORDER_CONFLICT` | Contradictory ordering constraints. | Check `before`/`after` constraints in node registrations. |

## V1 Scope Boundary

### In Scope
- 7 MVP Nodes (Noise, Ramp, Feedback, Composite, Displace, Blur, Level).
- Multi-pass execution.
- Stateful feedback loops.
- AI-driven authoring flow.
- Basic performance budgeting.

### Out of Scope (Future)
- Visual graph editor (UI).
- Shader fusion (merging multiple nodes into one shader).
- Custom GLSL node authoring by users.
- Dynamic branching in graphs.

## Future Roadmap
- **Visual Editor**: A node-based UI for manual tweaking of AI-generated effects.
- **Fusion Engine**: Automatically merging compatible filter chains into a single mega-shader to reduce draw calls.
- **Asset Integration**: Direct sampling of game textures (sprites, backgrounds) within the effect graph.
