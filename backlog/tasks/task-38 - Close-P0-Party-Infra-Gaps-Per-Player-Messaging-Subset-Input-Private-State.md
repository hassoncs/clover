---
id: TASK-38
title: >-
  Close P0 Party Infra Gaps (Per-Player Messaging + Subset Input + Private
  State)
status: To Do
assignee: []
created_date: '2026-02-15 23:19'
labels: []
milestone: games-buildout
dependencies:
  - TASK-37
references:
  - .sisyphus/plans/games-buildout-infra-readiness-plan.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement/verify sendToPlayer(playerId, message) capability. Implement/verify requestInputFromSubset(playerIds[], requestId, request) capability. Activate private state path client<->server where currently stubbed. Reference: .sisyphus/plans/games-buildout-infra-readiness-plan.md
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Targeted party infra tests pass with new capabilities.
- [ ] #2 Regression evidence captured at .sisyphus/evidence/task-2-party-regression.txt.
<!-- AC:END -->
