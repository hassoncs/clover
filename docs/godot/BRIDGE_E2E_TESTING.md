# Godot WASM ↔ TypeScript Bridge: E2E Testing Strategy

**Date:** 2026-02-09
**Scope:** Web-only, Node-only, no browser/Playwright
**Status:** Research Proposal

---

## Problem Statement

The Godot ↔ TypeScript bridge has **129 registered methods** across 14 categories (see `.sisyphus/evidence/bridge-contract-baseline.md`). Currently, bridge testing relies on:

1. **TypeScript-only unit tests** with mock bridges (`app/lib/godot/__tests__/mock-godot-bridge.ts`) — exercises TS logic but never touches real Godot WASM
2. **Manual Playwright/browser testing** via `game-inspector` MCP — exercises real bridge but requires a browser runtime
3. **Type-level contract tests** (`effects-bridge.test.ts`) — ensures interface compliance at compile time

**Gap:** No automated test exercises the full TS → WASM → GDScript → WASM → TS round-trip without a browser.

---

## Architecture Context

```
TypeScript (GodotBridge.web.ts)
    ↓ window.GodotBridge.methodName(args)
Godot WASM Glue (index.js - Emscripten)
    ↓ JavaScriptBridge callbacks
GDScript (GameBridge.gd)
    ↓ _method_map / _setup_js_bridge dispatch
Module handlers (PhysicsController, EntityManager, etc.)
```

### Critical Constraint: Godot's Emscripten Output

The Godot web export (`godot_project/export/web/index.js`) is compiled by Emscripten with **web-only environment targeting**:

```javascript
var ENVIRONMENT_IS_WEB = typeof window == "object";
var ENVIRONMENT_IS_NODE = typeof process == "object" && process.versions?.node;
// ...
if (ENVIRONMENT_IS_SHELL) {
  throw new Error("not compiled for this environment");
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  // OK - proceeds with fetch, canvas, WebGL, etc.
} else {
  throw new Error("environment detection error");
}
```

This means **the standard Godot WASM binary cannot load in plain Node.js**. It requires:
- `window` object (for environment detection)
- `document.createElement('canvas')` (for WebGL context)
- `WebGL2RenderingContext` (for rendering)
- `fetch` API (for loading `.pck` files)
- `AudioContext` (for audio worklets)
- Various other Web APIs

---

## Approach 1: Node.js + WASM with DOM Shims (happy-dom / jsdom)

### Concept

Use a DOM simulation library (`happy-dom` or `jsdom`) to provide the minimum Web API surface that Godot's Emscripten glue requires, then load the WASM in Node.js.

### How It Would Work

```typescript
// test-harness.ts
import { Window } from 'happy-dom';

// Create simulated browser environment
const window = new Window({ url: 'http://localhost:8085' });
globalThis.window = window;
globalThis.document = window.document;
globalThis.fetch = window.fetch;

// Stub WebGL (no real rendering needed for bridge testing)
const mockCanvas = document.createElement('canvas');
mockCanvas.getContext = (type: string) => {
  if (type === 'webgl2' || type === 'webgl') {
    return createWebGLStub(); // Return mock WebGL context
  }
  return null;
};

// Load Godot WASM
const Godot = require('./godot_project/export/web/index.js');
const engine = await Godot({
  locateFile: (path: string) => `./godot_project/export/web/${path}`,
  canvas: mockCanvas,
  // ... other Module overrides
});

// Now invoke bridge methods
window.GodotBridge.spawnEntity('box', 0, 0, 'test-1', '{}');
```

### Feasibility Assessment

| Factor | Assessment |
|--------|-----------|
| **Environment detection** | ✅ `happy-dom` provides `window`, passes `ENVIRONMENT_IS_WEB` check |
| **fetch API** | ✅ Node 18+ has native `fetch`; happy-dom provides it too |
| **Canvas/WebGL** | ❌ **BLOCKER** — Godot requires a real WebGL2 context for initialization. Neither happy-dom nor jsdom provide WebGL. Would need `headless-gl` (node-gl) or similar, which is fragile and often fails to compile |
| **Audio APIs** | ⚠️ Requires AudioContext stub — doable but adds mock surface |
| **SharedArrayBuffer** | ⚠️ May need `--experimental-vm-modules` and cross-origin flags |
| **WASM loading** | ✅ Node.js has full WebAssembly support |

### Pros

- **Closest to real web code path** — exercises the actual Emscripten glue and WASM binary
- **Runs in Node.js** — fits existing CI (GitHub Actions, no special runners)
- **Familiar tooling** — Vitest/Jest, TypeScript, npm packages
- **Reuses existing web export** — no custom Godot build needed

### Cons

- **WebGL is a hard blocker** — Godot's initialization requires a real WebGL context, not just a stub. The engine checks for specific WebGL extensions and creates framebuffers during init. `headless-gl` exists but is unmaintained, platform-specific, and breaks frequently
- **Massive mock surface** — Even with happy-dom, the number of Web APIs to stub is enormous (ResizeObserver, IntersectionObserver, AudioContext, requestAnimationFrame, etc.)
- **Fragile** — Any Godot update could add new Web API dependencies, breaking the shim layer
- **Incomplete physics** — Even if WASM loads, Godot needs its render loop ticking to process physics frames; a headless WASM without rendering would need careful frame-stepping

### Setup Complexity: **HIGH**
### Maintenance Burden: **HIGH** — each Godot upgrade risks breaking shims
### CI Integration: **MEDIUM** — Node.js native, but `headless-gl` requires system deps
### Real Code Path Coverage: **HIGH** (if it works) — exercises actual WASM binary

### Verdict: ❌ Not recommended

The WebGL dependency is a fundamental blocker. Godot's Emscripten initialization performs real WebGL calls that cannot be trivially stubbed. The effort to maintain a working WebGL shim in Node.js would be disproportionate to the value gained.

---

## Approach 2: Deno + WASM with Web API Polyfills

### Concept

Deno provides native Web APIs (`fetch`, `WebSocket`, etc.) and first-class WASM support. It's closer to a browser runtime than Node.js, potentially reducing the shim surface.

### How It Would Work

```typescript
// test-harness.ts (Deno)
// Deno already has: fetch, WebSocket, crypto, etc.
// Still need: window, document, canvas, WebGL

// Create minimal DOM shim
const document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') return createCanvasShim();
    return {};
  },
  // ... minimal stubs
};
(globalThis as any).document = document;

// Load Godot WASM
const wasmBytes = await Deno.readFile('./godot_project/export/web/index.wasm');
const module = await WebAssembly.compile(wasmBytes);
// ... instantiate with Godot's glue JS
```

### Feasibility Assessment

| Factor | Assessment |
|--------|-----------|
| **Web APIs** | ✅ Deno has native `fetch`, `Response`, `Request`, `URL`, `TextEncoder/Decoder`, `crypto` |
| **Canvas/WebGL** | ❌ **Same blocker as Node.js** — Deno has no DOM, no Canvas, no WebGL |
| **Environment detection** | ⚠️ Deno doesn't have `window` as a global by default (needs `--unstable` or polyfill) |
| **Emscripten glue** | ❌ Godot's glue JS is designed for web/worker, not Deno. Would need patching |
| **WASM support** | ✅ Excellent — first-class `.wasm` imports |
| **AudioContext** | ❌ Not available in Deno |

### Pros

- **Better built-in Web APIs** than Node.js — fewer polyfills needed for fetch, streams, etc.
- **Security model** — explicit permissions align well with CI
- **Native WASM imports** — cleaner WASM loading
- **Faster startup** — Deno is generally faster for script execution

### Cons

- **Same WebGL blocker** — Deno doesn't provide Canvas or WebGL; the fundamental problem remains
- **Ecosystem mismatch** — This is a Node.js/pnpm project; adding Deno creates toolchain fragmentation
- **Emscripten glue incompatibility** — Godot's generated JS assumes browser or worker environment; Deno is neither
- **No existing Deno integration** — Would need separate test infrastructure, CI steps, deps

### Setup Complexity: **HIGH**
### Maintenance Burden: **HIGH** — dual runtime + same WebGL problem
### CI Integration: **LOW** — requires installing Deno in CI, separate test pipeline
### Real Code Path Coverage: **HIGH** (if it works) — same WASM binary

### Verdict: ❌ Not recommended

Deno reduces the polyfill surface slightly vs Node.js but hits the exact same WebGL wall. The added cost of maintaining a second runtime in CI/tooling isn't justified when the core blocker is identical.

---

## Approach 3: Godot Headless + IPC (Recommended)

### Concept

Run Godot in headless mode (`--headless`) as a native binary with the same GDScript bridge code. Communicate from a Node.js test process via stdin/stdout JSON-RPC or a local WebSocket/TCP connection. This tests the **real GDScript bridge dispatch** without WASM at all.

### How It Would Work

```
┌──────────────────┐     stdin/stdout JSON     ┌───────────────────────┐
│  Node.js Test     │ ◄──────────────────────► │  Godot --headless     │
│  (Vitest)         │     or WebSocket          │  (GameBridge.gd)      │
│                   │                           │  + IPC adapter        │
│  - Send commands  │                           │  - Receive & dispatch │
│  - Assert results │                           │  - Return results     │
└──────────────────┘                           └───────────────────────┘
```

#### Step 1: Add a thin IPC adapter to Godot

```gdscript
# scripts/testing/HeadlessTestAdapter.gd
extends Node

func _ready():
    # Read JSON commands from stdin, dispatch through GameBridge
    var stdin = FileAccess.open("user://stdin", FileAccess.READ)
    # OR use TCP server on localhost:9999
    var server = TCPServer.new()
    server.listen(9999)

func _process_command(json_str: String) -> String:
    var cmd = JSON.parse_string(json_str)
    var method = cmd.get("method", "")
    var args = cmd.get("args", [])
    # Route through existing dispatch
    var result = GameBridge._method_map[method].callv(args)
    return JSON.stringify({"id": cmd.id, "result": result})
```

#### Step 2: Node.js test driver

```typescript
// tests/e2e/bridge-headless.test.ts
import { spawn } from 'child_process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

let godot: ChildProcess;
let rpc: JsonRpcClient;

beforeAll(async () => {
  godot = spawn('godot', [
    '--headless',
    '--path', './godot_project',
    '--main-pack', './godot_project/export/web/index.pck',
    // Load scene that initializes GameBridge + test adapter
  ]);
  rpc = new JsonRpcClient(godot.stdin, godot.stdout);
  await rpc.waitReady();
});

afterAll(() => godot.kill());

it('spawns an entity and retrieves its transform', async () => {
  await rpc.call('load_game_json', [sampleGameJson]);
  await rpc.call('spawn_entity', ['box', 0, 0, 'test-entity', '{}']);
  const transform = await rpc.call('get_entity_transform', ['test-entity']);
  expect(transform).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
});

it('applies impulse and detects velocity change', async () => {
  await rpc.call('apply_impulse', ['test-entity', 10, 0]);
  // Step physics a few frames
  await rpc.call('step', [{ frames: 10 }]);
  const vel = await rpc.call('get_linear_velocity', ['test-entity']);
  expect(vel.x).toBeGreaterThan(0);
});
```

### Feasibility Assessment

| Factor | Assessment |
|--------|-----------|
| **Godot headless** | ✅ Godot 4 natively supports `--headless` mode; no GPU needed |
| **GDScript execution** | ✅ Full GDScript runtime including physics, entity management, bridge dispatch |
| **Physics** | ✅ Rapier physics runs in headless mode (no WebGL dependency) |
| **Bridge dispatch** | ✅ Same `_method_map` and convention-based dispatch as web/native |
| **IPC** | ✅ Multiple options: stdin/stdout, TCP, or even OS-level pipes |
| **CI** | ✅ Godot headless binaries available for Linux/macOS; can download in CI |
| **Node.js test runner** | ✅ Standard Vitest; no special packages needed |

### Pros

- **Real Godot runtime** — exercises actual GDScript code, physics engine (Rapier), entity management
- **No WebGL dependency** — headless mode uses `Dummy` display server
- **Tests the dispatch contract** — same `_method_map` routing that web/native use
- **Standard CI** — just install Godot binary + run tests
- **Stable** — Godot headless is officially supported and used for dedicated servers
- **Fast** — headless startup is sub-second; no rendering overhead
- **Covers 90%+ of bridge surface** — lifecycle, entity, physics, transforms, joints, queries all work headless

### Cons

- **Not testing actual WASM binary** — tests GDScript dispatch, not the Emscripten WASM compilation output
- **Doesn't test JS↔WASM glue** — the Emscripten-generated callback layer is bypassed
- **Requires Godot binary in CI** — need to download/install Godot for the runner OS (~50MB)
- **IPC adapter needed** — requires a small GDScript adapter (stdin/stdout or TCP JSON-RPC)
- **Rendering effects untestable** — shaders, visual effects, canvas operations can't be verified

### Setup Complexity: **LOW-MEDIUM**
### Maintenance Burden: **LOW** — thin IPC adapter; Godot updates rarely break headless
### CI Integration: **MEDIUM** — need Godot binary in CI runner (available via GitHub Actions)
### Real Code Path Coverage: **MEDIUM-HIGH** — real GDScript + physics, but not WASM glue

### Verdict: ✅ Recommended

---

## Bonus: Approach 3b — Godot Headless + WebSocket (Enhanced Variant)

A refinement of Approach 3 using WebSocket instead of stdin/stdout, which makes the protocol closer to how the real web bridge communicates:

```gdscript
# scripts/testing/WebSocketTestServer.gd
extends Node

var _server: WebSocketMultiplayerPeer
var _game_bridge: Node  # Reference to GameBridge autoload

func _ready():
    _server = WebSocketMultiplayerPeer.new()
    _server.create_server(9876)
    _game_bridge = get_node("/root/GameBridge")

func _process(delta):
    _server.poll()
    while _server.get_available_packet_count() > 0:
        var packet = _server.get_packet().get_string_from_utf8()
        var response = _dispatch(packet)
        _server.put_packet(response.to_utf8_buffer())

func _dispatch(json_str: String) -> String:
    var cmd = JSON.parse_string(json_str)
    # Use existing dispatch infrastructure
    var result = _game_bridge.dispatch_method(cmd.method, cmd.args)
    return JSON.stringify({"id": cmd.id, "result": result})
```

Node.js side uses `ws` package — lightweight, well-maintained, no special deps.

---

## Comparison Matrix

| Criteria | Node + WASM | Deno + WASM | Godot Headless + IPC |
|----------|-------------|-------------|---------------------|
| **Setup Complexity** | High | High | Low-Medium |
| **Maintenance Burden** | High | High | Low |
| **CI Integration** | Medium | Low | Medium |
| **Real Code Paths** | High (if feasible) | High (if feasible) | Medium-High |
| **WebGL Dependency** | ❌ Blocker | ❌ Blocker | ✅ None |
| **Tests WASM Binary** | ✅ Yes | ✅ Yes | ❌ No |
| **Tests GDScript Dispatch** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Tests Physics** | ⚠️ Needs render loop | ⚠️ Needs render loop | ✅ Native |
| **Feasible Today** | ❌ No | ❌ No | ✅ Yes |
| **Toolchain Alignment** | ✅ Node/pnpm | ❌ New runtime | ✅ Node/pnpm |

---

## Recommendation

### Primary: Approach 3 — Godot Headless + IPC

This is the only approach that is **feasible today** without solving the WebGL-in-Node problem. It covers the highest-value test surface: GDScript bridge dispatch, physics simulation, entity management, and query operations.

### Minimal POC Outline

#### Phase 1: IPC Adapter (1-2 days)

1. Create `godot_project/scripts/testing/HeadlessTestAdapter.gd`:
   - TCP server on configurable port (default: 9876)
   - JSON-RPC protocol: `{"id": 1, "method": "spawn_entity", "args": [...]}`
   - Response: `{"id": 1, "result": {...}}` or `{"id": 1, "error": "..."}`
   - Route through existing `GameBridge` dispatch (convention-based or `_method_map`)

2. Create `godot_project/scenes/HeadlessTest.tscn`:
   - Minimal scene: `Main` + `GameBridge` autoload + `HeadlessTestAdapter`
   - No rendering nodes

3. Update `export_presets.cfg` or add a `--script` flag to load the adapter

#### Phase 2: Node.js Test Driver (1 day)

1. Create `tests/e2e/bridge/` directory
2. Implement `GodotHeadlessDriver.ts`:
   - Spawns `godot --headless --path ./godot_project`
   - Connects via TCP/WebSocket
   - Exposes `call(method, args): Promise<Result>`
   - Handles timeout, cleanup, process lifecycle

3. Write initial test suite covering:
   - Lifecycle: `load_game_json`, `clear_game`
   - Entity: `spawn_entity`, `destroy_entity`, `get_entity_transform`
   - Physics: `apply_impulse`, `get_linear_velocity`, `step`
   - Queries: `query_point`, `raycast`

#### Phase 3: CI Integration (0.5 days)

1. Add Godot binary download step to GitHub Actions:
   ```yaml
   - name: Install Godot
     uses: chickensoft-games/setup-godot@v2
     with:
       version: 4.3.0
       use-dotnet: false
   ```

2. Run headless bridge tests as part of `pnpm test`:
   ```yaml
   - name: Bridge E2E Tests
     run: pnpm test:bridge-e2e
   ```

### What This Covers

From the **129 total bridge methods**, headless testing can cover:

| Category | Methods | Headless Testable | Notes |
|----------|---------|-------------------|-------|
| Lifecycle | 6 | ✅ 6/6 | `load_game_json`, `clear_game`, etc. |
| Entity | 8 | ✅ 8/8 | Spawn, destroy, transform |
| Transform | 4 | ✅ 4/4 | Set position/rotation/scale |
| Physics | 7 | ✅ 7/7 | Velocity, impulse, force |
| Sync | 6 | ✅ 6/6 | Transform sync, properties |
| Joints | 9 | ✅ 9/9 | All joint types |
| Queries | 4 | ✅ 4/4 | Point, AABB, raycast |
| Input/Events | 5 | ✅ 5/5 | Collision, sensor events |
| Camera | 5 | ✅ 5/5 | Target, position, zoom |
| Visual | 10 | ⚠️ 4/10 | Debug settings work; image/texture ops need stubs |
| UI | 7 | ⚠️ 3/7 | Button creation works; themed components need stubs |
| 3D Viewport | 8 | ❌ 0/8 | Requires 3D rendering |
| Pixel Buffer | 4 | ❌ 0/4 | Requires rendering |
| Debug/Inspector | 41 | ✅ 35/41 | Most query handlers work headless |

**Estimated coverage: ~75% of bridge methods** (96 of 129), covering all the high-value physics and game logic paths.

### What This Doesn't Cover

- **Emscripten WASM glue layer** — the JS↔WASM marshalling
- **Web-specific callback registration** — `_setup_js_bridge()` web aliases
- **Rendering operations** — shaders, textures, 3D viewport, pixel buffers
- **Audio** — sound playback

These gaps are acceptable because:
1. The WASM glue is Emscripten-generated and rarely has bugs in the marshalling
2. Web callback registration is tested via the existing type-level contract tests
3. Rendering is inherently visual and better tested via screenshot comparison (Playwright)

---

## Future Considerations

### Re-evaluating Node.js + WASM (When Feasible)

If any of these changes occur, revisit Approach 1:

1. **Godot adds `--headless` to web export** — if Godot can be compiled with `ENVIRONMENT=node` support
2. **`headless-gl` becomes reliable** — if a maintained, cross-platform WebGL implementation for Node.js emerges
3. **Godot decouples rendering from bridge init** — if bridge dispatch can initialize without WebGL context

### Custom Emscripten Build

A more ambitious option: rebuild Godot for web with `ENVIRONMENT=web,node` in the Emscripten settings, allowing the WASM to load in Node.js with rendering disabled. This requires:
- Custom Godot build pipeline
- Maintaining a fork/patch for the web export template
- High effort, but would unlock true WASM-level E2E testing in Node.js
