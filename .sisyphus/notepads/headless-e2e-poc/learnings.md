# Headless E2E POC - Learnings

## HeadlessTestAdapter Implementation (2026-02-09)

### Architecture Decisions
- Adapter extends `Node` (not Node2D) since it has no visual presence
- HeadlessTestMain.gd is a separate script (mirrors Main.gd pattern) rather than inlining in the scene
- `_sanitize_for_json()` recursively converts Godot Variant types (Vector2, Color, Rect2, Transform2D, Node2D) to JSON-safe dictionaries before `JSON.stringify()`

### Key Patterns
- `DisplayServer.get_name() == "headless"` is the correct check for headless mode (not `OS.get_name()` which returns "macOS")
- `StreamPeerTCP.get_data()` returns `[error_code, PackedByteArray]` — must check `data[0]` for OK
- `StreamPeerTCP.poll()` must be called each frame to update connection status
- Buffer management: accumulate chunks, split on `\n`, keep remainder for next frame
- `native_dispatch(method, args_json)` expects args as a JSON array string, not raw Array

### Protocol
- Port: 9876
- Format: NDJSON (newline-delimited JSON)
- Meta-methods prefixed with `_`: `_ping`, `_quit`, `_query`
- `_query` routes through `GameBridge._query_system.dispatch()` for query handler testing
- All other methods route through `GameBridge.native_dispatch(method, args_json)`

### Scene Structure
- `HeadlessTest.tscn` has 3 nodes: HeadlessTestMain (root Node2D), GameRoot (Node2D child), HeadlessTestAdapter (Node child)
- Root script sets `GameBridge.game_root = $GameRoot` in `_ready()` — same as Main.gd
- Launch command: `godot --headless --path ./godot_project res://scenes/HeadlessTest.tscn`

### Gotchas
- `native_dispatch` returns `{"error": "unknown_method", "method": "..."}` for unknown methods — adapter checks for this and converts to error response
- Godot `JSON.stringify()` can't handle raw Godot types (Vector2, etc.) — must sanitize first
- `_quit` needs `client.poll()` after sending response to flush the TCP buffer before `get_tree().quit()`

## GodotHeadlessDriver Implementation (2026-02-09)

- Driver lives at `tests/e2e/bridge/GodotHeadlessDriver.ts` with types in `types.ts`
- Uses only Node.js built-ins: `net`, `child_process`, `path`, `events`, `url`
- NDJSON framing: buffer incoming TCP data, split on `\n`, parse each line
- Request correlation via monotonically increasing integer IDs stored in a `Map<number, PendingRequest>`
- TCP connect uses retry loop with 100ms interval until deadline (startTimeout)
- Race condition guard: checks if Godot process died before TCP connects
- `killGodot()` sends SIGTERM first, SIGKILL after 2s fallback
- `findRepoRoot()` uses `import.meta.url` → 4 levels up from `tests/e2e/bridge/`
- `findGodot()` replicates exact search order from `scripts/export-godot.mjs`
- The root tsconfig is a project-references-only config; these test files compile standalone with `--module ESNext --moduleResolution bundler`
