---
id: TASK-36
title: Upgrade moderation to ML-based pre-filter when abuse patterns emerge
status: To Do
assignee: []
created_date: '2026-02-15 21:48'
labels:
  - security
  - moderation
  - future
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Current keyword/regex moderation is MVP-appropriate but easily bypassed. When we see real abuse attempts in audit logs, upgrade to ML-based moderation (OpenAI Moderation API or similar).

See `docs/ops/future-moderation-roadmap.md` for full analysis and implementation path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 OpenAI Moderation API integrated as second layer after keyword check
- [ ] #2 ML filter catches contextual abuse and different languages
- [ ] #3 Cost monitoring in place (~$0.002/request)
- [ ] #4 Audit logs show both keyword and ML rejections
<!-- AC:END -->
