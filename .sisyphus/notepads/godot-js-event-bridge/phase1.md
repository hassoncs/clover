## Phase 1: Extract BridgeCore - COMPLETE

Created `app/lib/godot/BridgeCore.ts` with:

### BridgeMessage type
```typescript
export interface BridgeMessage {
  type: string;
  data?: unknown;
  id?: string;
  error?: { message: string; code?: string };
  progress?: { current: number; total?: number };
}
```

### BridgeCore abstract class
- `dispatch(msg)` - routes incoming messages to handlers or pending requests
- `on(type, handler)` - subscribe to events, returns unsubscribe function
- `emit(type, data)` - fire-and-forget event
- `request<T>(type, data, opts)` - request/response with timeout and optional progress
- `cancelAllPending()` - cleanup during dispose
- `abstract send(msg)` - implemented by transports

TypeScript compiles successfully.
