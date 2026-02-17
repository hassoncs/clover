
## Layout Adapter
- Created `LayoutAdapter` interface to abstract layout resolution from `GameDefinition` entities.
- Implemented `createEntityLayoutAdapter` as the default adapter for entity-based screens.
- Integrated `LayoutAdapter` into `WireframeRenderer` to support future code-driven screens (party games).
- `LayoutZone` uses world coordinates (center X, center Y) to match the renderer's coordinate system.
