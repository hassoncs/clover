# Game Engine Architecture

**Last Updated**: 2026-01-26  
**Status**: Single Source of Truth  
**Document Count**: 18 essential docs (down from 88)

---

## 🎯 Start Here

**New to the engine?** Read in this order:
1. **[00-MASTER-ARCHITECTURE.md](./00-MASTER-ARCHITECTURE.md)** - Complete system overview (~15 min read)
2. **[01-core-concepts/entity-system.md](./01-core-concepts/entity-system.md)** - How entities work
3. **[01-core-concepts/behavior-system.md](./01-core-concepts/behavior-system.md)** - Declarative logic
4. **[01-core-concepts/rules-system.md](./01-core-concepts/rules-system.md)** - Event-driven rules

**Implementing new features?**
- Check **[IMPLEMENTATION-SPEC-001](./IMPLEMENTATION-SPEC-001-ENTITY-HIERARCHY.md)** or **[002](./IMPLEMENTATION-SPEC-002-VARIABLE-TUNING.md)**
- Read relevant system docs from directories below

**Architectural decisions?**
- Read **[05-rfcs/](./05-rfcs/)** for design rationale
- Read **[00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md](./00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md)** for latest analysis

---

## 📂 Directory Structure

```
docs/game-engine-architecture/          (18 docs total)
│
├── README.md                           # This file
├── INDEX.md                            # Detailed navigation
├── 00-MASTER-ARCHITECTURE.md           # System overview ⭐ START HERE
├── 00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md  # Critical gap analysis
├── IMPLEMENTATION-SPEC-001-ENTITY-HIERARCHY.md  # Ready to implement
├── IMPLEMENTATION-SPEC-002-VARIABLE-TUNING.md   # Ready to implement
├── DOCUMENT-INVENTORY.md               # Source material catalog
│
├── 01-core-concepts/                   # (3 docs)
│   ├── entity-system.md
│   ├── behavior-system.md
│   └── rules-system.md
│
├── 02-dynamic-mechanics/               # (2 docs)
│   ├── variables-and-expressions.md
│   └── roadmap.md
│
├── 03-composable-systems/              # (1 doc)
│   └── overview.md
│
├── 05-rfcs/                            # (3 docs)
│   ├── RFC-001-derived-values.md
│   ├── RFC-002-complementary-systems.md
│   └── native-collision-support.md
│
├── 06-ai-integration/                  # (2 docs)
│   ├── generation-pipeline.md
│   └── tier-1-templates.md
│
└── 06-game-templates/                  # (1 doc)
    └── physics-templates-catalog.md
```

---

## 🎯 Quick Links

| I Want To... | Read This |
|--------------|-----------|
| Understand the whole system | [00-MASTER-ARCHITECTURE.md](./00-MASTER-ARCHITECTURE.md) |
| Learn about missing hierarchy | [00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md](./00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md) |
| Implement entity hierarchy | [IMPLEMENTATION-SPEC-001](./IMPLEMENTATION-SPEC-001-ENTITY-HIERARCHY.md) |
| Implement variable tuning | [IMPLEMENTATION-SPEC-002](./IMPLEMENTATION-SPEC-002-VARIABLE-TUNING.md) |
| Add a new behavior | [01-core-concepts/behavior-system.md](./01-core-concepts/behavior-system.md) |
| Add a new rule action | [01-core-concepts/rules-system.md](./01-core-concepts/rules-system.md) |
| Use variables/expressions | [02-dynamic-mechanics/variables-and-expressions.md](./02-dynamic-mechanics/variables-and-expressions.md) |
| Build Match3/Grid/Inventory | [03-composable-systems/overview.md](./03-composable-systems/overview.md) |
| Generate games with AI | [06-ai-integration/generation-pipeline.md](./06-ai-integration/generation-pipeline.md) |
| Understand design decisions | [05-rfcs/](./05-rfcs/) |

---

## 🔥 Critical Findings

### 1. **Entity Hierarchy** ✅ IMPLEMENTED

**Status**: Implemented
**Features**: `parentId`, `children[]`, `localTransform`, `worldTransform`
**Spec**: [IMPLEMENTATION-SPEC-001](./IMPLEMENTATION-SPEC-001-ENTITY-HIERARCHY.md)

### 2. **Variable Tuning Metadata** 🟡 HIGH

**Status**: Variables exist, metadata design complete  
**Impact**: Can't live-tune AI-generated games  
**Spec**: [IMPLEMENTATION-SPEC-002](./IMPLEMENTATION-SPEC-002-VARIABLE-TUNING.md)  
**Effort**: 5 days  
**Priority**: Implement alongside hierarchy

---

## 📊 Consolidation Results

### Before Cleanup

- **88 total docs** scattered across:
  - docs/game-maker/ (81 files)
  - docs/game-templates/ (7 files)
- **1.3MB** of documentation
- **No single source of truth**
- **Duplication and inconsistencies**

### After Cleanup

- **18 essential docs** in unified location
- **148KB** in game-engine-architecture/
- **Single master architecture document**
- **Clear navigation hierarchy**
- **70+ docs archived** (not deleted - preserved for history)

**Reduction**: 88 → 18 docs (79% reduction) ✅

---

## 🗂️ What Was Archived

### Archived (Historical Value)

All moved to `docs/archive/`:
- Old architecture docs superseded by master architecture
- Individual template docs (consolidated into catalog)
- Game template archetypes (merged into composable systems)
- Feature planning docs for completed features
- Analysis docs used for past decisions
- MVP roadmap (historical estimates)

### Deleted (True Redundancies)

Only 2 files actually deleted:
- `unified-input-action-implementation-prompt.md` (pure implementation prompt)
- `tile-system-summary.md` (merged into tile-system.md)

**Nothing lost** - everything else is archived, not deleted.

---

## 🔗 Related Documentation

### Other Doc Locations (Outside Engine Architecture)

- **Asset Generation**: `docs/asset-generation/` (separate system)
- **Godot Integration**: `docs/godot/` (bridge implementation)
- **Product/Editor Tracking**: `docs/game-maker/planning/CURRENT_WORK.md`
- **API Reference**: `packages/docs/api-reference/` (TypeDoc generated)
- **Guides**: `docs/game-maker/guides/` (user-facing tutorials)

---

## 📝 Maintenance

### When to Update

✅ **DO UPDATE** when:
- Implementing a spec (IMP-001, IMP-002)
- Adding new core system
- Making architectural decisions
- Identifying new gaps
- Completing roadmap phases

❌ **DON'T UPDATE** for:
- Bug fixes
- Implementation details (those are in code comments)
- API changes (those are in TypeDoc)
- Temporary workarounds

### Review Schedule

- **Weekly**: During active implementation (Q1-Q2 2026)
- **Monthly**: During maintenance phases
- **Quarterly**: Major architectural assessment

---

## 🎓 For New Team Members

### Week 1: Foundation
1. Read 00-MASTER-ARCHITECTURE.md (this gives you the complete mental model)
2. Read hierarchy analysis (understand the critical gap)
3. Read entity + behavior + rules (the core trinity)
4. Play with test games to see systems in action

### Week 2: Dynamics
1. Read variables-and-expressions.md
2. Read RFC-001 (expression system design)
3. Try modifying variables in games
4. Write simple expressions

### Week 3: Advanced
1. Read composable-systems/overview.md
2. Read physics-templates-catalog.md
3. Study one full game implementation
4. Read AI generation pipeline

---

## 💬 Questions?

- **Missing documentation?** Check `docs/archive/` first, then ask team
- **Inconsistency found?** File issue with `docs` label
- **Need implementation help?** Check specs first, then code comments

---

**This is the definitive game engine architecture knowledge base.**
