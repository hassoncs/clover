# Godot↔JS Event Bridge Inventory

**Created**: 2026-02-01  
**Updated**: 2026-02-01 (BridgeCore implementation)

---

## 1. BridgeCore.gd Implementation

### 1.1 BridgeEnvelopeV1 Structure

**Location**: `/Users/hassoncs/Workspaces/Personal/slopcade/godot_project/scripts/bridge/BridgeCore.gd`

**Structure**:
```gdscript
{
  "kind": "event" | "request" | "response" | "progress",
  "topic": String,
  "payload": Variant,
  "meta": {
    "channel": String,
    "priority": int,
    "timestamp": float
  }
}
```

### 1.2 BridgeKind Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `KIND_EVENT` | `"event"` | Fire-and-forget events |
| `KIND_REQUEST` | `"request"` | Request with response expected |
| `KIND_RESPONSE` | `"response"` | Response to a request |
| `KIND_PROGRESS` | `"progress"` | Progress update for long operations |

### 1.3 Channel Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `CHANNEL_DEFAULT` | `"default"` | General events |
| `CHANNEL_PHYSICS` | `"physics"` | Collision, sensor events |
| `CHANNEL_INPUT` | `"input"` | User input events |
| `CHANNEL_SYNC` | `"sync"` | Transform/property sync |
| `CHANNEL_QUERY` | `"query"` | Query system communication |

### 1.4 Priority Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `PRIORITY_LOW` | 0 | Background sync operations |
| `PRIORITY_NORMAL` | 1 | Standard events |
| `PRIORITY_HIGH` | 2 | Input, collisions |
| `PRIORITY_CRITICAL` | 3 | Urgent responses |

---

## 2. Implementation Decisions

### 2.1 EventQueue Integration

- BridgeCore accepts optional EventQueue instance in constructor
- Creates internal EventQueue if none provided
- Wraps EventQueue methods: `queue_event()`, `poll_events()`, `clear()`
- Fallback: when JS callback not available, events queued to EventQueue

### 2.2 Handler Registration System

**Pattern** (from QuerySystem.gd):
```gdscript
func register_handler(topic: String, callback: Callable) -> void:
    _handlers[topic] = callback

func unregister_handler(topic: String) -> void:
    _handlers.erase(topic)

func has_handler(topic: String) -> bool:
    return _handlers.has(topic)
```

### 2.3 Request Routing

**Flow**:
1. JS sends envelope with `kind: "request"`
2. `_on_js_bridge_event()` receives JSON string
3. Parse envelope, extract topic and args
4. Route to registered handler via `handle_request_async()`
5. Handler processes request
6. Response sent via `send_response()` or `send_error()`

### 2.4 Dual Path Support

**Web (Direct Callback)**:
- JS callback registered via `setup_js_bridge()`
- Events sent directly: `_js_callback.call("call", null, json_str)`
- Envelope serialized with `JSON.stringify()`

**Native (Event Queue)**:
- Events queued to EventQueue
- JS polls via `poll_events()`
- Returns JSON string of all queued envelopes

---

## 3. Key Methods

### 3.1 Event Emission

```gdscript
func emit_event(topic: String, payload: Variant, channel: String = "", priority: int = -1) -> void
func emit_collision(entity_a: String, entity_b: String, impulse: float) -> void
func emit_entity_spawned(entity_id: String, snapshot: Dictionary) -> void
func emit_input_event(input_type: String, x: float, y: float, entity_id: Variant = null) -> void
func emit_transform_sync(entity_id: String, transform_data: Dictionary) -> void
```

### 3.2 Request/Response

```gdscript
func handle_request(request_id: String, topic: String, args: Array) -> void
func handle_request_async(request_id: String, topic: String, args: Array) -> void
func send_response(request_id: String, topic: String, result: Variant) -> void
func send_error(request_id: String, topic: String, error_message: String) -> void
func send_progress(request_id: String, topic: String, progress: float, message: String = "") -> void
```

### 3.3 Handler Management

```gdscript
func register_handler(topic: String, callback: Callable) -> void
func unregister_handler(topic: String) -> void
func has_handler(topic: String) -> bool
func get_handler(topic: String) -> Callable
```

### 3.4 Queue Integration

```gdscript
func queue_event(event_type: String, data: Dictionary) -> void
func poll_events() -> String
func clear_events() -> void
```

---

## 4. Usage Example

```gdscript
var bridge = BridgeCore.new()

# Register handler
bridge.register_handler("step", func(args): 
    bridge.send_progress("req1", "step", 0.5, "Processing...")
    return game.step(args[0])
)

# Emit event
bridge.emit_collision("entity_a", "entity_b", 10.0)

# Poll events (native path)
var events_json = bridge.poll_events()
```

---

## 5. Compatibility Notes

### 5.1 Existing Systems Integration

- **EventQueue**: Wrapped, maintains existing API
- **QuerySystem**: Handler pattern replicated, can coexist
- **EventEmitter**: Events can use BridgeCore instead of direct callbacks

### 5.2 Migration Path

1. Create BridgeCore instance alongside existing systems
2. Register handlers for topics that need routing
3. Emit events via BridgeCore for new features
4. Existing EventQueue/EventEmitter code continues working
5. Gradually migrate handlers to BridgeCore

---

## 6. Files Reference

### Godot Side
- `/Users/hassoncs/Workspaces/Personal/slopcade/godot_project/scripts/bridge/BridgeCore.gd` - **NEW** Unified bridge core
- `/Users/hassoncs/Workspaces/Personal/slopcade/godot_project/scripts/bridge/EventQueue.gd` - Queue infrastructure
- `/Users/hassoncs/Workspaces/Personal/slopcade/godot_project/scripts/bridge/QuerySystem.gd` - Query infrastructure
- `/Users/hassoncs/Workspaces/Personal/slopcade/godot_project/scripts/bridge/EventEmitter.gd` - Event callbacks

### JavaScript/TypeScript Side
- TypeScript BridgeEnvelopeV1 structure (to be implemented)

---

*End of Inventory*
