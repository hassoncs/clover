# Slash Braindump (Enhance slopcade-documentation skill)

## TL;DR

Extend the existing brain dump workflow in `.opencode/skills/slopcade-documentation.md` so unstructured “braindump” input becomes a **prioritized, routed set of markdown-checkbox tasks** that are **always written to disk**:

- **Small (<1h)** → add to `docs/TODAY_YYYY-MM-DD.md`
- **Medium (1–4h)** → add to existing or new `.opencode/memory/roadmap/active/{feature}.md`
- **Large (>4h OR needs architecture)** → create `.opencode/memory/human-tasks/ht-XXX.md` (planning trigger; do not create Oracle plans directly)

---

## Context

### Original Request
Create a “slash braindump” capability for Slopcade: accept unstructured thoughts, organize them into prioritized TODOs, and route them into TODAY/roadmap/human-task docs.

### Why enhance (not new skill)
`slopcade-documentation.md` already defines:
- the three-tier system (docs/ vs .opencode/memory/ vs TODAY)
- a brain dump workflow (parse/categorize → choose doc → structure → integrate)
- templates for TODAY docs, active feature docs, and human task docs

Creating a separate skill would duplicate rules and risk conflicting routing logic.

---

## Work Objectives

### Core Objective
Make “braindump” input deterministic and actionable: every item gets (1) priority, (2) category/type, (3) effort band, and (4) routing destination with cross-links.

### Concrete Deliverables
- Updated `.opencode/skills/slopcade-documentation.md`:
  - expanded trigger phrases
  - explicit prioritization rubric
  - explicit routing rules matching the clarified contract
  - templates/snippets for writing into each destination doc
  - acceptance/verification checklist for the assistant behavior

---

## Scope

### IN
- Add/extend “slash braindump” behavior inside `slopcade-documentation` skill documentation
- Prioritization + routing rules
- File-writing contract and integration steps (TODAY + active feature + human-task)

### OUT (guardrails)
- Do **not** introduce a new parallel roadmap/todo system
- Do **not** create Oracle plan files directly from braindumps (Human Task is the trigger)
- Do **not** return “just a list” without writing files (contract says always write/update)
- Avoid scope creep into unrelated documentation pruning or broader roadmap rewrites

---

## Where to Change (file path + placement)

### Primary file
- `.opencode/skills/slopcade-documentation.md`

### Recommended insertion points
1) **Top trigger section** (near the beginning) — extend “Trigger” guidance to include the new phrases.
2) **User Intent Parsing table** — add rows mapping new phrases to “Process brain dump workflow”.
3) **`## Workflow: Processing User Brain Dumps`** (currently around lines ~640–679) — expand this section with:
   - prioritization rubric
   - action routing rules (small/medium/large)
   - output templates/snippets
   - file update sequencing and cross-linking

---

## Trigger Phrases to Include

Add these triggers to the skill’s trigger guidance (and/or intent parsing table):
- “braindump”
- “brain dump”
- “dump my thoughts”
- “here are my thoughts”
- “next steps for the project”
- “things we should do”
- “ideas for the project”
- “what I’m thinking”
- “my todo list”
- “random thoughts”

**Guardrail**: Ensure these don’t override existing intent routing like “Add {X} to roadmap”; they should only activate when the user provides unstructured multi-item input.

---

## Prioritization Logic (rubric)

Each extracted item must be annotated with:

### 1) Urgency (U)
- **U1 (High)**: blocks launch, blocks other work, or user explicitly says “blocker/urgent”.
- **U2 (Medium)**: meaningful progress, polish tied to near-term milestone.
- **U3 (Low)**: nice-to-have, exploratory, long-term.

### 2) Type (T)
- **Implementation**: build/change code or assets
- **Validation**: tests, verification, QA, instrumentation, “prove X works”
- **Research**: investigation, spike, unknown feasibility
- **Decision**: fork-in-road, trade-off, architecture/product direction

### 3) Effort Band (E)
- **E1 Small**: < 1 hour
- **E2 Medium**: 1–4 hours
- **E3 Large**: > 4 hours

### 4) Confidence (C) (helps routing)
- **C-high**: clear next action and known location
- **C-low**: ambiguous or missing info → treat as planning candidate

### Ranking Score (for ordering)
Use a simple, explainable ordering:
1) U1 items first, then U2, then U3
2) Within same urgency:
   - Implementation/Validation before Research
   - Lower effort before higher effort
3) Any Decision/C-low item floats to the top of its urgency group to ensure planning is triggered early.

---

## Action Routing Rules (contract)

### Small (<1h) → TODAY doc
- Destination: `docs/TODAY_YYYY-MM-DD.md`
- Placement: under **High Priority** if U1, else Medium/Low section.
- Formatting: markdown checkbox tasks with short description + (optional) “files to check” if mentioned.

### Medium (1–4h) → Active Feature doc
- Destination: `.opencode/memory/roadmap/active/{feature}.md`
- Rule:
  - If item clearly belongs to an existing active feature: append it to the appropriate Phase as a checkbox task.
  - If it does not map cleanly: create a new active feature doc (slugged name) with a minimal Phase 1 containing these items.

### Large (>4h OR needs architecture) → Human Task
- Destination: `.opencode/memory/human-tasks/ht-XXX.md` (sequential numbering)
- Purpose: trigger Oracle consultation and/or Sisyphus planning.
- Include:
  - the decision needed
  - options/unknowns
  - what it blocks (TODAY item or feature)

---

## Output Templates / Snippets (write patterns)

### A) TODAY doc addition snippet
Add tasks using existing TODAY template conventions:

```markdown
### {N}. {Task title} {optional: ⚡ URGENT}
{1–2 line description.}

- [ ] {subtask}
- [ ] {subtask}

**Notes**: {any context from braindump}
```

### B) Active Feature creation snippet

Use the existing Active Feature template (already documented in `slopcade-documentation.md`):

Minimum required fields when creating a new feature:
- Title
- Status + Priority + Started date
- Description (why)
- Progress Phase 1 with checkbox tasks derived from braindump
- (Optional) Human Tasks section with links to any ht-XXX created

### C) Human Task creation snippet

Use the existing Human Task template (already documented). For braindump-triggered planning, ensure these are present:
- **Priority** (default High if U1, else Medium)
- **Status**: Open
- **Source**: “braindump” (and optionally the related doc path)
- **Decision needed** section
- **Why it’s blocked / unknown** section
- **Next step**: “Consult Oracle” or “Create Sisyphus plan”

---

## Integration & Cross-Referencing Steps

When processing a braindump, the assistant must do this in order:

1) **Parse items** (split into bullets/tasks; keep original wording in notes)
2) **Annotate each item** with (U/T/E/C) and sort into prioritized list
3) **Route and write**:
   - write all small items into TODAY doc
   - ensure medium items live under an active feature doc (existing or new)
   - create ht-XXX for large/architecture items
4) **Cross-link**:
   - TODAY doc: include links to active feature docs + ht-XXX if created
   - Active feature doc: list blocking ht-XXX under its “Human Tasks” section
   - ROADMAP.md: update “Today’s Focus” and/or add references under Human Tasks / Active Features as appropriate (per existing conventions)
5) **Visibility**: open TODAY doc for user visibility (per existing workflow guidance)

---

## Verification Strategy (manual)

Because this is a skill-doc behavior change, verification is manual:

### Acceptance Criteria
- [ ] `slopcade-documentation.md` explicitly documents:
  - the 10 trigger phrases
  - the prioritization rubric (U/T/E/C + ordering)
  - the routing rules exactly matching the contract
  - the required file-writing order + cross-linking
- [ ] The documented workflow is internally consistent with the existing templates for:
  - TODAY docs (`docs/TODAY_YYYY-MM-DD.md`)
  - active features (`.opencode/memory/roadmap/active/{feature}.md`)
  - human tasks (`.opencode/memory/human-tasks/ht-XXX.md`)
- [ ] Guardrails are stated (no Oracle plans directly; no “list-only” output)

### Manual simulation (spot-check)
Use a sample braindump input and verify the docs would be updated as specified:
- At least 2 Small, 2 Medium, 1 Large/Decision item
- Verify each gets routed to correct doc type and cross-linked

---

## TODOs

- [ ] 1. Update trigger guidance in `.opencode/skills/slopcade-documentation.md`

  **What to do**:
  - Add the 10 trigger phrases to the skill’s “Trigger” guidance.
  - Add/extend the “User Intent Parsing” mapping so these phrases route into the brain dump workflow.

  **Must NOT do**:
  - Don’t break existing intent parsing (“Add {X} to roadmap/todo”).

  **References**:
  - `.opencode/skills/slopcade-documentation.md` (top trigger guidance; intent parsing table)

  **Acceptance Criteria**:
  - Trigger phrases are listed and mapped to the brain dump workflow.

- [ ] 2. Extend `## Workflow: Processing User Brain Dumps` with prioritization rubric

  **What to do**:
  - Add the U/T/E/C annotation rubric and a clear ordering rule.
  - Add a short example showing annotation and resulting sorted list.

  **References**:
  - `.opencode/skills/slopcade-documentation.md:## Workflow: Processing User Brain Dumps`

  **Acceptance Criteria**:
  - A reader can apply the rubric to a raw list and produce a prioritized list.

- [ ] 3. Extend brain dump workflow with action routing rules (small/medium/large)

  **What to do**:
  - Encode the clarified routing contract:
    - Small (<1h) → TODAY doc
    - Medium (1–4h) → active feature doc (existing or new)
    - Large (>4h OR needs architecture) → ht-XXX
  - Explicitly note: do not create Oracle plans directly.

  **Acceptance Criteria**:
  - Routing rules are unambiguous, including the “needs architecture” override.

- [ ] 4. Add output templates/snippets and integration sequencing

  **What to do**:
  - Provide copy-pastable snippets for TODAY additions.
  - Reference the existing Active Feature + Human Task templates and list “minimum required fields”.
  - Document ordering: parse → prioritize → route/write → cross-link → update ROADMAP “Today’s Focus” → open TODAY.

  **Acceptance Criteria**:
  - Executor can follow the sequence and knows exactly which files to touch and why.

- [ ] 5. Add a documented “example braindump → outputs” section

  **What to do**:
  - Provide a single example input and show:
    - prioritized list
    - which items go to TODAY vs active feature vs ht-XXX
    - what cross-links get added

  **Acceptance Criteria**:
  - Example demonstrates all three routing outcomes.

---

## Commit Strategy

- One doc-only commit after all edits:
  - `docs(opencode): extend slopcade brain dump routing`
