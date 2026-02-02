# Performance Guardrails for Godot↔JS Event Bridge

**Created**: 2026-02-01  
**Purpose**: Define performance constraints and measurement criteria for the Event Bridge implementation

---

## Baseline Measurements (Current State)

### Transform Sync (High-Frequency Path)
- **Current frequency**: 60fps (every 16ms)
- **Current payload**: All entity transforms as JSON
- **Current bottleneck**: JSON.stringify/parse on both sides
- **Current queue limit**: 100 events max (EventQueue.gd)

### Event Queue
- **Max capacity**: 100 events
- **Overflow behavior**: Drop oldest (pop_front)
- **Polling interval**: 16ms (native)

### Query System
- **Default timeout**: 5000ms
- **Pattern**: requestId-based Promise resolution

---

## Performance Guardrails

### 1. Frame Time Budget
- **Target**: No regression in frame time when bridge tracing is OFF
- **Budget**: Bridge overhead must be < 1ms per frame at 60fps
- **Measurement**: Compare before/after frame times with same entity count

### 2. Memory Constraints
- **Event queue**: Maintain 100 event max (or make configurable)
- **Callback arrays**: Clean up on unsubscribe to prevent leaks
- **Pending requests**: Timeout and cleanup to prevent memory growth

### 3. JSON Processing Limits
- **No new per-entity JSON stringify**: Reuse existing patterns
- **Batching**: Prefer batching multiple events into single JSON array
- **Transform sync**: Keep existing bypass path; don't force through generic envelope if it adds overhead

### 4. Channel Priorities
- **reliable**: Never drop, but bounded queue
- **state**: Coalesce by key, last-write-wins
- **debug**: Drop when behind, lowest priority

### 5. Platform Parity
- **Web**: Same polling semantics as native (no divergence)
- **Native**: Same 16ms polling, same batch format

---

## Measurement Criteria

### Success Metrics
1. **Functional**: All events reach subscribers correctly
2. **Performance**: Frame time ≤ baseline + 1ms
3. **Memory**: No observable memory growth over 5-minute session
4. **Parity**: Same event ordering on web and native

### Load Test Scenario
- 100 entities
- 60fps transform sync
- 10 collision events/second
- 5 sensor events/second
- Run for 60 seconds

### Regression Thresholds
- Frame drops: < 1% increase
- Memory: < 10MB growth
- Latency: < 16ms added per event

---

## Implementation Notes

### What to Avoid
- Per-entity JSON serialization overhead
- Synchronous blocking calls across threads
- Unbounded queue growth
- Platform-specific optimizations that break parity

### What to Preserve
- Existing transform sync performance
- Existing query timeout behavior
- Existing event queue capacity limits
