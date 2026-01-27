# Game Definition Validation System

**Status**: Planned  
**Priority**: High  
**Effort**: Medium (2-3 days)  
**Blocked By**: None  

## Problem

AI-generated game definitions can contain errors that only surface at runtime:
- **Expression syntax errors**: Unsupported operators (`!==`, `?.`, `**`), invalid function calls
- **Invalid references**: Non-existent entity IDs, templates, or tags
- **Physics inconsistencies**: Invalid body type combinations, out-of-range values
- **Semantic errors**: Circular dependencies, unreachable win conditions

These errors lead to:
- Poor user experience (games crash or behave unexpectedly)
- Difficult debugging (errors appear in console, not during generation)
- Wasted AI API calls (generating invalid games)

## Current Validation

✅ **Schema Validation** (via Zod)
- GameDefinition structure
- Required fields
- Type checking

❌ **Missing Validations**
- Expression syntax
- Reference integrity
- Semantic correctness
- Physics constraints

## Proposed Solution

### 1. Expression Validator

**Purpose**: Validate all expressions before runtime

**Implementation**:
```typescript
// shared/src/validation/expressionValidator.ts
export class ExpressionValidator {
  // Parse expression and report errors
  validate(expr: string): ValidationResult {
    try {
      compile(expr); // Use existing expression compiler
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        suggestion: this.suggestFix(error),
      };
    }
  }
  
  // Suggest fixes for common errors
  private suggestFix(error: Error): string {
    if (error.message.includes('!==')) {
      return 'Use comparison: (a - b) != 0 instead of a !== b';
    }
    if (error.message.includes('?.')) {
      return 'Remove optional chaining: use a.b instead of a?.b';
    }
    if (error.message.includes('**')) {
      return 'Exponentiation not supported. Use repeated multiplication or modify expression parser';
    }
    // ... more suggestions
  }
}
```

**Scan Locations**:
- Rule conditions: `{ type: 'expression', expr: '...' }`
- Rule actions: `{ type: 'set_velocity', x: { expr: '...' } }`
- Computed values: `{ value: { expr: '...' } }`

### 2. Reference Validator

**Purpose**: Ensure all IDs/tags reference valid entities

**Checks**:
- Entity IDs exist when referenced
- Templates exist when spawned
- Tags match actual entity tags
- Collision tag pairs are valid

**Implementation**:
```typescript
// shared/src/validation/referenceValidator.ts
export class ReferenceValidator {
  validate(game: GameDefinition): ValidationResult[] {
    const errors: ValidationResult[] = [];
    
    // Build index of valid IDs and tags
    const entityIds = new Set(game.entities.map(e => e.id));
    const templateIds = new Set(Object.keys(game.templates));
    const tags = new Set(game.entities.flatMap(e => e.tags || []));
    
    // Check rule references
    for (const rule of game.rules || []) {
      // Check collision triggers
      if (rule.trigger.type === 'collision') {
        if (!tags.has(rule.trigger.entityATag)) {
          errors.push({
            type: 'invalid_tag',
            rule: rule.id,
            tag: rule.trigger.entityATag,
            suggestion: `No entities with tag "${rule.trigger.entityATag}"`,
          });
        }
      }
      
      // Check spawn actions
      for (const action of rule.actions) {
        if (action.type === 'spawn' && !templateIds.has(action.template)) {
          errors.push({
            type: 'invalid_template',
            rule: rule.id,
            template: action.template,
            suggestion: `Template "${action.template}" not defined`,
          });
        }
      }
    }
    
    return errors;
  }
}
```

### 3. Physics Validator

**Purpose**: Validate physics configurations

**Checks**:
- Body type + property compatibility (e.g., kinematic bodies shouldn't have density)
- Valid value ranges (restitution 0-1, friction ≥ 0)
- Shape + dimension compatibility
- Mass calculation sanity checks

### 4. Semantic Validator

**Purpose**: Catch logical errors

**Checks**:
- Win/lose conditions are achievable
- No circular spawn dependencies
- Entity positions within world bounds
- Camera bounds contain entities

### 5. Integration Points

#### A. AI Generation Time
```typescript
// api/src/ai/generator.ts
export async function generateGame(prompt: string): Promise<GenerationResult> {
  const game = await llm.generate(prompt);
  
  // Validate before returning
  const validation = await validateGameDefinition(game);
  
  if (!validation.isValid) {
    // Attempt auto-fix
    const fixed = await autoFixGame(game, validation.errors);
    
    if (!fixed.isValid) {
      throw new ValidationError(fixed.errors);
    }
    
    return { game: fixed.game, warnings: validation.errors };
  }
  
  return { game };
}
```

#### B. Game Save Time
```typescript
// api/src/trpc/routers/games.ts
create: protectedProcedure
  .input(createGameSchema)
  .mutation(async ({ input, ctx }) => {
    const game = JSON.parse(input.definition);
    
    // Validate before saving
    const validation = await validateGameDefinition(game);
    
    if (!validation.isValid) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid game definition',
        cause: validation.errors,
      });
    }
    
    // Save...
  })
```

#### C. Editor Time (Future)
```typescript
// Real-time validation in game editor
useEffect(() => {
  const validation = validateGameDefinition(gameDefinition);
  setValidationErrors(validation.errors);
}, [gameDefinition]);
```

## Expression Parser Enhancement

**Problem**: Current parser is limited
- No `!==`, `?.`, `**` operators
- No `Math.*` functions
- No array/object methods

**Options**:

### Option A: Extend Current Parser
- Add missing operators to tokenizer
- Add Math function support
- **Pros**: Full control, no dependencies
- **Cons**: Maintenance burden, potential bugs

### Option B: Use Safe Eval Library
- Replace with `expr-eval` or similar
- **Pros**: Battle-tested, feature-rich
- **Cons**: Dependency, potential security concerns

### Option C: Compile to Safe Subset
- Transform expressions to supported syntax at validation time
- `a !== b` → `(a - b) != 0`
- `a?.b` → `a && a.b`
- `x ** 2` → `x * x`
- **Pros**: No parser changes, backward compatible
- **Cons**: Complex transformations, edge cases

**Recommendation**: Start with Option C (transformation), migrate to Option B long-term

## Implementation Plan

### Phase 1: Expression Validation (1 day)
- [ ] Create ExpressionValidator class
- [ ] Scan all expression locations in GameDefinition
- [ ] Report errors with suggestions
- [ ] Add to game generation pipeline

### Phase 2: Reference Validation (0.5 day)
- [ ] Create ReferenceValidator class
- [ ] Check entity IDs, template IDs, tags
- [ ] Add to save/generate pipelines

### Phase 3: Physics Validation (0.5 day)
- [ ] Create PhysicsValidator class
- [ ] Validate body types, ranges, shapes
- [ ] Add sanity checks for mass/density

### Phase 4: Integration (0.5 day)
- [ ] Wire validators into AI generation
- [ ] Wire validators into game save
- [ ] Add validation UI (show errors/warnings)

### Phase 5: Expression Parser Enhancement (1 day)
- [ ] Research transformation approach
- [ ] Implement common transformations
- [ ] Update LLM prompts with supported syntax
- [ ] Consider long-term parser replacement

## Success Metrics

- **Zero runtime expression errors** in AI-generated games
- **<5% validation failure rate** during generation
- **Auto-fix success rate >80%** for common errors
- **Validation time <100ms** for typical game definition

## Future Enhancements

- **Linting**: Style suggestions, performance hints
- **Type inference**: Detect type mismatches in expressions
- **Visual validator**: Editor integration with inline errors
- **AI-assisted fixes**: LLM suggests corrections for validation errors
