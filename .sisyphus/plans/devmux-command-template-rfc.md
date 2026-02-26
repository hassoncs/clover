# RFC: Support `{{PORT}}` template substitution in `command` field

**Package**: `@chriscode/devmux`
**Priority**: High — blocks clean portless proxy adoption

## Problem

When a service opts into portless proxy mode (no `health.port`, no `port`), devmux auto-assigns a free port and sets `PORT` / `DEVMUX_PORT` as environment variables. However, many tools (wrangler, storybook, bdui, backlog) require the port as a CLI flag (`--port`, `-p`) and don't read `PORT` from env.

The natural thing to write is:

```json
{
  "command": "wrangler dev --port $PORT"
}
```

But this doesn't work. Devmux builds the tmux command as:

```
tmux new-session -d -s "session" -c "cwd" "PORT=12345 DEVMUX_PORT=12345 wrangler dev --port $PORT"
```

The shell expands `$PORT` **before** the inline `PORT=12345` assignment takes effect, so `--port` gets an empty string.

### Current workaround

Wrap every command in `sh -c '...'`:

```json
{
  "command": "sh -c 'wrangler dev --port $PORT'"
}
```

This works but is ugly, error-prone with quoting, and non-obvious.

## Proposal

Extend `{{PORT}}` template substitution (already supported in `env` values) to also apply to the `command` string:

```json
{
  "command": "wrangler dev --port {{PORT}}"
}
```

Devmux would replace `{{PORT}}` with the resolved port number before constructing the tmux command. This already works for `env` field values — the change is to apply the same `replace(/\{\{PORT\}\}/g, ...)` call to `service.command` before passing it to `newSession()`.

### Other useful templates

While at it, consider supporting the full template set in commands:

| Template | Expands to |
|----------|-----------|
| `{{PORT}}` | Resolved port number |
| `{{INSTANCE}}` | Config instance ID |
| `{{SERVICE}}` | Service name |
| `{{PROJECT}}` | Project name |

These are already supported in `env` values (see `buildServiceEnv`).

## Implementation

In `chunk-VZSZNCMT.js` (or equivalent source), around line 778:

```diff
- newSession(sessionName, cwd, service.command, env);
+ const resolvedCommand = service.command
+   .replace(/\{\{PORT\}\}/g, String(resolvedPort ?? ""))
+   .replace(/\{\{INSTANCE\}\}/g, config.instanceId)
+   .replace(/\{\{SERVICE\}\}/g, serviceName)
+   .replace(/\{\{PROJECT\}\}/g, config.project);
+ newSession(sessionName, cwd, resolvedCommand, env);
```

## Additional Issue: `isServiceProxied` blocks truly portless services

`isServiceProxied()` returns `false` for services with no `port` and no `health`:

```javascript
// chunk-7BOKHA4F.js:428
if (!hasPort && !service.health) return false;
```

This prevents `findFreePort()` from ever being called for services that want auto-port-assignment. The guard exists to avoid proxying non-HTTP services (like file watchers), but it blocks the portless proxy use case entirely.

**Fix**: Allow opting in explicitly, e.g. `"proxy": true` should override the port/health check:

```diff
  if (service.proxy === false) return false;
+ if (service.proxy === true) return true;
  const hasPort = getResolvedPort(config, serviceName) !== void 0;
  if (!hasPort && !service.health) return false;
```

## Impact

These two changes together unblock clean portless service definitions — no `sh -c` wrappers, no hardcoded ports, just:

```json
{
  "api": {
    "command": "wrangler dev --port {{PORT}}",
    "proxy": true
  }
}
```
