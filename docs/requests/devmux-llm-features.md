# Feature Request: `devmux doctor` & LLM-Friendly Tooling

**Context**: We are using `devmux` in an agentic coding environment (OpenCode/Sisyphus). The agent often encounters "locked by another process" errors when services (Storybook, Metro) crash or leave zombie processes. Currently, the agent must manually find PIDs via `lsof` and `kill` them, which is error-prone and requires complex prompting.

We need first-class support in `devmux` to make service management self-healing and LLM-friendly.

## 1. New Command: `devmux doctor`

A diagnostic and fix tool that automates the cleanup of zombie processes.

**Usage**:
```bash
npx devmux doctor [service-name] [--fix]
```

**Behavior**:
1.  **Check Lockfile**: Verify if the `devmux` lockfile for the service exists.
2.  **Check Port**: Check if the service's configured port (e.g., 6006) is occupied.
3.  **Process Match**: Verify if the process holding the port matches the known service signature.
4.  **Zombie Detection**: If the port is held but `devmux` isn't running it (or thinks it stopped), identify it as a zombie.

**Output (JSON mode for LLMs)**:
```json
{
  "service": "storybook",
  "status": "locked",
  "port": 6006,
  "pid": 12345,
  "reason": "Port 6006 is occupied by PID 12345, but no active devmux session owns it.",
  "action_required": "kill_pid"
}
```

**With `--fix` flag**:
- Automatically kills the zombie PID.
- Removes stale lockfiles.
- Resets the service state to "stopped".

---

## 2. New Command: `devmux status --json`

Current status output is a beautiful CLI table, which is hard for LLMs to parse reliably. We need a structured output.

**Usage**:
```bash
npx devmux status --json
```

**Output**:
```json
{
  "services": [
    {
      "name": "api",
      "status": "running",
      "port": 8789,
      "pid": 4567,
      "session": "omo-clover-api"
    },
    {
      "name": "storybook",
      "status": "stopped",
      "port": 6006,
      "last_error": "locked by another process"
    }
  ]
}
```

---

## 3. Enhanced `ensure` Behavior: `--force`

Allow `ensure` to aggressively take over if it detects a lock.

**Usage**:
```bash
npx devmux ensure storybook --force
```

**Behavior**:
- If port 6006 is locked by a zombie: Kill it immediately and start the new session.
- If another valid `devmux` session is running: Stop it and restart.
- **Why**: Agents often just want to "make it work" and don't care about preserving a hung process.

---

## 4. LLM "Skill" Export

It would be amazing if `devmux` could export its own "Skill" definition for AI agents.

**Usage**:
```bash
npx devmux generate-skill > .opencode/skills/devmux.skill
```

**Behavior**:
- Generates an XML/Markdown skill file customized for the current `devmux.config.json`.
- Lists exact triggers ("start storybook", "restart api").
- Injects the correct project-specific paths and commands.
- This ensures the agent always has up-to-date knowledge of the project's services.
