---
id: TASK-37
title: Build Canonical Planned-vs-Built-vs-Infra Matrix
status: To Do
assignee: []
created_date: '2026-02-15 23:19'
labels: []
milestone: games-buildout
dependencies: []
references:
  - .sisyphus/plans/games-buildout-infra-readiness-plan.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enumerate all game-specific plans in .sisyphus/plans/party-games/. Normalize slugs and map each to built artifacts under r2/games/. Add infra readiness state for each game (ready_now, needs_p0, needs_p1, needs_content, needs_publish). Store matrix artifact for downstream task dispatch. Reference: .sisyphus/plans/games-buildout-infra-readiness-plan.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Matrix includes every 01-* to 05-* party game plan file.
- [ ] #2 Each row has non-empty values for built_status and infra_status.
- [ ] #3 Artifact saved at .sisyphus/evidence/task-1-planned-built-matrix.md.
<!-- AC:END -->
