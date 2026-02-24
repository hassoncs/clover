# Project Agents Configuration

## Related Documents

This file covers **how agents work** — rules, patterns, and conventions. The rest of the team's knowledge lives in companion documents:

| Document | Purpose |
|----------|---------|
| [SOUL.md](SOUL.md) | Voice, personality, values — who we are |
| [IDENTITY.amen.md](IDENTITY.amen.md) | Amen brand bible — audience, tone, colors, content guidelines |
| [IDENTITY.slopcade.md](IDENTITY.slopcade.md) | Slopcade brand bible — audience, tone, colors, content guidelines |
| [HEARTBEAT.md](HEARTBEAT.md) | Maintenance cadences — brain-sleep, skill audits, dependency health |
| [TOOLS.md](TOOLS.md) | Environment map — services, ports, secrets, external dependencies |

When working on brand-specific features (UI, content generation, copy), load the relevant IDENTITY file first.

## General Principles

- When asked to implement something, start building immediately. Do not over-plan, over-research, or over-analyze before writing code. If clarification is needed, ask — otherwise start coding.
- When the user describes an architecture or design direction, confirm understanding before implementing. Pay close attention to directionality (e.g., which entity references which, which file is canonical vs symlinked). If unsure, ask rather than guess.
- When cleaning up or deleting code/UI, be conservative. Only remove what was explicitly requested. Do not opportunistically delete adjacent code, UI sections, or features that weren't mentioned.

### Architecture & Code Quality Standards

- **Right architecture, not easy architecture.** When choosing between approaches, pick the one that's actually correct — not the quickest hack. If the "right" way takes meaningfully more effort, flag it and let the user decide, but always present the proper solution first.
- **No dead weight.** Every implementation plan should include a final cleanup step: remove tech debt introduced during the work, delete deprecated code paths that were replaced, and clean up any legacy patterns that the new work makes obsolete. Don't leave behind scaffolding.
- **Single source of truth.** Never duplicate logic. If something exists in one place, reference it — don't copy it. If you find duplicated logic during work, consolidate it.
- **Name things for what they are.** Variables, functions, files, and modules should describe their purpose precisely. Vague names (`utils`, `helpers`, `misc`, `data`, `handle`) are a code smell — be specific.
- **Small surface area.** Export only what's needed. Keep interfaces narrow. Prefer explicit over implicit. The less surface area a module exposes, the easier it is to change later.
- **Delete, don't comment out.** Dead code gets deleted. Git remembers everything — commented-out blocks are clutter, not safety nets.
- **Dependencies are liabilities.** Every dependency is a maintenance burden. Before adding one, ask: can we do this in <50 lines ourselves? If yes, do that. If the dependency genuinely saves significant complexity, add it.
- **Leave it better than you found it.** When touching a file, fix small adjacent issues (stale imports, inconsistent formatting, obvious type improvements) — but don't refactor the whole file uninvited. Boy Scout Rule, not scorched earth.
- **Split large files eagerly.** If a file is growing past ~300-400 lines, split it proactively. Don't wait for it to become unmanageable. Smaller files are easier to navigate, review, and delegate across agents.
- **Fix easy broken tests.** If you encounter a failing test that's trivial to fix (< 5 minutes), just fix it — even if you didn't break it. Don't spend significant time on it though; if it's non-trivial, note it and move on.
- **Never revert uncommitted changes from git.** Other sub-agents may be working in parallel and their in-progress changes will show up in `git status`/`git diff`. Never revert, checkout, or discard changes you didn't make — you could be destroying another agent's work.
- **Think forward, build for now.** Design interfaces and abstractions that can grow, but don't build the growth yet. Leave seams for extension without over-engineering. Ask: "will this be easy to extend when the time comes?" — not "let me build for every possible future."
- **You are a team, not a solo dev.** This codebase is worked on by multiple agents in parallel. Don't be intimidated by scale — break large tasks into independent pieces, delegate aggressively, and trust that the system handles coordination. A 20-file change across 5 agents is routine, not exceptional.

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

This project uses custom Metro ports (not the default 8081): **Slopcade=8085, Amen=8086**. Both apps can run simultaneously. The port must be configured at multiple layers (Metro config, Podfile, native binary compilation). Raw expo commands bypass these safeguards and produce broken builds.

| Goal | Correct Command (from repo root) | NEVER Do This |
|------|----------------------------------|---------------|
| Start dev server (slopcade) | `pnpm dev` | `expo start`, `npx expo start` |
| Start dev server (amen) | `pnpm dev:amen` | `expo start`, `npx expo start` |
| Run iOS (slopcade) | `pnpm ios` | `expo run:ios`, `npx expo run:ios` |
| Run iOS (amen) | `pnpm ios:amen` | `expo run:ios`, `npx expo run:ios` |
| Run Android (slopcade) | `pnpm android` | `expo run:android`, `npx expo run:android` |
| Run Android (amen) | `pnpm android:amen` | `expo run:android`, `npx expo run:android` |
| Run web (slopcade) | `pnpm web` | `expo start --web` |
| Run web (amen) | `pnpm web:amen` | `expo start --web` |
| Install pods (slopcade) | `cd apps/slopcade && pnpm pods` | `cd apps/slopcade/ios && pod install` |
| Install pods (amen) | `cd apps/amen && pnpm pods` | `cd apps/amen/ios && pod install` |
| Prebuild (slopcade) | `cd apps/slopcade && npx expo prebuild` | OK, but must be from `apps/slopcade/` dir |
| Prebuild (amen) | `cd apps/amen && npx expo prebuild` | OK, but must be from `apps/amen/` dir |

**Why this matters:**
- The root scripts ensure Metro is running via devmux before building
- The app scripts include `--no-bundler` (prevents duplicate Metro instances)
- The app scripts set `RCT_METRO_PORT` env var (`8085` for slopcade, `8086` for amen) and matching `--port` flag
- A preflight check validates port configuration before every native build
- Running raw `expo run:ios` without these flags produces a binary that connects to port 8081

**If you must run expo commands directly**, always include ALL of:
```bash
# Slopcade
RCT_METRO_PORT=8085 npx expo run:ios --no-bundler
# Amen
RCT_METRO_PORT=8086 npx expo run:ios --no-bundler
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

**Limitation**: Only one codesearch MCP session can access the DB at a time (LMDB writer lock). If `index_status` returns 0 chunks or an error, another session may have the lock. Close other OpenCode sessions and restart.

**Search tool selection guide** (based on benchmarking):

| Query Type | Best Tool | Example |
|------------|-----------|---------|
| Exact symbol/string | Grep | `interface GameDefinition`, `RCT_METRO_PORT` |
| Domain disambiguation | Codesearch | "entity component" → finds ECS types, not React components |
| Symbol references | Codesearch `find_references` | "where is `authenticate` called?" |
| List all of a kind | Grep | "find all tRPC routers" → `router(` |
| Cross-file pipeline | Explore agent | "how does input flow from React Native to Godot?" |
| Cross-layer architecture | Explore agent | "trace the AI game generation pipeline end-to-end" |

**Known weaknesses:** Codesearch may miss primary definitions when multiple files have similar content (e.g., finds secondary `GameEntry` interface instead of primary `GameDefinition`). For exact type definitions, grep `interface TypeName` is more reliable. Codesearch scores below 0.70 often indicate wrong-domain matches.

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
# Any script needing SCENARIO_API_KEY, MODAL_ENDPOINT, etc.
hush run -- npx tsx api/scripts/some-script.ts
```

If a command fails with "API key required" or similar, the fix is almost always to prefix with `hush run --`.

**Note:** Most functionality that previously required CLI scripts is now available as tRPC routes callable via MCP. See "API-First: No New CLI Scripts" below.

## API-First: No New CLI Scripts

**All new functionality MUST be implemented as tRPC routes, not CLI scripts.**

The API has an MCP (Model Context Protocol) endpoint at `/mcp` that auto-discovers all tRPC routes and exposes them as MCP tools. This means any tRPC route is automatically callable by AI agents.

### Why API routes over CLI scripts

| CLI Script | tRPC Route |
|------------|------------|
| Only callable from terminal | Callable by agents, UI, other services, and terminal |
| Requires `hush run --` for secrets | Secrets available via `ctx.env` automatically |
| Local filesystem only | R2, D1, and all Workers bindings available |
| Can't be shipped to production | Already deployed as part of the API |
| Hard to test | Testable via tRPC caller |

### How it works

1. Create a tRPC route in `api/src/trpc/routes/`
2. Register it in `api/src/trpc/router.ts`
3. The MCP bridge (`api/src/mcp/trpc-mcp-bridge.ts`) auto-discovers it
4. Agents can call it via the `slopcade-api` MCP server (configured in `.opencode/opencode.json`)

### Where to put new routes

| Purpose | Router | File |
|---------|--------|------|
| Admin/dev tools (generation, seeding) | `adminTools` | `api/src/trpc/routes/admin-tools.ts` |
| Game operations | `games` | `api/src/trpc/routes/games.ts` |
| Asset operations | `assetSystem` | `api/src/trpc/routes/asset-system.ts` |

### Remaining CLI scripts (exceptions)

Only one script remains as a CLI — it requires direct local filesystem access:

| Script | Why it stays |
|--------|-------------|
| `api/scripts/sync-r2.ts` | Compiles games from source files, then syncs `r2/` to local wrangler R2 (used by devmux `games-watcher`) |

### MCP configuration

The MCP server is configured in both `.mcp.json` (Claude Code) and `.opencode/opencode.json` (OpenCode) as `slopcade-api`. It uses `mcp-remote` to bridge the HTTP MCP endpoint at `http://localhost:8789/mcp` to stdio. The API must be running (via `pnpm dev`) for the MCP server to work.

### How to call tRPC routes from agents

**Preferred: MCP tools (zero config, auto-auth)**

When the `slopcade-api` MCP server is connected, every tRPC route is exposed as an MCP tool. The tool name matches the tRPC path (e.g., `partyContent.reviewAll`). Auth is handled automatically via `dev-token`. Just call the tool with the route's input params as arguments.

**Fallback: curl (when MCP server isn't available in current session)**

The tRPC server does NOT use superjson. Pass raw JSON — no `{"json": ...}` wrapper.

```bash
# Query (GET) — use --data-urlencode for the input param
curl -sG 'http://localhost:8789/trpc/<router>.<procedure>' \
  -H 'Authorization: Bearer dev-token' \
  --data-urlencode 'input={"param1":"value1","param2":42}'

# Mutation (POST) — raw JSON body, no wrapper
curl -s 'http://localhost:8789/trpc/<router>.<procedure>' \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer dev-token' \
  -d '{"param1":"value1","param2":42}'
```

**Common mistakes to avoid:**
- Do NOT wrap input in `{"json": {...}}` — that's for superjson-enabled clients; our server uses plain JSON
- Do NOT use `{"0":{"json":{...}}}` batch format — that's tRPC client internal encoding
- Queries MUST be GET (POST to a query returns 405)
- Mutations MUST be POST
- Always include `Authorization: Bearer dev-token` for admin routes
- For long-running mutations (>2 min), run curl in background: `nohup curl ... > /tmp/result.json &`

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

### Animations — Cross-Platform Only (No CSS)
All animations **must** use `react-native-reanimated` — never CSS `@keyframes`, `<style>` tags, `dangerouslySetInnerHTML`, or the CSS `animation` property. Reanimated works on both web and native Metro, so there's no reason to use web-only CSS animations.

**Standard pattern:**
```tsx
import Animated, {
  useAnimatedStyle, useSharedValue,
  withRepeat, withTiming, Easing, cancelAnimation,
} from "react-native-reanimated";

const value = useSharedValue(0);
useEffect(() => {
  value.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1, true);
  return () => cancelAnimation(value);
}, []);
const style = useAnimatedStyle(() => ({ opacity: value.value }));
return <Animated.View style={style}>{children}</Animated.View>;
```

**For components that require SVG** (e.g., feTurbulence, stroke-dashoffset animation): use the `.web.tsx` / `.native.tsx` platform split. The web version can use raw `<svg>` elements; the native version uses `react-native-reanimated` with simplified rendering. Do NOT create a bare `.tsx` shim that re-exports from `.web` — that breaks Metro's platform resolution.

### Game Source Files (r2/games/)
Games are authored as directories of source files (`manifest.json`, `scripts/`, `prefabs/`, `entities/`). `definition.json` and `metadata.json` are auto-generated build outputs (gitignored) — never edit them directly. The `games-watcher` devmux service recompiles on source file change via `api/scripts/sync-r2.ts`.

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

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
