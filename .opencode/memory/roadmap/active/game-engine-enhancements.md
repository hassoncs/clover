# Game Engine Enhancements (Post-Redesign)

**Status**: Planned  
**Priority**: Low  
**Created**: 2026-01-25  
**Source**: Deferred items from game-engine-redesign plan

## Overview

Enhancement tasks deferred from the Game Engine Redesign plan. These are non-blocking improvements that can be tackled in future sprints.

## Deferred Tasks

### Validation Enhancements
- [ ] Tag ownership validation: systems declare managed tags
- [ ] Behavior schemas with Zod validation
- [ ] Slot params validated by impl's Zod schema
- [ ] Slot params validation (invalid param → schema error)

### Compilation/Normalization
- [ ] Behavior→rule normalization compile step (convert `score_on_collision` to rules)
- [ ] Sugar behaviors compile into rules

### Marketplace Features
- [ ] Marketplace ref `marketplace://diagonal-match@1.2.0` resolves (stub test)
- [ ] Slot marketplace pattern runtime validation

### Additional Game Systems
- [ ] Card Game System with slots: `shuffleAlgorithm`, `drawRule`, `playCondition`, `scoreCalculation`
- [ ] Card Game default slot implementations
- [ ] Card Game hand + field zones grid model

### Manual QA Tasks
- [ ] E2E test: "Make a gem matching game" → valid Match3 definition
- [ ] AI generation success rate validation (>85% with 20 prompts)

## Dependencies

- Completed: Game Engine Redesign (game-engine-redesign.md)
- Tetris system proves architecture is generic

## Notes

These items were explicitly deferred during the redesign to maintain focus on core architecture. The Tetris implementation proved the architecture is generic, so Card Game System is nice-to-have rather than necessary for validation.
