# Gallery System Documentation

> Making all game engine capabilities discoverable through visual galleries

## Overview

The Gallery System provides a unified way to discover, preview, and reuse all game engine capabilities across three tiers:

1. **Tier 1: Game Prefabs** - Pre-made games users can customize
2. **Tier 2: Component Gallery** - All building blocks (effects, scripts, physics, etc.)
3. **Tier 3: JSON Editor** - Power-user authoring tools

## Documents

| Document | Description |
|----------|-------------|
| [GALLERY_MASTER_PLAN.md](./GALLERY_MASTER_PLAN.md) | Comprehensive plan for the gallery system including inventory of all capabilities, gap analysis, architecture, and implementation roadmap |

## Quick Links

### Current Galleries (In-App)
- Effects Gallery: `app/components/examples/EffectsGallery.tsx`
- Particle Playground: `app/components/examples/ParticlePlayground.tsx`

### Capability Sources
- Effects: `shared/src/types/effects.ts`
- Particles: `shared/src/types/particles.ts`
- Scripts: `shared/src/scripting/`
- Physics: `shared/src/types/physics.ts`
- Sprites: `shared/src/types/sprite.ts`
- Game Config: `shared/src/types/schemas.ts`

### Existing Examples
- Location: `app/app/examples/`
- Count: 20 demo games/physics showcases

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Effects Gallery | ✅ Done | 18 effects with live controls |
| Particle Playground | ✅ Done | 10 presets with live controls |
| Scripts Gallery | ❌ Planned | 17 script patterns need demos |
| Physics Gallery | ⚠️ Partial | 2 Storybook stories exist |
| Sprites Gallery | ❌ Planned | 4 sprite types need demos |
| Prefabs Catalog | ❌ Planned | Needs metadata + UI |
| JSON Editor | ❌ Planned | Low-level authoring tool |

## Related Documentation

- [Special Effects Plan](../special-effects/EFFECTS_PLAN.md) - Original effects implementation plan
- [Godot Physics](../godot/) - Godot 4 physics backend
- [Game Maker](../game-maker/INDEX.md) - Game generation documentation
