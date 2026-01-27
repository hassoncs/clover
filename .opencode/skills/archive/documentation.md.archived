# Documentation Skill

> **Trigger**: When creating, updating, or organizing documentation in this repository.
>
> **Purpose**: Ensure all documentation follows the established taxonomy, naming conventions, and organizational patterns.

---

## Documentation Structure

This repository uses a **component-first, type-second** documentation structure:

```
docs/
├── INDEX.md                    # Global navigation hub
├── shared/                     # Cross-cutting project docs
│   ├── guides/                 # How-to tutorials
│   ├── reference/              # Lookup documentation
│   ├── troubleshooting/        # Problem → solution
│   ├── decisions/              # ADRs
│   ├── planning/               # Roadmaps (temporal)
│   └── log/YYYY/               # Status updates (temporal)
├── physics-engine/             # Box2D + Skia docs
│   ├── INDEX.md
│   ├── guides/
│   ├── reference/
│   ├── architecture/
│   ├── decisions/
│   ├── troubleshooting/
│   ├── research/
│   └── archive/
└── game-maker/                 # AI game generation docs
    ├── INDEX.md
    ├── guides/
    ├── reference/
    ├── architecture/
    ├── decisions/
    ├── troubleshooting/
    ├── research/
    ├── planning/
    ├── templates/
    └── archive/
```

---

## Document Types

| Type | Purpose | Lifecycle | Location |
|------|---------|-----------|----------|
| **guides/** | "How to do X" step-by-step tutorials | Evergreen | Any component |
| **reference/** | APIs, configs, lookup tables | Evergreen | Any component |
| **architecture/** | System design, component relationships | Evergreen | Component-specific |
| **decisions/** | ADRs - "we chose X because..." | Permanent record | Any component |
| **troubleshooting/** | Symptoms → causes → fixes | Evergreen | Any component |
| **research/** | Investigations, experiments | Temporal | Component-specific |
| **planning/** | Roadmaps, feature plans | Temporal | Component-specific |
| **templates/** | Reusable patterns, examples | Evergreen catalog | game-maker only |
| **log/** | Status updates, completion notes | Temporal | shared only |
| **archive/** | Historical docs, outdated content | Archived | Any component |

---

## Placement Rules

### Step 1: Choose Component

| Content About | Component |
|---------------|-----------|
| Box2D, Skia, Physics2D, platform adapters | `physics-engine/` |
| AI generation, entities, behaviors, game templates | `game-maker/` |
| Dev setup, tooling, repo-wide | `shared/` |

### Step 2: Choose Type

Ask yourself:

| Question | Type |
|----------|------|
| "How do I do X?" | `guides/` |
| "What is the API/config for X?" | `reference/` |
| "How is X designed/structured?" | `architecture/` |
| "Why did we choose X?" | `decisions/` |
| "What's wrong and how do I fix it?" | `troubleshooting/` |
| "I'm investigating/experimenting with X" | `research/` |
| "Here's our plan for X" | `planning/` |
| "X is now complete/done" | `log/` (with date prefix) |

---

## Naming Conventions

### File Names

- **Use kebab-case**: `box2d-contact-filtering.md`, `entity-system.md`
- **No SCREAMING_CASE**: Rename `ARCHITECTURE.md` → `architecture.md` or `system-overview.md`
- **Date-prefix logs only**: `2026-01-21-scenario-setup.md`
- **No lifecycle words in names**: Avoid `COMPLETE`, `FINAL`, `V2`, `DRAFT` in filenames

### Exceptions

- `INDEX.md` files are uppercase by convention
- `AGENTS.md` at repo root is uppercase by convention

---

## Required Metadata

### For Temporal Docs (research/, planning/, log/)

Add YAML frontmatter:

```yaml
---
status: draft | active | implemented | archived
created: YYYY-MM-DD
updated: YYYY-MM-DD
owner: (optional)
related:
  - path/to/related-doc.md
---
```

### For Evergreen Docs

Metadata is optional. Focus on content quality.

---

## Update vs Create Decision

### Update Existing Doc When:

- Same topic AND same doc type
- Adding to existing content (new section, more examples)
- Fixing errors or outdated information
- Content naturally extends what's there

### Create New Doc When:

- New topic (doesn't fit existing docs)
- Different doc type (e.g., investigation → ADR)
- Different lifecycle (temporal → evergreen requires new doc)
- Content is large enough to warrant separation

---

## Closure Requirements

### Research Docs

Must end with one of:
- **"Open Questions" + "Next Experiment"** (if ongoing)
- **"Outcome"** + link to ADR/guide where conclusion is evergreen (if resolved)

### Planning Docs

Must have a `status` field:
- `draft` - Not yet started
- `active` - Currently being worked on
- `implemented` - Done, content promoted to evergreen docs
- `abandoned` - Not pursued

When `implemented`, either:
1. Promote key sections to guides/reference
2. Move entire doc to `archive/`

---

## Discoverability Rule

**Every doc must be linked from exactly one INDEX.md file.**

- Component docs → linked in component's `INDEX.md`
- Shared docs → linked in `docs/INDEX.md`

If a doc isn't linked from an INDEX, it's considered undiscoverable and should either be:
1. Added to the appropriate INDEX
2. Deleted

---

## Quick Reference: Where to Put Common Docs

| I'm Writing... | Put It In |
|----------------|-----------|
| API reference for Physics2D | `physics-engine/reference/` |
| Tutorial on creating a game | `game-maker/guides/` |
| Investigation into a bug | `[component]/research/` |
| Why we chose Box2D over Rapier | `physics-engine/decisions/` |
| Expo setup instructions | `shared/guides/` |
| MVP roadmap | `game-maker/planning/` |
| "Feature X is now complete" | `shared/log/YYYY/YYYY-MM-DD-feature-x.md` |
| A new game template | `game-maker/templates/` |
| Troubleshooting guide | `[component]/troubleshooting/` |

---

## Workflow: Adding New Documentation

1. **Determine component**: physics-engine, game-maker, or shared
2. **Determine type**: guides, reference, architecture, decisions, troubleshooting, research, planning, templates, or log
3. **Create file with kebab-case name**
4. **Add frontmatter** (if temporal doc)
5. **Write content**
6. **Add link to appropriate INDEX.md**
7. **If replacing/superseding old doc**, either archive or delete the old one

---

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Create `DRAFT_FEATURE.md` | Use frontmatter `status: draft` |
| Name file `ARCHITECTURE_V2.md` | Update existing or use date in frontmatter |
| Put status updates in evergreen folders | Use `shared/log/YYYY/` |
| Create doc without adding to INDEX | Always update the INDEX |
| Mix guide + reference in one doc | Split into separate files |
| Leave research docs open forever | Close with "Outcome" or move to archive |
