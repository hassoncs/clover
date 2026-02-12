# Skill Extraction and Organization Prompt (Iterative)

## Goal
Transform scattered documentation into organized, auto-loadable skills in `.claude/skills/`. This prompt is **idempotent** - run it multiple times to iteratively improve skill coverage and quality.

## How It Works (Iterative Improvement)

### First Run
- Creates initial skill files from documentation
- Establishes baseline coverage
- Creates skill index/manifest

### Subsequent Runs
- **Enriches** existing skills with new insights from docs
- **Identifies gaps** - docs not yet covered by any skill
- **Cross-links** related skills
- **Refines** based on usage patterns (if usage data available)
- **Prunes** outdated information

## Skill Format Template

```markdown
# {Skill Name}

> **Skill for AI Agents**: {One-line description}
> **Version**: {increment on significant updates}
> **Last Updated**: {date}
> **Source Docs**: {list of source documentation files}

## When to Use This Skill

Load this skill when:
- {Specific trigger 1}
- {Specific trigger 2}

## Key Concepts

### {Concept 1}
{Explanation with examples}

## Common Patterns

### {Pattern Name}
```typescript
// Code example
```

## Gotchas & Warnings

- **{Issue}**: {Explanation and fix}

## Troubleshooting Guide

| Symptom | Cause | Solution |
|---------|-------|----------|
| {Problem} | {Root cause} | {Fix} |

## Quick Reference

| Task | Solution |
|------|----------|
| {Task} | {Answer} |

## Related Skills
- {skill-name} - {why related}

## Changelog
- {date}: {what changed}
```

## Phase 1: Audit Current State

### Step 1: Discover Existing Skills
```bash
ls -la .claude/skills/*.md
ls -la .claude/skills/**/*.md 2>/dev/null || true
```

For each existing skill, record:
- Skill name
- Last updated date (from frontmatter)
- Coverage areas
- Quality assessment (minimal/adequate/comprehensive)

### Step 2: Discover Documentation Sources
```bash
find docs -name "*.md" -type f | sort
find . -name "AGENTS.md" -o -name "CLAUDE.md" -o -name "README.md" | grep -v node_modules
ls .sisyphus/plans/*.md 2>/dev/null || true
ls .sisyphus/notepads/**/*.md 2>/dev/null || true
```

### Step 3: Map Docs to Skills

Create a coverage matrix:

| Source Doc | Current Skill Coverage | Gap? |
|------------|------------------------|------|
| docs/godot/BRIDGE_REFACTOR.md | bridge-development.md | Partial |
| docs/economy/ENGINE_GUIDE.md | economy-engine.md | Missing |
| ... | ... | ... |

**Mark as gap if:**
- No skill exists for this domain
- Skill exists but doesn't cover key info from doc
- Doc is newer than last skill update

## Phase 2: Skill Categories (Living Document)

These categories grow over time. On each run, assess if new categories are needed.

### Core Categories

#### A. Game Engine & Bridge
**Existing Skills**: `bridge-development.md`, `input-handling.md`, `coordinate-systems.md`  
**Source Candidates**:
- `docs/godot/*.md`
- `docs/refactoring/*.md`
- `AGENTS.md` § Bridge, Godot sections
- Code: `app/lib/godot/`, `godot_project/scripts/`

**Improvement on each run**:
- Add new bridge methods as they're added
- Update gotchas based on recent issues
- Add troubleshooting entries from debugging sessions

#### B. Asset Generation
**Existing Skills**: `asset-pack-generation.md`  
**Source Candidates**:
- `docs/IMAGE_GENERATION_ARCHITECTURE.md`
- `docs/gallery-system/*.md`
- `AGENTS.md` § Asset Pipeline

**Improvement on each run**:
- Update pricing/providers
- Add new generation patterns
- Document recent pipeline changes

#### C. Chat & AI Systems
**Existing Skills**: *(likely none yet)*  
**Source Candidates**:
- `AGENTS.md` § Chat Flow, Billing
- `.sisyphus/plans/chat-streaming-migration.md`
- Code: `app/lib/chat/`, `api/src/chat/`

**Key insights to capture**:
- SSE CORS requirements
- AG-UI event mapping
- Billing lifecycle (reservation/settlement/finalize)
- HITL (askUser) patterns

#### D. Economy Engine
**Existing Skills**: *(likely none yet)*  
**Source Candidates**:
- `docs/economy/*.md`
- `packages/economy-engine/`
- Notepads from completed economy work

#### E. Effects & Visual
**Existing Skills**: *(likely none yet)*  
**Source Candidates**:
- `docs/effects/*.md`
- `docs/special-effects/*.md`
- `docs/text-effects-implementation.md`
- `godot_project/docs/VFX_IMPLEMENTATION_TODO.md`

#### F. Testing & Debugging
**Existing Skills**: *(likely none yet)*  
**Source Candidates**:
- `docs/game-inspector/*.md`
- `docs/testing/*.md`
- `app/lib/godot/__tests__/README.md`

#### G. React Native / Expo
**Existing Skills**: *(likely none yet)*  
**Source Candidates**:
- `docs/shared/guides/*.md`
- `docs/shared/reference/*.md`
- `AGENTS.md` § Expo, Metro, Native Build Commands

#### H. Architecture & Patterns
**Existing Skills**: `game-authoring.md`  
**Source Candidates**:
- `docs/ARCHITECTURE.md`
- `docs/VISION.md`
- `docs/architecture/*.md`
- `docs/roadmap/*.md`

## Phase 3: Extraction Rules

### Rule 1: Append, Don't Replace
When enriching an existing skill:
- Add new sections at the end
- Update "Last Updated" date
- Add entry to Changelog
- Mark conflicts for manual review

### Rule 2: Deduplicate Intelligently
If the same information exists in multiple docs:
- Keep the most detailed version
- Add cross-references to other docs
- Note discrepancies if sources conflict

### Rule 3: Prioritize Actionable Content
**High priority** (always include):
- Code examples showing correct usage
- Warnings about common mistakes
- Step-by-step procedures
- Configuration examples

**Medium priority** (include if space):
- Architecture explanations
- Design rationale
- Historical context

**Low priority** (skip or summarize):
- Meeting notes
- Brainstorming
- Future ideas without implementation

### Rule 4: Code Example Quality
Every code example must be:
- **Runnable**: Valid syntax, imports included
- **Complete**: Not pseudocode, actually works
- **Contextual**: Shows where the code goes
- **Tested**: Prefer examples from working code

## Phase 4: Gap Detection

After processing known sources, look for:

### Undocumented Gotchas
Search codebase for warning patterns:
```bash
grep -r "WARNING\|FIXME\|HACK\|NOTE:" --include="*.ts" --include="*.tsx" app/lib/godot/ | head -20
grep -r "console.warn\|console.error" --include="*.ts" app/lib/ | head -20
```

### Error Patterns
Search for common errors that should be documented:
```bash
grep -r "throw new Error\|throw Error" --include="*.ts" api/src/ | head -20
```

### Configuration Patterns
Find hardcoded values that should be documented:
```bash
grep -r "8085\|RCT_METRO_PORT" --include="*.ts" --include="*.json" . | head -10
```

## Phase 5: Cross-Linking Strategy

Create a graph of related skills:

```
bridge-development
├── input-handling (bridge methods for input)
├── coordinate-systems (transform methods)
└── native-image-loading (texture bridge methods)

chat-streaming
├── agent-billing (billing in chat)
└── hitl-patterns (askUser in chat)

game-authoring
├── economy-engine (game.economy field)
├── effects-system (game.effects field)
└── bridge-development (entity spawn/destroy)
```

On each run, ensure:
- New skills are linked into the graph
- Bi-directional links exist
- No orphaned skills (skills with no links may be too narrow)

## Phase 6: Quality Metrics

Track these metrics on each run:

| Metric | Target | Current | Trend |
|--------|--------|---------|-------|
| Total skills | 15-25 | {?} | {?} |
| Docs covered | 80%+ | {?}% | {?} |
| Avg skill size | 150-300 lines | {?} | {?} |
| Code examples | 3+ per skill | {?} | {?} |
| Gotchas captured | 2+ per skill | {?} | {?} |
| Cross-link ratio | 2+ links per skill | {?} | {?} |

**Quality gates**:
- Any skill < 50 lines is probably incomplete
- Any skill > 500 lines should be split
- Skills with 0 code examples need attention
- Skills with 0 gotchas may be too superficial

## Phase 7: Maintenance Mode

On subsequent runs, also:

### Check for Stale Skills
Compare skill "Last Updated" with source doc modification dates:
```bash
git log -1 --format=%ci -- docs/godot/BRIDGE_REFACTOR.md
git log -1 --format=%ci -- .claude/skills/bridge-development.md
```

If doc is newer than skill, flag for update.

### Check for Orphaned Skills
If a skill's source docs are deleted/moved, either:
- Update skill with new source locations
- Mark skill as archived
- Remove skill if truly obsolete

### Consolidate Fragmented Knowledge
If multiple docs cover similar ground:
- Consider merging docs first
- Or create comprehensive skill that synthesizes all sources

## Example Iteration

### Run 1: Initial Creation
- Create `bridge-development.md` from `docs/godot/BRIDGE_REFACTOR.md`
- Basic coverage: 60%
- 5 code examples, 3 gotchas

### Run 2: Enrichment
- Read `docs/godot/BRIDGE_E2E_TESTING.md`
- Add testing section to `bridge-development.md`
- Coverage: 75%
- Now 8 code examples, 5 gotchas
- Add cross-link to new `testing-patterns.md`

### Run 3: Gap Filling
- Search finds `docs/godot/WEB_INPUT_HANDLING.md` not yet covered
- Create `input-handling.md`
- Link to `bridge-development.md`
- Coverage: 85%

### Run 4: Quality Pass
- Review metrics: `bridge-development.md` is 450 lines (too long)
- Split: Move coordinate content to `coordinate-systems.md`
- Both skills now 200 lines each
- Better organization, same coverage

## Execution Checklist

Each run, complete these phases:

- [ ] Phase 1: Audit existing skills and docs
- [ ] Phase 2: Identify gaps and update coverage matrix
- [ ] Phase 3: Extract/enrich skills following rules
- [ ] Phase 4: Detect gaps in code patterns
- [ ] Phase 5: Cross-link related skills
- [ ] Phase 6: Measure quality metrics
- [ ] Phase 7: Check for stale skills and orphaned content
- [ ] Update `.claude/skills/README.md` with current index
- [ ] Update `.sisyphus/brain-sleep.md` with skill changes

## Integration with Brain Sleep

This skill extraction prompt is **designed to be called from brain-sleep**. See `brain-sleep-command.md` for the integrated workflow.

**Typical flow:**
1. `/brain-sleep` starts documentation audit
2. As stale docs are identified, insights are extracted
3. This prompt is invoked to create/update skills
4. Skills are cross-linked and indexed
5. Manifest is updated with skill changes

**Benefits of integration:**
- Knowledge extracted during cleanup is immediately available
- No separate "skill building" session needed
- Skills stay in sync with documentation
- Iterative improvement happens automatically

## Deliverables

Each run produces:
1. **New skills** for previously uncovered domains
2. **Enriched skills** with additional insights
3. **Updated skill index** (`README.md` or `INDEX.md`)
4. **Coverage report** showing what's documented vs not
5. **Quality report** with metrics and recommendations

## Long-Term Evolution

After 3-5 runs, skills should:
- Cover 90%+ of architectural documentation
- Have comprehensive code examples
- Be heavily cross-linked
- Include troubleshooting guides
- Reflect current best practices

The skill library becomes a **living knowledge base** that improves with each iteration.
