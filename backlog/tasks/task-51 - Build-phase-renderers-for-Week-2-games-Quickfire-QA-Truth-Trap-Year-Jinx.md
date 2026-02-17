---
id: TASK-51
title: 'Build phase renderers for Week 2 games (Quickfire QA, Truth Trap, Year Jinx)'
status: To Do
assignee: []
created_date: '2026-02-17 19:07'
labels:
  - party
  - frontend
  - week-2
milestone: m-1
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three games have server scripts but need custom phase renderers. Quickfire QA needs a multiple-choice question phase. Truth Trap needs a writing_lies phase (fibbage-style). Year Jinx needs a guessing phase (number input). Register all in phaseRegistry.ts and add to AVAILABLE_GAMES.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Quickfire QA: multiple choice button UI for question phase
- [ ] #2 Truth Trap: text input for writing_lies phase + shuffled answer list for voting
- [ ] #3 Year Jinx: number input for guessing phase + timeline reveal
- [ ] #4 All 3 games added to AVAILABLE_GAMES and playable end-to-end
<!-- AC:END -->
