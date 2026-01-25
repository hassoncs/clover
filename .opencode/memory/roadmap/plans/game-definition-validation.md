# Game Definition Validation System

**Type**: Oracle Plan  
**Status**: Planned  
**Priority**: High  
**Effort**: Medium (2-3 days)  
**Dependencies**: None  
**Related**: ai-game-maker

## Problem Statement

AI-generated game definitions can contain errors that only surface at runtime, causing:
- Runtime crashes from invalid expressions (unsupported operators like `!==`, `?.`, `**`)
- Invalid entity/template references
- Physics configuration errors
- Wasted AI API calls generating invalid games

## Current State

✅ Basic Zod schema validation exists  
❌ No expression syntax validation  
❌ No reference integrity checking  
❌ No semantic correctness validation  

## Proposed Solution

Comprehensive multi-layer validation system:

1. **Expression Validator**: Parse & validate all expressions before runtime
2. **Reference Validator**: Ensure entity IDs, templates, tags exist
3. **Physics Validator**: Check body types, value ranges, shapes
4. **Semantic Validator**: Detect logical errors (unreachable wins, circular deps)

Integration points:
- AI generation time (validate + auto-fix before returning)
- Game save time (reject invalid definitions)
- Editor time (real-time feedback - future)

## Implementation Phases

### Phase 1: Expression Validation (1 day)
- Create ExpressionValidator
- Scan GameDefinition for all expressions
- Report errors with fix suggestions
- Wire into generation pipeline

### Phase 2: Reference Validation (0.5 day)
- Create ReferenceValidator
- Check IDs, templates, tags
- Wire into save/generate

### Phase 3: Physics Validation (0.5 day)
- Create PhysicsValidator
- Validate configurations

### Phase 4: Integration (0.5 day)
- Connect validators to pipelines
- Add UI for errors/warnings

### Phase 5: Expression Parser Enhancement (1 day)
- Implement expression transformations (`!==` → `!=`, etc.)
- Update LLM prompts with supported syntax
- Consider parser library replacement long-term

## Success Metrics

- Zero runtime expression errors in AI games
- <5% validation failure rate
- >80% auto-fix success rate
- <100ms validation time

## Files

- `shared/src/validation/expressionValidator.ts` (new)
- `shared/src/validation/referenceValidator.ts` (new)
- `shared/src/validation/physicsValidator.ts` (new)
- `api/src/ai/generator.ts` (modify - add validation)
- `api/src/trpc/routers/games.ts` (modify - add validation)

## Documentation

Detailed plan: [docs/game-maker/plans/game-definition-validation.md](../../../docs/game-maker/plans/game-definition-validation.md)

## Next Steps

1. Review plan with team
2. Schedule Phase 1 (expression validation) - highest ROI
3. Implement incrementally, deploy validators one at a time
4. Monitor validation failures, tune auto-fix rules
