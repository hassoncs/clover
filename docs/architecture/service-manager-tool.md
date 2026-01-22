# Service Manager Tool (`service_manager`) Implementation Plan

This document outlines the architecture for the `service_manager` tool, which provides agents with a unified interface for managing long-running development services.

## 1. Rationale

Agents often need to "start the API", "check if Metro is running", or "restart Storybook". While these tasks are orchestration-heavy (requiring `tmux` sessions, port checks, and zombie process cleanup), the agent interacts with them as logical **services**.

The name `service_manager` was chosen because:
*   **Semantic Intuition**: It maps directly to user intents like "Start the API service".
*   **Abstraction**: It hides the underlying engine (`devmux` + `tmux`) behind a clean lifecycle API.
*   **Broad Scope**: It clearly handles *state* (Start/Stop/Status), distinguishing it from one-off command runners.

## 2. Tool Definition

**Location**: `packages/opencode/src/tool/service_manager.ts`

**Schema**:
```typescript
import { z } from "zod";
import { tool } from "../plugin/tool";

export const ServiceManagerTool = tool({
  name: "service_manager",
  description: "Manage long-running development services (API, Metro, Storybook). Use this to start, stop, check status, or fix stuck services. DO NOT use for one-off commands.",
  parameters: z.object({
    action: z.enum(["start", "stop", "restart", "status", "fix", "list"]).describe("The lifecycle action to perform"),
    service: z.string().optional().describe("The name of the service (e.g., 'storybook', 'api', 'metro')"),
    force: z.boolean().optional().describe("Force the operation (e.g., kill locked ports)"),
  }),
  execute: async ({ action, service, force }, { cwd }) => {
    // Implementation logic wrapping devmux
  },
});
```

## 3. Implementation Logic

The tool acts as an adapter, translating high-level "Service Actions" into specific CLI commands for the underlying engine (`devmux`).

### Command Mapping

| Service Action | Underlying Command | Description |
| :--- | :--- | :--- |
| `start` | `npx devmux ensure [service]` | Idempotent start. Does nothing if already running. |
| `stop` | `npx devmux stop [service]` | Graceful stop. |
| `restart` | `stop` + `ensure` | Full restart cycle. |
| `status` | `npx devmux status` | Returns structured status of all services. |
| `fix` | `npx devmux doctor [service] --fix` | (Hypothetical) Kills zombie processes and clears locks. |
| `list` | Read config | Returns valid service names. |

### Execution Wrapper
We will use `Bun.spawn` to execute the commands, ensuring proper error handling and output capture.

```typescript
import { spawn } from "bun";

async function runEngine(args: string[], cwd: string) {
  const proc = spawn(["npx", "devmux", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  
  const output = await new Response(proc.stdout).text();
  const error = await new Response(proc.stderr).text();
  
  if (proc.exitCode !== 0) {
    throw new Error(`Service Manager failed: ${error || output}`);
  }
  
  return output.trim();
}
```

## 4. Implementation Steps

1.  **Create Tool File**:
    - `packages/opencode/src/tool/service_manager.ts`
2.  **Define Schema**: Use the Zod schema defined above.
3.  **Implement Execute**:
    - Switch on `action`.
    - Map `start` -> `ensure`.
    - Map `fix` -> `doctor` (or custom cleanup logic if CLI support is missing).
    - Return clear, human-readable confirmation messages (e.g., "Service 'api' is now running on port 8789").
4.  **Register**: Verify auto-discovery in `registry.ts`.

## 5. Verification Scenarios

Once implemented, the agent should handle these prompts natively:

*   "Start the API and Storybook." -> `service_manager({ action: "start", service: "api" })` ...
*   "Why isn't the API working?" -> `service_manager({ action: "status" })`
*   "It says the port is locked." -> `service_manager({ action: "fix", service: "api" })`
