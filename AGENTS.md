# Project Agents Configuration

## General Principles

- When asked to implement something, start building immediately. Do not over-plan, over-research, or over-analyze before writing code. If clarification is needed, ask — otherwise start coding.
- When the user describes an architecture or design direction, confirm understanding before implementing. Pay close attention to directionality (e.g., which entity references which, which file is canonical vs symlinked). If unsure, ask rather than guess.
- When cleaning up or deleting code/UI, be conservative. Only remove what was explicitly requested. Do not opportunistically delete adjacent code, UI sections, or features that weren't mentioned.

## Git & Commits

- When asked to commit, just commit. Do not review, analyze, or summarize changes before committing unless explicitly asked to review first.

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

## Project Context

- This is a TypeScript monorepo using `pnpm` workspaces. Primary language is TypeScript. Do not use plain JavaScript unless explicitly asked.
- `app/` contains the Expo/React Native app.
- `packages/` contains shared UI, logic, and configuration.
- `apps/storybook` contains the component library documentation.
- This project has a dual game system: bundled TypeScript test games and API-served JSON game definitions. Understand which system you're modifying before editing files.

## Infrastructure

- The project uses Cloudflare Workers with R2 and D1. Local development uses Wrangler/miniflare. Asset URLs must use the correct bucket name (check for -dev suffix). Do not assume Node.js filesystem APIs work in the Workers runtime.

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

## Secrets Management (Hush)

This project uses **`hush`** for secrets management. API keys and credentials are stored in the hush vault — never in `.env` files.

**Any command that needs secrets (AI generation, external APIs) must be prefixed with `hush run --`:**
```bash
# Asset generation (run from repo root — NOT from api/ directory)
hush run -- pnpm generate:assets --game=ballSort --debug

# Any script needing SCENARIO_API_KEY, MODAL_ENDPOINT, etc.
hush run -- npx tsx api/scripts/some-script.ts
```

**IMPORTANT: Always run `pnpm generate:assets` from the repo root.** The root package.json delegates to the api workspace automatically.

If a command fails with "API key required" or similar, the fix is almost always to prefix with `hush run --`.

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
