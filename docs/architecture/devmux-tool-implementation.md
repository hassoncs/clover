# DevMuxTool Implementation Plan

This document outlines the detailed plan for integrating the `DevMuxTool` into OpenCode, enabling agents to interact with the `devmux` CLI for service management.

## 1. Overview

The `DevMuxTool` will provide a programmatic interface to the `devmux` command-line utility, allowing OpenCode agents to manage development services (e.g., `ensure`, `stop`, `status`, `doctor`). This integration will leverage OpenCode's existing tool system, including dynamic registry and `zod` for parameter validation.

## 2. Tool Definition (`packages/opencode/src/tool/devmux.ts`)

The `devmux.ts` file will define the `DevMuxTool` schema and its associated actions.

### 2.1. Zod Schema for Parameters

We will define a `zod` schema to validate the input parameters for the `devmux` commands.

```typescript
import { z } from 'zod';

// Define schemas for each command's arguments
const ensureArgsSchema = z.object({
  service_name: z.string().describe('The name of the service to ensure is running.'),
});

const stopArgsSchema = z.object({
  service_name: z.string().describe('The name of the service to stop.'),
  force: z.boolean().optional().describe('Force stop the service.'),
});

const statusArgsSchema = z.object({
  service_name: z.string().optional().describe('The name of the service to get status for. If omitted, shows status for all services.'),
});

const doctorArgsSchema = z.object({
  fix: z.boolean().optional().describe('Attempt to automatically fix issues found by doctor.'),
});

// Define the main DevMuxTool schema
export const DevMuxToolSchema = z.discriminatedUnion('command', [
  z.object({
    command: z.literal('ensure'),
    args: ensureArgsSchema,
  }),
  z.object({
    command: z.literal('stop'),
    args: stopArgsSchema,
  }),
  z.object({
    command: z.literal('status'),
    args: statusArgsSchema,
  }),
  z.object({
    command: z.literal('doctor'),
    args: doctorArgsSchema,
  }),
]);

export type DevMuxTool = z.infer<typeof DevMuxToolSchema>;
```

### 2.2. Tool Function Signature

The tool function will accept the validated parameters and execute the corresponding `devmux` command.

```typescript
import { DevMuxTool } from './devmux'; // Assuming the schema is in the same file or imported

export async function devmuxTool(params: DevMuxTool): Promise<any> {
  // Implementation logic will go here
}
```

## 3. Implementation Logic

The `devmuxTool` function will be responsible for constructing and executing `bun spawn` or `exec` calls to the `devmux` CLI, and then parsing its output.

### 3.1. Executing `devmux` Commands

We will use `bun spawn` or `exec` to run `devmux` commands. The choice between `spawn` and `exec` depends on whether we need to stream output or wait for completion. For most `devmux` commands, waiting for completion and capturing stdout/stderr will be sufficient.

```typescript
import { spawn } from 'bun'; // Or 'child_process' for Node.js environments

async function executeDevMuxCommand(command: string, args: string[]): Promise<string> {
  const { stdout, stderr, exitCode } = await spawn(['devmux', command, ...args]).text();

  if (exitCode !== 0) {
    throw new Error(`devmux command failed with exit code ${exitCode}: ${stderr}`);
  }

  return stdout;
}
```

### 3.2. Parsing `devmux` Output

`devmux` currently outputs CLI tables. If the `--json` flag feature request for `devmux` is implemented, we will prioritize using it for easier parsing. Otherwise, we will implement basic text parsing for the table output.

**Option A: Using `--json` (Preferred if available)**

If `devmux` supports a `--json` flag, the implementation will be straightforward:

```typescript
async function executeDevMuxCommandJson(command: string, args: string[]): Promise<any> {
  const { stdout, stderr, exitCode } = await spawn(['devmux', command, '--json', ...args]).text();

  if (exitCode !== 0) {
    throw new Error(`devmux command failed with exit code ${exitCode}: ${stderr}`);
  }

  return JSON.parse(stdout);
}
```

**Option B: Parsing CLI Table Output (Fallback)**

If `--json` is not available, we will need to parse the text output. This will involve string manipulation to extract relevant data from the table format. This is more brittle and prone to breaking if `devmux` output format changes.

Example for `status` command:

```typescript
function parseDevMuxStatusOutput(output: string): any[] {
  const lines = output.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) return []; // No header and no data

  const header = lines[0].split(/\s{2,}/).map(h => h.trim().toLowerCase().replace(/\s/g, '_'));
  const dataLines = lines.slice(1);

  return dataLines.map(line => {
    const values = line.split(/\s{2,}/).map(v => v.trim());
    const service: { [key: string]: string } = {};
    header.forEach((key, index) => {
      service[key] = values[index];
    });
    return service;
  });
}
```

### 3.3. Integrating into `devmuxTool`

The `devmuxTool` function will orchestrate the command execution and output parsing based on the `command` parameter.

```typescript
import { z } from 'zod';
import { spawn } from 'bun'; // Or 'child_process' for Node.js environments

// ... (DevMuxToolSchema and types from above) ...

async function executeDevMuxCommand(command: string, args: string[]): Promise<string> {
  // ... (implementation from above) ...
}

// ... (parseDevMuxStatusOutput from above, if needed) ...

export async function devmuxTool(params: DevMuxTool): Promise<any> {
  const { command, args } = params;
  let devmuxArgs: string[] = [];
  let output: string;

  switch (command) {
    case 'ensure':
      devmuxArgs = [args.service_name];
      output = await executeDevMuxCommand('ensure', devmuxArgs);
      return { message: output.trim() };
    case 'stop':
      devmuxArgs = [args.service_name];
      if (args.force) {
        devmuxArgs.push('--force');
      }
      output = await executeDevMuxCommand('stop', devmuxArgs);
      return { message: output.trim() };
    case 'status':
      if (args.service_name) {
        devmuxArgs = [args.service_name];
      }
      output = await executeDevMuxCommand('status', devmuxArgs);
      // TODO: Implement robust parsing for status output, ideally using --json
      // For now, return raw output or a simplified parsed version
      return { status: output.trim() }; // Or parseDevMuxStatusOutput(output)
    case 'doctor':
      if (args.fix) {
        devmuxArgs.push('--fix');
      }
      output = await executeDevMuxCommand('doctor', devmuxArgs);
      return { report: output.trim() };
    default:
      throw new Error(`Unknown devmux command: ${command}`);
  }
}
```

## 4. File Structure

The new tool will reside in:

```
packages/opencode/src/tool/devmux.ts
```

## 5. Dependencies

We need to ensure that the `devmux` CLI is available in the environment where OpenCode runs.

### 5.1. `package.json` Entry (if `devmux` is an npm package)

If `devmux` is distributed as an npm package, it should be added to `packages/opencode/package.json` as a `dependency` or `devDependency` as appropriate.

```json
// packages/opencode/package.json
{
  "name": "opencode",
  // ...
  "dependencies": {
    // ...
    "devmux": "^x.y.z" // Add this line if devmux is an npm package
  },
  // ...
}
```
**Note**: Given `devmux` is likely a global CLI tool or a custom binary, simply ensuring its presence in the system's PATH might be sufficient, rather than adding it as an npm dependency. We should clarify how `devmux` is expected to be installed and accessed. For this plan, we assume it's a globally available command.

## 6. Integration with Tool Registry

The `devmuxTool` function will need to be registered in `packages/opencode/src/tool/registry.ts`.

```typescript
// packages/opencode/src/tool/registry.ts
import { devmuxTool } from './devmux';
import { DevMuxToolSchema } from './devmux';

export const tools = {
  // ... existing tools ...
  devmux: {
    tool: devmuxTool,
    schema: DevMuxToolSchema,
    description: 'Manage development services using the devmux CLI.',
  },
};
```

## 7. Testing

Thorough testing will be crucial to ensure the `DevMuxTool` functions correctly and handles various `devmux` outputs.

### 7.1. Unit Tests

- Test each command (`ensure`, `stop`, `status`, `doctor`) with valid and invalid arguments.
- Mock `bun spawn` or `exec` to simulate `devmux` CLI responses, including success, failure, and different output formats (e.g., empty status, multiple services status).
- Test output parsing logic with various `devmux` output examples.

### 7.2. Integration Tests

- Run OpenCode agents with tasks that utilize the `DevMuxTool` to ensure end-to-end functionality.
- Verify that agents can correctly interpret `devmux` output and make decisions based on it.

## 8. Future Considerations

- **JSON Output from `devmux`**: Prioritize implementing a `--json` flag in `devmux` itself to simplify parsing and make the tool more robust.
- **Streaming Output**: If `devmux` commands produce long-running or streaming output, consider enhancing the tool to handle streamed responses rather than waiting for full command completion.
- **Error Handling**: Improve error reporting and recovery mechanisms within the `devmuxTool` to provide more actionable feedback to agents.
