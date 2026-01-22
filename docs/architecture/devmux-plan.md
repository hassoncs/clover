# Devmux Integration Plan: Bridging the Gap

## 1. Problem Statement
The current agent environment has a capability mismatch:
- **User Intent**: "Start Storybook" (high-level)
- **Tooling**: `interactive_bash` (low-level tmux primitives)
- **Middleware**: `devmux` (service orchestration)

The agent tries to use `interactive_bash` directly or standard `pnpm` commands, often missing the `devmux` abstraction layer that handles session management, port checking, and persistence.

## 2. Solution Strategy
We will implement a **Knowledge Injection Strategy** using a specialized Skill (`devmux`) and explicit System Prompt context.

### A. The `/devmux` Skill
A new skill file that serves as the definitive reference for service management.

**Location**: `.opencode/skills/devmux.skill`

**Content Structure**:
1.  **Trigger Phrases**: "start storybook", "run api", "check services", "devmux", "fix port lock".
2.  **Core Concept**: Explain that `devmux` is the *exclusive* way to run long-running services in this repo.
3.  **Command Mapping**:
    *   Start/Ensure: `devmux ensure [service]`
    *   Status: `devmux status` (or `pnpm svc:status`)
    *   Logs: `devmux attach [service]` (conceptually) or reading logs
    *   Stop: `devmux stop [service]`
4.  **Troubleshooting**: Specific steps for the "locked by another process" error (finding and killing the PID).

### B. `AGENTS.md` Updates
Update the project-specific `AGENTS.md` to mandate the use of the `devmux` skill for any service-related request.

**Add Section**:
```markdown
## Service Management (Devmux)
- **ALWAYS** use the `devmux` skill for starting, stopping, or debugging services (api, metro, storybook).
- **NEVER** run `pnpm start` or `node server.js` directly for long-running processes.
- **NEVER** try to construct raw `tmux` commands manually. Use `devmux` abstraction.
```

### C. Prompt Engineering (System Prompt)
We don't need to change the global system prompt if the `AGENTS.md` and Skill are strong enough. The existing intent classification should pick up "start X" and route it to the skill.

## 3. Implementation Steps

### Step 1: Create `.opencode/skills/devmux.skill`
This file will contain the "brain" for handling services.

```xml
<skill>
  <name>devmux</name>
  <description>Orchestrate background services (Storybook, Metro, API) using devmux. Handles starting, stopping, and fixing lock files.</description>
  <triggers>
    <trigger>start storybook</trigger>
    <trigger>run api</trigger>
    <trigger>check status</trigger>
    <trigger>devmux</trigger>
    <trigger>service locked</trigger>
  </triggers>
  <instructions>
    1. **Status Check**: Run `pnpm svc:status` first to see what's running.
    2. **Start Service**: Use `pnpm [service-name]` (e.g., `pnpm storybook`) which maps to `devmux ensure`.
    3. **Locked Port Fix**:
       - If you see "locked by another process":
       - Find PID: `lsof -i :[port] -t`
       - Kill PID: `kill -9 [PID]`
       - Retry start command.
    4. **Logs**: Don't attach to tmux. Check output of the ensure command or log files.
  </instructions>
</skill>
```

### Step 2: Update `AGENTS.md`
Explicitly link service requests to this workflow.

### Step 3: Verify `package.json` scripts
Ensure `pnpm svc:status` and other helpers exist or suggest adding them if missing (we saw `svc:status` in the analysis).

## 4. Verification Plan
1.  **Test Start**: Ask agent to "Start Storybook". It should invoke `devmux ensure storybook`.
2.  **Test Status**: Ask "What's running?". It should use `pnpm svc:status`.
3.  **Test Failure**: Simulate a port lock (start node on 6006 manually) and ask agent to fix it. It should find and kill the PID.
