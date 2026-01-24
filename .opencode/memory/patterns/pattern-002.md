# Documentation Taxonomy

**Category**: documentation
**Detected From**: docs/INDEX.md
**Proposed for AGENTS.md**: No (already documented in .opencode/skills/documentation.md)

## Description

Structured documentation types with clear purposes and locations.

## Document Types

| Type | Purpose | Location | Lifecycle |
|------|---------|----------|-----------|
| **guides/** | "How to do X" step-by-step tutorials | Evergreen | Update as needed |
| **reference/** | APIs, configs, lookup tables | Evergreen | Update as needed |
| **architecture/** | System design, component relationships | Evergreen | Update as needed |
| **decisions/** | ADRs - "we chose X because..." | Permanent record | Never delete |
| **troubleshooting/** | Symptoms → causes → fixes | Evergreen | Update as needed |
| **research/** | Investigations, experiments | Temporal | Requires closure |
| **planning/** | Roadmaps, feature plans | Temporal | Archive when done |
| **templates/** | Reusable patterns, examples | Evergreen catalog | Update as needed |
| **log/** | Status updates, completion notes | Temporal | Date-prefixed |
| **archive/** | Historical docs, outdated content | Archived | Permanent |

## Examples

### Guides
- `docs/shared/guides/expo-development.md` - Setting up and running the Expo app
- `docs/shared/guides/storybook-setup.md` - Component development with Storybook
- `docs/shared/guides/app-template-setup.md` - Creating new apps from template

### Reference
- `docs/shared/reference/waypoint-architecture.md` - Full infrastructure patterns
- `docs/shared/reference/registry-system.md` - Auto-discovered lazy loading
- `docs/shared/reference/sound-generation.md` - ElevenLabs sound effects API

### Log
- `docs/shared/log/2026/2026-01-21-scenario-setup.md` - Scenario.com integration verified

### Plans
- `docs/plans/comfyui-migration-architecture.md` - RunPod ComfyUI serverless migration plan
- `docs/plans/runpod-comfyui-setup-status.md` - Deployment checklist

## Naming Conventions

- **Guides**: `{action}-{subject}.md` (e.g., `expo-development.md`)
- **Reference**: `{subject}-{type}.md` (e.g., `registry-system.md`)
- **Log**: `YYYY-MM-DD-{event}.md` (e.g., `2026-01-21-scenario-setup.md`)
- **Plans**: `{subject}-{type}.md` (e.g., `comfyui-migration-architecture.md`)

## Related Documentation

- [Documentation Skill](../../../.opencode/skills/documentation.md) - Full documentation guidelines
- [docs/INDEX.md](../../../docs/INDEX.md) - Documentation hub
