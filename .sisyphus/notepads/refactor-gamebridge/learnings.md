## Learnings
- Successfully moved physics, UI, and entity creation functions from GameBridge.gd to specialized modules.
- GameBridge.gd reduced from ~1600 lines to 1123 lines.
- EntityFactory now handles hierarchical entity creation (children).
- UIManager now handles UI button event routing.
- PhysicsController now handles velocity queries.

## Issues
- Frequent 'file modified since last read' errors due to multiple edits in a single session. Reading the file before each edit is necessary.

## Decisions
- Moved 'create_body' to EntityFactory as it is a factory method, even though it was not explicitly listed in the initial task. This helped reach the line count target.
- Moved sensor-related event routing to PhysicsController/UIManager as appropriate.
