# Brain Sleep Command

## Overview

Consolidate working memory, clean up documentation, **and auto-generate skills** in a single pass. Run this command periodically (daily/weekly) to maintain a clean, knowledge-rich codebase.

## Command Syntax

```bash
/brain-sleep                    # Full run with skill generation
/brain-sleep --fresh            # Ignore manifest, re-evaluate everything
/brain-sleep --tier=6           # Only process T6 (notepads/memory)
/brain-sleep --tier=5,6         # Plans + working memory only
/brain-sleep --path=docs/godot  # Only audit specific path
/brain-sleep --no-skills        # Skip skill generation (fast mode)
```

## Execution Flow

### Phase 0: Load State
1. **Check manifest** - Load `.sisyphus/brain-sleep.md` if exists
2. **Check skill index** - Load `.claude/skills/INDEX.md` if exists
3. **Check last run date** - Skip recently reviewed files
4. **Load learned rules** - Apply custom rules from previous runs

### Phase 1: Documentation Audit (Existing)

Process documentation bottom-up by tier:

#### T6: Working Memory
- Find all files in `.sisyphus/notepads/`, `.claude/memory/`, `docs/wip/`
- For each file:
  - Check freshness (git modification time)
  - Extract insights before deletion
  - **Extract skill candidates** - flag patterns worth skill-ifying
- Classify: DELETE / EXTRACT+DELETE / KEEP

#### T5: Plans
- Find all files in `.sisyphus/plans/`, `.opencode/plans/`
- Check completion status (checkbox counting)
- Completed plans → **extract key patterns** → DELETE
- Active plans → verify still relevant

#### T4: Decisions/Evidence
- Find all files in `.sisyphus/evidence/`, `docs/decisions/`
- Evidence files → DELETE (temporary)
- ADRs/Decision records → KEEP (historical)

#### T3: Guides
- Find all files in `docs/shared/guides/`, `docs/how-tos/`
- Verify accuracy against code
- **Flag for skill extraction** if contains actionable patterns

#### T2: Reference
- Find all files in `docs/shared/reference/`, `docs/operations/`
- Keep if accurate
- **Extract to skills** for frequently referenced topics

#### T1: Core Truth
- `AGENTS.md`, `CLAUDE.md`, subdir `AGENTS.md` files
- **NEVER delete**
- Extract insights to appropriate skills
- Cross-link skills back to AGENTS.md

### Phase 2: Knowledge Extraction (NEW)

As docs are processed, extract structured knowledge:

#### Step 2a: Identify Skill Candidates

For each processed doc, ask:
- Does this contain **actionable how-to information**?
- Does this document **common patterns**?
- Are there **code examples** showing best practices?
- Are there **warnings/gotchas** about mistakes?
- Is this information **repeatedly needed**?

If YES to 2+ → **Create or update skill**

#### Step 2b: Extract Content by Type

**Code Examples:**
- Copy complete, runnable examples
- Include imports and context
- Add comments explaining key points

**Gotchas/Warnings:**
- Extract verbatim warnings
- Format as: `**{Issue}**: {Explanation} → {Fix}`
- Group by severity if multiple

**Procedures:**
- Convert to numbered steps
- Include prerequisites
- Add verification step at end

**Configuration:**
- Extract as tables or code blocks
- Note defaults and valid values
- Show example configurations

#### Step 2c: Determine Skill Category

Map doc location to skill category:

| Doc Location | Skill Category | Example Skill Name |
|--------------|----------------|-------------------|
| `docs/godot/*` | bridge | `bridge-development.md` |
| `docs/effects/*` | effects | `effects-system.md` |
| `docs/economy/*` | economy | `economy-engine.md` |
| `docs/chat/*` | chat | `chat-streaming.md` |
| `docs/testing/*` | testing | `testing-patterns.md` |
| `AGENTS.md` § Expo | expo-native | `expo-native.md` |
| `docs/shared/guides/*` | guides | `platform-modules.md` |
| `docs/shared/reference/*` | reference | `metro-config.md` |

#### Step 2d: Update or Create Skills

**If skill exists:**
- Read existing skill
- Check "Last Updated" date
- If doc is newer → **Append new content**
- Add to Changelog: `- {date}: Added {topic} from {source}`
- Update "Source Docs" list

**If skill doesn't exist:**
- Create new skill from template
- Fill in extracted content
- Set "Version": 1.0
- Set "Last Updated": today
- Set "Source Docs": [list]

**Skill Template:**
```markdown
# {Skill Name}

> **Skill for AI Agents**: {One-line description}
> **Version**: {x.y}
> **Last Updated**: {YYYY-MM-DD}
> **Source Docs**: {comma-separated list}

## When to Use This Skill

Load this skill when:
- {Trigger 1 from doc}
- {Trigger 2 from doc}

## Key Concepts

### {Concept from doc}
{Explanation with extracted code example}

## Common Patterns

### {Pattern name}
```typescript
{Extracted code example}
```

## Gotchas & Warnings

- **{Issue from doc}**: {Explanation} → {Fix from doc}

## Quick Reference

| Task | Solution |
|------|----------|
| {Task from doc} | {Solution from doc} |

## Related Skills
- {related-skill} - {why}

## Changelog
- {date}: Created from {source}
```

### Phase 3: Skill Index Maintenance (NEW)

After processing all docs:

#### Step 3a: Update Skill Index

Create/update `.claude/skills/INDEX.md`:

```markdown
# Skill Index

Generated: {date}

## By Category

### Bridge & Engine
- [bridge-development](bridge-development.md) - Godot-TypeScript bridge
- [input-handling](input-handling.md) - Web/native input
- [coordinate-systems](coordinate-systems.md) - World/screen transforms

### Assets & Generation
- [asset-generation](asset-generation.md) - Image/sound generation
- [asset-packs](asset-packs.md) - Pack structure and resolution

### Chat & AI
- [chat-streaming](chat-streaming.md) - SSE, AG-UI protocol
- [agent-billing](agent-billing.md) - Reservation/settlement pattern

... etc

## Recently Updated
| Skill | Date | Changes |
|-------|------|---------|
| {skill} | {date} | {summary} |

## Coverage Report
| Category | Skills | Docs Covered | Status |
|----------|--------|--------------|--------|
| Bridge | 3 | 8/10 docs | ✅ Good |
| Effects | 1 | 2/8 docs | ⚠️ Needs work |
| ... | ... | ... | ... |

## Gaps Identified
- {doc} not yet covered by any skill
- {topic} split across multiple skills, should consolidate
```

#### Step 3b: Cross-Link Skills

For each skill, add "Related Skills" section:
- Bridge skills link to each other
- Game-authoring links to bridge, economy, effects
- Chat links to billing, hitl-patterns
- etc.

#### Step 3c: Quality Check

Verify each skill meets minimum standards:
- [ ] Has "When to Use" section
- [ ] Has at least 1 code example
- [ ] Has at least 1 gotcha/warning
- [ ] Has quick reference table
- [ ] Links to at least 1 related skill
- [ ] < 400 lines (split if longer)

Flag skills that need improvement.

### Phase 4: Cleanup Execution

#### Delete Marked Files

```bash
# T6 - Working memory
rm -rf .sisyphus/notepads/completed-task/
rm -rf .claude/memory/old-feature/

# T5 - Completed plans
rm .sisyphus/plans/finished-plan.md

# T4 - Evidence
rm -rf .sisyphus/evidence/old-task/
```

#### Move Consolidated Docs

```bash
# Move useful T6 to T2/T3
mv .sisyphus/notepads/good-guide.md docs/shared/guides/

# Archive old T5 to T4
mv .sisyphus/plans/old-plan.md docs/archive/plans/
```

### Phase 5: Manifest Update

Update `.sisyphus/brain-sleep.md`:

```markdown
# Brain Sleep Manifest
Last run: {date}

## Documentation Changes
| File | Action | Reason |
|------|--------|--------|
| {file} | DELETED | {reason} |
| {file} | MOVED | {reason} |

## Skills Created/Updated
| Skill | Action | Source |
|-------|--------|--------|
| {skill}.md | CREATED | {source docs} |
| {skill}.md | UPDATED | Added {content} from {source} |

## Knowledge Extracted
| Source | Skill | Insight Type |
|--------|-------|--------------|
| {doc} | {skill} | Gotcha: {brief} |
| {doc} | {skill} | Pattern: {brief} |

## Stats
- Files reviewed: {N}
- Deleted: {N}
- Moved: {N}
- Skills created: {N}
- Skills updated: {N}
- Insights extracted: {N}

## Coverage Report
| Category | Before | After | Target |
|----------|--------|-------|--------|
| Bridge | 60% | 85% | 90% |
| Effects | 20% | 40% | 80% |
| ... | ... | ... | ... |

## Self-Critique
- **False positives**: {any deletions that were wrong}
- **False negatives**: {missed stale docs}
- **Skill quality**: {assessment}
- **Gaps remaining**: {what still needs coverage}

## Learned Rules
{Append new rules discovered this run}
```

## Integration with Existing Flow

### Before Brain Sleep
1. User writes code/docs
2. Knowledge accumulates in notepads, plans, memory
3. Skills may be incomplete

### During Brain Sleep
1. ✅ Audit documentation (existing)
2. ✅ Clean up stale files (existing)
3. 🆕 **Extract to skills** (NEW)
4. 🆕 **Update skill index** (NEW)
5. ✅ Update manifest (existing)

### After Brain Sleep
1. Stale docs deleted
2. Key insights preserved in AGENTS.md
3. 🆕 **Actionable knowledge in skills** (NEW)
4. 🆕 **Auto-loaded when needed** (NEW)

## Example Session

### User Runs: `/brain-sleep`

**Phase 1 - Audit:**
- Finds `.sisyphus/notepads/chat-streaming-migration/learnings.md`
- Classification: DELETE (task complete)
- **Skill candidate**: Contains SSE CORS gotcha → flag for extraction

**Phase 2 - Extraction:**
- Extracts: "SSE streaming endpoints need CORS headers on the streaming response itself"
- Determines category: chat
- Skill: `chat-streaming.md`
- Action: CREATE (doesn't exist yet)

- Extracts: "AG-UI finish chunks fire per step"
- Same skill: `chat-streaming.md`
- Action: APPEND to same skill

**Phase 3 - Index:**
- Creates `.claude/skills/INDEX.md`
- Lists: `chat-streaming.md` under "Chat & AI" category
- Cross-links: None yet (first run)

**Phase 4 - Cleanup:**
- Deletes: `chat-streaming-migration/` directory

**Phase 5 - Manifest:**
- Records: "chat-streaming.md CREATED from chat-streaming-migration notepads"
- Records: "3 insights extracted"
- Coverage: "Chat: 0% → 40%"

### Next Day: `/brain-sleep`

**Phase 1 - Audit:**
- Finds `docs/economy/ENGINE_GUIDE.md`
- Classification: KEEP (active documentation)
- **Skill candidate**: Comprehensive guide → flag for extraction

**Phase 2 - Extraction:**
- Extracts: Pool/node/edge patterns
- Skill: `economy-engine.md`
- Action: CREATE

- Also finds code gotchas in `packages/economy-engine/`
- Action: APPEND to `economy-engine.md`

**Phase 3 - Index:**
- Updates INDEX.md
- Adds: `economy-engine.md` under "Economy"
- Cross-links: `economy-engine.md` → `game-authoring.md` (game.economy field)

**Phase 4 - Cleanup:**
- Nothing to delete today

**Phase 5 - Manifest:**
- Records: "economy-engine.md CREATED"
- Coverage: "Economy: 0% → 70%"

## Success Criteria

After 3-5 runs of `/brain-sleep`:
- [ ] 15-25 skills created and maintained
- [ ] 80%+ of docs covered by skills
- [ ] All major gotchas captured in skills
- [ ] Skills are cross-linked and discoverable
- [ ] No knowledge lost when docs are deleted
- [ ] Skills auto-load when relevant topics arise

## Error Handling

### If skill creation fails:
- Log error in manifest
- Keep source doc (don't delete)
- Flag for manual review

### If doc extraction is ambiguous:
- Extract to "pending" section of skill
- Flag for manual review
- Ask user on next interaction

### If skills conflict:
- Note conflict in manifest
- Keep both versions
- Ask user which to prefer

## Performance

For large codebases (>1000 docs):
- Process in chunks of 50 files
- Save intermediate state
- Allow resuming interrupted runs

## Future Enhancements

- **Skill suggestions**: Suggest new skills based on code patterns
- **Usage tracking**: Track which skills are most loaded, prioritize updates
- **Auto-pruning**: Remove skills not loaded in 30+ days
- **Skill ratings**: User feedback on skill quality
