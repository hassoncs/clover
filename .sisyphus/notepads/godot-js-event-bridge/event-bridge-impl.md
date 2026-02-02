# EventBridgeImpl Implementation Notes

**Created**: 2026-02-01

## Implementation Decisions

### 1. Transport Adapter Pattern

The `EventBridgeImpl` class accepts a `TransportAdapter` in its constructor, which abstracts the platform-specific transport details:

```typescript
interface TransportAdapter {
  send(envelope: BridgeEnvelopeV1): BridgeEnvelopeV1 | null;
  sendAsync(envelope: BridgeEnvelopeV1): Promise<BridgeEnvelopeV1>;
  onEvent(callback: (envelope: BridgeEnvelopeV1) => void): Unsubscribe;
  platform: 'web' | 'native';
}
```

This allows the same EventBridge implementation to work with both:
- **Web**: Uses window/iframe-based transport
- **Native**: Uses JSI-based transport (react-native-godot)

### 2. Correlation ID System

Requests use unique correlation IDs (`eb_{timestamp}_{random}`) for matching responses:

- Generated via `generateId()` function
- Stored in `pendingRequests` Map with resolve/reject callbacks
- Matched when responses arrive from Godot
- Timeout cleanup prevents memory leaks

### 3. Timeout Handling

- Default timeout: 5000ms (configurable per request)
- Uses `setTimeout` for each pending request
- AbortSignal support for cancellation
- Proper cleanup on dispose

### 4. Event Subscription System

- Topic-based subscriptions via `subscribe()`
- Multiple handlers per topic (Set-based)
- Type-safe payload handling with generics
- Unsubscribe function returned for cleanup

### 5. Tracing System

- Optional tracing for debugging
- Sample rate control (100% dev, 1% prod)
- Optional payload inclusion
- Trace event history (max 1000 events)
- Console logging in development mode

### 6. Error Handling

- Request errors include code, message, and optional data
- Event handler errors caught and logged
- Proper Promise rejection for failed requests
- Timeout errors with context

### 7. Cleanup/Dispose

- `dispose()` method cleans all resources
- Rejects pending requests with "disposed" error
- Clears event handlers and unsubscribers
- Prevents new operations after dispose

## Key Methods

| Method | Description |
|--------|-------------|
| `publish(topic, payload, opts?)` | Fire-and-forget event to Godot |
| `request(topic, payload, opts?)` | Promise-based request with optional timeout |
| `requestWithProgress(topic, payload, onProgress, opts?)` | Request with progress callbacks |
| `subscribe(topic, handler)` | Subscribe to events from Godot |
| `setTracing(enabled, opts?)` | Enable/disable debug tracing |
| `dispose()` | Clean up all resources |

## Usage Example

```typescript
// Create transport adapter (platform-specific)
const transport = createWebTransport(); // or createNativeTransport()

// Create EventBridge
const bridge = createEventBridge(transport);

// Publish an event
bridge.publish('player/jump', { velocity: 10 });

// Make a request
const player = await bridge.request('player/get', { id: 'player1' });

// Subscribe to events
const unsubscribe = bridge.subscribe('collision', (payload) => {
  console.log('Collision:', payload);
});

// Enable tracing for debugging
bridge.setTracing(true, { sampleRate: 1.0 });

// Cleanup
unsubscribe();
bridge.dispose();
```

## Files Reference

- `/Users/hassoncs/Workspaces/Personal/slopcade/app/lib/godot/EventBridgeImpl.ts` - **NEW** Runtime implementation
- `/Users/hassoncs/Workspaces/Personal/slopcade/app/lib/godot/EventBridge.ts` - Interface and types

## Next Steps

- Create transport adapters for web and native
- Integrate with existing GodotBridge implementations
- Add unit tests
- Update documentation
