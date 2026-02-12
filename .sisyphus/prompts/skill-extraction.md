# Skill Extraction and Organization Prompt

## Goal
Transform scattered documentation into organized, auto-loadable skills in `.claude/skills/`. Each skill should be self-contained, actionable, and follow the established skill format.

## Skill Format Template

Each skill file must follow this structure:

```markdown
# {Skill Name}

> **Skill for AI Agents**: {One-line description of what this skill enables}

## When to Use This Skill

Load this skill when:
- {Specific trigger 1}
- {Specific trigger 2}
- {Specific trigger 3}

## Key Concepts

### {Concept 1}
{Explanation with code example if applicable}

### {Concept 2}
{Explanation with code example if applicable}

## Common Patterns

### {Pattern Name}
```typescript
// Code example
```

## Gotchas & Warnings

- **{Issue}**: {Explanation and fix}
- **{Issue}**: {Explanation and fix}

## Quick Reference

| Task | Solution |
|------|----------|
| {Common task} | {Quick answer} |

## See Also
- {Link to related skill}
- {Link to documentation}
```

## Phase 1: Discover and Categorize

First, scan all documentation files and categorize them by domain:

### Category A: Game Engine & Bridge (Critical)
**Source Files:**
- `docs/godot/BRIDGE_REFACTOR.md`
- `docs/godot/BRIDGE_E2E_TESTING.md`
- `docs/godot/UNIFIED_BRIDGE_DESIGN_BRIEF.md`
- `docs/godot/WEB_INPUT_HANDLING.md`
- `docs/godot/NATIVE_IMAGE_LOADING_ISSUE.md`
- `docs/godot/3d-rendering.md`
- `docs/godot/COORDINATE_SYSTEM_GUIDE.md`
- `docs/refactoring/gamebridge-module-split.md`
- `docs/refactoring/transform-sync-protocol.md`
- `docs/refactoring/coordinate-mapper-contract.md`
- `AGENTS.md` § Bridge sections

**Target Skills:**
1. `bridge-development.md` - Godot/TypeScript bridge, method registration, dispatch
2. `input-handling.md` - Web vs native input, touch, drag, gestures
3. `coordinate-systems.md` - World vs screen coordinates, transforms
4. `native-image-loading.md` - Texture loading, R2 assets, caching

### Category B: Asset Generation & Management (High Priority)
**Source Files:**
- `docs/IMAGE_GENERATION_ARCHITECTURE.md`
- `docs/gallery-system/GALLERY_MASTER_PLAN.md`
- `docs/gallery-system/INDEX.md`
- `docs/shared/reference/sound-generation.md` (if exists)
- `AGENTS.md` § Asset Pipeline sections

**Target Skills:**
1. `asset-generation.md` - Scenario.com, pipelines, silhouettes
2. `asset-packs.md` - Pack structure, R2 keys, resolution
3. `sound-generation.md` - ElevenLabs, sound effects

### Category C: Chat & AI Systems (High Priority)
**Source Files:**
- `.sisyphus/plans/chat-streaming-migration.md` (if archived)
- `AGENTS.md` § Chat Flow, Billing
- Any chat-related architecture docs

**Target Skills:**
1. `chat-streaming.md` - SSE, AG-UI, streaming patterns
2. `agent-billing.md` - Reservation/settlement/finalize pattern
3. `hitl-patterns.md` - Human-in-the-loop, askUser, tool calls

### Category D: Economy Engine (Medium Priority)
**Source Files:**
- `docs/economy/ENGINE_GUIDE.md` (already moved)
- `docs/economy/INDEX.md`
- `docs/economy/STRATEGY.md`
- `docs/economy/API_KEY_SETUP.md`
- `packages/economy-engine/` source files

**Target Skills:**
1. `economy-engine.md` - Graph simulation, nodes, edges, pools
2. `economy-rules.md` - Economy actions, conditions, rules integration

### Category E: Effects & Shaders (Medium Priority)
**Source Files:**
- `docs/effects/EFFECTS_ARCHITECTURE.md`
- `docs/effects/deferred-phases-roadmap.md`
- `docs/text-effects-implementation.md`
- `docs/special-effects/EFFECTS_PLAN.md`
- `godot_project/docs/VFX_IMPLEMENTATION_TODO.md`

**Target Skills:**
1. `effects-system.md` - Multi-pass effects, shaders, GPU
2. `text-effects.md` - Typography, text rendering, bitmap fonts

### Category F: Testing & Debugging (Medium Priority)
**Source Files:**
- `docs/game-inspector/unified-input-simulation-plan.md`
- `docs/testing/INPUT_CONTROL_TESTING.md`
- `docs/testing/SOCIAL_FEATURES_TESTING.md`
- `app/lib/godot/__tests__/README.md`

**Target Skills:**
1. `game-inspector.md` - MCP tools, debugging, assertions
2. `testing-patterns.md` - Unit tests, integration tests, fixtures

### Category G: React Native / Expo (Medium Priority)
**Source Files:**
- `docs/shared/guides/expo-development.md`
- `docs/shared/guides/storybook-setup.md`
- `docs/shared/reference/metro-port-configuration.md`
- `docs/shared/reference/platform-specific-modules.md`
- `AGENTS.md` § Expo & Native Build Commands

**Target Skills:**
1. `expo-native.md` - Metro config, platform modules, builds
2. `storybook-testing.md` - Component isolation, story writing

### Category H: Architecture & Patterns (Reference)
**Source Files:**
- `docs/ARCHITECTURE.md`
- `docs/VISION.md`
- `docs/roadmap/ai-game-generation-architecture.md`
- `docs/architecture/declarative-imperative-hybrid.md`
- `docs/architecture/godot-typescript-authority-analysis.md`

**Target Skills:**
1. `architecture-overview.md` - High-level system design
2. `ai-generation-patterns.md` - Game generation, planning, stages

## Phase 2: Extraction Process

For each source file:

1. **Read the file** - Understand the domain and key information
2. **Identify patterns** - Look for:
   - Code examples that show "the right way"
   - Warnings about what NOT to do
   - Step-by-step procedures
   - Common pitfalls and solutions
3. **Extract gotchas** - Copy verbatim any warnings, cautions, or notes
4. **Create quick reference tables** - Summarize common tasks and solutions
5. **Write the skill** following the template above

## Phase 3: Cross-Linking

After creating skills, add "See Also" sections linking related skills:
- `bridge-development.md` ↔ `input-handling.md`
- `asset-generation.md` ↔ `asset-packs.md`
- `chat-streaming.md` ↔ `agent-billing.md` ↔ `hitl-patterns.md`
- `economy-engine.md` ↔ `economy-rules.md`
- `effects-system.md` ↔ `text-effects.md`

## Phase 4: Validation

For each skill created:

1. **Verify it loads** - File is valid markdown
2. **Check triggers** - "When to Use" is specific enough
3. **Test code examples** - All code blocks use correct syntax
4. **Review gotchas** - Warnings are clear and actionable

## Deliverables

After running this prompt, you should have created:
- 15-20 skill files in `.claude/skills/`
- Each skill is 100-300 lines
- All source documentation is referenced
- Cross-links between related skills
- Updated `.claude/skills/README.md` (create if doesn't exist) indexing all skills

## Example Skill: bridge-development.md

Here's an example of what to create:

```markdown
# Bridge Development

> **Skill for AI Agents**: Working with the Godot-TypeScript bridge for game engine communication.

## When to Use This Skill

Load this skill when:
- Adding new bridge methods between TypeScript and Godot
- Debugging bridge communication issues
- Understanding the method registration and dispatch system
- Working with web vs native bridge implementations

## Key Concepts

### Bridge Method Registration

Bridge methods must be registered in `GameBridge.gd` to be callable from TypeScript:

```gdscript
# In GameBridge.gd _ready()
_method_map = {
    "spawn_entity": _spawn_entity,
    "destroy_entity": _destroy_entity,
    # ... etc
}
```

### Web vs Native Dispatch

**Web**: Direct iframe communication via `JavaScriptBridge.eval()`
**Native**: JSI (JavaScript Interface) through `callGameBridgeSync/Async`

## Common Patterns

### Adding a New Bridge Method

1. Add to `GodotBridge` interface in `app/lib/godot/types.ts`
2. Implement in `GodotBridge.web.ts` and `GodotBridge.native.ts`
3. Add handler in `GameBridge.gd` `_method_map`
4. Register in `BridgeRegistry.ts` for codegen

## Gotchas & Warnings

- **Method name mismatch**: Godot uses snake_case, TypeScript uses camelCase. The bridge handles conversion, but registration must use snake_case in GDScript.
- **Sync vs Async**: Web methods can be sync, native methods are always async. Design APIs accordingly.
- **CORS on streaming**: SSE endpoints need CORS headers on the streaming response itself, not just the initial request.

## Quick Reference

| Task | Solution |
|------|----------|
| Debug bridge calls | Check `window.GodotBridge._lastResult` in web console |
| Find method name | Check `BridgeRegistry.ts` for canonical names |
| Test bridge | Use `api/scripts/test-bridge.ts` |

## See Also
- `input-handling.md` - Input events through bridge
- `coordinate-systems.md` - Coordinate transformations
```

## Execution

Start with **Category A (Bridge)** since it's most critical, then proceed through B, C, D, etc.

For each category:
1. Read all source files in that category
2. Create the target skill files
3. Validate the output
4. Move to next category

DO NOT modify existing skills (`game-authoring.md`, `asset-pack-generation.md`) unless adding cross-links.

DO create new skills for categories not yet covered.
