# Knowledge Architecture Reorganization

**Date**: 2026-01-26  
**Status**: ✅ Complete  
**Type**: System Maintenance

---

## Summary

Reorganized Slopcade's knowledge architecture to eliminate redundancy, improve discoverability, and establish clear boundaries between auto-loaded config, skills, memory, and documentation.

---

## Changes Made

### 1. Streamlined `.opencode/AGENTS.md`

**Before**: 148 lines with full roadmap system documentation (duplicated from skill)  
**After**: ~70 lines with concise overview + reference to skill

**Changes**:
- ✂️ Removed duplicate roadmap templates and workflows
- ✅ Kept: Service management, codebase context, established patterns
- ➕ Added: Reference to `/slopcade-documentation` skill for full details

**Rationale**: AGENTS.md should be quick-reference config, not a workflow manual.

---

### 2. Updated Pattern Files (Lightweight References)

#### `pattern-001.md` (Platform-Specific Modules)
- Converted from 79-line detailed guide to 60-line reference
- Points to `.opencode/AGENTS.md` for full details
- Kept: Examples, benefits, configuration notes

#### `pattern-002.md` (Documentation Taxonomy)
- Converted from 56-line catalog to 50-line reference
- Points to `slopcade-documentation.md` skill for full workflows
- Kept: Quick taxonomy table, examples from codebase

**Rationale**: Pattern files should aid discovery in memory search, not duplicate skill/AGENTS.md content.

---

### 3. Archived Generic Documentation Skill

**Archived**: `.opencode/skills/documentation.md`  
**Moved to**: `.opencode/skills/archive/documentation.md.archived`  
**Reason**: Superseded by `slopcade-documentation.md` which provides:
- Project-specific 3-tier system
- Roadmap integration workflows
- User intent parsing
- Temporal document lifecycle

**Created**: `.opencode/skills/archive/README.md` documenting archived skills

---

### 4. Renamed Skills for Consistency

Adopted **slopcade-* prefix convention** for all project-specific skills:

| Old Name | New Name | Reason |
|----------|----------|--------|
| `glb-optimization.md` | `slopcade-3d-assets.md` | Broader scope, matches prefix pattern |
| `icon-generation.md` | `slopcade-icon-generation.md` | Consistency with other slopcade-* skills |

**Kept as-is**:
- `game-inspector.md` (tool-specific, clear purpose)

**Current skill inventory** (5 active):
1. `slopcade-documentation.md` ⭐ (roadmap, docs workflows)
2. `slopcade-game-builder.md` (game creation)
3. `slopcade-icon-generation.md` (icon workflows)
4. `slopcade-3d-assets.md` (3D model optimization)
5. `game-inspector.md` (testing/debugging)

---

### 5. Created Knowledge Architecture Reference

**New file**: `.opencode/KNOWLEDGE-ARCHITECTURE.md`

Comprehensive reference guide documenting:
- **4 knowledge layers**: Auto-injected, Skills, Memory, Tools/Agents
- **Layer boundaries**: What goes where and why
- **Decision tree**: "How do I make Claude aware of X?"
- **Memory vs Skills**: Clear distinction (project state vs workflows)
- **Best practices**: DO/DON'T patterns
- **Maintenance schedule**: Daily/weekly/monthly/quarterly tasks

**Purpose**: Future-proofing - you (or future you) can quickly understand the system.

---

## Before/After Comparison

### Before Reorganization

```
❌ AGENTS.md: 148 lines (included full roadmap docs)
❌ Pattern files: Full implementation details
❌ Skills: Inconsistent naming (some slopcade-*, some not)
❌ documentation.md: Generic, not project-specific
❌ No reference doc explaining the system
```

### After Reorganization

```
✅ AGENTS.md: ~70 lines (concise overview)
✅ Pattern files: Lightweight references
✅ Skills: Consistent slopcade-* prefix for project skills
✅ documentation.md: Archived (superseded)
✅ KNOWLEDGE-ARCHITECTURE.md: Complete system reference
```

---

## Benefits

### 🎯 Clarity
- Clear boundaries: Config vs Skills vs Memory vs Docs
- No more "where does this go?" confusion

### 🔍 Discoverability
- Consistent naming makes skills easy to find
- Pattern files aid memory search without duplication

### 🧹 Maintainability
- Single source of truth for each concept
- References instead of duplication = easier updates

### 📏 Leanness
- AGENTS.md reduced by ~50% (less auto-loaded context)
- Pattern files are discovery aids, not duplicates

### 📚 Onboarding
- KNOWLEDGE-ARCHITECTURE.md explains the entire system
- Future developers/AI can quickly understand structure

---

## Impact on Existing Workflows

### ✅ No Breaking Changes

All workflows continue to work:
- Memory search still finds patterns (they reference full docs)
- Skills load the same way (just with consistent names)
- AGENTS.md still provides project context (now more concise)

### 🔄 Improved Workflows

- **"Add to roadmap"**: Load `/slopcade-documentation` (was already working)
- **"Work with 3D assets"**: Now clearly discoverable as `/slopcade-3d-assets`
- **"What's the knowledge system?"**: Read `KNOWLEDGE-ARCHITECTURE.md`

---

## Files Changed

### Modified
- `.opencode/AGENTS.md` (streamlined)
- `.opencode/memory/patterns/pattern-001.md` (lightweight reference)
- `.opencode/memory/patterns/pattern-002.md` (lightweight reference)

### Renamed
- `glb-optimization.md` → `slopcade-3d-assets.md`
- `icon-generation.md` → `slopcade-icon-generation.md`

### Archived
- `.opencode/skills/documentation.md` → `.opencode/skills/archive/documentation.md.archived`

### Created
- `.opencode/KNOWLEDGE-ARCHITECTURE.md` (new reference doc)
- `.opencode/skills/archive/README.md` (archive index)
- `.opencode/memory/log/2026-01-26-knowledge-architecture-reorganization.md` (this file)

---

## Next Steps

### Immediate (Done ✅)
- [x] Streamline AGENTS.md
- [x] Update pattern files
- [x] Archive documentation.md
- [x] Rename skills for consistency
- [x] Create KNOWLEDGE-ARCHITECTURE.md
- [x] Document changes

### Future Maintenance

**Monthly**:
- Review pattern files - are they still lightweight references?
- Check for new skills - do they follow naming conventions?
- Audit AGENTS.md - has it grown too large again?

**Quarterly**:
- Review KNOWLEDGE-ARCHITECTURE.md - is it still accurate?
- Check skill effectiveness - are they being used?
- Consider archiving unused skills

---

## References

- [Knowledge Architecture Reference](../KNOWLEDGE-ARCHITECTURE.md)
- [Slopcade Documentation Skill](../skills/slopcade-documentation.md)
- [AGENTS.md](../AGENTS.md)
- [Memory Patterns](../memory/patterns/)

---

## Lessons Learned

### What Worked Well
✅ Skills as "how to work" vs Memory as "what exists" distinction  
✅ Prefix-based naming convention for discoverability  
✅ Lightweight pattern files that reference full docs  
✅ Creating comprehensive reference doc (KNOWLEDGE-ARCHITECTURE.md)

### Avoid in Future
❌ Duplicating workflow instructions across AGENTS.md and skills  
❌ Full implementation details in pattern files  
❌ Generic skills when project-specific ones are more useful  
❌ Letting AGENTS.md grow unbounded without references to skills
