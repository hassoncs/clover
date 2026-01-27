# DevMux Service Orchestration

**Status**: active
**Source**: docs
**Created**: 2026-01-24
**Updated**: 2026-01-24

## Objective

Managed tmux sessions for long-running development processes (Metro, API, Storybook)

## Progress

- [x] DevMux configuration for Metro (:8085), API (:8789), Storybook (:6006)
- [x] Idempotent service management
- [x] Service status checking
- [x] Automatic service coordination (e.g., pnpm ios ensures Metro is running)

## Blockers

None

## Notes

Documented in app/AGENTS.md. Configuration in devmux.config.json

### Key Commands

| Command | Action |
|---------|--------|
| `pnpm dev` | Ensures `metro` (:8085) and `api` (:8789) are running |
| `pnpm storybook` | Ensures `storybook` (:6006) is running |
| `pnpm svc:status` | Shows health of all configured services |
| `pnpm svc:stop` | Stops all services (kills tmux sessions) |
| `npx devmux attach <service>` | Connect to a specific session to see logs |

### Benefits
1. **Persistence**: Servers don't die when you close a terminal tab
2. **Idempotency**: Running `pnpm dev` multiple times attaches to existing session instead of failing with "port in use"
3. **Coordination**: Scripts automatically ensure dependencies are running

### Configuration
See `devmux.config.json` in the root for port mappings and commands.
