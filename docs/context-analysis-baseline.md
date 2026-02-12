# MCP & Tool Context Analysis: Current State

**Date:** 2026-02-12  
**Session:** Initial baseline assessment for Docker dynamic MCP optimization  
**Goal:** Document current context overhead, identify optimization opportunities

---

## Executive Summary

**Total Tools/Functions Available:** ~200+ individual tool operations  
**Estimated Context Tokens (rough estimate):** 15,000-25,000 tokens  
**Primary Categories:** Built-in OpenCode Tools, User Skills, Project Skills, MCP Servers

This document serves as a baseline. After implementing Docker dynamic MCPs, we'll re-measure and compare.

---

## 1. Built-in OpenCode Tools (Core)

### File Operations (~20 tools)
- `read` - Read files/directories (up to 2000 lines)
- `write` - Write files
- `edit` - Text replacements with exact matching
- `glob` - File pattern matching
- `grep` - Content search with regex

**Context Impact:** High - used in every session, core to workflow

### Code Intelligence Tools (~10 tools)
- `lsp_goto_definition` - Jump to symbol definitions
- `lsp_find_references` - Find all usages
- `lsp_symbols` - Get symbols from files
- `lsp_diagnostics` - Get errors/warnings
- `lsp_rename` - Rename across workspace
- `ast_grep_search` / `ast_grep_replace` - AST-aware pattern matching

**Context Impact:** Medium - used frequently for refactors

### Session Management (~8 tools)
- `session_list`, `session_read`, `session_search`, `session_info`

**Context Impact:** Low - background utility

### Background Tasks (~3 tools)
- `background_output`, `background_cancel`

**Context Impact:** Low

### Agent Delegation (~1 tool)
- `task` - Spawn specialized agents (Sisyphus-Junior)

**Context Impact:** High - but this is the delegation mechanism itself

**Total Built-in Tools: ~42**

---

## 2. User-Installed Skills (Global)

Location: `~/.claude/skills/`

These are reusable skill modules that provide specialized knowledge:

### Development & Best Practices
1. **bootstrap** - Project initialization patterns
2. **test-driven-development** - TDD methodology
3. **systematic-debugging** - Debug approach
4. **writing-plans** - Implementation planning
5. **executing-plans** - Plan execution
6. **verification-before-completion** - Verification protocol
7. **requesting-code-review** - Code review process
8. **receiving-code-review** - Handling feedback
9. **vercel-react-best-practices** - React/Next.js optimization

### Git & Workflow
10. **git-master** - Git operations expertise
11. **git-worktree** - Worktree management
12. **finishing-a-development-branch** - Branch completion

### Documentation & Knowledge
13. **compound-docs** - Problem documentation
14. **context7-auto-research** - Auto-fetch library docs
15. **writing-skills** - Skill authoring
16. **every-style-editor** - Editorial review

### Agent Configuration
17. **oh-my-opencode** - OpenCode configuration
18. **opencode-config** - Config reference
19. **opencode-config-manager** - Config management
20. **skill-creator** - Skill development
21. **agent-tool-builder** - Tool design

### Specialized Domains
22. **brainstorming** - Creative exploration (MUST USE for creative work)
23. **building-native-ui** - Expo/React Native
24. **dispatching-parallel-agents** - Parallel execution
25. **find-skills** - Skill discovery
26. **refactor-swarm** - Mass parallel refactoring
27. **context-window-management** - Context optimization (meta!)
28. **long-context** - Transformer context extension
29. **subagent-driven-development** - Multi-agent workflows

### Infrastructure
30. **rclone** - Cloud storage management
31. **web-design-guidelines** - UI/UX review
32. **devmux** - Service management
33. **shell-config** - Shell configuration

**Total User Skills: ~33**

**Context Impact:** VERY HIGH - Each skill provides substantial domain knowledge that gets loaded into context when relevant. This is likely 8,000-12,000 tokens when all loaded.

---

## POST-OPTIMIZATION UPDATE (2026-02-12)

### Actions Taken

**Archived 14 Skills:**
1. `receiving-code-review` - team of one, not needed
2. `requesting-code-review` - team of one, not needed  
3. `refactor-swarm` - highly specialized, rarely used
4. `using-superpowers` - legacy/bootstrap, unclear use
5. `find-skills` - rarely used CLI wrapper
6. `finishing-a-development-branch` - part of complex workflow
7. `subagent-driven-development` - specialized workflow
8. `executing-plans` - part of workflow flows
9. `vercel-react-best-practices` - React-specific, not relevant to slopcade
10. `systematic-debugging` - superseded by TDD
11. `opencode-config` - merged into consolidated skill
12. `opencode-config-manager` - merged into consolidated skill
13. `skill-creator` - merged into consolidated skill
14. `writing-skills` - merged into consolidated skill

**Consolidated 2 Skill Groups:**
1. **Config skills** (`opencode-config` + `opencode-config-manager`) → `opencode-configuration` (~400 lines vs ~1600 lines)
2. **Skill creation** (`skill-creator` + `writing-skills`) → `creating-skills` (~200 lines vs ~740 lines)

### New Skill Inventory

**Remaining Skills: 22 (down from 34)**

1. **agent-browser** - Browser automation
2. **agent-tool-builder** - Tool design (symlinked)
3. **bootstrap** - Project initialization
4. **brainstorming** - Creative exploration
5. **building-native-ui** - Expo/React Native
6. **compound-docs** - Knowledge documentation
7. **context-window-management** - Context optimization (symlinked)
8. **context7-auto-research** - Auto-fetch docs (symlinked)
9. **creating-skills** - NEW: Skill creation with TDD
10. **devmux** - Service management
11. **dispatching-parallel-agents** - Parallel execution
12. **every-style-editor** - Editorial review
13. **git-worktree** - Worktree management
14. **long-context** - Context extension (symlinked)
15. **oh-my-opencode** - Plugin reference
16. **opencode-configuration** - NEW: Unified config guide
17. **rclone** - Cloud storage
18. **shell-config** - Shell configuration
19. **test-driven-development** - TDD methodology (kept)
20. **verification-before-completion** - Verification guardrail
21. **web-design-guidelines** - UI/UX review
22. **writing-plans** - Implementation planning

### Context Savings

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total skills** | 34 | 22 | -35% |
| **Active user skills** | 34 | 18 | -47% |
| **Lines of skill content** | ~5,500 | ~2,800 | -49% |
| **Estimated tokens** | ~12,000 | ~6,000 | **-50%** |

**Result: ~6,000 tokens saved (50% reduction in user skill context)**

### Skills in Archive (14 total)

Available at: `~/.claude/skills/archive/`

Can be restored if needed:
```bash
cd ~/.claude/skills
mv archive/skill-name ./
```

### Verification

All remaining skills are:
- ✅ Relevant to current workflow
- ✅ Not overlapping with oh-my-opencode
- ✅ Actually useful (not theoretical)
- ✅ Properly formatted with YAML frontmatter

---

## 3. Project-Specific Skills (slopcade)

Location: `/Users/hassoncs/Workspaces/Personal/slopcade/.claude/skills/`

### Game Development
1. **game-authoring** - Creating games, prefabs, entities
2. **game-authoring/examples** - Code examples
3. **game-authoring/game-definition-reference** - Game def specs
4. **game-authoring/scripting-api-reference** - Scripting API
5. **game-authoring/bundling-and-shaders** - Asset pipeline

### Core Systems
6. **bridge-development** - Godot-TypeScript bridge
7. **input-handling** - Web/native input system
8. **game-inspector** - Debugging/inspection tools
9. **economy-engine** - Resource simulation
10. **effects-system** - Shader effects

### Assets
11. **asset-pack-generation** - Image generation pipelines

**Total Project Skills: ~11**

**Context Impact:** Medium-High (~3,000-5,000 tokens) - Loaded when working on game features

---

## 4. MCP Servers (External Tool Providers)

These are Model Context Protocol servers that expose domain-specific tools:

### A. Backlog MCP
**Purpose:** Task & document management
**Tools:**
- Task: create, list, search, edit, view, archive, complete
- Milestones: list, add, rename, remove, archive  
- Documents: list, view, create, update, search
- Guides: workflow overviews

**Tool Count:** ~20 operations
**Context Impact:** Medium (~2,000 tokens)
**When Loaded:** When I need task management

### B. Scenario Image Gen MCP
**Purpose:** AI image generation
**Tools:**
- generate_image, remove_background, image_to_image
- generate_layered_image, upload_image, list_models

**Tool Count:** ~6 operations
**Context Impact:** Low (~500 tokens)
**When Loaded:** Asset generation tasks

### C. Game Inspector MCP
**Purpose:** Game runtime debugging
**Tools:**
- Game state inspection (game_state, snapshot, screenshot)
- Entity management (spawn, destroy, clone, reparent)
- Physics queries (raycast, overlaps, collisions)
- Property operations (get_props, set_props, patch_props)
- Query systems (find, count, at_point, in_rect)
- Debugging (eval, console_logs, subscribe/poll events)
- Time control (pause, resume, step, set_time_scale)

**Tool Count:** ~40+ operations
**Context Impact:** High (~4,000 tokens) - Very detailed schemas
**When Loaded:** Game debugging sessions

### D. Context7 MCP
**Purpose:** Library documentation research
**Tools:**
- resolve-library-id
- query-docs

**Tool Count:** 2 operations
**Context Impact:** Low (~300 tokens)
**When Loaded:** When researching libraries

### E. Web Search MCP (Exa)
**Purpose:** Web search
**Tools:**
- websearch_web_search_exa

**Tool Count:** 1 operation
**Context Impact:** Very Low (~100 tokens)
**When Loaded:** Research tasks

### F. GitHub Search MCP (grep.app)
**Purpose:** Code examples from public repos
**Tools:**
- grep_app_searchGitHub

**Tool Count:** 1 operation
**Context Impact:** Very Low (~100 tokens)
**When Loaded:** Implementation research

### G. Session Manager MCP
**Purpose:** OpenCode session management
**Tools:**
- session_list, session_read, session_search, session_info

**Tool Count:** 4 operations
**Context Impact:** Low (~200 tokens)
**When Loaded:** Session analysis

**Total MCP Tools: ~74**
**Total MCP Context Impact: ~7,000-10,000 tokens**

---

## 5. Context Window Analysis

### Estimation Methodology
Based on typical token counts for tool schemas:
- Simple tool (1-2 params): ~50-100 tokens
- Medium tool (3-5 params, descriptions): ~200-400 tokens  
- Complex tool (nested objects, enums): ~500-800 tokens
- Rich skill (patterns, examples, gotchas): ~1,500-3,000 tokens

### Current Breakdown

| Category | Item Count | Est. Tokens | % of Context |
|----------|------------|-------------|--------------|
| Built-in Tools | 42 | ~4,000 | 16% |
| User Skills | 33 | ~10,000 | 40% |
| Project Skills | 11 | ~4,000 | 16% |
| MCP Tools | 74 | ~8,000 | 32% |
| **TOTAL** | **160** | **~26,000** | **100%** |

*Note: This is a rough estimate. Actual context usage depends on:
- How many skills are auto-loaded
- Which MCPs are active
- Tool schema complexity
- System prompt overhead*

### Context Window Limits
- **Claude 3.5 Sonnet:** 200K context window
- **Available for user content:** ~150K after system/tools
- **Current tool overhead:** ~26K (17% of available)

**Status:** Not critical yet, but optimization opportunity exists

---

## 6. Docker Dynamic MCP Opportunities

### What is Dynamic MCP?
Instead of loading ALL MCP servers at startup, Docker dynamic MCPs would:
1. Keep MCP servers in Docker containers
2. Spin up on-demand when tools are needed
3. Destroy when no longer needed
4. Only load tool schemas into context when active

### Potential Benefits

#### A. Reduced Context Overhead
**Current:** All MCP tool schemas loaded regardless of use
**Dynamic:** Only active MCP schemas in context

**Estimated Savings:**
- Game Inspector: ~4,000 tokens (only needed during debugging)
- Scenario Image Gen: ~500 tokens (only during asset gen)
- Context7: ~300 tokens (only during research)
- Backlog: ~2,000 tokens (only during task management)

**Potential Reduction: ~7,000 tokens (27% of tool context)**

#### B. Faster Session Startup
- Fewer initial tool registrations
- Lazy loading of capabilities

#### C. Better Resource Isolation
- Each MCP in its own container
- No conflicts between MCPs
- Easier to add/remove MCPs

#### D. Cost Optimization
- Only pay for compute when MCP is active
- Can use spot instances for ephemeral containers

### Challenges

#### A. Latency
- Cold start time for Docker containers (~1-3 seconds)
- May impact interactive workflows

#### B. Complexity
- Need container orchestration
- Health checks and monitoring
- Error handling for container failures

#### C. State Management
- How to handle persistent state across container restarts?
- Session management becomes harder

#### D. Local Development
- Docker requirement for development
- Might be overkill for personal use

---

## 7. Recommendations

### Immediate (No Docker)
1. **Lazy Skill Loading**: Don't auto-load all 33 user skills - only load when relevant topics detected
2. **Skill Pruning**: Review if all 33 user skills are actually needed
3. **MCP Lazy Loading**: Only activate MCPs when explicitly requested

### Medium-term (Docker MCP)
1. **Start with heavy MCPs**: Game Inspector, Scenario Image Gen
2. **Keep lightweight MCPs always-on**: Web Search, GitHub Search
3. **Add warm pools**: Keep 1-2 containers warm for common MCPs

### Long-term
1. **Context Pruning**: Remove tool schemas from context after use
2. **Skill Compression**: Summarize skills to essential info only
3. **Custom MCPs**: Create domain-specific MCPs for slopcade workflows

---

## 8. Measurement Plan

To validate Docker dynamic MCP benefits:

### Metrics to Track
1. **Context Window Usage**
   - Tool schema tokens loaded
   - User content available vs used
   
2. **Response Latency**
   - Time to first token
   - Total response time
   
3. **Cost Analysis**
   - API call costs (token usage)
   - Compute costs (if using cloud)

4. **Developer Experience**
   - Session startup time
   - Tool availability latency
   - Error rates

### A/B Test Setup
1. **Baseline** (current): All tools always loaded
2. **Test** (dynamic): Only load tools when needed
3. **Compare**: Same tasks, measure metrics above

---

## 9. Open Questions

1. **Tool Schema Caching**: Can we cache schemas client-side to avoid reloading?
2. **Predictive Loading**: Can we predict which tools will be needed?
3. **Partial Loading**: Can we load only the specific tools needed, not entire MCP?
4. **Skill vs MCP**: Should some user skills become MCPs instead?

---

## Appendix: Full Tool Inventory

### Built-in Tools (42)
```
File Operations: read, write, edit, glob, grep
Code Intelligence: lsp_*, ast_grep_*
Session: session_*
Background: background_*
Agent: task
Other: look_at, webfetch, bash, interactive_bash, slashcommand, question, todowrite
```

### User Skills (33)
```
bootstrap, test-driven-development, systematic-debugging, writing-plans,
executing-plans, verification-before-completion, requesting-code-review,
receiving-code-review, vercel-react-best-practices, git-master, git-worktree,
finishing-a-development-branch, compound-docs, context7-auto-research,
writing-skills, every-style-editor, oh-my-opencode, opencode-config,
opencode-config-manager, skill-creator, agent-tool-builder, brainstorming,
building-native-ui, dispatching-parallel-agents, find-skills, refactor-swarm,
context-window-management, long-context, subagent-driven-development, rclone,
web-design-guidelines, devmux, shell-config
```

### Project Skills (11)
```
game-authoring, game-authoring/examples, game-authoring/game-definition-reference,
game-authoring/scripting-api-reference, game-authoring/bundling-and-shaders,
bridge-development, input-handling, game-inspector, economy-engine,
effects-system, asset-pack-generation
```

### MCP Servers (7)
```
backlog, scenario-image-gen, game-inspector, context7, websearch-exa,
grep-app-github, session-manager
```

---

**Next Steps:**
1. Review this document
2. Decide on optimization priorities
3. Implement changes
4. Re-measure and compare against this baseline

*Document Version: 1.0 (Baseline)*
