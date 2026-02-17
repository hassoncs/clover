---
id: TASK-50
title: QuickJS interrupt handler for infinite loop protection
status: To Do
assignee: []
created_date: '2026-02-17 19:07'
labels:
  - security
  - party
  - week-1
milestone: m-1
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Critical security gap: no runtime.setInterruptHandler() means while(true){} hangs the Durable Object. Add interrupt handler to QuickJSServerRunner to prevent script DoS.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Infinite loop in server script terminates after timeout
- [ ] #2 DO remains responsive after script timeout
- [ ] #3 Test verifying interrupt handler works
<!-- AC:END -->
