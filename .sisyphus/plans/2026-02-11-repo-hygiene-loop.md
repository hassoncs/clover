# Repo Hygiene Loop (v1 Brainstorm)

## Goal

Create a repeatable repo-health loop you can run daily (or multiple times/day) to keep the codebase clean, reduce drift, and surface scheduled cleanup work.

## What this loop should do

1. Detect technical debt and stale code paths early.
2. Keep docs/plans current (archive/delete completed or stale plans).
3. Remove accidental artifacts (logs, temp files, debug screenshots).
4. Review the last 24h of changes for duplication, architecture drift, and missing tests.
5. Produce a prioritized cleanup backlog (today, this week, later).

## Recommended Execution Model (start simple)

Use a **hybrid model**:

- **Primary trigger**: slash command (manual, fast iteration).
- **Decision engine**: prompt-driven agent (for judgment-heavy checks like "does this doc still match reality?").
- **Optional automation later**: cron/scheduled CI that runs only safe checks and posts a report.

Why hybrid first:

- Fully scripted cleanup is brittle for semantic decisions.
- Prompt-only without structure can be inconsistent.
- Hybrid gives consistency + judgment.

## Existing project capabilities to reuse

- `pnpm knip` - unused files/dependencies/exports.
- `pnpm generate:registry:check` - stale registry detection.
- `pnpm check:bridge` - bridge codegen drift.
- `pnpm godot:check` - Godot export drift.
- `app && pnpm tsc --noEmit` (already part of pre-commit expectations).
- Existing command: `.opencode/commands/cleanup.md` (artifact cleanup baseline).

## Daily Checklist (v1)

### A) Repo hygiene and artifacts (safe, automatable)

- Root and docs scan for accidental files: `*.log`, `*.tmp`, `*.bak`, `.DS_Store`, ad-hoc screenshots not intentionally documented.
- Verify ignore coverage for recurring junk (update `.gitignore` with patterns, not one-off filenames).
- Confirm generated/stale signals are clean:
  - `pnpm generate:registry:check`
  - `pnpm check:bridge`
  - `pnpm godot:check`

### B) Documentation and planning hygiene (semi-automated)

- Scan `docs/plans/` and classify each plan: `active`, `completed`, `stale`, `superseded`.
- For `completed`/`superseded` plans:
  - either delete, or move to `docs/archive/` (pick one policy and keep it consistent).
- Validate key index docs still point to real files (`docs/INDEX.md`, top-level READMEs).
- Flag docs with obvious mismatch against current implementation (manual review list).

### C) Last-24-hours code review (judgment-heavy)

- Gather recent change set (`git log` + changed file list for last 24h).
- Check for:
  - duplicated logic introduced by new work,
  - violations of existing architecture direction (especially around known "god files"),
  - missing or weak tests on modified critical paths,
  - opportunities to extract common utilities where duplication is material.
- Output must separate:
  - `fix now`,
  - `schedule this week`,
  - `defer`.

### D) Technical debt triage output (required artifact)

Produce one short report each run:

- `Critical` (must address now)
- `Important` (schedule this week)
- `Nice-to-have` (backlog)

Include per item:

- scope/files,
- why it matters,
- estimated effort,
- suggested owner (optional),
- exact next action.

## Guardrails (important)

- Never auto-delete production code or tests.
- Never auto-delete docs based on filename alone.
- "Delete tests that don't add value" should be manual review only; default action is mark for rewrite/merge, not delete.
- Auto-delete only clearly safe artifacts.

## Suggested slash command (starter)

Create `.opencode/commands/repo-hygiene.md` with this first version:

```markdown
---
description: "Run daily repo hygiene sweep and produce prioritized cleanup report"
agent: "default"
subtask: false
---

# Repo Hygiene Sweep

Run a repo-health pass with strict guardrails.

## MUST DO

1. Run safe automated checks:
   - `pnpm knip`
   - `pnpm generate:registry:check`
   - `pnpm check:bridge`
   - `pnpm godot:check`
2. Review docs and plans (`docs/plans`, index references) and classify stale/completed items.
3. Review changes from the last 24h for duplication, architecture drift, and missing tests.
4. Generate a triaged action list: `Critical`, `Important`, `Nice-to-have`.

## MUST NOT DO

- Do not delete code/tests/docs automatically (except obvious temp artifacts).
- Do not make broad refactors in this pass.
- Do not commit unless explicitly requested.

## Output Format

Return:
- `Safe deletions performed`
- `Findings`
- `Scheduled cleanup tasks`
- `Suggested focused follow-up commands`

$ARGUMENTS
```

## Later (v2+) enhancements

1. Add machine-readable report output (`reports/repo-hygiene/YYYY-MM-DD.json`).
2. Add weekly trend tracking (debt count, stale plans count, duplicate hotspots).
3. Add optional scheduled run (CI/cron) that comments on PR/slack.
4. Add policy checks for "big-file growth" on known hotspots.

## First iteration rollout

1. Use this manually once/day for one week.
2. Track false positives and noisy checks.
3. Tighten command prompt and guardrails.
4. Only then automate scheduled/background mode.
