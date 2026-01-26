# Learnings - New Slot Games Implementation

## Slot System Patterns
- SYSTEM_ID and SYSTEM_VERSION constants at top
- Slot contracts: { name, kind: 'pure'|'policy'|'hook', description }
- Typed interfaces for Input/Output of each slot
- SlotImplementation: { id, version, owner, compatibleWith, run }
- registerIfNotExists helper to avoid duplicate registration
- Export register{System}SlotImplementations() function

## Test Game Patterns
- Export metadata: TestGameMeta with title, description, titleHeroImageUrl
- Export default: GameDefinition
- ASSET_BASE constant (can use placeholder for now)
- cx()/cy() coordinate helpers for center-based positioning
- Templates for reusable entity configs
- Rules for event-driven game logic

## Behavior System
- 27 behavior types available
- Key ones: move, oscillate, destroy_on_collision, score_on_collision, spawn_on_event, timer
- Behaviors execute in phases: input -> timer -> movement -> visual -> post_physics

## Physics Integration
- bodyType: 'static' | 'dynamic' | 'kinematic'
- Shapes: box, circle, polygon
- isSensor: true for trigger zones (no physical collision)
- bullet: true for fast-moving objects

