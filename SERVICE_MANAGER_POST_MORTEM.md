# Service Manager Troubleshooting Post-Mortem

## Overview
This document outlines the attempt to start the `api` service using the newly introduced `service-manager` skill, the failures encountered, and the subsequent logic used to reach a successful state.

## 1. Intent & Strategy
The goal was to start the "API in the web" (specifically the `api` service) using the project's dedicated service management tools.

**Planned Strategy:**
1.  **Skill Discovery**: Identify the correct skill (`service-manager`).
2.  **Context Gathering**: Locate the configuration file (`devmux.config.json`) to verify service definitions.
3.  **Preferred Tooling**: Use the `skill_mcp` tool to invoke the `service_manager` action, as it provides a semantic abstraction.
4.  **Fallback**: If abstraction fails, use the CLI directly (`devmux`).

---

## 2. Failure Log & Analysis

### Attempt 1: MCP Tooling
**Action:** `skill_mcp({ action: "start", service: "api", mcp_name: "service-manager-mcp-v2" ... })`
**Result:** `Error: MCP server "service-manager-mcp-v2" not found.`
**Analysis:** 
The `service-manager` skill documentation mentions `service_manager` as a tool, but the actual MCP server implementation was either not registered in this specific environment's toolset or was named differently. I attempted to guess the name based on common patterns, which failed.

### Attempt 2: Direct Bash (Global Command)
**Action:** `bash({ command: "service_manager start api" })`
**Result:** `zsh:1: command not found: service_manager`
**Analysis:** 
I assumed `service_manager` might be an alias or a global binary provided by the environment. It was not.

### Attempt 3: Direct Bash (devmux CLI)
**Action:** `bash({ command: "devmux ensure api" })`
**Result:** `zsh:1: command not found: devmux`
**Analysis:** 
The configuration file is named `devmux.config.json`, which strongly implies the use of the `devmux` CLI. However, `devmux` was not in the system's `PATH`.

---

## 3. Successful Resolution

### The "Npx" Pivot
**Action:** `bash({ command: "npx devmux ensure api" })`
**Result:** `✅ api already running (tmux session: omo-clover-api)`
**Thought Process:** 
In modern JavaScript-heavy monorepos, specialized CLIs are often local dependencies rather than global binaries. Using `npx` allows me to execute the tool directly from `node_modules` or download it on the fly, bypassing `PATH` issues. 

---

## 4. Key Friction Points for Improvement

1.  **Tool/Skill Misalignment**: The `service-manager` skill implies the existence of a `service_manager` tool, but if that tool isn't provided as a built-in MCP by the system, it leaves me in a "gap" where I have the instructions but not the instrument.
2.  **Discovery of Binary Path**: There was no immediate way to know if `devmux` was supposed to be global, local, or provided via a specific plugin. 
3.  **Config Name vs. CLI Name**: The config is `devmux.config.json`, but the skill is `service-manager`. Standardizing the naming (e.g., everything being `devmux`) would reduce cognitive load.

## 5. Recommendations
- **Ensure MCP Availability**: If the `service-manager` skill is loaded, the corresponding `service_manager` MCP tool should be injected into the context.
- **Environment Pre-checks**: The skill could include a diagnostic check to see if `devmux` or `npx devmux` is the preferred way to interact with the project.
- **Path Injection**: Automatically add `./node_modules/.bin` to the shell environment when running bash commands in projects with a `package.json`.
