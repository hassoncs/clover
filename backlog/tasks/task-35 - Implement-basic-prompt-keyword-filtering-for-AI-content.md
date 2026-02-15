---
id: TASK-35
title: Implement basic prompt keyword filtering for AI content
status: To Do
assignee: []
created_date: '2026-02-15 20:33'
labels:
  - security
  - content-moderation
  - ai
dependencies: []
references:
  - .sisyphus/plans/pre-launch-security-review.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a simple keyword blacklist to filter inappropriate content from AI generation prompts before they're sent to external APIs.

**Scope**:
- Add a `filterPrompt()` utility function
- Block obvious inappropriate keywords
- Integrate into `games.generate`, `games.refine`, `assetSystem.createGenerationJob`, `chatThreads.sendMessage`

**Approach**: Start with a simple regex/blacklist approach. No external API calls needed.
<!-- SECTION:DESCRIPTION:END -->
