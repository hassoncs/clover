# Standardized Godot ↔ JavaScript Event Bridge (Web + Native)

## TL;DR

Deliver a **single, standardized bidirectional message protocol** for Slopcade’s Godot engine and TypeScript frontends that:

- Preserves **async, ordered JS→Godot calls** (Promise-based “callbacks” semantics)
- Standardizes **Godot→JS events** via a typed, debuggable envelope
- Works on **Web (WASM + JavaScriptBridge)** and **Native (react-native-godot JSI + runOnGodotThread)**
- Enables incremental migration from today’s mix of direct callbacks + event queue + polling

**User direction (confirmed):** keep **GodotBridge as the “inbound” JS→Godot command surface**, and standardize/replace the ad-hoc Godot→JS side with a single **EventBridge** (“clean in/out construction”). Web and native must go through the **same system** (no divergence).

This plan proposes a **simple outbound EventBridge**: one unified *event envelope* + *router* for Godot→JS, while preserving existing GodotBridge methods for JS→Godot.

1) **Pub/Sub events** (fire-and-forget)
2) **Optional request/response** (correlation IDs) for a small set of cases like progress streams (e.g. `preloadTextures`) — *not* a general “RPC framework”.

### Simplicity guardrail (user preference)

This is all in-process; we **avoid building a heavy RPC system**. The bridge is:

- **Event-first**
- “Request/response” is just a **Promise + correlation ID** pattern used sparingly
- No extra networking concepts (no retries/circuit breakers/transport abstraction layers beyond web vs native)

### Oracle guidance (incorporated)

- Model “callbacks” semantics (Promise + ordering) as **request/response over the same envelope** only where needed (e.g. progress streams), while keeping existing GodotBridge methods as the canonical JS→Godot entrypoint.
- Prefer **queue + poll parity** across web and native for consistent ordering/tracing/backpressure; keep direct web callbacks only as a temporary compatibility adapter.
- Add **channels + drop/coalesce policies** so high-frequency state never blocks reliable RPC.
- Add a simple **hello/handshake** capability negotiation (protocol version + caps).

---

## Context (Repo facts)

### Today’s Godot→JS patterns (mixed)

- Direct JS callbacks stored in Godot and invoked via `JavaScriptObject.call("call", null, ...)` (web only)
  - Example: `godot_project/scripts/bridge/EventEmitter.gd` uses stored `_js_*_callback` objects and calls `.call("call", null, ...)`.
- Event queue fallback in Godot:
  - `godot_project/scripts/bridge/EventQueue.gd` stores `[{type, data}, ...]`, caps at `MAX_EVENT_QUEUE_SIZE = 100`, and `poll_events()` returns a JSON string.
- Native (React Native) cannot receive Godot→JS callbacks, so it polls:
  - `app/lib/godot/GodotBridge.native.ts` polls every 16ms, calls `GameBridge.poll_events()` via `runOnGodotThread`, parses JSON `QueuedEvent[]`, dispatches by `event.type`.

### Today’s JS→Godot async request/response already exists (web)

- `godot_project/scripts/bridge/QuerySystem.gd` implements `query(requestId, method, argsJson)` and responds by `JavaScriptBridge.eval("(window.parent||window)._godotQueryResolve(requestId, resultJson)")`.
- `app/lib/godot/query.ts` implements a resolver map keyed by `requestId` and returns `Promise<T>`.

### High-frequency path to protect

- Transform sync uses JSON stringify/parse on both sides (and can run ~60fps). See:
  - `godot_project/scripts/bridge/SyncSystem.gd` (tracked transforms; JSON stringify)
  - `docs/refactoring/transform-sync-protocol.md` (event-driven vs on-demand vs tracked)

---

## Recommended Architecture

### Goals

1) **One outbound event system** shared by web + native (same message format, same ordering semantics).
2) **Event-first**: pub/sub for gameplay and engine signals.
3) **Optional request/response semantics** (correlation IDs) for a small, explicit set of use-cases (progress/ack).
4) Keep **GodotBridge** as the inbound JS→Godot command layer (existing methods, already async-friendly where needed).

### Components

#### A) Bridge Core (shared concept across platforms)

- **Envelope**: versioned message format
- **Router**: dispatch by `topic`/`type`
- **RPC manager**: pending map + timeouts + cancellation token
- **Trace hooks**: capture all crossings with correlation IDs

#### B) Web Transport Adapter

- JS→Godot: keep using existing `GodotBridge.web.ts` methods (and existing `QuerySystem.gd` where already used).
- Godot→JS: **standardize on the same polling queue model as native** (EventQueue/poll_events) to avoid platform divergence.

#### C) Native Transport Adapter

- JS→Godot: use `runOnGodotThread` worklets and keep API **async**.
- Godot→JS: **poll_events** with a standardized queue item format (already in place).

### Architecture Diagram (text)

```
TypeScript                                   Godot
──────────                                   ─────

  EventBridge (TS)
    ├─ publish(topic, payload) ──────────────►  BridgeIn (GDScript)
    ├─ request(topic, payload) ──────────────►    ├─ routes to handlers
    │     (id, timeout)                        │    └─ emits response
    └─ subscribe(topic, handler) ◄────────────  BridgeOut (GDScript)
           ▲                                     ├─ emits events
           │                                     └─ emits progress
   Trace/Log sink

Web transport:
  - request(): QuerySystem.gd (requestId + argsJson) + _godotQueryResolve
  - events out: callback OR poll_events

Native transport:
  - request(): runOnGodotThread Promise
  - events out: poll_events every ~16ms
```

---

## Message Format Specification

### Envelope (v1)

All messages crossing the boundary MUST be JSON-serializable (for now), with a single canonical envelope.

```ts
type BridgeDirection = 'js->godot' | 'godot->js'
type BridgeKind = 'event' | 'request' | 'response' | 'progress'

type BridgeEnvelopeV1 = {
  v: 1
  kind: BridgeKind
  id: string               // required for request/response/progress; optional for event but recommended
  topic: string            // e.g. "physics/collision", "assets/preload", "sync/transforms"
  ts: number               // epoch ms
  seq?: number             // optional monotonic per-direction
  payload?: unknown
  error?: { code: string; message: string; data?: unknown }
  meta?: {
    dir: BridgeDirection
    platform: 'web' | 'native'
    traceId?: string
    parentId?: string
    channel?: 'realtime' | 'sync' | 'debug' | string
    priority?: 0 | 1 | 2 | 3
    dropped?: number       // for polling systems
  }
}

### Handshake / capability negotiation (keep minimal)

First round-trip after bridge init:

- JS → Godot request: `topic: "bridge/hello"`, payload includes `{ protocol: { min: 1, max: 1 }, platform, buildId }`
- Godot → JS response: `{ protocol: 1, caps: { batching: true, coalescing: true, priorities: true, batchMaxItems: N, ... } }`

Unknown fields MUST be ignored for forward compatibility.
```

### Event vs RPC semantics

- **event**: no response expected. `id` may be empty, but should be present for tracing.
- **request**: receiver must send either:
  - `response` with same `id`, or
  - `error` in `response` with same `id`
- **progress**: 0..N updates that share the request `id` and a `payload` describing progress state.

### Batching

Transport MAY batch by sending:

```ts
type BridgeBatchV1 = { v: 1; kind: 'batch'; ts: number; items: BridgeEnvelopeV1[] }

### Backpressure policy (channel-aware)

Define three default channels with explicit behavior (small and pragmatic):

- **reliable** (RPC + critical events): bounded queue; on overflow, fail fast (error response / `bridge/overloaded` event), never silently drop.
- **state** (high-frequency transforms/properties): coalesce per topic-defined key; last-write-wins; may drop intermediate updates.
- **debug** (verbose traces): best-effort; drop when behind.
```

Native polling already returns an array; this becomes the natural batch container.

### Channels / priorities

Default channels:
- `realtime`: high-frequency (transform sync); allow drop/coalesce
- `sync`: normal gameplay events
- `debug`: verbose tracing (can be disabled in prod)

Priority defaults:
- `realtime`: 3 (can drop)
- `sync`: 1
- `debug`: 0

---

## Interface Definitions

### TypeScript (public API)

```ts
type Unsubscribe = () => void

export type BridgeTopic = string

export interface EventBridge {
  publish<TPayload>(topic: BridgeTopic, payload: TPayload, opts?: { channel?: string; priority?: number }): void

  // request/response
  request<TReq, TRes>(topic: BridgeTopic, payload: TReq, opts?: { timeoutMs?: number; signal?: AbortSignal }): Promise<TRes>

  // progress stream (preloadTextures-like)
  requestWithProgress<TReq, TProgress, TRes>(
    topic: BridgeTopic,
    payload: TReq,
    onProgress: (p: TProgress) => void,
    opts?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<TRes>

  subscribe<TPayload>(topic: BridgeTopic, handler: (payload: TPayload, meta: BridgeEnvelopeV1) => void): Unsubscribe

  // debugging/observability
  setTracing(enabled: boolean, opts?: { sampleRate?: number; includePayloads?: boolean }): void
}
```

Type-safety strategy (recommended):
- Define a `BridgeTopics` map:
  - `topic -> { req?: ..., res?: ..., event?: ..., progress?: ... }`
- Generate strongly typed overloads from it.

### GDScript (public API)

```gdscript
# BridgeCore.gd (autoload or owned by GameBridge)

func emit_event(topic: String, payload: Variant, meta: Dictionary = {}) -> void

func handle_request(id: String, topic: String, payload: Variant, meta: Dictionary = {}) -> void
  # routes to registered handler

func send_response(id: String, topic: String, payload: Variant, meta: Dictionary = {}) -> void
func send_error(id: String, topic: String, code: String, message: String, data: Variant = null) -> void

func send_progress(id: String, topic: String, payload: Variant) -> void

func register_handler(topic: String, handler: Callable) -> void
func unregister_handler(topic: String) -> void
```

Transport specifics:
- Web: implement `emit_to_js(envelope_json)` via direct callback OR queue.
- Native: always queue via `EventQueue` and return from `poll_events()`.

---

## Examples (as required)

### 1) Simple event: collision occurred

Topic: `physics/collision`

Payload (typed on TS side via existing CollisionEvent types):
```json
{ "entityA": "ball", "entityB": "wall", "contacts": [{"point": {"x":0,"y":0},"normal": {"x":0,"y":1},"normalImpulse": 1.2,"tangentImpulse":0}] }
```

Envelope:
```json
{ "v":1, "kind":"event", "id":"e_...", "topic":"physics/collision", "ts": 1700000000000, "payload": { ... } }
```

### 2) Request/response + progress: preload textures

Topic: `assets/preload_textures`

Request payload:
```json
{ "urls": ["https://.../a.png", "https://.../b.png"] }
```

Progress payload:
```json
{ "percent": 40, "completed": 2, "failed": 1 }
```

Final response payload:
```json
{ "completed": 9, "failed": 1 }
```

### 3) High-frequency sync: entity transforms

Topic: `sync/transforms`

Batching policy:
- Prefer sending **one batch per poll/frame**
- Payload: `Record<entityId, transform>`
- Allow coalescing/dropping when behind (channel=`realtime`)

---

## Migration Plan (incremental, backward compatible)

### Phase 0 — Inventory and guardrails

1) Map all current bridge entry/exit points:
   - Godot→JS direct callbacks in `EventEmitter.gd`, `SyncSystem.gd`, `CollisionSystem.gd`.
   - Godot queued events in `EventQueue.gd` and `GameBridge.gd:poll_events()`.
   - Web async RPC in `QuerySystem.gd` + `app/lib/godot/query.ts`.
   - Native polling + dispatch in `GodotBridge.native.ts`.

2) Define perf guardrails:
   - No new per-entity/per-frame JSON stringify/parse beyond current baseline.
   - Keep transform sync bypass path if needed (see Phase 3).

### Phase 1 — Introduce the envelope + TS EventBridge wrapper (no behavior changes)

1) Add TS `EventBridge` implementation that can:
   - Wrap current `poll_events` native events into `BridgeEnvelopeV1` and dispatch.
   - Wrap current web callbacks/JSON payloads into `BridgeEnvelopeV1` and dispatch.
2) Add tracing hooks that log:
   - topic, id, kind, duration (for requests), and drop counts.

### Phase 2 — Standardize Godot→JS events through EventQueue everywhere

Goal: remove the fragile “store JS callback in Godot and invoke it” pattern for production gameplay.

1) Web: prefer queue/poll parity with native (optional to keep direct callback in debug builds).
2) Update emitters (EventEmitter, SyncSystem, CollisionSystem) to emit envelopes into EventQueue.
3) TS bridges (web + native) consume a single format: `BridgeBatchV1` / list of envelopes.

### Phase 3 — Standardize JS→Godot RPC under one API

We keep inbound as **GodotBridge methods** (per user preference). For the few places that need async correlation (like progress), we standardize on the envelope id and reuse existing patterns.

1) Web: keep using `QuerySystem.gd` + `app/lib/godot/query.ts` for request/response.
2) Native: keep using `runOnGodotThread` for request/response.
3) Unify *outbound* progress streams via queued `progress` envelopes keyed by `id`.

### Phase 4 — Deprecate old APIs and migrate call sites

Migrate features in this recommended order:
1) Query-style features (low rate): debug snapshot queries, raycasts, AABB
2) Asset preload (`preloadTextures`) to requestWithProgress
3) Gameplay events: collision, sensor, destroy, spawn, score
4) Transform sync: adopt transform-sync-protocol event-driven/tracked modes

Provide compatibility adapters so existing `GodotBridge.*` methods still work during migration.

---

## Risk Assessment

### Key risks

1) **Performance regression on transforms**
   - Mitigation: allow `channel=realtime` to coalesce/drop; preserve tracked mode; keep fallback “legacy full sync” flag if needed.

2) **Threading complexity on native**
   - Mitigation: enforce **async-only** JS→Godot cross-thread calls; never block JS thread.

3) **Protocol drift between platforms**
   - Mitigation: identical envelope parsing + topic routing; add parity tests.

4) **Migration stalls, dual systems linger**
   - Mitigation: define “done” criteria: all events use envelopes; direct JS callbacks removed (except optional debug);
     poll_events returns only envelopes.

5) **Queue overflow** (currently max 100 in `EventQueue.gd`)
   - Mitigation: define drop policy per channel; include `dropped` metrics in meta.

---

## Verification / Acceptance Criteria (for execution)

### Functional

- [ ] Web: collision event reaches TS subscribers via `EventBridge.subscribe('physics/collision')`.
- [ ] Native: collision event reaches TS subscribers via the same API.
- [ ] `request('assets/preload_textures')` resolves and progress callbacks fire.
- [ ] Request timeout produces a typed error with correlation id.

### Platform parity

- [ ] Same test scenario emits the same ordered topics on web + native (allowing platform-specific timing but not reordering within a batch).

### Performance

- [ ] Under target workload (define entity count), frame time does not regress compared to baseline when bridge tracing is off.

### Migration safety

- [ ] Existing code paths still work during Phase 1/2 (backward compatible).

---

## Open Decisions (must be answered before execution)

Defaults applied (override if needed):

1) **Transform sync scope**: OUT of scope beyond wrapping existing events/protocol; no major sync redesign in this bridge work.
2) **Web Godot→JS transport**: polling-only for parity with native.
3) **Backpressure**: reliable never silently drops; state coalesces; debug drops-first.
