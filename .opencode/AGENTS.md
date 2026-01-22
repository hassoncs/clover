# Project Agents Configuration

## Service Management (Devmux)
- **ALWAYS** use the `devmux` skill for starting, stopping, or debugging services (api, metro, storybook).
- **NEVER** run `pnpm start` or `node server.js` directly for long-running processes.
- **NEVER** try to construct raw `tmux` commands manually. Use `devmux` abstraction.

## Codebase Context
- This is a monorepo using `pnpm` workspaces.
- `app/` contains the Expo/React Native app.
- `packages/` contains shared UI, logic, and configuration.
- `apps/storybook` contains the component library documentation.
