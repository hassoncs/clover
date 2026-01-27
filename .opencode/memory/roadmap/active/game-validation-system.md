# Game Validation System

**Status:** Proposed  
**Priority:** High  
**Originated From:** Ball-sort debugging session (2026-01-26) - identified that impossible puzzle could have been caught before runtime

---

## Problem Statement

Games can be structurally valid (correct schema) but functionally broken:
- **Impossible puzzles** - Ball-sort with no empty tubes (mathematically unsolvable)
- **Missing implementations** - Win condition `type: "custom"` but no win-checking rules
- **Feature gaps** - Using event-driven state machine transitions before engine supported them
- **Runtime issues** - Variables not available in expression context

**Current State:** No validation beyond TypeScript types. Issues discovered only through manual playtesting or debugging sessions.

---

## Proposed Solution

Multi-layer validation system combining static analysis, AI reasoning, and runtime checks.

### Layer 1: Static Analysis (Pre-Runtime)

**Structural Validation** (Already Have via TypeScript)
- Schema compliance
- Required fields present
- Type correctness

**Playability Validation** (NEW)
- Win/lose conditions reachable
- Required entities exist
- Physics configs stable
- Archetype-specific rules met

```typescript
interface PlayabilityValidator {
  validateWinCondition(game: GameDefinition): ValidationResult;
  validateLoseCondition(game: GameDefinition): ValidationResult;
  validatePhysicsStability(game: GameDefinition): ValidationResult;
  validateArchetype(game: GameDefinition, archetype: string): ValidationResult;
}

// Example: Ball-sort specific
const ballSortRules = {
  minTubes: (colors: number) => colors + Math.ceil(colors / 2),
  requiresEmptyTubes: true,
  requiresWinDetection: true,
  winCondition: 'all_tubes_monochrome',
};
```

### Layer 2: AI Analysis (Design Time)

**LLM-Powered Validation**
- Reason about game logic completeness
- Suggest missing mechanics
- Identify edge cases
- Compare against known patterns

```typescript
const aiValidation = await llm.validate({
  game: gameDefinition,
  archetype: 'puzzle-sort',
  check: [
    'Is this puzzle solvable?',
    'Are there enough empty spaces?',
    'Is the win condition properly implemented?',
    'Can the player get stuck?',
  ],
});
```

**When to Use:**
1. During AI game generation (before returning result)
2. In game editor (live feedback)
3. Before publishing game

### Layer 3: Runtime Validation (Execution)

**Execution Checks**
- Assert required variables exist in expression context
- Warn if rules never fire
- Detect stuck game states
- Track win/lose reachability

```typescript
class RuntimeValidator {
  checkRuleExecution(evaluator: RulesEvaluator): void {
    // Track which rules have fired
    if (evaluator.frameId > 300 && this.neverFiredRules.size > 0) {
      console.warn('[Validation] Rules never fired:', this.neverFiredRules);
    }
  }
  
  checkWinReachability(evaluator: RulesEvaluator): void {
    // Periodically check if win is still possible
    if (evaluator.frameId % 300 === 0) {
      const canWin = evaluateWinPossibility(evaluator);
      if (!canWin) {
        console.error('[Validation] Win condition unreachable!');
      }
    }
  }
}
```

---

## Validation Categories

| Category | Examples | Catch Ball-Sort Bug? | Implementation |
|----------|----------|---------------------|----------------|
| **Structure** | Schema, required fields | ❌ No | ✅ Have (TypeScript) |
| **Playability** | Win/lose possible, controls work | ✅ **YES** | 🔴 Missing |
| **Archetype** | Pattern-specific rules (ball-sort, platformer) | ✅ **YES** | 🔴 Missing |
| **Physics** | Stable configs, no tunneling | ⚠️ Partial | 🟡 Basic checks exist |
| **Execution** | Rules fire, variables exist | ⚠️ Partial | 🟡 Some runtime logs |
| **Feature Support** | Engine version has needed features | ⚠️ With versioning | 🔴 Need feature flags |

---

## Archetype-Specific Rules

### Ball Sort Puzzle
```typescript
const BALL_SORT_VALIDATION = {
  structure: {
    requiredEntities: ['tube', 'ball'],
    requiredTags: ['tube', 'ball', 'color-*'],
  },
  playability: {
    minEmptyTubes: 1,
    tubesNeeded: (colors) => colors + Math.ceil(colors / 2),
    winCondition: 'custom_with_rules' || 'all_tubes_monochrome',
  },
  rules: {
    required: ['move_validation', 'win_detection'],
    patterns: {
      move_validation: /can only place on empty or matching/i,
      win_detection: /all tubes.*same color/i,
    },
  },
};
```

### Platformer
```typescript
const PLATFORMER_VALIDATION = {
  structure: {
    requiredEntities: ['player', 'ground', 'goal || collectible'],
  },
  playability: {
    playerHasControl: ['tap_to_jump', 'buttons', 'tilt_to_move'],
    winConditionValid: ['reach_entity', 'collect_all'],
    groundExists: true,
  },
  physics: {
    gravity: { y: { min: 9.8, max: 20 } },
    playerBodyType: 'dynamic',
  },
};
```

### Breakout
```typescript
const BREAKOUT_VALIDATION = {
  physics: {
    gravity: { x: 0, y: 0 },
    ballRestitution: { min: 0.9, max: 1.0 },
    ballLinearDamping: { max: 0.1 },
  },
  playability: {
    ballIsDynamic: true,
    paddleControlled: true,
    bricksExist: true,
  },
};
```

---

## Implementation Plan

### Phase 1: Foundation (1-2 days)
- [ ] Create validation types/interfaces
- [ ] Implement basic playability checks
- [ ] Add to game-inspector MCP tool
- [ ] Document validation API

**Files:**
- `shared/src/validation/types.ts`
- `shared/src/validation/playability.ts`
- `packages/game-inspector-mcp/src/tools/validation.ts`

### Phase 2: Archetype Validators (2-3 days)
- [ ] Define archetype rules (ball-sort, platformer, breakout, etc.)
- [ ] Implement archetype-specific validators
- [ ] Add auto-detection (infer archetype from game structure)
- [ ] Create validation test suite

**Files:**
- `shared/src/validation/archetypes/*.ts`
- `shared/src/validation/archetype-detector.ts`

### Phase 3: AI Validation (3-5 days)
- [ ] LLM-powered game logic reasoning
- [ ] Integration with game generator
- [ ] Auto-fix suggestions
- [ ] Validation report generation

**Files:**
- `api/src/ai/validation/llm-validator.ts`
- `api/src/ai/validation/auto-fix.ts`

### Phase 4: Runtime Validation (2-3 days)
- [ ] Rule execution tracking
- [ ] Variable availability checks
- [ ] Win/lose reachability analysis
- [ ] Developer mode warnings

**Files:**
- `app/lib/game-engine/validation/runtime.ts`

### Phase 5: Tooling Integration (1-2 days)
- [ ] Game editor live validation
- [ ] CI/CD validation checks
- [ ] Validation dashboard
- [ ] Documentation with examples

---

## Success Metrics

**Before Implementation:**
- Impossible games discovered only through manual playtesting
- Debug sessions required for every broken game
- No automated quality checks

**After Implementation:**
- 95% of impossible games caught before runtime
- 80% of design issues caught with helpful error messages
- 50% reduction in debugging time for game developers
- 90% of generated games pass playability validation

---

## Example Validation Output

```typescript
const result = validateGame(ballSortGame);

// Result:
{
  valid: false,
  errors: [
    {
      type: 'UNSOLVABLE_PUZZLE',
      severity: 'error',
      category: 'playability',
      message: 'Ball-sort needs at least 6 tubes (4 colors + 2 empty), found 4',
      location: { entities: [...] },
      fix: 'Add 2 empty tubes',
      autoFixable: true,
    },
    {
      type: 'MISSING_WIN_DETECTION',
      severity: 'error',
      category: 'rules',
      message: 'Win condition is "custom" but no rules check for win state',
      location: { winCondition: {...} },
      fix: 'Add rule that checks if all tubes are monochrome and fires game_state: win',
      autoFixable: false,
      suggestion: `{
        id: "check_win",
        trigger: { type: "frame" },
        conditions: [{ type: "expression", expr: "allTubesMonochrome()" }],
        actions: [{ type: "game_state", state: "win" }]
      }`,
    },
  ],
  warnings: [
    {
      type: 'INEFFICIENT_PATTERN',
      severity: 'warning',
      message: 'Using state machine events but could use simpler rule actions',
    },
  ],
}
```

---

## Integration Points

### 1. Game Generator (api/src/ai/generator.ts)
```typescript
export async function generateGame(prompt: string) {
  const game = await llm.generate(prompt);
  
  // Validate + auto-fix
  const validation = await validateAndFix(game);
  if (!validation.valid) {
    return { game: validation.fixedGame, warnings: validation.warnings };
  }
  
  return { game, warnings: [] };
}
```

### 2. Game Inspector (MCP Tool)
```typescript
server.tool("validate_game", "Validate game playability", {}, async () => {
  const validation = validateGame(currentGame);
  return { ...validation, suggestions: getSuggestions(validation.errors) };
});
```

### 3. Runtime (Development Mode)
```typescript
if (DEV) {
  const validator = new RuntimeValidator();
  validator.enable(rulesEvaluator);
  // Periodic checks + warnings in console
}
```

### 4. Game Editor (Future)
```typescript
// Live validation as you edit
useEffect(() => {
  const validation = validateGame(gameDefinition);
  setValidationErrors(validation.errors);
}, [gameDefinition]);
```

---

## Open Questions

1. **How to handle false positives?** Some "impossible" games might be solvable in non-obvious ways
2. **Validation performance?** Running AI validation on every edit could be slow
3. **Feature versioning?** Need to track which engine version supports which features
4. **Auto-fix safety?** When is it safe to auto-fix vs requiring manual intervention?

---

## References

- **Origin:** Ball-sort debugging session (2026-01-26)
- **Related:** Playability Contract (`docs/game-maker/reference/playability-contract.md`)
- **Related:** Game Archetypes (various docs in `docs/game-maker/templates/`)

---

## Decision Log

**2026-01-26:** Documented validation system concept after discovering ball-sort was impossible to solve. Identified that static analysis could have caught the "no empty tubes" issue before any code execution.
