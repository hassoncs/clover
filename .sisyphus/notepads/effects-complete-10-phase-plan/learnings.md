# Effects System Execution Notepad

## Conventions
- Godot: Use `:=` for typed locals, `var` for untyped
- GDScript: Always clean up with `remove_child()` before `queue_free()`
- Normalized coords: width relative to viewport HEIGHT (not width)
- Draw containers: Always create as children of viewports

## Decisions

## Issues

## Completed Tasks

### Phase 1 Complete (2026-02-09)
All 7 Phase 1 tasks completed successfully:

1. ✅ **Task 1**: PingPongManager Draw Containers - Added Node2D draw containers to viewports
2. ✅ **Task 2**: GraphExecutor Frame Cleanup - Clear draw containers after swap
3. ✅ **Task 3**: PixelBufferManager Normalized Coords - Added normalized coordinate API
4. ✅ **Task 4**: GameBridgeEffects Draw Routing - Route draws based on graph state
5. ✅ **Task 5**: Bake-on-Stop Cleanup + Debounce Guard - Clear containers before bake, frame counter
6. ✅ **Task 6**: TypeScript Bridge + Paint Example - Updated bridge and paint example
7. ✅ **Task 7**: End-to-End Verification - All 8 scenarios passed

**Critical Bug Fixed**: GDScript type inference in PixelBufferManager.gd line 144
```gdscript
# Failed (type inference)
var pixel_cmd := cmd.duplicate()
# Fixed (explicit type)
var pixel_cmd: Dictionary = cmd.duplicate()
```

## Phase 1 Task 3: Normalized Coordinate Support

Added `draw_commands_normalized()` to PixelBufferManager.gd:
- Accepts same command format as `draw_commands()` but with normalized (0-1) coordinates
- Converts normalized to pixels: `x = normalized_x * image_width`, `y = normalized_y * image_height`
- Width normalization uses image HEIGHT (not width) per convention
- JS bridge wrapper `_js_draw_commands_normalized()` added for JavaScript integration
- Existing `draw_commands()` unchanged for backwards compatibility

Implementation pattern:
- Duplicate command dictionary before modifying
- Convert coordinates per command type (pixel, line, fill)
- Reuse existing `_draw_pixel()`, `_draw_line()`, `_draw_fill()` helpers

## Phase 1 Task 1: Draw Container Support in PingPongManager

### Implementation Details
- Added `draw_container_a` and `draw_container_b` as Node2D children of viewports in `initialize()`
- Stored draw containers in entry dictionary for lifecycle management
- Implemented coordinate helpers:
  - `_normalized_to_viewport()`: Converts UV [0,1] to viewport pixel coords
  - `_normalized_width_to_pixels()`: Width relative to viewport HEIGHT (not width)
  - `_parse_flat_points()`: Converts flat array [x1,y1,x2,y2,...] to PackedVector2Array
- Public API methods:
  - `add_stroke()`: Creates Line2D with rounded caps/joints in write viewport's draw container
  - `add_stamp()`: Creates Sprite2D for textured stamps
  - `clear_draw_container()`: Properly removes children with `remove_child()` before `queue_free()`
  - `get_draw_container()`: Returns write viewport's draw container
- Updated `_release_entry()` to clean up draw containers before viewports

### Key Patterns
- Always use `remove_child()` before `queue_free()` for proper cleanup
- Width normalization uses viewport HEIGHT to maintain aspect ratio consistency
- Draw containers are children of viewports, not the host node
- Write viewport determined by `write_index` (0 or 1) maps to container_a or container_b

