# AI Game Self-Improvement Loop

> **Status**: Planning Phase
> **Created**: 2026-01-26
> **Purpose**: Enable AI-assisted game generation with automated testing, evaluation, and iterative improvement

---

## Vision

The AI Game Self-Improvement Loop is a system that enables:

1. **AI Game Generation**: Generate physics-based games from natural language prompts
2. **Automated Testing**: Open games in browser, interact with them, take screenshots
3. **AI Evaluation**: Have AI analyze screenshots and gameplay to assess quality
4. **Iterative Improvement**: Automatically or semi-automatically fix issues and regenerate
5. **Human-in-the-Loop**: Allow human feedback to calibrate AI evaluations
6. **Model Experimentation**: Compare different AI models for cost/quality tradeoffs

### Why This Matters

Currently, AI game generation is a "fire and forget" process. We generate a game, hope it works, and manually check if it's good. This system creates a feedback loop where:

- We can measure game quality programmatically
- We can identify patterns in what makes games fail
- We can tune prompts based on concrete metrics
- We can experiment with cheaper models for certain tasks
- We can build training data for future improvements

---

## Architecture Overview

```
                                    ┌─────────────────────────────────┐
                                    │       Human Feedback            │
                                    │  (Review UI, ratings, notes)    │
                                    └───────────────┬─────────────────┘
                                                    │
                                                    ▼
┌──────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│   User Prompt    │───▶│  AI Generator    │───▶│  GameDefinition   │
│ "Make platformer"│    │  (GPT-4o/Claude) │    │     (JSON)        │
└──────────────────┘    └──────────────────┘    └─────────┬─────────┘
                                                          │
                        ┌─────────────────────────────────┴─────────┐
                        │                                           │
                        ▼                                           ▼
              ┌──────────────────┐                        ┌─────────────────┐
              │ Validation Pass  │                        │ Game Inspector  │
              │  (Schema, Rules) │                        │   MCP Server    │
              └────────┬─────────┘                        └────────┬────────┘
                       │                                           │
                       ▼                                           ▼
              ┌──────────────────┐                        ┌─────────────────┐
              │ Structural OK?   │                        │ Open in Browser │
              │                  │                        │ (Playwright)    │
              └────────┬─────────┘                        └────────┬────────┘
                       │                                           │
                       │                                           ▼
                       │                                  ┌─────────────────┐
                       │                                  │ Take Screenshot │
                       │                                  │ Query Entities  │
                       │                                  │ Simulate Input  │
                       │                                  └────────┬────────┘
                       │                                           │
                       │                                           ▼
                       │                                  ┌─────────────────┐
                       └─────────────────────────────────▶│ AI Evaluation   │
                                                          │ (Vision + Text) │
                                                          └────────┬────────┘
                                                                   │
                                                                   ▼
                                                          ┌─────────────────┐
                                                          │  Score: 0-100   │
                                                          │  - Visual: 70   │
                                                          │  - Playable: 85 │
                                                          │  - Complete: 90 │
                                                          └────────┬────────┘
                                                                   │
                                   ┌───────────────────────────────┼───────────────────────────────┐
                                   │                               │                               │
                                   ▼                               ▼                               ▼
                          Score >= 80?                    Score 50-80?                     Score < 50?
                          ┌─────────┐                    ┌─────────────┐                   ┌─────────┐
                          │  PASS   │                    │   ITERATE   │                   │  FAIL   │
                          │  Done!  │                    │ Fix + Retry │                   │  Stop   │
                          └─────────┘                    └──────┬──────┘                   └─────────┘
                                                                │
                                                                ▼
                                                       ┌─────────────────┐
                                                       │ AI Refinement   │
                                                       │ Patch JSON or   │
                                                       │ Regenerate      │
                                                       └────────┬────────┘
                                                                │
                                                                └──────▶ (Loop back to validation)
```

---

## Components

### 1. Game Inspector MCP

**Location**: `packages/game-inspector-mcp/`

The MCP server provides 40+ tools for interacting with running games:

| Category | Tools | Purpose |
|----------|-------|---------|
| Game Management | `list`, `open`, `close` | Open/close games in browser |
| Query | `query`, `game_find`, `game_entity` | Find entities by selector |
| Properties | `get_props`, `set_props`, `patch_props` | Read/write entity state |
| Lifecycle | `spawn`, `destroy`, `clone` | Create/remove entities |
| Time Control | `pause`, `resume`, `step`, `set_time_scale` | Control physics simulation |
| Physics | `raycast`, `query_point`, `get_overlaps` | Physics queries |
| Events | `subscribe`, `poll_events` | Monitor game events |
| Interaction | `simulate_input`, `game_tap`, `game_drag` | Simulate user input |

**Current Limitation**: Game list is hardcoded (10 games). Needs to use dynamic registry.

### 2. AI Generator

**Location**: `api/src/ai/generator.ts`

Current flow:
1. `classifyPrompt()` - Extract game type, theme, mechanics from user prompt
2. `generateObject()` - Use GPT-4o/Claude with Zod schema to generate GameDefinition
3. `validateGameDefinition()` - Check physics constraints, win/lose conditions
4. Return JSON or retry

**Enhancement needed**: Add iteration hooks for self-improvement loop.

### 3. AI Evaluator (IMPLEMENTED)

**Location**: `api/src/ai/evaluator/`

The evaluator takes a screenshot and game state, then scores the game:

```typescript
import { evaluateGame, evaluateGameStructure } from './evaluator';

// Full AI evaluation (uses GPT-4o/Claude for visual analysis)
const result = await evaluateGame(
  {
    screenshot: base64Screenshot,  // Optional
    gameDefinition: gameJson,
    originalPrompt: "Make a platformer",
  },
  {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
  }
);

// Quick structural check (no AI call)
const structural = evaluateGameStructure(gameDefinition);

interface GameEvaluation {
  overall: number;        // 0-100
  
  dimensions: {
    visualAppeal: number; // Does it look good?
    themeMatch: number;   // Does it match the prompt?
    entityClarity: number;// Can you identify game elements?
    layoutBalance: number;// Good use of screen space?
  };
  
  structural: {
    hasWinCondition: boolean;
    hasLoseCondition: boolean;
    hasPlayerControl: boolean;
    entityCountReasonable: boolean;
    physicsConfigured: boolean;
  };
  
  issues: string[];       // Specific problems found
  suggestions: string[];  // Improvement ideas
  confidence: number;     // 0-1
}
```

### 4. Experiment Framework (NEW)

**Location**: `api/src/ai/experiments/` (to be created)

For comparing models and prompts:

```typescript
interface ExperimentConfig {
  name: string;
  models: string[];           // ["gpt-4o", "claude-sonnet-4", "gpt-4o-mini"]
  prompts: string[];          // ["Make a platformer", "Create a puzzle game"]
  runsPerCombination: number; // 3
  evaluationModel: string;    // "claude-sonnet-4" for evaluation
  maxIterations: number;      // 3
}

interface ExperimentResult {
  experimentId: string;
  runs: RunResult[];
  summary: {
    modelScores: Record<string, number>;
    promptDifficulty: Record<string, number>;
    costPerRun: Record<string, number>;
  };
}
```

---

## Implementation Phases

### Phase 1: Fix Game Inspector MCP (Priority: HIGH)

**Goal**: Make the MCP work with all 23+ games dynamically.

**Changes**:

1. Update `packages/game-inspector-mcp/src/types.ts`:
   - Remove hardcoded `AVAILABLE_GAMES` array
   - Import from app registry OR read from filesystem

2. Update `packages/game-inspector-mcp/src/utils.ts`:
   - Make `normalizeGameName` work with any game ID
   - Support both test games and labs examples

3. Update `packages/game-inspector-mcp/src/tools/game-management.ts`:
   - `list` tool reads from dynamic registry
   - `open` tool accepts any valid game/example path

**Test**: Verify all 23 games can be opened and inspected.

### Phase 2: Basic Evaluation System (Priority: HIGH)

**Goal**: Take screenshot of a game, send to Claude Vision, get structured feedback.

**Files to create**:

```
api/src/ai/evaluator/
├── index.ts              # Main evaluate() function
├── prompts.ts            # Evaluation system prompts
├── types.ts              # Evaluation result types
└── scoring.ts            # Score normalization logic
```

**API**:

```typescript
import { evaluateGame } from './evaluator';

const result = await evaluateGame({
  screenshot: base64Screenshot,
  gameDefinition: gameJson,
  originalPrompt: "Make a platformer with a cat",
  model: "claude-sonnet-4",
});

console.log(result.overall); // 75
console.log(result.issues);  // ["Player entity too small", "No visible goal"]
```

### Phase 3: Self-Improvement Loop (IMPLEMENTED)

**Location**: `api/src/ai/evaluator/improvement-loop.ts`

**Goal**: If evaluation score is low, attempt to fix and retry.

**Usage**:

```typescript
import { runImprovementLoop, quickEvaluate } from './evaluator';

// Full improvement loop with AI evaluation
const result = await runImprovementLoop(
  "Make a platformer where a cat collects fish",
  {
    generationConfig: { provider: 'openrouter', apiKey: '...' },
    evaluationConfig: { provider: 'openrouter', apiKey: '...' },
    maxIterations: 3,
    targetScore: 80,
    minScoreToIterate: 40,
  },
  (record) => {
    console.log(`Iteration ${record.iteration}: score=${record.evaluation.overall}`);
  }
);

if (result.success) {
  console.log('Game reached target quality!', result.finalGame);
} else {
  console.log(`Stopped: ${result.stoppedReason}`);
}

// Quick structural check (no AI call - instant)
const { score, issues } = await quickEvaluate(gameDefinition);
```

**Loop Logic**:
1. Generate initial game
2. Evaluate game (structural + AI visual analysis)
3. If score >= targetScore: SUCCESS
4. If score < minScoreToIterate: FAIL (too broken to fix)
5. Otherwise: Build refinement prompt from issues/suggestions
6. Refine game (or regenerate if refinement fails)
7. Loop back to step 2

### Phase 4: Experiment Framework (IMPLEMENTED)

**Location**: `api/src/ai/experiments/`

**Goal**: Compare models, prompts, and track costs.

**Usage**:

```typescript
import { 
  runExperiment, 
  formatExperimentReport, 
  BENCHMARK_PROMPTS 
} from './experiments';

const result = await runExperiment(
  {
    name: 'gpt4o-vs-claude',
    models: [
      { provider: 'openrouter', model: 'openai/gpt-4o', displayName: 'GPT-4o' },
      { provider: 'openrouter', model: 'anthropic/claude-sonnet-4', displayName: 'Claude' },
    ],
    prompts: BENCHMARK_PROMPTS,  // 5 standard test prompts
    runsPerCombination: 3,
    evaluationModel: 'anthropic/claude-sonnet-4',
  },
  {
    openrouter: process.env.OPENROUTER_API_KEY,
  },
  (run) => {
    console.log(`${run.model.displayName}: ${run.evaluation?.overall ?? 'failed'}`);
  }
);

// Generate markdown report
const report = formatExperimentReport(result);
console.log(report);
```

**Report Output**:
```markdown
# Experiment Report: exp-2026-01-26-abc1

## Model Performance
| Model | Avg Score | Min | Max | Success Rate | Avg Time |
|-------|-----------|-----|-----|--------------|----------|
| openai/gpt-4o | 72.5 | 58 | 89 | 93% | 8.2s |
| anthropic/claude-sonnet-4 | 68.3 | 45 | 82 | 87% | 12.1s |

## Prompt Difficulty
| Prompt | Avg Score | Success Rate |
|--------|-----------|--------------|
| Make a game where I launch balls... | 78.2 | 100% |
| Create a platformer where... | 65.1 | 80% |
```

---

## Evaluation Criteria

### Visual Quality (0-100)

| Score | Description |
|-------|-------------|
| 90-100 | Visually polished, clear entities, good color contrast |
| 70-89 | Good overall, minor visual issues |
| 50-69 | Functional but visually rough |
| 30-49 | Hard to understand what's happening |
| 0-29 | Broken or empty |

### Playability (0-100)

| Score | Description |
|-------|-------------|
| 90-100 | Clear controls, obvious goal, satisfying physics |
| 70-89 | Playable with minor confusion |
| 50-69 | Can figure it out with effort |
| 30-49 | Controls exist but unclear what to do |
| 0-29 | No apparent way to interact |

### Theme Match (0-100)

| Score | Description |
|-------|-------------|
| 90-100 | Perfectly matches requested theme |
| 70-89 | Matches theme with minor deviations |
| 50-69 | Somewhat related to theme |
| 30-49 | Theme barely recognizable |
| 0-29 | Completely different from request |

---

## Human-in-the-Loop Review

After AI evaluation, humans can review:

1. **Rating**: 1-5 stars overall
2. **Categories**: Rate visual, playability, theme, physics separately
3. **Notes**: Free-text feedback
4. **Tags**: "too-cluttered", "physics-broken", "missing-goal"
5. **Verdict**: ship / needs-work / broken / unusable

This data helps calibrate AI evaluation prompts.

---

## Cost Considerations

| Operation | Estimated Cost | Notes |
|-----------|---------------|-------|
| Game generation (GPT-4o) | ~$0.02-0.05 | Depends on prompt complexity |
| Game generation (Claude) | ~$0.02-0.08 | Depends on token count |
| Screenshot evaluation (Vision) | ~$0.01-0.02 | Per screenshot |
| Full iteration (3 attempts) | ~$0.10-0.20 | Including all evals |

**Optimization strategies**:
- Use cheaper models for initial attempts
- Cache evaluation prompts
- Batch evaluations
- Use GPT-4o-mini for classification

---

## Success Metrics

1. **Generation Quality**: % of games scoring >70 on first attempt
2. **Improvement Rate**: Average score increase per iteration
3. **Iteration Efficiency**: Games reaching >80 in N iterations
4. **Model Comparison**: Quality-per-dollar across models
5. **Human Correlation**: Agreement between AI eval and human ratings

---

## Files Reference

| Path | Purpose |
|------|---------|
| `packages/game-inspector-mcp/` | MCP server for game automation |
| `api/src/ai/generator.ts` | Game generation logic |
| `api/src/ai/validator.ts` | Structural validation |
| `api/src/ai/evaluator/` | (NEW) Visual/gameplay evaluation |
| `api/src/ai/experiments/` | (NEW) A/B testing framework |
| `app/lib/registry/generated/testGames.ts` | Dynamic game registry |

---

## Next Steps

1. [ ] Fix Game Inspector MCP to use dynamic registry
2. [ ] Test MCP with all 23 games
3. [ ] Create basic evaluation endpoint
4. [ ] Build simple iterate-until-good loop
5. [ ] Add human review UI
6. [ ] Implement experiment framework
