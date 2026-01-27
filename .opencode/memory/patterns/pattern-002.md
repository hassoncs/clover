# pattern-002: Documentation Taxonomy

**Category**: documentation  
**Status**: active  
**Documented in**: `.opencode/skills/slopcade-documentation.md`

## Description

This pattern defines the 3-tier documentation system used across Slopcade:

1. **Product Documentation** (`docs/`) - User-facing, component-specific, evergreen knowledge
2. **Project Management** (`.opencode/memory/`) - Roadmaps, tasks, patterns, active work tracking
3. **Daily Operations** (`docs/TODAY_*.md`) - Temporal daily/weekly work plans

### Document Types

| Type | Purpose | Lifecycle |
|------|---------|-----------|
| **guides/** | "How to do X" tutorials | Evergreen |
| **reference/** | APIs, configs, lookups | Evergreen |
| **architecture/** | System design | Evergreen |
| **decisions/** | ADRs (permanent) | Never delete |
| **troubleshooting/** | Problem → solution | Evergreen |
| **research/** | Investigations | Temporal (requires closure) |
| **planning/** | Feature roadmaps | Temporal (archive when done) |
| **templates/** | Reusable patterns | Evergreen |
| **log/** | Status updates | Temporal (date-prefixed) |
| **archive/** | Outdated content | Archived |

## Examples in Codebase

- **Guides**: `docs/shared/guides/expo-development.md`, `docs/game-maker/guides/input-configuration.md`
- **Reference**: `docs/shared/reference/sound-generation.md`, `docs/asset-generation/reference/`
- **Log**: `docs/shared/log/2026/2026-01-21-scenario-setup.md`
- **Planning**: `docs/game-maker/planning/`

## Full Documentation

See `.opencode/skills/slopcade-documentation.md` for:
- Complete taxonomy rules
- Placement guidelines
- Temporal document lifecycle
- User intent parsing ("add to roadmap", "document this")
- Workflow examples

## Related

- [Documentation Hub](../../../docs/INDEX.md)
- [Slopcade Documentation Skill](../../skills/slopcade-documentation.md)
