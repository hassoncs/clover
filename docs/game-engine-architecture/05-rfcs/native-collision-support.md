# Feature Request: JSI Collision Listeners for `react-native-box2d`

## Problem Statement
Collision detection is critical for game logic (e.g., breaking bricks, scoring points, triggering sound effects). Currently, the `react-native-box2d` JSI binding exposes physics simulation (`Step`, `CreateBody`) but lacks the interface to report collision events back to JavaScript. This renders many games (Breakout, Dominoes) non-functional on native platforms.

## Technical Gap
The current C++ implementation (`cpp/`) is missing bindings for:
1.  `b2ContactListener` (The callback interface).
2.  `b2Contact` (The contact data object).
3.  `b2Manifold` (The collision geometry/impulse data).
4.  `b2World::SetContactListener` (The method to register the listener).

## Proposed Implementation

### 1. `JSIBox2dContactListener.h`
Create a C++ class that inherits from `b2ContactListener`. It should hold a reference to a JSI Javascript callback (or object with methods) and invoke it when Box2D fires events.

```cpp
class JSIBox2dContactListener : public b2ContactListener {
    jsi::Function beginContactCb;
    jsi::Function endContactCb;
    jsi::Runtime& runtime;

public:
    JSIBox2dContactListener(jsi::Runtime& rt, jsi::Function begin, jsi::Function end) 
        : runtime(rt), beginContactCb(std::move(begin)), endContactCb(std::move(end)) {}

    void BeginContact(b2Contact* contact) override {
        // Wrap b2Contact in a HostObject and pass to JS
        // invoke beginContactCb.call(runtime, wrappedContact);
    }

    void EndContact(b2Contact* contact) override {
        // ...
    }
};
```

### 2. `JSIBox2dContact.h`
Create a HostObject wrapper for `b2Contact`. This allows JS to query fixtures and manifolds lazily (performance critical).

**Exposed Methods:**
- `GetFixtureA()` -> Returns `JSIBox2dFixture`
- `GetFixtureB()` -> Returns `JSIBox2dFixture`
- `GetManifold()` -> Returns `JSIBox2dManifold` (for normal/impulse data)
- `IsTouching()` -> Boolean

### 3. Update `JSIBox2dWorld.h`
Add `SetContactListener` method to the World HostObject.

```cpp
B2D_JSI_HOST_FUNCTION(SetContactListener) {
    if (arguments[0].isObject()) {
        auto listenerObj = arguments[0].asObject(runtime);
        auto beginFunc = listenerObj.getPropertyAsFunction(runtime, "BeginContact");
        auto endFunc = listenerObj.getPropertyAsFunction(runtime, "EndContact");
        
        // Create the C++ listener and attach to world
        // Note: Lifecycle management of the listener is important (keep it alive)
    }
    return jsi::Value::undefined();
}
```

## API Usage (JavaScript)
The goal is to match the box2d-wasm API structure to reuse `Box2DAdapter`:

```typescript
const listener = new box2d.JSContactListener();
listener.BeginContact = (contactPtr) => {
  const contact = box2d.wrapPointer(contactPtr, box2d.b2Contact);
  const fixtureA = contact.GetFixtureA();
  // ...
};
world.SetContactListener(listener);
```

*Note: Since JSI doesn't use pointers in the same way, we might adapt the JS side or make the C++ side mimic the `wrapPointer` pattern by passing a HostObject reference.*

## Priority
**Critical**. Without this, physics interactions on native are visual-only.
