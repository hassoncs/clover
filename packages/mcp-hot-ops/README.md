# mcp-hot-ops

Let your AI agent build its own dev tools — and use them immediately.

## What This Is

An MCP server where the agent can create, edit, and fix operations (tools) live, without anyone restarting anything. Write a TypeScript file, and it's callable on the next request.

**The core idea**: Instead of exposing 46 MCP tools (burning thousands of context tokens), expose 2 — `list_operations` and `call_operation` — and let the agent discover what it needs on demand. Operations hot-reload from TypeScript files via esbuild. The agent can write new ones mid-session.

## Why

- **Context efficiency**: 2 MCP tools instead of 46. ~200 tokens instead of ~4,600.
- **Hot reload**: Edit an operation file → next call picks it up. No restart.
- **Agent-authored tooling**: The agent writes a `.ts` file → immediately available as an operation.
- **Error resilience**: One broken operation doesn't take down the rest. Compilation errors surface in `list_operations`.

## Install

```bash
npm install @chriscode/mcp-hot-ops
```

## Setup

### 1. Create operations

```
my-project/
  operations/
    _types.ts       # shared types (underscore prefix = ignored by loader)
    hello.ts
```

```typescript
// operations/_types.ts
export interface OperationMeta {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

export interface Operation extends OperationMeta {
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}
```

```typescript
// operations/hello.ts
import type { Operation } from "./_types";

const operation: Operation = {
  name: "hello",
  description: "Returns a greeting message.",
  parameters: {
    name: { type: "string", description: "Name to greet", required: false },
  },
  execute: async (args) => {
    const name = (args.name as string) || "world";
    return { message: `Hello, ${name}!` };
  },
};

export default operation;
```

### 2. Register with your MCP host

**OpenCode** (`.opencode/opencode.json`):
```json
{
  "mcp": {
    "my-tools": {
      "type": "local",
      "command": ["npx", "tsx", "node_modules/@chriscode/mcp-hot-ops/src/server.ts"]
    }
  }
}
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "my-tools": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/node_modules/@chriscode/mcp-hot-ops/src/server.ts"]
    }
  }
}
```

## Writing Operations

```typescript
import type { Operation } from "./_types";

const operation: Operation = {
  name: "operation_name",        // unique identifier
  description: "What it does",   // shown to LLM via list_operations
  parameters: {
    arg1: { type: "string", description: "...", required: true },
  },
  execute: async (args) => {
    return { result: "any JSON-serializable value" };
  },
};

export default operation;
```

**Conventions**: One operation per file. `_`-prefixed files ignored (use for shared code). Filename doesn't matter — the `name` field is the identifier. Node builtins (`fs`, `path`, etc.) work out of the box.

## How It Works

1. Scans `operations/` for `.ts` files
2. Bundles each with esbuild into CJS, loads via `new Function()`
3. Caches in memory — subsequent calls skip bundling
4. `fs.watch` invalidates cache on file changes — next call re-bundles
5. Broken operations don't block others — errors surface in `list_operations`

## Errors

Compilation errors, runtime errors, and missing operations all return structured JSON:

```json
{ "compilationErrors": [{ "file": "broken.ts", "error": "..." }] }
{ "error": "Operation \"x\" threw at runtime", "message": "...", "stack": "..." }
{ "error": "Operation \"x\" not found", "available": ["hello", "add_numbers"] }
```

## For LLM Agents

You have 2 tools:

1. **`list_operations`** — no args. Returns all operations with schemas + any compilation errors.
2. **`call_operation`** — `{ "operation": "name", "args": { ... } }`. Runs it, returns result.

Workflow: `list_operations` → find what you need → `call_operation`. Need a tool that doesn't exist? Create a `.ts` file in the operations directory — it's available immediately on next call.

## Security

Operations run arbitrary code via `new Function()`. Only use with trusted operation sources.

## License

MIT
