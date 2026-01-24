# AI-Powered Game Generation

**Status**: active
**Source**: docs
**Created**: 2026-01-24
**Updated**: 2026-01-24

## Objective

AI-powered game generation from natural language prompts using entity/behavior systems

## Progress

- [x] Entity system with templates and behaviors
- [x] Asset generation pipeline (Scenario.com integration)
- [x] Multiple asset types: entity, background, title_hero, parallax
- [x] Game templates: fallingCatcher, hillRacer, jumpyCat, stackAttack, ballLauncher
- [x] CLI tools for asset generation
- [ ] Wire AI generation API into AIGenerateModal (see ht-001)

## Blockers

- [ht-001] Implement AI Generation API Call

## Notes

Documentation in docs/game-maker/. Asset pipeline fully documented in docs/asset-generation-knowledge.md

### Game Templates
Located in `api/src/ai/templates/`:
- `fallingCatcher.ts` - Catch falling objects
- `hillRacer.ts` - Physics-based hill racing
- `jumpyCat.ts` - Platformer jumping mechanics
- `stackAttack.ts` - Stacking physics game
- `ballLauncher.ts` - Ball launching mechanics

### AI Integration
- `api/src/ai/generator.ts` - Game generation logic
- `api/src/ai/classifier.ts` - Game type classification
- `api/src/ai/validator.ts` - Game definition validation
