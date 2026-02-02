# Godot↔JS Event Bridge Implementation Summary

**Status**: Phase 1-2 Complete  
**Last Updated**: 2026-02-01

---

## Completed Work

### Phase 0: Inventory & Guardrails ✅
- **bridge-inventory.md**: Comprehensive mapping of all bridge entry/exit points
  - 9 direct callback types in EventEmitter.gd
  - 10 event types in EventQueue.gd
  - Web async RPC pattern in QuerySystem.gd
  - Native polling in GodotBridge.native.ts
- **perf-guardrails.md**: Performance constraints documented
  - Frame time budget: <1ms overhead
  - Memory: 100 event queue limit
  - JSON processing limits
  - Channel priorities (reliable/state/debug)

### Phase 1: Type Definitions ✅
- **app/lib/godot/EventBridge.ts**: Complete TypeScript types
  - BridgeEnvelopeV1 interface
  - BridgeBatchV1 for batching
  - EventBridge interface with publish/request/subscribe
  - BridgeTopic registry types
  - Handshake/capability types

### Phase 2: BridgeCore Implementation ✅
- **godot_project/scripts/bridge/BridgeCore.gd**: GDScript implementation
  - 4 BridgeKind constants (event/request/response/progress)
  - 5 channel constants (default/physics/input/sync/query)
  - 4 priority levels (low/normal/high/critical)
  - Handler registration system
  - Event emission methods for all event types
  - Request/response/progress handling
  - EventQueue integration
  - JavaScript bridge setup for web

---

## Key Design Decisions

1. **Dual Path Support**: Direct callback (web) + queue polling (native)
2. **Envelope Format**: BridgeEnvelopeV1 with kind, topic, payload, meta
3. **Channel-based Priorities**: Separate handling for physics/input/sync/query
4. **Backward Compatible**: Wraps existing EventQueue, doesn't replace it yet

---

## Next Steps

### Phase 3: Progress Streams
- Implement requestWithProgress in TypeScript
- Connect to BridgeCore.send_progress()
- Test with preloadTextures use case

### Phase 4: Migration
- Update EventEmitter to use BridgeCore
- Update SyncSystem to use BridgeCore
- Update CollisionSystem to use BridgeCore
- Migrate call sites incrementally

### Verification
- Functional tests for all event types
- Platform parity tests (web vs native)
- Performance benchmarks
