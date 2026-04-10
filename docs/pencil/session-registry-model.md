# Pencil Session Registry Model

Design for a local daemon/session registry that manages multiple Pencil projects concurrently. CLI/MCP-friendly from day one.

## Overview

Pencil needs to support **multiple concurrent sessions** — each editing a different `.pen` file, potentially from different repos or folders. This is the Storybook model: multiple projects running simultaneously without path/port collisions.

The registry is the **source of truth** for session discovery, not browser automation.

## Session Identity

### Primary Key

A Pencil session is uniquely identified by:

```
sessionId = hash(projectPath + filePath)
```

Where:
- `projectPath` — Absolute path to the project root (repo or folder containing the `.pen` file)
- `filePath` — Relative path from project root to the `.pen` file

**Example:**
```
projectPath: /Users/hassoncs/Workspaces/Personal/slopcade
filePath: designs/button-system.pen
sessionId: pen_a3f8b2c1
```

### Session Record

```typescript
interface PencilSession {
  id: string;              // pen_<hash>
  projectPath: string;     // Absolute path to project root
  filePath: string;        // Relative path to .pen file
  port: number;            // HTTP/WebSocket port for this session
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  pid?: number;            // Process ID of the runtime
  startedAt: number;       // Unix timestamp (ms)
  lastActivity: number;    // Unix timestamp (ms)
  error?: string;          // Last error message if status === 'error'
}
```

### Identity Rules

1. **One session per .pen file** — Opening the same file twice attaches to the existing session
2. **Project path is canonical** — Symlinks are resolved to their real path before hashing
3. **Session IDs are stable** — The same file always maps to the same session ID
4. **Sessions are project-scoped** — Different projects can have files with the same relative path without collision

## Port Allocation

### Strategy: Dynamic Port Assignment

Unlike Metro (fixed ports per app), Pencil sessions use **dynamic port allocation** from a reserved range.

**Port Range:** `8100-8199` (100 ports for concurrent sessions)

**Allocation Algorithm:**
1. Check if session already has a port assigned (from registry)
2. If new session, find lowest available port in range
3. Mark port as in-use in registry
4. Release port when session stops

**Why dynamic?**
- Fixed ports don't scale for N concurrent sessions
- Port 8089 is reserved for the Pencil dev server (single-project development)
- Production sessions (MCP-driven) use the 8100+ range

### Port Registry

```typescript
interface PortRegistry {
  // Map of port -> sessionId
  allocations: Map<number, string>;
  
  // Find next available port
  allocate(sessionId: string): number;
  
  // Release port when session stops
  release(port: number): void;
  
  // Check if port is in use
  isAvailable(port: number): boolean;
}
```

### Port Health Check

Before assigning a port, verify it's actually free:

```typescript
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}
```

## Session Lifecycle

### States

```
┌─────────┐     start()     ┌──────────┐
│ stopped │ ───────────────▶│ starting │
└─────────┘                 └──────────┘
     ▲                           │
     │                           ▼
     │     stop()         ┌──────────┐
     └────────────────────│ running  │
                         └──────────┘
                              │
                              ▼
                         ┌──────────┐
                         │ stopping │
                         └──────────┘
                              │
                              ▼
                         ┌─────────┐
                         │ stopped │
                         └─────────┘
```

**Error state:** Any state can transition to `error` on failure. Error sessions retain their state for debugging.

### Operations

| Operation | CLI | MCP Tool | Description |
|-----------|-----|----------|-------------|
| `list` | `pencil list` | `pencil_list_sessions` | List all sessions with status |
| `start` | `pencil start <path>` | `pencil_start_session` | Start new session for .pen file |
| `stop` | `pencil stop <sessionId>` | `pencil_stop_session` | Stop a running session |
| `attach` | `pencil attach <sessionId>` | `pencil_attach_session` | Get connection info for session |
| `discover` | `pencil discover <dir>` | `pencil_discover_files` | Find .pen files in directory |
| `status` | `pencil status` | `pencil_registry_status` | Registry health + active sessions |

### Start Flow

```
1. Resolve .pen file path (absolute)
2. Compute sessionId from projectPath + filePath
3. Check registry for existing session
   - If exists and running: return attach info
   - If exists and stopped: restart
4. Allocate port from range
5. Fork runtime process with port + file path
6. Wait for health check (HTTP GET /health)
7. Update registry: status = 'running'
8. Return session info
```

### Stop Flow

```
1. Look up session in registry
2. Send SIGTERM to process
3. Wait for graceful shutdown (timeout: 5s)
4. If still running: SIGKILL
5. Release port
6. Update registry: status = 'stopped'
```

### Attach Flow

```
1. Look up session in registry
2. Return connection info:
   - HTTP URL: http://localhost:{port}
   - WebSocket URL: ws://localhost:{port}/ws
   - MCP endpoint: http://localhost:{port}/mcp
```

## Registry Storage

### Location

```
~/.local/share/pencil/
├── registry.json     # Active sessions
├── registry.lock     # File lock for concurrent access
└── logs/
    └── {sessionId}.log  # Per-session logs
```

### Registry Schema

```typescript
interface RegistryFile {
  version: 1;
  sessions: PencilSession[];
  portAllocations: Record<number, string>; // port -> sessionId
  updatedAt: number;
}
```

### Concurrency

- File-based lock (`registry.lock`) for multi-process access
- Lock timeout: 5 seconds
- Atomic writes (write to temp, rename)

### Recovery

On daemon startup:
1. Read registry.json
2. For each session with `status: 'running'`:
   - Check if process is alive (PID check)
   - If dead: mark as `stopped`, release port
   - If alive: verify health check
3. Clean up orphaned ports

## CLI Interface

### Commands

```bash
# List all sessions
pencil list
# Output: JSON array of sessions

# Start session for a .pen file
pencil start /path/to/design.pen
pencil start ./designs/button.pen --project /path/to/project
# Output: Session info with connection URLs

# Stop a session
pencil stop pen_a3f8b2c1
pencil stop --all  # Stop all sessions

# Attach to session (get connection info)
pencil attach pen_a3f8b2c1
# Output: { http, ws, mcp } URLs

# Discover .pen files in directory
pencil discover ./designs
pencil discover /path/to/project --recursive
# Output: List of .pen file paths

# Registry status
pencil status
# Output: Registry health, active sessions, port usage

# Kill orphaned sessions
pencil prune
```

### Global Options

```bash
--json          # Output as JSON (for scripting)
--quiet         # Suppress non-essential output
--timeout <ms>  # Operation timeout (default: 30000)
```

## MCP Tools

### Tool Definitions

```typescript
// List all sessions
{
  name: "pencil_list_sessions",
  description: "List all Pencil sessions (running and stopped)",
  inputSchema: { type: "object", properties: {} }
}

// Start a session
{
  name: "pencil_start_session",
  description: "Start a Pencil session for a .pen file",
  inputSchema: {
    type: "object",
    properties: {
      filePath: { type: "string", description: "Path to .pen file" },
      projectPath: { type: "string", description: "Project root (optional, auto-detected)" }
    },
    required: ["filePath"]
  }
}

// Stop a session
{
  name: "pencil_stop_session",
  description: "Stop a Pencil session",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      force: { type: "boolean", description: "Force kill if graceful shutdown fails" }
    },
    required: ["sessionId"]
  }
}

// Attach to session
{
  name: "pencil_attach_session",
  description: "Get connection info for a Pencil session",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" }
    },
    required: ["sessionId"]
  }
}

// Discover .pen files
{
  name: "pencil_discover_files",
  description: "Find .pen files in a directory",
  inputSchema: {
    type: "object",
    properties: {
      directory: { type: "string", description: "Directory to search" },
      recursive: { type: "boolean", description: "Search recursively (default: true)" }
    },
    required: ["directory"]
  }
}

// Registry status
{
  name: "pencil_registry_status",
  description: "Get registry health and active sessions",
  inputSchema: { type: "object", properties: {} }
}
```

### MCP Response Format

All tools return consistent response shapes:

```typescript
interface MCPResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

## Runtime Architecture

### Process Model

Each Pencil session runs as a **separate Node.js process**:

```
pencil-daemon (registry)
├── session:pen_a3f8b2c1 (port 8100)
├── session:pen_c4d9e2f0 (port 8101)
└── session:pen_b7a1c3d5 (port 8102)
```

**Why separate processes?**
- Isolation: One crash doesn't affect others
- Memory: Each session has its own heap
- Flexibility: Different Node versions if needed

### Runtime Communication

```
┌─────────────┐     HTTP/WS      ┌──────────────────┐
│   Client    │ ◀──────────────▶ │  Pencil Runtime  │
│  (Browser)  │                  │   (per-session)  │
└─────────────┘                  └──────────────────┘
                                        │
                                        │ IPC / stdout
                                        ▼
                                 ┌─────────────┐
                                 │   Daemon    │
                                 │  (Registry) │
                                 └─────────────┘
```

### Health Check Endpoint

Each runtime exposes:

```
GET /health → { status: "ok", sessionId: "pen_..." }
```

Used by:
- Daemon to verify session started
- Load balancers (future)
- MCP tools to verify connectivity

## Integration with Devmux

### Service Definition

Add to `devmux.config.json`:

```json
{
  "pencil-daemon": {
    "cwd": ".",
    "command": "pencil daemon",
    "port": 8099,
    "dashboard": false
  }
}
```

### Devmux Commands

```bash
# Start daemon
devmux ensure pencil-daemon

# Check status
devmux status pencil-daemon
```

### Dependency Chain

```
pencil-daemon (no dependencies)
    ↓
pencil sessions (depend on daemon)
```

## Security Considerations

### Local-Only Binding

All runtimes bind to `127.0.0.1` only — no external network exposure.

### No Authentication Required

Sessions are local-only. No Slopcade auth, no game ownership checks.

**Rationale:**
- Pencil is a local-first design tool
- Files are on local filesystem
- No multi-tenant concerns

### File Access

Sessions can only access files within their project path. Attempts to read/write outside project root are rejected.

## Error Handling

### Session Start Failures

| Error | Cause | Recovery |
|-------|-------|----------|
| `PORT_UNAVAILABLE` | Port already in use | Retry with next port |
| `FILE_NOT_FOUND` | .pen file doesn't exist | Return error to caller |
| `PROCESS_SPAWN_FAILED` | Node.js not available | Return error, check PATH |
| `HEALTH_CHECK_TIMEOUT` | Runtime didn't start in time | Kill process, mark as error |

### Registry Corruption

If `registry.json` is corrupted:
1. Rename to `registry.json.broken`
2. Start fresh registry
3. Log warning

## Future Extensions

### Multi-User (Future)

The registry can be extended for multi-user scenarios:
- Add `ownerId` to session record
- Per-user port ranges
- Access control for attach operations

### Remote Sessions (Future)

For remote development:
- SSH tunnel support
- Remote registry sync
- Port forwarding

### Session Snapshots (Future)

Save/restore session state:
- Canvas position
- Selection state
- Undo history

## Implementation Checklist

- [ ] Create `~/.local/share/pencil/` directory structure
- [ ] Implement `RegistryFile` with file locking
- [ ] Implement `PortRegistry` with allocation logic
- [ ] Create CLI commands (`pencil list`, `start`, `stop`, etc.)
- [ ] Create MCP tools
- [ ] Implement session process spawning
- [ ] Add health check endpoint to runtime
- [ ] Add recovery logic on daemon startup
- [ ] Add devmux integration
- [ ] Write tests for registry operations
