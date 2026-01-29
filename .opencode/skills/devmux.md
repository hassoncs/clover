# DevMux Service Orchestration

> **Trigger**: When mentioning "devmux", "dev mux", "service", "metro", "storybook", "api", "start server", "stop service", "port locked", or any service management task.
>
> **Purpose**: Complete reference for the DevMux service orchestration system - how it works, how to configure it, and how to manage development services.

---

## When to Load This Skill

Load this skill when working on:
- **Starting/stopping services** (Metro, API, Storybook, Docs, Godot, Web)
- **Service troubleshooting** (port conflicts, zombie processes, health checks)
- **DevMux configuration** (`devmux.config.json` changes)
- **Service dependencies** (understanding service startup order)
- **Adding new services** to the devmux configuration
- **Debugging** "locked by another process" errors

---

## Quick Reference

### Common Commands

| Goal | Command | What It Does |
|------|---------|--------------|
| Check all services | `pnpm svc:status` | Shows running/stopped status of all services |
| Start Metro | `pnpm dev` | Starts Metro bundler via devmux (idempotent) |
| Start API | `pnpm dev:api` | Starts Cloudflare Workers API via devmux |
| Start Storybook | `pnpm storybook` | Starts Storybook on port 6006 |
| Start Docs | `pnpm docs` | Starts documentation site on port 3000 |
| Stop all services | `pnpm svc:stop` | Stops all devmux-managed services |
| Stop one service | `npx devmux stop <service>` | Stop specific service (e.g., `metro`) |
| Attach to logs | `npx devmux attach <service>` | View real-time logs (Ctrl+B, D to detach) |
| Ensure service | `npx devmux ensure <service>` | Start if not running (idempotent) |
| Check health | `curl localhost:<port>/status` | Verify service is responding |

### Service Quick Reference

| Service | Port | Command | Depends On |
|---------|------|---------|------------|
| `metro` | 8085 | `pnpm dev` | api, godot, registry, game-inspector |
| `api` | 8789 | `pnpm dev:api` | - |
| `web` | 8085 | `pnpm web` | api, godot, registry, game-inspector |
| `storybook` | 6006 | `pnpm storybook` | - |
| `docs` | 3000 | `pnpm docs` | - |
| `godot` | - | `pnpm godot` | - |
| `registry` | - | Auto-starts | - |
| `game-inspector` | 3100 | Auto-starts | - |

---

## What is DevMux?

**DevMux** is a tmux-based service orchestration tool that manages long-running development services in named sessions. It ensures:

1. **Persistence**: Services keep running after terminal closes
2. **Idempotency**: Running `ensure` multiple times is safe
3. **Health Checks**: Verifies services are actually working (not just running)
4. **Dependency Management**: Starts services in correct order
5. **Port Management**: Detects conflicts and prevents collisions

### How It Works

When you run `npx devmux ensure metro`:

1. **Check Session**: Looks for tmux session named `omo-slopcade-metro`
2. **Health Check**: Verifies port 8085 is responding (if configured)
3. **Start if Needed**: Creates tmux session and runs the command
4. **Wait for Healthy**: Polls until health check passes
5. **Return**: Exits once service is confirmed running

The service runs **inside tmux**, which means:
- It persists after your terminal closes
- You can attach to see logs: `npx devmux attach metro`
- `Ctrl+B, D` detaches without killing
- `npx devmux stop` kills the tmux session

---

## Configuration (`devmux.config.json`)

**Location**: `/Users/hassoncs/Workspaces/Personal/slopcade/devmux.config.json`

### Full Schema

```json
{
  "version": 1,
  "project": "slopcade",
  "services": {
    "<service-name>": {
      "cwd": "<working-directory>",
      "command": "<command-to-run>",
      "health": {
        "type": "port",
        "port": <port-number>
      },
      "dependsOn": ["<dependency-service-1>", "<dependency-service-2>"]
    }
  }
}
```

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | number | Yes | Config version (currently 1) |
| `project` | string | Yes | Project name (used in tmux session naming) |
| `services` | object | Yes | Map of service definitions |

### Service Definition Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cwd` | string | Yes | Working directory for the command (relative to config) |
| `command` | string | Yes | Shell command to run |
| `health` | object | No | Health check configuration |
| `health.type` | string | No | Currently only `"port"` supported |
| `health.port` | number | No | Port to check for health |
| `dependsOn` | string[] | No | Services that must start before this one |

### Current Configuration

```json
{
  "version": 1,
  "project": "slopcade",
  "services": {
    "game-inspector": {
      "cwd": "packages/game-inspector-mcp",
      "command": "pnpm dev",
      "health": { "type": "port", "port": 3100 }
    },
    "api": {
      "cwd": ".",
      "command": "CLOUDFLARE_INCLUDE_PROCESS_ENV=true npx hush run -t api-workers -- pnpm --filter @slopcade/api dev",
      "health": { "type": "port", "port": 8789 }
    },
    "godot": {
      "cwd": ".",
      "command": "node scripts/export-godot.mjs --watch"
    },
    "registry": {
      "cwd": "app",
      "command": "node scripts/generate-registry.mjs --watch"
    },
    "metro": {
      "cwd": "app",
      "command": "node ../scripts/export-godot.mjs --once && node scripts/generate-registry.mjs && RCT_METRO_PORT=8085 npx hush run -t app -- npx expo start --dev-client --port 8085",
      "health": { "type": "port", "port": 8085 },
      "dependsOn": ["api", "godot", "registry", "game-inspector"]
    },
    "web": {
      "cwd": "app",
      "command": "node ../scripts/export-godot.mjs --once && node scripts/generate-registry.mjs && npx hush run -t app -- npx expo start --web --port 8085",
      "health": { "type": "port", "port": 8085 },
      "dependsOn": ["api", "godot", "registry", "game-inspector"]
    },
    "storybook": {
      "cwd": "apps/storybook",
      "command": "npx hush run -t app -- pnpm storybook",
      "health": { "type": "port", "port": 6006 }
    },
    "docs": {
      "cwd": ".",
      "command": "pnpm --filter @slopcade/docs dev",
      "health": { "type": "port", "port": 3000 }
    }
  }
}
```

### Service Details

#### Metro (Port 8085)
The React Native bundler for iOS/Android development.

```json
{
  "cwd": "app",
  "command": "node ../scripts/export-godot.mjs --once && node scripts/generate-registry.mjs && RCT_METRO_PORT=8085 npx hush run -t app -- npx expo start --dev-client --port 8085",
  "health": { "type": "port", "port": 8085 },
  "dependsOn": ["api", "godot", "registry", "game-inspector"]
}
```

**Pre-start steps**:
1. Export Godot assets once (`export-godot.mjs --once`)
2. Generate game registry (`generate-registry.mjs`)
3. Start Metro with port 8085

**Used by**: `pnpm ios`, `pnpm android`, `pnpm dev`

#### API (Port 8789)
Cloudflare Workers backend API.

```json
{
  "cwd": ".",
  "command": "CLOUDFLARE_INCLUDE_PROCESS_ENV=true npx hush run -t api-workers -- pnpm --filter @slopcade/api dev",
  "health": { "type": "port", "port": 8789 }
}
```

**Used by**: Metro (dependency), direct API calls

#### Storybook (Port 6006)
Component library documentation and testing.

```json
{
  "cwd": "apps/storybook",
  "command": "npx hush run -t app -- pnpm storybook",
  "health": { "type": "port", "port": 6006 }
}
```

**Used by**: `pnpm storybook`

#### Docs (Port 3000)
Project documentation site (VitePress).

```json
{
  "cwd": ".",
  "command": "pnpm --filter @slopcade/docs dev",
  "health": { "type": "port", "port": 3000 }
}
```

**Used by**: `pnpm docs`

#### Godot
File watcher for Godot scene/asset exports.

```json
{
  "cwd": ".",
  "command": "node scripts/export-godot.mjs --watch"
}
```

**Watches**: `.gd`, `.tscn`, and asset files

#### Registry
File watcher for game registry generation.

```json
{
  "cwd": "app",
  "command": "node scripts/generate-registry.mjs --watch"
}
```

**Watches**: Test games in `app/lib/test-games/games/`

#### Game Inspector (Port 3100)
MCP-based debugging tool for games.

```json
{
  "cwd": "packages/game-inspector-mcp",
  "command": "pnpm dev",
  "health": { "type": "port", "port": 3100 }
}
```

---

## Workflows

### 1. Check Service Status

Always start by checking what's running:

```bash
pnpm svc:status
```

Example output:
```
NAME          STATUS    PORT   PID
metro         running   8085   12345
api           running   8789   12346
storybook     stopped   6006   -
docs          stopped   3000   -
```

### 2. Start a Service

**Always use the pnpm scripts** (not devmux directly):

```bash
# Metro (for mobile dev)
pnpm dev

# API only
pnpm dev:api

# Storybook
pnpm storybook

# Documentation
pnpm docs

# Web dev server
pnpm web
```

These scripts internally run `npx devmux ensure <service>`.

### 3. Stop Services

```bash
# Stop all services
pnpm svc:stop

# Stop specific service
npx devmux stop metro
npx devmux stop api
npx devmux stop storybook
```

### 4. View Logs

```bash
# Attach to Metro logs
npx devmux attach metro

# Attach to API logs
npx devmux attach api

# Detach without killing: Ctrl+B, then D
```

### 5. Fix "Locked by Another Process"

This error means the port is already in use:

```bash
# 1. Check what's using the port
lsof -i :8085

# 2. Get just the PID
lsof -i :8085 -t

# 3. Kill the process
kill -9 <PID>

# 4. Stop the service in devmux to clear state
npx devmux stop metro

# 5. Restart
pnpm dev
```

**One-liner for Metro (port 8085)**:
```bash
kill -9 $(lsof -i :8085 -t) && npx devmux stop metro && pnpm dev
```

### 6. Full Reset

When everything is broken:

```bash
# 1. Stop all services
pnpm svc:stop

# 2. Kill any lingering processes
kill -9 $(lsof -i :8085 -t 2>/dev/null) 2>/dev/null
kill -9 $(lsof -i :8789 -t 2>/dev/null) 2>/dev/null
kill -9 $(lsof -i :6006 -t 2>/dev/null) 2>/dev/null

# 3. Verify nothing on ports
lsof -i :8085
lsof -i :8789
lsof -i :6006

# 4. Restart
pnpm dev
```

---

## Common Issues

### Issue: "Metro is not running"

**Symptoms**: App shows loading screen, can't connect

**Diagnosis**:
```bash
pnpm svc:status
npx devmux attach metro
```

**Fixes**:
1. `pnpm svc:stop && pnpm ios` - Restart everything
2. Check port: `lsof -i :8085`
3. Check logs: `npx devmux attach metro`

### Issue: "Cannot connect to Metro" but it's running

**Cause**: Port mismatch between Metro and app

**Fix**: Ensure `--port 8085` is used consistently:
- `devmux.config.json`: `RCT_METRO_PORT=8085`
- `pnpm ios`: Uses `--port 8085` internally

### Issue: Hot reload stopped working

**Possible causes**:
1. Metro crashed - check `npx devmux attach metro`
2. App disconnected - shake device, press Cmd+D → "Reload"
3. Wrong build type - ensure using dev build, not Expo Go

### Issue: "locked by another process"

See [Workflow 5: Fix "Locked by Another Process"](#5-fix-locked-by-another-process)

---

## Tmux Session Details

### Session Naming

DevMux names sessions: `omo-{project}-{service}`

For this project:
- `omo-slopcade-metro`
- `omo-slopcade-api`
- `omo-slopcade-storybook`
- etc.

### Direct Tmux Commands

```bash
# List all sessions
tmux list-sessions

# Attach to Metro directly
tmux attach -t omo-slopcade-metro

# Kill a session
tmux kill-session -t omo-slopcade-metro

# Kill all sessions
tmux kill-server
```

### Tmux Shortcuts

When attached to a session:
- `Ctrl+B, D` - Detach (keep running)
- `Ctrl+B, C` - Create new window
- `Ctrl+B, N` - Next window
- `Ctrl+B, P` - Previous window
- `Ctrl+B, [` - Scroll mode (use arrows, q to quit)

---

## Package.json Scripts Reference

### Root `package.json`

```json
{
  "storybook": "devmux ensure storybook",
  "docs": "devmux ensure docs",
  "dev": "devmux ensure metro",
  "dev:api": "devmux ensure api",
  "dev:web": "devmux ensure web",
  "web": "devmux ensure web",
  "ios": "devmux ensure metro && npx hush run -- pnpm --filter slopcade ios",
  "ios:device": "devmux ensure metro && npx hush run -- pnpm --filter slopcade ios:device",
  "android": "devmux ensure metro && npx hush run -- pnpm --filter slopcade android",
  "svc:ensure": "devmux ensure",
  "svc:status": "devmux status",
  "svc:attach": "devmux attach",
  "svc:stop": "devmux stop",
  "svc:restart": "devmux stop api && devmux ensure api",
  "godot": "devmux ensure godot"
}
```

### Key Points

- **Always use root-level scripts** (from `/Users/hassoncs/Workspaces/Personal/slopcade/`)
- **Never use app-level scripts directly** (they don't ensure Metro)
- **iOS/Android scripts ensure Metro first**, then run the build

---

## Adding a New Service

To add a new service to DevMux:

1. **Edit `devmux.config.json`**:

```json
{
  "services": {
    "my-new-service": {
      "cwd": "path/to/dir",
      "command": "pnpm my-command",
      "health": { "type": "port", "port": 9000 }
    }
  }
}
```

2. **Add pnpm script** to root `package.json`:

```json
{
  "my-service": "devmux ensure my-new-service"
}
```

3. **Test**:

```bash
pnpm my-service
pnpm svc:status
```

---

## Related Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| **Expo Development Guide** | Metro, iOS/Android builds | `docs/shared/guides/expo-development.md` |
| **DevMux Integration Plan** | Original implementation plan | `docs/architecture/devmux-plan.md` |
| **Service Manager Tool** | Tool implementation details | `docs/architecture/service-manager-tool.md` |

---

## Checklist for Service Issues

- [ ] Run `pnpm svc:status` to see what's running
- [ ] Check correct port with `lsof -i :<port>`
- [ ] View logs with `npx devmux attach <service>`
- [ ] Try stopping and restarting: `npx devmux stop <service>` then `pnpm <service>`
- [ ] Check for port conflicts and kill zombie processes
- [ ] Verify `devmux.config.json` syntax is valid JSON
- [ ] Ensure working directory (`cwd`) exists

---

## Version

Last updated: 2026-01-29  
Skill version: 2.0.0 (Enhanced from basic XML skill)
