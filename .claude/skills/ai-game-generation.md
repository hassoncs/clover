---
name: ai-game-generation
description: Use when working with AI game generation, the agent execution engine, game generation stages, asset pipeline, theme planning, prompt classification, or AI-powered game building workflows
---

# AI Game Generation

The AI game generation system lives in `api/src/ai/`. It has three main subsystems:

1. **Agent** (`api/src/ai/agent/`) — Multi-stage execution engine for orchestrated game creation
2. **Game** (`api/src/ai/game/`) — Standalone game generation/refinement via structured output
3. **Pipeline** (`api/src/ai/pipeline/`) — Asset image generation pipeline (silhouettes, img2img, bg removal, R2 upload)

## Directory Map

| Path | Purpose |
|------|---------|
| `api/src/ai/agent/execution-engine.ts` | Stage orchestration, prerequisite validation, checkpoint persistence |
| `api/src/ai/agent/tier-config.ts` | `AgentTier` type, `TierModelConfig`, `TIER_CONFIGS`, model selection per tier |
| `api/src/ai/agent/artifact-manager.ts` | `ArtifactManager` class — R2 versioning, publish, rollback for game definitions |
| `api/src/ai/agent/feature-flags.ts` | `isAIEditingEnabled()` — currently always returns `true` |
| `api/src/ai/agent/stages.ts` | Re-exports all stage runners; `refine`, `theme`, `asset`, `chat` are pass-through placeholders |
| `api/src/ai/agent/stages/planning.ts` | `planningStage` — generates markdown planning doc via `generateText` |
| `api/src/ai/agent/stages/build.ts` | `buildStage` — generates `GameDefinition` JSON via `generateObject` + `GameDefinitionSchema` |
| `api/src/ai/agent/stages/shader.ts` | `shaderStage` — generates Godot shaders, writes to R2 workspace + definition |
| `api/src/ai/agent/stages/refine.ts` | `refineStage` — validates game definition, re-generates if invalid |
| `api/src/ai/agent/stages/theme.ts` | `themeStage` — calls `generateThemePlan` to create per-prefab visual plans |
| `api/src/ai/agent/stages/asset.ts` | `assetStage` — calls `executeGameAssets` from the pipeline executor |
| `api/src/ai/game/generator.ts` | `generateGame()`, `refineGame()` — standalone game generation with retry logic |
| `api/src/ai/game/classifier.ts` | `classifyPrompt()` — keyword-based intent extraction from user prompts |
| `api/src/ai/game/validator.ts` | Re-exports `validateGameDefinition` from `@slopcade/shared/validation` |
| `api/src/ai/game/schemas.ts` | `GameDefinitionSchema` — Zod schema used by `generateObject` for structured output |
| `api/src/ai/model-factory.ts` | `createModel()` — creates OpenRouter-backed `LanguageModel` via `@ai-sdk/openai` |
| `api/src/ai/chat-model-config.ts` | `ChatModelTier`, `CHAT_MODELS`, `resolveChatModel()` — chat model selection |
| `api/src/ai/pipeline/types.ts` | Core pipeline types: `AssetSpec`, `AssetRun`, `Stage`, `PipelineAdapters`, `GameAssetConfig` |
| `api/src/ai/pipeline/executor.ts` | `executeAsset()`, `executeGameAssets()` — runs pipeline stages sequentially per asset |
| `api/src/ai/pipeline/registry.ts` | `pipelineRegistry` — maps `AssetType` to ordered `Stage[]` arrays |
| `api/src/ai/pipeline/stages/index.ts` | Pipeline stage implementations: silhouette, build-prompt, upload, img2img, txt2img, remove-bg, upload-r2 |
| `api/src/ai/pipeline/theme-planner.ts` | `generateThemePlan()` — txt2txt AI call to OpenRouter for cohesive theme plans |
| `api/src/ai/pipeline/theme-plan.ts` | `ThemePlan`, `PrefabPlan`, `CohesionAnchors` types + Zod schemas |
| `api/src/ai/pipeline/prompt-builder.ts` | `buildPromptForSpec()`, `buildEntityPrompt()` — constructs image generation prompts |
| `api/src/ai/archetypes/index.ts` | `ARCHETYPES` record — currently only `'paint-shader'` |
| `api/src/ai/archetypes/paint-shader.ts` | `ShaderArchetype` interface, `paintShaderArchetype` with example Godot shaders |
| `api/src/ai/providers/contract.ts` | `ImageGenerationAdapter` interface, `ImageProvider` type, `ProviderError` class |
| `api/src/ai/skills/types.ts` | `Skill` interface — `{ id, name, description, keywords, priority, content }` |

## Agent Execution Engine

### Tier System

`AgentTier` is a string union, not an object:

```typescript
// api/src/ai/agent/tier-config.ts
type AgentTier = 'free' | 'standard' | 'pro';

interface TierModelConfig {
  tier: AgentTier;
  displayName: string;
  primary: { provider: 'openrouter'; model: string };
  maxBudgetMicros: number;
  estimatedCostPerStepMicros: number;
}
```

Tier model assignments:
- `free` → `openai/gpt-4o-mini` (budget: 50,000 micros)
- `standard` → `openai/gpt-4o` (budget: 200,000 micros)
- `pro` → `anthropic/claude-sonnet-4-20250514` (budget: 500,000 micros)

Key functions: `resolveTierConfig(tier)`, `createModelForTier(config, env)`, `estimateRunCost(tier, steps)`.

### Stage Types

```typescript
// api/src/ai/agent/execution-engine.ts
type AgentStage = 'planning' | 'build' | 'shader' | 'refine' | 'theme' | 'asset' | 'chat';

const STAGE_ORDER: AgentStage[] = ['planning', 'build', 'shader', 'refine', 'theme', 'asset'];
// Note: 'chat' is not in STAGE_ORDER — it's a separate on-demand stage
```

### Stage Result (Discriminated Union)

```typescript
// api/src/ai/agent/execution-engine.ts
type AgentExecutionStageResult =
  | {
      status: 'succeeded';
      outputArtifactKey: string;
      costMicros: number;
      inputTokens: number;
      outputTokens: number;
      provider: string;
      model: string;
      checkpoint: Record<string, unknown>;
    }
  | {
      status: 'failed';
      failureReason: FailureReason;
      errorMessage: string;
      checkpoint: Record<string, unknown>;
      costMicros: number;
      inputTokens: number;
      outputTokens: number;
      provider: string;
      model: string;
    };

type FailureReason =
  | 'MISSING_PREREQUISITE'
  | 'VALIDATION_FAILED'
  | 'MODEL_ERROR'
  | 'ASSET_PIPELINE_FAILED'
  | 'PERSISTENCE_ERROR'
  | 'UNKNOWN';
```

### Stage Context

```typescript
// api/src/ai/agent/execution-engine.ts
interface AgentExecutionStageContext {
  runId: string;
  stepId: string;
  stepIndex: number;
  stage: AgentStage;
  tier: AgentTier;
  env: AgentExecutionEnv;
  previousArtifacts: Partial<Record<AgentStage, string>>;
  context: AgentExecutionRunContext;
  planningDoc?: string;
  gameDefinition?: GameDefinition;
  themePlan?: ThemePlan;
}

interface AgentExecutionRunContext {
  gameId: string;
  gameTitle: string;
  gameDescription: string | null;
  planningDocJson?: string | null;
}
```

### Stage Prerequisites

Validated in `validateStagePrerequisites()`:
- `planning` → no prerequisites
- `build` → requires `planning` artifact
- `shader`, `refine`, `theme` → requires `planning` + `build` artifacts
- `asset` → requires `planning` + `build` + `theme` artifacts

### Execution Entry Point

```typescript
// api/src/ai/agent/execution-engine.ts
function executeAgentStage(
  input: ExecuteAgentStageInput,
  options?: ExecuteAgentStageOptions
): Promise<AgentExecutionStageResult>
```

Checkpoints are persisted to R2 at `agent-runs/{runId}/steps/{stepIndex}/{stage}/checkpoint.json`.

### Implemented vs Placeholder Stages

**Fully implemented** (have real AI calls):
- `planningStage` — uses `generateText` from Vercel AI SDK
- `buildStage` — uses `generateObject` with `GameDefinitionSchema`
- `shaderStage` — uses `generateText`, parses Godot shader blocks from markdown
- `refineStage` — uses `generateObject` to fix validation errors
- `themeStage` — calls `generateThemePlan()` (raw OpenRouter fetch)
- `assetStage` — calls `executeGameAssets()` from pipeline executor

**Pass-through placeholders** (in `api/src/ai/agent/stages.ts`):
- `refineStage` (the re-exported one from `stages.ts`) — pass-through
- `themeStage` (the re-exported one from `stages.ts`) — pass-through
- `assetStage` (the re-exported one from `stages.ts`) — pass-through
- `chatStage` — pass-through

Note: `stages.ts` creates pass-through versions of refine/theme/asset/chat via `makePassThroughStage()`, but also re-exports the real `planningStage`, `buildStage`, `shaderStage` from `stages/`. The real implementations in `stages/refine.ts`, `stages/theme.ts`, `stages/asset.ts` exist but the barrel file (`stages.ts`) exports the pass-through versions for refine/theme/asset/chat.

## Standalone Game Generation

`api/src/ai/game/generator.ts` provides a simpler path without the multi-stage agent:

```typescript
function generateGame(prompt: string, config: AIConfig, options?: GenerationOptions): Promise<GenerationResult>
function refineGame(currentGame: GameDefinition, request: string, config: AIConfig): Promise<RefinementResult>

interface GenerationResult {
  success: boolean;
  game?: GameDefinition;
  error?: { code: 'INVALID_PROMPT' | 'GENERATION_FAILED' | 'VALIDATION_FAILED' | 'API_ERROR'; message: string; suggestions?: string[] };
  intent?: GameIntent;
  validationResult?: GameDefinitionValidationResult;
  retryCount?: number;
}
```

### Prompt Classification

`classifyPrompt(prompt)` returns a `GameIntent`:

```typescript
// api/src/ai/game/classifier.ts
type GameType = 'projectile' | 'platformer' | 'stacking' | 'vehicle' | 'falling_objects' | 'rope_physics' | 'match3' | 'tetris';

interface GameIntent {
  gameType: GameType;
  theme: string;
  playerAction: string;
  targetAction: string;
  winConditionType: WinConditionType;
  loseConditionType: LoseConditionType;
  controlIntent: ControlIntent;
  difficulty: 'easy' | 'medium' | 'hard';
  specialRequests: string[];
}
```

## Asset Pipeline

### Pipeline Flow

Each `AssetSpec` flows through an ordered list of `Stage` objects from the registry:

```
entity:     silhouette → build-prompt → upload-provider → img2img → remove-bg → upload-r2
background: build-prompt → txt2img → upload-r2
title_hero: build-prompt → txt2img → upload-r2
parallax:   build-prompt → txt2img → layered-decompose → upload-r2
sheet:      sheet-guide → build-prompt → upload-provider → img2img → remove-bg → build-sheet-metadata → upload-r2
text_grid:  build-prompt → txt2img → upload-r2
```

### Asset Types

```typescript
// api/src/ai/pipeline/types.ts
type AssetType = 'entity' | 'background' | 'title_hero' | 'title_hero_no_bg' | 'parallax' | 'sheet' | 'text_grid';
type EntityType = 'character' | 'enemy' | 'item' | 'platform' | 'background' | 'ui';
```

### Pipeline Adapters

```typescript
// api/src/ai/pipeline/types.ts
interface PipelineAdapters {
  provider: ImageGenerationAdapter;
  scenario?: ImageGenerationAdapter;  // @deprecated
  r2: R2Adapter;
  silhouette: SilhouetteAdapter;
}
```

### Image Provider Contract

```typescript
// api/src/ai/providers/contract.ts
type ImageProvider = 'scenario' | 'comfyui' | 'modal';

interface ImageGenerationAdapter {
  uploadImage: (png: Uint8Array) => Promise<string>;
  txt2img: (params: { prompt: string; width?: number; height?: number; guidance?: number; seed?: number }) => Promise<{ assetId: string }>;
  img2img: (params: { imageAssetId: string; prompt: string; strength?: number; guidance?: number }) => Promise<{ assetId: string }>;
  downloadImage: (assetId: string) => Promise<{ buffer: Uint8Array; extension: string }>;
  removeBackground: (assetId: string) => Promise<{ assetId: string }>;
  layeredDecompose?: (params: { imageAssetId: string; layerCount: number; description?: string }) => Promise<{ assetIds: string[] }>;
}
```

### Theme Planning

```typescript
// api/src/ai/pipeline/theme-plan.ts
interface ThemePlan {
  version: 1;
  theme: string;
  style?: string;
  globalPalette: string[];
  prefabPlans: Record<string, PrefabPlan>;
  cohesionAnchors: CohesionAnchors;
  generatedAt: string;
  providerModel?: string;
}

interface PrefabPlan {
  prefabId: string;
  conceptName: string;
  prompt: string;
  negativePrompt?: string;
  silhouetteColor: string;
  rationale: string;
  skipSilhouette?: boolean;
}

interface CohesionAnchors {
  motifFamily: string;
  colorHarmony: string;
  moodDescriptor: string;
}
```

`generateThemePlan()` in `theme-planner.ts` makes raw `fetch` calls to OpenRouter (not using Vercel AI SDK). It retries up to 3 times with decreasing temperature.

## Model Configuration

All LLM calls go through OpenRouter. Two model selection systems:

1. **Agent tiers** (`tier-config.ts`): `free`/`standard`/`pro` → specific models for game generation stages
2. **Chat tiers** (`chat-model-config.ts`): `fast`/`balanced`/`quality`/`reasoning` → models for editor chat

```typescript
// api/src/ai/chat-model-config.ts
type ChatModelTier = 'fast' | 'balanced' | 'quality' | 'reasoning';

// Current assignments:
// fast     → openai/gpt-oss-120b:nitro
// balanced → openai/gpt-4o
// quality  → anthropic/claude-sonnet-4-20250514
// reasoning → moonshotai/kimi-k2-thinking
```

`createModel()` in `model-factory.ts` creates a Vercel AI SDK `LanguageModel` via `createOpenAI` with OpenRouter base URL.

## Artifact Manager

`ArtifactManager` class manages game definition versioning in R2:

```typescript
// api/src/ai/agent/artifact-manager.ts
class ArtifactManager {
  getRunFinalDefinitionKey(runId: string): string     // agent-runs/{runId}/final/definition.json
  getActiveDefinitionKey(gameId: string): string       // games/{gameId}/definition.json
  getVersionDefinitionKey(gameId, versionId): string   // games/{gameId}/versions/{versionId}/definition.json
  publishRunFinalDefinition(params): Promise<PublishDefinitionResult>
  rollbackToVersion(params): Promise<RollbackDefinitionResult>
  listVersions(gameId, limit?): Promise<StoredDefinitionVersion[]>
}
```

## Archetypes

Only one archetype exists: `paint-shader`.

```typescript
// api/src/ai/archetypes/paint-shader.ts
interface ShaderArchetype {
  name: string;
  description: string;
  referenceDefinition: Partial<GameDefinition>;
  exampleShaders: Record<string, { filename: string; glsl: string }>;
  promptContext: string;
}
```

The planning stage detects paint/shader keywords and injects archetype context into the prompt. The shader stage uses `paintShaderArchetype.exampleShaders` as few-shot examples.

## Gotchas

- **Pass-through stages**: The barrel file `agent/stages.ts` exports pass-through placeholders for `refine`, `theme`, `asset`, `chat`. The real implementations exist in `agent/stages/*.ts` but are NOT used by the default execution engine. Only `planning`, `build`, and `shader` are real in the default flow.
- **Two generation paths**: `agent/execution-engine.ts` (multi-stage orchestrated) vs `game/generator.ts` (single-shot `generateObject`). They share `GameDefinitionSchema` but have different retry/validation logic.
- **Theme planner uses raw fetch**: Unlike other AI calls that use Vercel AI SDK's `generateText`/`generateObject`, `generateThemePlan()` makes direct `fetch` calls to OpenRouter's chat completions endpoint.
- **R2 key patterns**: Agent artifacts go to `agent-runs/{runId}/steps/{stepIndex}/{stage}/`. Game definitions go to `games/{gameId}/definition.json`. Generated assets go to `generated/{remixId}/{assetId}.png`.
- **Shader stage mutates definition**: The shader stage writes generated shaders back into the `GameDefinition.effects.shaders` object AND persists the updated definition to both `games/{gameId}/definition.json` and `agent-runs/{runId}/final/definition.json`.
- **img2img strength is color-adaptive**: The pipeline calculates img2img strength from silhouette color luminance (darker colors → higher strength, range 0.87–0.93). Override via `ExecutionOptions.strength`.
- **Economy guidance is conditional**: `generator.ts` only includes economy graph guidance in the prompt when the user's text matches economy-related keywords (currency, upgrade, craft, idle, etc.).

## Related Skills

- **game-authoring**: `GameDefinition` structure, prefabs, entities, scripts
- **asset-pack-generation**: Asset pipeline details, Scenario.com/ComfyUI providers
- **effects-system**: Shader effects created in shader stage
- **storage-ops**: R2 artifact storage, D1 database
- **agent-orchestration**: Chat streaming, SSE, billing
- **economy-engine**: Economy graph schema used in `GameDefinitionSchema`
