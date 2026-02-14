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

## Expo & Native Build Commands (CRITICAL)

**NEVER run raw `expo` commands directly.** Always use the project's `pnpm` scripts from the **repo root**.

This project uses Metro port 8085 (not the default 8081). The port must be configured at multiple layers (Metro config, Podfile, native binary compilation). Raw expo commands bypass these safeguards and produce broken builds.

| Goal | Correct Command (from repo root) | NEVER Do This |
|------|----------------------------------|---------------|
| Start dev server | `pnpm dev` | `expo start`, `npx expo start` |
| Run iOS | `pnpm ios` | `expo run:ios`, `npx expo run:ios` |
| Run Android | `pnpm android` | `expo run:android`, `npx expo run:android` |
| Run web | `pnpm web` | `expo start --web` |
| Install pods | `cd app && pnpm pods` | `cd app/ios && pod install` |
| Prebuild | `cd app && npx expo prebuild` | OK, but must be from `app/` dir |

**Why this matters:**
- The root scripts ensure Metro is running via devmux before building
- The app scripts include `--no-bundler` (prevents duplicate Metro instances)
- The app scripts set `RCT_METRO_PORT=8085` env var and `--port 8085` flag
- A preflight check validates port configuration before every native build
- Running raw `expo run:ios` without these flags produces a binary that connects to port 8081

**If you must run expo commands directly**, always include ALL of:
```bash
RCT_METRO_PORT=8085 npx expo run:ios --no-bundler
```
Note: `--port` and `--no-bundler` are mutually exclusive. The port is communicated via `RCT_METRO_PORT` env var and baked into the binary at build time.

## Service Management (Devmux)
- **ALWAYS** use the `devmux` skill for starting, stopping, or debugging services (api, metro, storybook).
- **NEVER** run `pnpm start` or `node server.js` directly for long-running processes.
- **NEVER** try to construct raw `tmux` commands manually. Use `devmux` abstraction.
- **Binary Path**: `devmux` is available directly in the shell via `.envrc` (pointing to `node_modules/.bin`).
- **Auto-loading**: The project uses `direnv` to automatically add project binaries to your PATH. If your shell doesn't load it on startup, ensure `eval "$(direnv export zsh)"` is in your shell config (already added to `~/.hassoncsShell/index.zsh`).

## Browser Automation & Debugging

When you need to debug something in the browser, verify UI behavior, scrape data, or take screenshots, **prefer `agent-browser` over Playwright MCP**.

### Why agent-browser?
- **Context-efficient**: Uses snapshot+refs pattern (returns 10-20 interactive elements vs thousands of DOM nodes)
- **Stable references**: Element refs (`@e2`) survive UI changes better than CSS selectors
- **Session persistence**: Maintains cookies, auth, and state across commands
- **Better for agents**: Designed specifically for AI agent workflows

### Basic workflow
```bash
# Navigate and capture snapshot
agent-browser open http://localhost:8085
agent-browser snapshot -i

# Interact using refs from snapshot
agent-browser click @e2
agent-browser fill @e3 "some text"

# Re-snapshot after interactions
agent-browser snapshot -i

# Screenshot for verification
agent-browser screenshot --full result.png
```

### When to use Playwright MCP instead
- Network interception/mocking needs
- Complex element timing conditions
- Video recording requirements
- Integration with existing Playwright test suites

## Code Search (codesearch)

This project has a semantic code search index via `codesearch` MCP. Use it to find code by meaning, not just string matching.

**When to use codesearch vs grep:**
- Grep: You know the exact string/symbol name (`RCT_METRO_PORT`, `GameDefinition`)
- Codesearch: You know what you're looking for conceptually ("where do we handle authentication?", "wallet transaction logic")

**Available MCP tools:**
- `semantic_search` — natural language code search, returns ranked results. Use `compact=true` (default) for token efficiency.
- `find_references` — find all usages/call sites of a symbol across the codebase.
- `get_file_chunks` — get all indexed chunks from a file (structural outline).

**The index auto-updates** — codesearch watches for file changes in MCP mode. No manual re-indexing needed.

**Config**: `.codesearchignore` controls what gets indexed (excludes addons, vendored code, build artifacts).

## Project Context

For domain-specific knowledge, load the relevant skill from `.claude/skills/`:

| Domain | Skill | Covers |
|--------|-------|--------|
| Chat/AI | `agent-orchestration` | SSE streaming, AG-UI, HITL, billing |
| Database/Storage | `storage-ops` | D1, R2, Supabase, migrations |
| Testing | `testing-patterns` | Vitest, GDUnit4, mocking, E2E |
| Entities/Games | `ecs-architecture` | Prefabs, GameDefinition, EntityManager, scriptRef |
| Godot Engine | `godot-engine` | GDScript, scenes, coordinates, exports |
| Physics | `physics` | Bodies, collision, joints, PPM |
| Godot Bridge | `bridge-development` | TS↔Godot communication |
| Visual Effects | `effects-system` | Shaders, feedback, particles |
| Economy | `economy-engine` | Resource graphs, pools |
| Input | `input-handling` | Touch, drag, gestures |
| Game Inspector | `game-inspector` | MCP tools, debugging |
| Asset Generation | `asset-pack-generation` | Image pipelines, BlobStore |
| Native/Build | `native-infrastructure` | Metro 8085, CocoaPods, Expo plugins |

Full skill index: `.claude/skills/INDEX.md`

### Skill Auto-Loading

Before starting domain-specific work, **proactively load the relevant skill** — don't wait until you're stuck.

1. Check the domain table above OR scan `.claude/skills/INDEX.md` for keyword matches
2. Load the skill BEFORE writing code in that domain
3. If a skill's trigger keywords don't match your task but the content would help, update the skill's "When to Use" section with better keywords

If you find yourself grepping for something that a loaded skill should have answered, that skill has a gap — fill it (see § Continuous Self-Improvement below).

## Secrets Management (Hush)

This project uses **`hush`** for secrets management. API keys and credentials are stored in the hush vault — never in `.env` files.
- **Binary Path**: `hush` is available directly in the shell via `.envrc` (pointing to `node_modules/.bin`).
- **Automatic PATH**: Local binaries are preferred over global ones thanks to `direnv`.

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

## Documentation & Planning

### Implementation Plans

**All implementation plans MUST go in `.sisyphus/plans/`.**

- **Active plans**: Work-in-progress implementation plans with task checklists.
- **Completed plans**: Delete immediately after implementation is verified and committed.
- **Archived plans**: If a plan has historical value, move to `docs/archive/plans/` after completion.

**Never create plans in `docs/plans/`.** That directory no longer exists for new work.

**Plan naming convention**: Use descriptive names like `live-workspace-editor.md` or date-prefixed for small tasks like `2026-02-11-repo-hygiene-loop.md`.

**Auto-open in editor**: When writing a new plan or markdown document, open it in Z editor automatically with `z <path>` — no need to ask.

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

---

## Learned Patterns & Gotchas

Domain-specific gotchas live in their respective skills (see Project Context table above). This section is for cross-cutting patterns that don't fit in a single skill.

### Script-First Architecture
- The engine has migrated to a script-first model. Logic lives in JS modules referenced by `scriptRef` on prefabs and entities.

### Prefab Migration
- The codebase has completed a big-bang rename from `template` to `prefab`. All core types (`EntityPrefab`, `GameDefinition.prefabs`) have been updated.

---

## Continuous Self-Improvement

Skills and AGENTS.md are living documents. Update them as a natural byproduct of working — not as a separate step.

### A. Immediate Skill Correction (during work)

When you discover that information in a loaded skill is **wrong or outdated**, fix it immediately:

1. Correct the wrong information in-place — don't wait until the end of the session
2. If a file path in a skill doesn't exist, grep for where it moved and update the skill
3. If a skill says "use X pattern" but the codebase has migrated to Y, update the skill to Y
4. Commit: `git add .claude/skills/ && git commit -m "docs: update {skill} — {what changed}"`

**Triggers:**
- Skill says file is at path A, but it's actually at path B
- Skill describes a pattern that no longer matches the code
- Skill references a type/interface/function that was renamed or deleted
- You try the skill's recommended approach and it fails due to codebase changes

### B. Learning Capture (during work)

When you discover something through research or trial-and-error that a skill *should have told you*:

1. Identify which skill covers this domain (check `.claude/skills/INDEX.md`)
2. Add the learning to that skill's `## Gotchas` section: `- **{Issue}**: {explanation} → {fix/workaround}`
3. If no matching skill exists and the learning is cross-cutting, add to "Learned Patterns & Gotchas" above
4. If no matching skill exists and the learning is domain-specific + substantial (3+ useful facts), create a new skill stub
5. Commit: `git add .claude/skills/ && git commit -m "docs: add learned pattern to {skill}"`

**Triggers:**
- You tried 2+ approaches before finding the right one
- You had to explore/grep for something that prior knowledge would have answered instantly
- You hit a non-obvious gotcha that will definitely recur
- User corrects you ("no, that's wrong", "actually it works like...", "you should have known...")
- User corrects a project-specific behavior or convention

### C. End-of-Session Reflection (before signing off)

Before your final response in any substantial session (3+ files edited or 10+ tool calls), do a quick self-check:

1. **Stale info?** Did any skill I loaded have wrong/outdated information I haven't already fixed?
2. **New learnings?** Did I discover anything not captured in our skills?
3. **Corrections?** Did the user correct me about something project-specific?

If YES to any → apply fixes (A or B above) if not already done. Mention briefly: "Updated {skill} with {learning}."
If NO to all → say nothing. Don't reflect for the sake of reflecting.

**Cost budget:** < 30 seconds, 0-2 tool calls. Skip entirely if nothing to update.
