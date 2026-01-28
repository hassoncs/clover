# Zone System Refactor - Progress Tracker

> **Plan**: zone-system-refactor  
> **Started**: 2026-01-27  
> **Status**: In Progress

---

## Current State Assessment

### What's Already Done ✅

1. **Zone Types Added** (`shared/src/types/physics.ts`)
   - `ZoneComponent` interface
   - `ZoneShape` types (box, circle, polygon)
   - `ZoneEntityDefinition` interface
   - `BodyEntityDefinition` interface
   - `EntityTemplate` discriminated union

2. **Zone Schemas Added** (`shared/src/types/schemas.ts`)
   - `ZoneShapeSchema` 
   - `ZoneComponentSchema`
   - `ZoneEntityDefinitionSchema`
   - `EntityTemplateSchema` discriminated union

3. **Migration Script Exists** (`scripts/migrate-isensor-to-zones.ts`)
   - Ready to transform game files

### What's Still Needed 🔴

1. **Schema Fix**: `BodyEntityTemplateSchema` has `type: z.literal('body').optional()` - discriminated union needs required discriminator
2. **EntityManager Updates**: Handle zone entities in EntityManager.ts
3. **Godot Bridge Updates**: Remove isSensor references, unify zone handling
4. **Game Migration**: Run codemod on 23 games (93 instances)
5. **AI Templates**: Update to output zone syntax
6. **Testing**: Verify all games work

---

## Task Breakdown

### Wave 1: Types + Schemas (Foundation)

- [ ] Task 1: Fix BodyEntityTemplateSchema discriminator (make type required)
- [ ] Task 2: Verify all schemas work with discriminated union

### Wave 2: Engine Implementation

- [ ] Task 3: Update EntityManager for zone handling
- [ ] Task 4: Unify Godot bridge storage (remove isSensor references)
- [ ] Task 5: Zone movement support

### Wave 3: Rules + Events

- [ ] Task 6: Add zone_enter/zone_exit triggers

### Wave 4: Migration

- [ ] Task 7: Run migration codemod on all games
- [ ] Task 8: Update AI templates
- [ ] Task 9: Update documentation

### Wave 5: Verification

- [ ] Task 10: QA all migrated games
- [ ] Task 11: Add zone-specific tests

---

## Files Modified

### To Be Modified
- `shared/src/types/schemas.ts` - Fix discriminator
- `app/lib/game-engine/EntityManager.ts` - Zone handling
- `app/lib/godot/GodotBridge.web.ts` - Remove isSensor
- `app/lib/godot/GodotBridge.native.ts` - Remove isSensor
- `app/lib/godot/types.ts` - Remove isSensor
- `app/lib/physics2d/types.ts` - Remove isSensor
- All game files in `app/lib/test-games/games/` - Migrate to zones

### Already Modified (in types/schemas)
- `shared/src/types/physics.ts` ✅
- `shared/src/types/entity.ts` ✅
- `shared/src/types/schemas.ts` (partial) ✅

---

## Blockers

None currently.

---

## Notes

- Migration is "big bang" - no deprecation period
- 93 instances across 23 games need updating
- Test games with moving zones especially (Slopeggle bucket)
- Keep collision triggers working for backward compatibility

---

## QA Checklist (from plan)

- [ ] Static zone enter/exit (drain in Slopeggle)
- [ ] Moving zone enter/exit (bucket in Slopeggle)
- [ ] Zone used as UI button hit region (slotMachine buttons)
- [ ] Zone used as collectible trigger (coins in platformer)
- [ ] Zone used as portal (Slopeggle portals)
- [ ] Zone+body collision rules still fire
- [ ] All 23 games load without errors
- [ ] All 23 games play correctly (spot check)
