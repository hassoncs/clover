# AI Authoring Playbook: Effects V2

This playbook provides guidance for generating valid `EffectGraphSpec` JSON using AI.

## Prompt Template

When asking an AI to generate an effect, use the following structure:

```text
Generate a Slopcade Effect Graph JSON for a [DESCRIPTION OF EFFECT].

Constraints:
1. Use only the following node types: noise, ramp, feedback, composite, displace, blur, level.
2. Ensure the graph is a Directed Acyclic Graph (DAG), unless using 'feedback' nodes.
3. Every node must have a unique 'id'.
4. 'generator' nodes (noise, ramp) must not have inputs.
5. 'filter' nodes (blur, level, feedback) must have exactly one input named 'texture'.
6. 'combiner' nodes (composite, displace) must have two inputs.
   - composite: 'base', 'overlay'
   - displace: 'source', 'displacementMap'
7. The 'output' field in a connection must match the 'bufferId' of the source node's 'outputTarget'.

Output only the JSON object.
```

## Example: Dreamy Underwater Effect

**Prompt**: "Create a dreamy underwater effect with blue tints, slight blurring, and wavy displacement."

**Generated JSON**:
```json
{
  "id": "underwater-v1",
  "version": "1.0.0",
  "engineApiVersion": "1.0.0",
  "scope": "screen",
  "nodes": [
    {
      "id": "bg-noise",
      "type": "noise",
      "family": "generator",
      "params": { "scale": 2.0, "octaves": 3 },
      "outputTarget": { "bufferId": "b1", "format": "rgba8", "resolution": "full" }
    },
    {
      "id": "waves",
      "type": "blur",
      "family": "filter",
      "params": { "radius": 10.0 },
      "outputTarget": { "bufferId": "b2", "format": "rgba8", "resolution": "full" }
    },
    {
      "id": "tint",
      "type": "level",
      "family": "filter",
      "params": { "outputBlack": 0.1, "gamma": 1.2 },
      "outputTarget": { "bufferId": "b3", "format": "rgba8", "resolution": "full" }
    }
  ],
  "connections": [
    { "from": { "nodeId": "bg-noise", "output": "b1" }, "to": { "nodeId": "waves", "input": "texture" } },
    { "from": { "nodeId": "waves", "output": "b2" }, "to": { "nodeId": "tint", "input": "texture" } }
  ]
}
```

## Node Type Reference

### 1. Noise (`noise`)
- **Aliases**: `perlin`, `simplex`, `procedural texture`
- **Params**: `scale` (float), `octaves` (int), `persistence` (float), `seed` (int)

### 2. Ramp (`ramp`)
- **Aliases**: `gradient`, `linear gradient`, `radial gradient`
- **Params**: `direction` (`horizontal`|`vertical`|`radial`), `colorA` (hex), `colorB` (hex)

### 3. Feedback (`feedback`)
- **Aliases**: `trails`, `ghosting`, `motion blur`
- **Params**: `mixFactor` (0-1), `decayRate` (0-1)
- **Note**: Requires a `FeedbackEdge` in the graph spec for the loop.

### 4. Composite (`composite`)
- **Aliases**: `blend`, `mix`, `layer`
- **Params**: `blendMode` (`normal`|`add`|`multiply`|`screen`), `opacity` (0-1)

### 5. Displace (`displace`)
- **Aliases**: `warp`, `distort`, `refraction`
- **Params**: `strength` (float), `channel` (`r`|`rg`)

### 6. Blur (`blur`)
- **Aliases**: `soften`, `smooth`, `gaussian`
- **Params**: `radius` (float), `sigma` (float)

### 7. Level (`level`)
- **Aliases**: `brightness`, `contrast`, `color correction`
- **Params**: `inputBlack`, `inputWhite`, `gamma`, `outputBlack`, `outputWhite`

## Common AI Mistakes & Fixes

| Mistake | Normalizer/Validator Action | Fix |
| :--- | :--- | :--- |
| Missing `family` | Normalizer infers from `type`. | AI should include `family` for clarity. |
| Connecting to non-existent slot | Validator throws `E_RESOURCE_UNRESOLVED`. | Check node reference for correct slot names. |
| Generator with input | Validator throws `E_GENERATOR_HAS_INPUT`. | Remove input connection from noise/ramp nodes. |
| Cycle without feedback node | Validator throws `E_GRAPH_CYCLE`. | Use `feedback` node and `feedbackEdges` array. |
