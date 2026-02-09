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

## Project Context
...
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
