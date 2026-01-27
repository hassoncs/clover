# Slopcade Knowledge Architecture

> **Last Updated**: 2026-01-26  
> **Purpose**: Reference guide for understanding what Claude knows and when

---

## Overview

Claude's knowledge in this project comes from **4 layers**:

1. **Auto-Injected** - Always loaded into system prompt
2. **Skills** - Loaded on-demand via `/skill-name` or trigger phrases
3. **Memory Search** - Semantic search results you paste as `[MEMORY]` blocks
4. **Tools** - Direct file/codebase exploration via tools and agents

---

## Layer 1: Auto-Injected (Always Loaded)

These files are **automatically** included in every conversation:

### Global Configuration
- **`~/.config/opencode/AGENTS.md`** (if exists)
  - Core Sisyphus identity and operating protocols
  - Phase 0-3 behavior instructions
  - Delegation rules and agent coordination

### Project Configuration
- **`.opencode/AGENTS.md`** (this project)
  - Service management (devmux)
  - Monorepo structure (pnpm workspaces)
  - Roadmap system overview
  - Established patterns (platform-specific modules, asset pipeline debug)

### Project Overview
- **`README.md`** (excerpt)
  - Project description
  - External services (Supabase, Scenario.com, ElevenLabs, Google OAuth)
  - Quick start commands

**Total Size**: ~200 lines auto-loaded per conversation

---

## Layer 2: Skills (On-Demand Loading)

Skills provide **specialized instructions** when needed. Load with `/skill-name` or via trigger phrases.

### Active Skills

| Skill Name | Purpose | Trigger Phrases |
|------------|---------|-----------------|
| **slopcade-documentation** | 3-tier documentation system, roadmap workflows | "add to roadmap", "document this", "what's next", "work on today" |
| **slopcade-game-builder** | Game creation workflows with AI | Building/generating games |
| **slopcade-icon-generation** | Icon creation workflows | Creating icons |
| **slopcade-3d-assets** | 3D model optimization and asset workflows | Working with 3D assets, GLB files |
| **game-inspector** | Game testing/debugging with MCP tools | Testing, debugging games |

### How Skills Work

```
User: "Add this feature to the roadmap"
         ↓
System detects trigger phrase: "add to roadmap"
         ↓
Claude loads: /slopcade-documentation
         ↓
Claude now has: Full roadmap templates, workflows, lifecycle rules
```

**Skills are NOT memory** - They're instruction manuals, not project state.

---

## Layer 3: Memory Search (Semantic Search)

The `.opencode/memory/` directory contains **project state** that is searchable but NOT auto-loaded.

### What's in Memory

```
.opencode/memory/
├── ROADMAP.md              # Master roadmap (single source of truth)
├── roadmap/
│   ├── active/             # Features currently being built
│   │   ├── asset-generation-pipeline.md
│   │   ├── ai-game-maker.md
│   │   └── ...
│   └── completed/2026-01/  # Archived completed features
├── human-tasks/            # Blockers requiring human decision
│   ├── ht-001.md           # AI Generation API integration
│   ├── ht-002.md           # Sheet Prompt Builder
│   └── ...
├── patterns/               # Discovered codebase patterns
│   ├── pattern-001.md      # Platform-Specific Module Pattern
│   ├── pattern-002.md      # Documentation Taxonomy
│   └── ...
├── graph.yaml              # Auto-generated knowledge graph
└── chronicler-log.md       # Audit trail of chronicler operations
```

### How Memory Search Works

```
You: [asks question about asset pipeline]
         ↓
OpenCode: Searches .opencode/memory/ semantically
         ↓
OpenCode: Returns top 3-5 chunks with relevance scores
         ↓
You: Paste results as [MEMORY] block in chat
         ↓
Claude: Reads memory results, responds with context
```

**Memory IS project state** - Current features, blockers, patterns discovered.

### Memory vs Skills

| Memory Files | Skill Files |
|--------------|-------------|
| **What exists** in the codebase | **How to work** with the codebase |
| Project state (features, tasks) | Process instructions (workflows) |
| Discovered patterns | How to apply patterns |
| Temporal (changes often) | Stable (changes rarely) |
| Example: "asset-generation-pipeline is 86% complete" | Example: "When user says 'add to roadmap', do X" |

---

## Layer 4: Tools & Agents (Active Exploration)

When Claude needs to find something, these tools/agents are used:

### Direct Tools
- **`read`** - Read file contents
- **`grep`** - Search file contents by pattern
- **`glob`** - Find files by name pattern
- **`ast_grep_search`** - AST-aware code search
- **`lsp_*`** - Language server features (goto definition, find references, etc.)

### Specialized Agents
- **`explore`** - Contextual codebase grep (internal, runs in background)
- **`librarian`** - External docs/OSS search (external, runs in background)
- **`oracle`** - Deep reasoning consultation (expensive, synchronous)

### When Claude Uses What

| Task | Tool/Agent Used |
|------|-----------------|
| "Read this specific file" | `read` tool directly |
| "Find where X is used" | `grep` or `explore` agent (background) |
| "How does library Y work?" | `librarian` agent (background) |
| "Help me decide architecture" | `oracle` agent (synchronous) |
| "Find all implementations of Z" | `ast_grep_search` + `explore` agents (parallel) |

---

## Decision Tree: "How Do I Make Claude Aware of X?"

```
Information Type: _________

├─ General project rules/conventions (always needed)
│  └─ Add to: .opencode/AGENTS.md
│
├─ Specialized workflow (needed for specific tasks)
│  └─ Create: .opencode/skills/{name}.md
│
├─ Current project state (features, tasks, blockers)
│  └─ Document in: .opencode/memory/roadmap/
│
├─ Discovered pattern (architectural decision)
│  └─ Document in: .opencode/memory/patterns/
│
└─ Product documentation (guides, reference, ADRs)
   └─ Document in: docs/{component}/
```

---

## Best Practices

### ✅ DO

- **AGENTS.md**: Keep concise (<100 lines), reference skills for details
- **Skills**: Create for repeatable workflows (documentation, game building, testing)
- **Memory**: Track active features, blockers, discovered patterns
- **Docs**: Write evergreen guides and references for users/developers

### ❌ DON'T

- **Duplicate** information across AGENTS.md and skills (reference skills instead)
- **Put workflow instructions** in memory files (that's what skills are for)
- **Put project state** in skills (that's what memory is for)
- **Auto-load everything** (use skills and memory search to keep context clean)

---

## Maintenance Schedule

| Frequency | Task |
|-----------|------|
| **Daily** | Update active feature progress in `.opencode/memory/roadmap/active/` |
| **Weekly** | Review human tasks, update `ROADMAP.md` |
| **Monthly** | Archive completed features, prune temporal docs, audit patterns |
| **Quarterly** | Run `/chronicler bootstrap --deep`, review skill effectiveness |

---

## Quick Reference

### "What does Claude auto-load?"
- `.opencode/AGENTS.md` (project rules)
- `README.md` (project overview)
- Global `~/.config/opencode/AGENTS.md` (if exists)

### "How do I teach Claude a new workflow?"
- Create `.opencode/skills/{workflow-name}.md`
- Add trigger phrases in skill header
- Load with `/workflow-name`

### "How do I tell Claude about current project state?"
- Document in `.opencode/memory/roadmap/active/` or `human-tasks/`
- Memory search will surface it when relevant
- OR paste `[MEMORY]` search results directly

### "How do I make something discoverable?"
- Evergreen knowledge → `docs/` with clear navigation
- Project rules → `.opencode/AGENTS.md`
- Workflows → `.opencode/skills/`
- Project state → `.opencode/memory/`
- Link everything from INDEX.md files

---

## Related Documentation

- [Slopcade Documentation Skill](.opencode/skills/slopcade-documentation.md) - Full documentation system
- [AGENTS.md](.opencode/AGENTS.md) - Project configuration
- [ROADMAP.md](.opencode/memory/ROADMAP.md) - Master roadmap
- [docs/INDEX.md](docs/INDEX.md) - Documentation hub

---

## Changelog

- **2026-01-26**: Initial version created during knowledge architecture reorganization
  - Streamlined AGENTS.md (removed duplicate roadmap content)
  - Updated pattern files to lightweight reference format
  - Archived generic `documentation.md` skill (superseded by `slopcade-documentation.md`)
