---
id: TASK-31
title: 'Native: Game viewport shifted to upper-left (camera/world positioning broken)'
status: To Do
assignee: []
created_date: '2026-02-15 04:57'
labels:
  - native
  - rendering
  - camera
  - bug
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On native iOS, games like Ball Sort render shifted to the upper-left corner instead of centered. The game content appears cropped/offset. Likely related to the camera setup being disabled (CameraController.setup_camera crashes due to typed property mismatch) or world coordinate initialization differing between web and native.
<!-- SECTION:DESCRIPTION:END -->
