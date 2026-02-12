# User Skills Audit: Assessment & Pruning Recommendations

**Date:** 2026-02-12  
**Skills Audited:** 34 user skills  
**Context Impact:** ~10,000-15,000 tokens when all loaded

---

## Executive Summary

Your 34 user skills are well-organized but have significant **overlap** and **redundancy**. Conservative pruning could reduce context usage by **30-40%** without losing functionality.

### Quick Wins
1. **Merge 3 config skills** → 1 unified skill (save ~1,500 tokens)
2. **Merge 2 code review skills** → 1 skill (save ~1,000 tokens)  
3. **Remove 4 unused/symlinked skills** (save ~800 tokens)
4. **Archive 3 highly-specific workflow skills** (save ~2,000 tokens)

**Estimated Total Savings: ~5,300 tokens (35-40% reduction)**

---

## Current Skill Inventory (34 Skills)

### Category Breakdown

| Category | Count | Skills |
|----------|-------|--------|
| **Configuration** | 3 | oh-my-opencode, opencode-config, opencode-config-manager |
| **Development Process** | 6 | writing-plans, executing-plans, subagent-driven-development, finishing-a-development-branch, requesting-code-review, receiving-code-review |
| **Code Quality** | 4 | test-driven-development, systematic-debugging, verification-before-completion, vercel-react-best-practices |
| **Refactoring** | 2 | refactor-swarm, git-worktree |
| **Brainstorming** | 1 | brainstorming |
| **Documentation** | 2 | compound-docs, writing-skills |
| **Opencode Specific** | 5 | find-skills, skill-creator, using-superpowers, shell-config, devmux |
| **External Integrations** | 3 | rclone, agent-browser, web-design-guidelines |
| **Advanced Topics** | 4 | context-window-management, context7-auto-research, long-context, agent-tool-builder, dispatching-parallel-agents |
| **Symlinks (in .agents)** | 4 | agent-tool-builder, context-window-management, context7-auto-research, long-context |

### Size Analysis

| Skill | Lines | Priority | Notes |
|-------|-------|----------|-------|
| test-driven-development | 372 | HIGH | Core workflow, heavily used |
| receiving-code-review | 214 | MEDIUM | Valuable but overlaps with requesting-code-review |
| systematic-debugging | ~200 | HIGH | Essential debugging process |
| compound-docs | ~180 | MEDIUM | Knowledge capture |
| subagent-driven-development | ~150 | HIGH | Active workflow skill |
| verification-before-completion | 140 | MEDIUM | Good guardrail |
| find-skills | 134 | LOW | Rarely needed (CLI tool) |
| opencode-config-manager | ~150 | MEDIUM | Overlaps with other config skills |
| oh-my-opencode | ~150 | MEDIUM | Overlaps with opencode-config |
| opencode-config | ~100 | MEDIUM | Overlaps with above |
| writing-plans | 117 | HIGH | Core planning skill |
| executing-plans | 77 | MEDIUM | Works with writing-plans |
| requesting-code-review | 106 | MEDIUM | Overlaps with receiving-code-review |
| finishing-a-development-branch | ~70 | MEDIUM | Specific workflow |
| vercel-react-best-practices | ~60 | LOW | React-specific, rarely used |
| refactor-swarm | 41 | LOW | Specialized use case |
| git-worktree | ~50 | MEDIUM | Useful but specific |
| brainstorming | 55 | HIGH | Used frequently |
| writing-skills | ~40 | LOW | Meta-skill, rarely used |
| skill-creator | ~30 | LOW | Meta-skill, rarely used |
| using-superpowers | ~30 | LOW | Legacy bootstrap skill? |
| web-design-guidelines | ~30 | LOW | Rarely used |
| shell-config | ~30 | MEDIUM | Personal config |
| devmux | ~20 | MEDIUM | Project-specific |
| agent-browser | ~20 | LOW | Specialized |
| dispatching-parallel-agents | ~30 | MEDIUM | Could be consolidated |
| bootstrap | ~30 | MEDIUM | Startup skill |
| every-style-editor | ~40 | LOW | Specialized |
| rclone | ~30 | LOW | Infrastructure |

---

## Detailed Pruning Recommendations

### 🔴 HIGH PRIORITY: Merge Config Skills (3→1)

**Skills to Merge:**
- `oh-my-opencode`
- `opencode-config`  
- `opencode-config-manager`

**Problem:** Massive overlap. All three deal with OpenCode configuration:
- oh-my-opencode: Plugin architecture, agents, categories
- opencode-config: File locations, JSON schemas
- opencode-config-manager: Directory structure, symlinks

**Solution:** Create single `opencode-configuration` skill with sections:
```
1. Quick Reference (most-used 20%)
2. File Locations & Structure
3. Agent/Category Configuration
4. Directory Management & Symlinks
5. Common Tasks
```

**Estimated Savings:** ~1,500 tokens

---

### 🟠 MEDIUM PRIORITY: Consolidate Code Review (2→1)

**Skills to Merge:**
- `requesting-code-review`
- `receiving-code-review`

**Problem:** Two sides of same coin. 320 lines total with overlapping concepts.

**Solution:** Create `code-review-process` skill:
```
1. When to Request Review
2. How to Request (Process)
3. Handling Feedback (Reception)
4. Integration Patterns
```

**Estimated Savings:** ~1,000 tokens

---

### 🟡 MEDIUM PRIORITY: Archive Specialized Workflows (3 skills)

**Skills to Consider Archiving:**
1. **`subagent-driven-development`** (~150 lines)
   - Very specific workflow
   - Only used in certain project types
   - Could be documented in compound-docs instead

2. **`finishing-a-development-branch`** (~70 lines)
   - Specific git workflow
   - Could be merged into git-worktree or compound-docs

3. **`refactor-swarm`** (~40 lines)
   - Highly specialized (mass refactoring)
   - Rarely used
   - Could be a compound-doc entry

**Action:** Move to `~/.claude/skills/archive/` - not deleted, just not auto-loaded

**Estimated Savings:** ~2,000 tokens

---

### 🟢 LOW PRIORITY: Remove/Consolidate Meta-Skills (4 skills)

**Candidates:**

1. **`writing-skills`** (~40 lines)
   - Meta-skill (how to write skills)
   - Rarely used in daily work
   - Could be compound-doc entry

2. **`using-superpowers`** (~30 lines)
   - Appears to be legacy/bootstrap
   - Unclear current use
   - **Verify if needed, otherwise delete**

3. **`skill-creator`** (~30 lines)
   - Another meta-skill
   - How often do you create new skills?
   - Could be compound-doc

4. **`find-skills`** (134 lines)
   - CLI tool wrapper
   - Used rarely (only when adding skills)
   - Could be simplified or moved to compound-docs

**Estimated Savings:** ~600 tokens

---

### 🔵 LOW PRIORITY: External Integration Consolidation (2 skills)

**Candidates:**

1. **`rclone`** (~30 lines)
   - Cloud storage operations
   - Only relevant if actively managing cloud assets
   - **Keep if used, archive if not**

2. **`agent-browser`** (~20 lines)
   - Browser automation
   - May overlap with built-in `dev-browser` skill
   - **Verify if distinct value, otherwise archive**

**Estimated Savings:** ~200-400 tokens

---

### 🟣 CONSIDER: Domain-Specific Skills (2 skills)

**Review for relevance:**

1. **`vercel-react-best-practices`** (~60 lines)
   - React/Next.js specific
   - Only valuable if actively doing React work
   - **Keep if in React codebase, archive if game-focused**

2. **`web-design-guidelines`** (~30 lines)
   - UI/UX review
   - May overlap with built-in `frontend-ui-ux` skill
   - **Test overlap, keep if adds unique value**

---

### ⚪ KEEP (High Value Core Skills)

These are essential and well-designed:

| Skill | Why Keep |
|-------|----------|
| **test-driven-development** | Core workflow, 372 lines of gold |
| **systematic-debugging** | Essential debugging discipline |
| **brainstorming** | Used frequently for design |
| **writing-plans** | Core planning workflow |
| **verification-before-completion** | Critical guardrail |
| **compound-docs** | Knowledge management |
| **executing-plans** | Works with writing-plans |
| **git-worktree** | Useful isolation pattern |

---

### 🔗 SYMLINKED SKILLS (Already Optimized)

These are in `~/.agents/skills/` and symlinked:
- `agent-tool-builder`
- `context-window-management`
- `context7-auto-research`
- `long-context`

**Status:** ✅ Already optimized (shared across projects)

---

## Implementation Plan

### Phase 1: Quick Wins (Immediate - 30 min)

1. **Create archive directory:**
   ```bash
   mkdir -p ~/.claude/skills/archive
   ```

2. **Move low-use skills to archive:**
   ```bash
   cd ~/.claude/skills
   mv refactor-swarm finishing-a-development-branch archive/
   # Only if verified unused:
   # mv using-superpowers writing-skills skill-creator archive/
   ```

**Immediate Savings:** ~2,500 tokens

### Phase 2: Consolidation (This week - 2 hours)

1. **Merge config skills** into `opencode-configuration.md`
2. **Merge code review skills** into `code-review-process.md`
3. **Test** that new skills work correctly

**Additional Savings:** ~2,500 tokens

### Phase 3: Evaluation (Next week - 30 min)

1. Monitor if archived skills are needed
2. If needed frequently, restore from archive
3. If not needed after 2 weeks, permanently delete

---

## Expected Outcomes

### Before Pruning
- **34 skills**
- **~10,000-15,000 tokens** when all loaded
- **High redundancy** in config/code-review areas
- **Mixed relevance** (some rarely used)

### After Pruning
- **~20-22 skills** (35% reduction)
- **~6,000-9,000 tokens** (35-40% reduction)
- **Streamlined categories**
- **Focused relevance**

### Context Window Impact

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Full skill loading | ~15K tokens | ~9K tokens | 40% less |
| Typical session | ~8K tokens | ~5K tokens | 37% less |
| Remaining for user content | ~135K | ~141K | +6K available |

---

## Risk Assessment

### Low Risk
- Archiving specialized skills (can restore)
- Removing meta-skills (rarely used)
- Consolidating config skills (same info, better organized)

### Medium Risk
- Merging code review skills (ensure all patterns preserved)
- Archiving workflow skills (verify not in active use)

### Mitigation
- **Archive, don't delete** ( Phase 1)
- **Test merged skills** thoroughly
- **Monitor usage** for 1-2 weeks

---

## Questions to Decide

Before implementing, clarify:

1. **Do you actively use `subagent-driven-development`?** 
   - If yes → Keep
   - If no → Archive

2. **Is `vercel-react-best-practices` relevant to slopcade?**
   - If React work planned → Keep
   - If game-focused only → Archive

3. **Do you create skills often enough to need `writing-skills` and `skill-creator`?**
   - If monthly+ → Keep
   - If rarely → Archive

4. **Is `using-superpowers` still needed?**
   - What does it do? (Legacy bootstrap?)
   - If unclear → Archive and see if anything breaks

---

## Recommended Next Steps

1. **Review this audit** - Mark which recommendations you agree with
2. **Decide on the 4 questions above**
3. **Start with Phase 1** (archive low-use skills) - lowest risk
4. **Test for 1 week** - See if workflow is affected
5. **Proceed to Phase 2** if Phase 1 successful
6. **Re-measure context** - Compare against baseline document

---

## Appendix: Skill Dependencies

Some skills reference others (via `superpowers:X`):

```
subagent-driven-development → finishing-a-development-branch
writing-plans → subagent-driven-development OR executing-plans
executing-plans → finishing-a-development-branch
brainstorming → writing-plans, git-worktree
```

**Impact:** When archiving skills, check for these references and update accordingly.

---

**Document Version:** 1.0  
**Next Review:** After Phase 1 implementation
