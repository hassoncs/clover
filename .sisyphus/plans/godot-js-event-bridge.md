# Godot ↔ JavaScript Bridge Cleanup

## TL;DR

A **minimal refactor** to clean up the Godot↔JS bridge by:

1. **Unifying message format** - One shape for all events: `{type, data, id?, error?, progress?}`
2. **Extracting shared dispatch logic** - Dedupe the ~2000 lines across web/native bridges
3. **Killing `_lastResult` hacks** - Proper request/response with correlation IDs
4. **Adding progress callbacks** - For `preloadTextures` and similar long-running ops
5. **Adaptive polling on native** - Back off when idle to reduce CPU waste

**What we're NOT doing** (deemed overengineered for our needs):
- ~~TransportAdapter interface~~ - We have exactly 2 transports, no abstraction needed
- ~~Protocol versioning/handshake~~ - Both sides ship together
- ~~Channels/priorities/backpressure~~ - EventQueue cap of 100 works fine
- ~~Complex envelope metadata~~ - `traceId`, `parentId`, `seq`, `dropped` etc. not needed

---

## Current Pain Points

| Problem | Location | Impact |
|---------|----------|--------|
| **Code duplication** | `GodotBridge.web.ts` (1200 lines), `GodotBridge.native.ts` (1000 lines) | Same dispatch logic written twice |
| **Inconsistent event shapes** | Various - some JSON-stringified, some direct args | Confusing, error-prone |
| **`_lastResult` hack** | `GodotBridge.web.ts:627`, `JointManager.gd:86` | Race conditions, `setTimeout(16)` waits |
| **Constant polling** | `GodotBridge.native.ts:359` - 16ms interval | Wastes CPU when idle |
| **No progress callbacks** | `preloadTextures` can't report progress | Poor UX for asset loading |

---

## Message Format

One simple shape for everything:

```typescript
// The ONLY message format we need
type BridgeMessage = {
  type: string;                              // Event type: "collision", "entity_spawned", etc.
  data?: unknown;                            // Payload
  id?: string;                               // For request/response correlation (optional)
  error?: { message: string; code?: string }; // For error responses
  progress?: { current: number; total?: number }; // For progress updates
};
```

**That's it.** No `v`, `kind`, `topic`, `ts`, `seq`, `meta`, `channel`, `priority`, `dropped`.

### GDScript equivalent

```gdscript
# All events use this shape
var message = {
  "type": "collision",
  "data": { "entityA": "ball", "entityB": "wall", "impulse": 5.2 }
}

# Request/response adds id
var response = {
  "type": "response",
  "id": "req_123",
  "data": { "result": 42 }
}

# Progress updates
var progress = {
  "type": "progress",
  "id": "req_123",
  "progress": { "current": 3, "total": 10 }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BridgeCore (shared TS)                  │
│  - dispatch(msg) → routes to registered handlers            │
│  - request(type, data, {onProgress?}) → Promise<result>     │
│  - emit(type, data) → fire-and-forget                       │
│  - pending requests map with timeouts                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
┌────────▼────────┐      ┌────────▼────────┐
│  Web Transport   │      │ Native Transport │
│  (thin wrapper)  │      │  (thin wrapper)  │
│                  │      │                  │
│ - Callbacks for  │      │ - Adaptive poll  │
│   Godot→JS       │      │   (backs off     │
│ - Direct calls   │      │    when idle)    │
│   for JS→Godot   │      │ - JSI worklets   │
└──────────────────┘      └──────────────────┘
```

**Key insight**: Web and native transports are thin (~100 lines each), not abstracted behind an interface. The shared logic lives in BridgeCore.

---

## Implementation Plan

### Phase 1: Extract BridgeCore (~0.5 day)

Create `app/lib/godot/BridgeCore.ts`:

```typescript
type MessageHandler = (data: unknown) => void;
type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: { current: number; total?: number }) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export class BridgeCore {
  private handlers = new Map<string, Set<MessageHandler>>();
  private pending = new Map<string, PendingRequest>();

  /** Dispatch incoming message to handlers */
  dispatch(msg: BridgeMessage): void {
    // Handle responses to pending requests
    if (msg.id && (msg.type === 'response' || msg.type === 'error')) {
      const req = this.pending.get(msg.id);
      if (req) {
        clearTimeout(req.timeout);
        this.pending.delete(msg.id);
        if (msg.error) {
          req.reject(new Error(msg.error.message));
        } else {
          req.resolve(msg.data);
        }
      }
      return;
    }

    // Handle progress updates
    if (msg.id && msg.progress) {
      const req = this.pending.get(msg.id);
      req?.onProgress?.(msg.progress);
      return;
    }

    // Dispatch to event handlers
    const handlers = this.handlers.get(msg.type);
    handlers?.forEach(h => h(msg.data));
  }

  /** Subscribe to events */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  /** Make a request with optional progress */
  request<T>(
    type: string,
    data: unknown,
    opts?: { timeoutMs?: number; onProgress?: (p: { current: number; total?: number }) => void }
  ): Promise<T> {
    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timeoutMs = opts?.timeoutMs ?? 5000;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${type}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, onProgress: opts?.onProgress, timeout });
      
      // Transport sends: { type, data, id }
      this.send({ type, data, id });
    });
  }

  /** Override in web/native transport */
  protected send(_msg: BridgeMessage): void {
    throw new Error('Transport must implement send()');
  }
}
```

### Phase 2: Migrate Web Bridge (~0.5 day)

Update `GodotBridge.web.ts` to use BridgeCore:

```typescript
class WebBridgeTransport extends BridgeCore {
  protected send(msg: BridgeMessage): void {
    // Use existing QuerySystem for requests
    if (msg.id) {
      getGodotBridge()?.query(msg.id, msg.type, JSON.stringify(msg.data ?? {}));
    } else {
      // Fire-and-forget calls use existing methods
      getGodotBridge()?.[msg.type]?.(msg.data);
    }
  }
}
```

- Remove duplicate event dispatch switch statements
- Remove `_lastResult` usage - all async results go through request/response
- Keep existing `godotBridge.onCollision()` etc. callbacks working (they feed into `dispatch()`)

### Phase 3: Migrate Native Bridge (~0.5 day)

Update `GodotBridge.native.ts`:

```typescript
class NativeBridgeTransport extends BridgeCore {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private consecutiveEmpty = 0;

  startPolling(): void {
    this.poll();
  }

  private async poll(): Promise<void> {
    const events = await this.fetchEvents();
    
    if (events.length === 0) {
      this.consecutiveEmpty++;
      // Back off: 16ms → 33ms → 66ms → 100ms max
      const delay = Math.min(16 * Math.pow(2, this.consecutiveEmpty), 100);
      setTimeout(() => this.poll(), delay);
    } else {
      this.consecutiveEmpty = 0;
      events.forEach(e => this.dispatch(e));
      setTimeout(() => this.poll(), 16); // Back to 16ms when active
    }
  }

  protected send(msg: BridgeMessage): void {
    runOnGodotThread(() => {
      'worklet';
      const bridge = getGameBridge();
      if (msg.id) {
        bridge?.handle_request(msg.id, msg.type, JSON.stringify(msg.data ?? {}));
      } else {
        bridge?.[msg.type]?.(msg.data);
      }
    });
  }
}
```

### Phase 4: Update Godot Side (~0.5 day)

Simplify `BridgeCore.gd` to use the minimal message format:

```gdscript
func emit_event(type: String, data: Variant) -> void:
    var msg = {"type": type, "data": data}
    _queue_event(msg)

func send_response(id: String, result: Variant) -> void:
    var msg = {"type": "response", "id": id, "data": result}
    _send_to_js(msg)

func send_error(id: String, message: String, code: String = "") -> void:
    var msg = {"type": "error", "id": id, "error": {"message": message, "code": code}}
    _send_to_js(msg)

func send_progress(id: String, current: int, total: int = -1) -> void:
    var progress = {"current": current}
    if total >= 0:
        progress["total"] = total
    var msg = {"type": "progress", "id": id, "progress": progress}
    _send_to_js(msg)
```

### Phase 5: Add Progress to Preload (~0.5 day)

Update `preloadTextures` to report progress:

```gdscript
# TexturePreloader.gd
func preload_textures(request_id: String, urls: Array) -> void:
    var total = urls.size()
    var completed = 0
    
    for url in urls:
        # ... load texture ...
        completed += 1
        _bridge_core.send_progress(request_id, completed, total)
    
    _bridge_core.send_response(request_id, {"completed": completed})
```

TypeScript usage:

```typescript
const result = await bridge.request('preload_textures', { urls }, {
  onProgress: (p) => console.log(`${p.current}/${p.total} loaded`)
});
```

---

## What to Delete

After migration, remove:

| File/Code | Reason |
|-----------|--------|
| `app/lib/godot/EventBridge.ts` | Overengineered types |
| `app/lib/godot/EventBridgeImpl.ts` | Overengineered implementation |
| `_lastResult` patterns | Replaced by request/response |
| `setTimeout(16)` waits | No longer needed |
| Duplicate dispatch switches | Consolidated in BridgeCore |

---

## Verification

> **Validated 2026-02-03**: Partial completion. BridgeCore exists, progress callbacks work, adaptive polling implemented. `_lastResult` still present in web bridge.

- [x] Collision events work on web (uses BridgeCore.dispatch)
- [x] Collision events work on native (uses BridgeCore.dispatch)
- [x] `preloadTextures` reports progress (web: lines 852-884, native: lines 1062-1098)
- [x] Request timeout produces error (BridgeCore.ts:103-106)
- [x] Native CPU usage lower when idle (adaptive polling: 16ms → 100ms backoff)
- [ ] No `_lastResult` usage remains — **PARTIAL**: Still in web bridge (lines 48, 656, 1029, 1093) and GDScript (JSBridge.gd:74, 78)
- [ ] Code size reduced (target: ~500 lines removed) — **NOT MET**: BridgeCore adds 144 lines shared, but web (1247) and native (1270) remain large

---

## Effort Estimate

| Phase | Effort |
|-------|--------|
| Extract BridgeCore | 0.5 day |
| Migrate Web | 0.5 day |
| Migrate Native + adaptive poll | 0.5 day |
| Update Godot side | 0.5 day |
| Add progress to preload | 0.5 day |
| **Total** | **~2.5 days** |

---

## Future Escalation Triggers

Only add complexity back if:

- **Third transport added** (desktop, server relay, editor) - then consider abstraction
- **Independent versioning** (Godot/JS ship separately) - then add protocol version
- **Real QoS needs** (guaranteed delivery, replay) - then add channels/priorities

Until then, keep it simple.
