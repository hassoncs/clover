# Project Agents Configuration

## Terminal Command Execution

**ALWAYS use the `interactive_bash` tool for running terminal commands**, unless:
- You only need a simple one-shot command with immediate output
- The command is a simple status check (e.g., `git status`, `ls`)

**Prefer `interactive_bash` for:**
- Long-running processes
- Build commands
- Test commands
- Commands that may produce interactive output
- Any command that might require monitoring or interaction

The `interactive_bash` tool runs commands in a persistent tmux session, which provides better output handling and allows for ongoing interaction.

## Service Management (Devmux)
- **ALWAYS** use the `devmux` skill for starting, stopping, or debugging services (api, metro, storybook).
- **NEVER** run `pnpm start` or `node server.js` directly for long-running processes.
- **NEVER** try to construct raw `tmux` commands manually. Use `devmux` abstraction.

## Codebase Context
- This is a monorepo using `pnpm` workspaces.
- `app/` contains the Expo/React Native app.
- `packages/` contains shared UI, logic, and configuration.
- `apps/storybook` contains the component library documentation.

## Roadmap System

The project uses a distributed roadmap managed by the **Chronicler** agent.

**Full documentation**: `.opencode/skills/slopcade-documentation.md` (load with `/slopcade-documentation`)

### Quick Reference

| Path | Purpose |
|------|---------|
| `.opencode/memory/ROADMAP.md` | Master roadmap (single source of truth) |
| `.opencode/memory/roadmap/active/` | Features currently being built |
| `.opencode/memory/roadmap/completed/{date}/` | Completed features (archived by date) |
| `.opencode/memory/human-tasks/` | Blockers requiring human decision |
| `.opencode/memory/graph.yaml` | Master knowledge graph (auto-generated) |

### When User Says "Add to Roadmap"

Load the `slopcade-documentation` skill to determine:
- Active Feature vs Human Task vs Oracle Plan
- Proper file location and template
- Cross-referencing and lifecycle management

---

## Established Patterns

### Platform-Specific Modules
When code needs different implementations for web vs. native:

```
src/
  utils/
    index.ts          # Unified exports
    platform.ts       # Shared logic
    platform.web.ts   # Web-specific (React Native Web)
    platform.native.ts # Native-specific (iOS/Android)
```

**Usage**: Import from `index.ts` - the platform-appropriate file loads automatically via Metro bundler resolution.

### Asset Pipeline Debug Output
When debugging asset generation, save intermediate files to:
```
api/debug-output/{gameId}/{assetId}/
  1-original.png      # Input image
  2-masked.png        # After masking
  3-silhouette.png    # Silhouette result
  4-final.png         # Final output
  metadata.json       # Generation parameters
```

This enables visual inspection at each pipeline stage.
