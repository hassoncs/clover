# Tools

The environment map. Everything an agent needs to know about what's running, where, and how to interact with it.

---

## Services (Devmux)

All services are managed through `devmux`. Never run processes directly. Never construct raw tmux commands.

### Core Services

| Service | Port | Description | Depends On |
|---------|------|-------------|------------|
| `api` | 8789 | Cloudflare Workers API (tRPC + MCP) | games-watcher, r2-pull-watcher |
| `metro` | 8085 | Slopcade Metro bundler | api, godot, bridge-watch, admin |
| `metro-amen` | 8086 | Amen Metro bundler | api, godot, bridge-watch, admin |
| `admin` | 8787 | Admin web app (Supabase creds via hush) | api |
| `storybook` | 6007 | Component library | — |
| `backlog` | 6420 | Backlog issue tracker | — |
| `beads-ui` | 8030 | Beads issue tracker web UI | — |

### Background Watchers

| Service | Description |
|---------|-------------|
| `games-watcher` | Compiles game source files in `r2/games/` on change |
| `r2-pull-watcher` | Syncs binary blobs from R2 |
| `bridge-watch` | Monitors Godot-TypeScript bridge changes |
| `godot` | Exports Godot project on change |
| `game-inspector` | MCP server for game debugging (46 operations) |
| `game-inspector-tsc` | TypeScript watcher for game-inspector package |

### Build Services (One-shot)

| Service | Description |
|---------|-------------|
| `ios` | Build + install Slopcade on iOS simulator |
| `ios-amen` | Build + install Amen on iOS simulator |
| `web` | Slopcade web (port 8085) |
| `web-amen` | Amen web (port 8086) |

### Quick Commands

```bash
devmux start api          # Start a service
devmux stop api           # Stop a service
devmux logs api           # View logs
devmux status             # See what's running
pnpm dev                  # Start api + metro (Slopcade)
pnpm dev:amen             # Start api + metro (Amen)
```

---

## Secrets (Hush)

Secrets are managed through `hush`. Never use `.env` files.

```bash
hush run -- <command>            # Run with all secrets injected
hush run -t api-workers -- ...   # Run with API-specific secrets
hush run -t app -- ...           # Run with app-specific secrets
```

**Binary path**: Available via `.envrc` (direnv auto-loads project binaries).

**Template**: `.hush.template` lists all required secret keys.

**Encrypted vaults**: `.hush.encrypted` (production), `.hush.development.encrypted` (dev).

---

## MCP Servers

AI agents interact with the project through MCP (Model Context Protocol) servers.

| Server | Transport | Description |
|--------|-----------|-------------|
| `slopcade-api` | HTTP → stdio bridge at `localhost:8789/mcp` | All tRPC routes as MCP tools (auto-discovered) |
| `game-inspector` | stdio | 46 game debugging operations |
| `codesearch` | stdio | Semantic code search (LMDB-backed) |
| `scenario-image-gen` | stdio | AI image generation via Scenario.com |

**Requirement**: The API must be running (`pnpm dev`) for `slopcade-api` MCP to work.

**Codesearch limitation**: Only one session can access the LMDB writer at a time. Close other sessions if `index_status` returns 0.

---

## External Services

### Infrastructure

| Service | Purpose | Dashboard |
|---------|---------|-----------|
| Cloudflare | Workers, D1, R2, Durable Objects | [dash.cloudflare.com](https://dash.cloudflare.com) |
| Supabase | Auth (Google, Apple, Email) | [supabase.com/dashboard/project/bqoepxmdaiggnwjjszsd](https://supabase.com/dashboard/project/bqoepxmdaiggnwjjszsd/) |
| Google Cloud | OAuth credentials | [console.cloud.google.com/auth/clients?project=slopcade](https://console.cloud.google.com/auth/clients?project=slopcade) |

### AI / Generation

| Service | Purpose |
|---------|---------|
| Scenario.com | Sprite and image generation |
| ElevenLabs | Sound effects and voice generation |
| OpenRouter | LLM routing (game generation, content, chat) |

### Payments

| Service | Purpose |
|---------|---------|
| Stripe | Web subscriptions + church plans |
| RevenueCat | iOS/Android IAP (Sparks currency packs) |

---

## Project Structure

```
slopcade/
  apps/
    slopcade/         # Main app (port 8085)
    amen/             # Amen app (port 8086)
    admin/            # Admin dashboard (port 8787)
    storybook/        # Component library (port 6007)
    landing-slopcade/ # Marketing site
    landing-amen/     # Marketing site
  api/                # Cloudflare Workers API
  packages/           # Shared packages
  shared/             # Shared types
  godot_project/      # Godot 4 game engine
  r2/                 # Game source files + local R2 mirror
  data/               # Static data files
  scripts/            # Build and utility scripts
  tests/              # E2E and integration tests
```

### Config Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent behavior rules and codebase conventions |
| `SOUL.md` | Agent voice, personality, values |
| `IDENTITY.amen.md` | Amen brand bible |
| `IDENTITY.slopcade.md` | Slopcade brand bible |
| `HEARTBEAT.md` | Maintenance cadences and cleanup rituals |
| `TOOLS.md` | This file — environment map |
| `devmux.config.json` | Service orchestration |
| `hush.yaml` | Secret templates |
| `biome.json` | Linter / formatter |
| `turbo.json` | Turborepo pipeline config |
| `knip.json` | Unused export detection |
| `pnpm-workspace.yaml` | Monorepo workspace config |

### Agent-Specific Directories

| Directory | Purpose |
|-----------|---------|
| `.claude/skills/` | Domain knowledge for AI agents (26+ skill files) |
| `.claude/memory/` | Persistent context across sessions |
| `.sisyphus/plans/` | Active implementation plans |
| `.sisyphus/notepads/` | Working notes and learnings |
| `.sisyphus/brain-sleep.md` | Maintenance run history |
| `.opencode/` | MCP config, custom commands, plugins |

---

## Build Commands

All commands run from repo root unless noted.

| Task | Command |
|------|---------|
| Install dependencies | `pnpm install` |
| Start dev (Slopcade) | `pnpm dev` |
| Start dev (Amen) | `pnpm dev:amen` |
| iOS build (Slopcade) | `pnpm ios` |
| iOS build (Amen) | `pnpm ios:amen` |
| Android build (Slopcade) | `pnpm android` |
| Android build (Amen) | `pnpm android:amen` |
| Web (Slopcade) | `pnpm web` |
| Web (Amen) | `pnpm web:amen` |
| Run tests | `pnpm test` |
| Type check | `tsc --noEmit` |
| Lint | `pnpm lint` |
| Install CocoaPods | `cd apps/{app} && pnpm pods` |

**Critical**: Never run raw `expo` commands. Always use the `pnpm` scripts which set the correct Metro ports (Slopcade=8085, Amen=8086) and include `--no-bundler` flags. See AGENTS.md for details.
