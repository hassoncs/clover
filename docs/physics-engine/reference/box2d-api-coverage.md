# Box2D API Coverage & Feature Matrix

This document tracks the Box2D features verified in this project. The goal is to ensure the unified API shim (`react-native-box2d` + `box2d-wasm`) supports the full range of physics capabilities required for game development.

## Feature Matrix

| Category | Feature | Example Implementation | Status | Notes |
|----------|---------|------------------------|--------|-------|
| **Bodies** | Dynamic Bodies | Falling Boxes, All | ✅ Verified | Basic rigid body simulation. |
| | Static Bodies | Bridge (Anchors), Car (Terrain) | ✅ Verified | Zero mass, fixed position. |
| | Kinematic Bodies | *Not Explicitly Used* | ⚠️ Partial | Supported by API, logic same as Dynamic. |
| **Shapes** | Polygon (Box) | Falling Boxes, Bridge, Dominoes | ✅ Verified | Used extensively. |
| | Circle | Interaction, Avalanche, Newton | ✅ Verified | `SetRadius` shim verified. |
| | Edge / Chain | *Not Explicitly Used* | ⬜ Pending | Terrain currently uses Boxes. |
| **Joints** | Revolute Joint | Double Pendulum, Bridge, Car | ✅ Verified | `Initialize` shim verified. |
| | Distance Joint | Newtons Cradle | ✅ Verified | Length/Frequency constraints verified. |
| | Wheel Joint | *Car (Approximated)* | ⚠️ Alternative | Car uses Revolute. Adapter exists in types. |
| | Prismatic Joint | *Not Used* | ⬜ Pending | Adapter exists in types. |
| | Mouse Joint | *Not Used* | ⬜ Pending | Interaction uses creation, not dragging. |
| **Dynamics** | Gravity | All | ✅ Verified | Default 9.8 m/s². |
| | Forces | Pendulum (Constraint Force) | ✅ Verified | `ApplyForceToCenter`. |
| | Impulses | *Not Explicitly Used* | ⬜ Pending | `ApplyLinearImpulseToCenter`. |
| | Motors | Car | ✅ Verified | Revolute Joint motors. |
| | Friction | Bridge, Car, Dominoes | ✅ Verified | Friction parameter works. |
| | Restitution | Newtons Cradle, Avalanche | ✅ Verified | Bounciness (1.0 = elastic). |
| | Damping | Pendulum | ✅ Verified | Linear/Angular damping. |
| **Queries** | RayCast | *Not Used* | ⬜ Pending | Skipped for Avalanche (Particles). |
| | AABB Query | *Not Used* | ⬜ Pending | |
| **Contacts** | Filtering | *Not Explicitly Used* | ⬜ Pending | Collision groups/masks. |
| | Sensors | *Not Explicitly Used* | ⬜ Pending | `isSensor` property. |

## API Shim Verification

The unified API (`app/lib/physics`) has been stress-tested with the following adaptations:

### Web (WASM) Adaptations
The `Physics.web.ts` adapter includes critical Monkey Patches to match the Native JSI API:

1.  **Vector Accessors**:
    *   **Issue**: WASM uses `get_x()`/`get_y()`. JSI uses `.x`/`.y`.
    *   **Fix**: Patched `b2Vec2.prototype` with getters/setters.
2.  **Missing Convenience Methods**:
    *   **Issue**: JSI has `CreateFixture2(shape, density)`. WASM only has `CreateFixture(def)`.
    *   **Fix**: Polyfilled `b2Body.prototype.CreateFixture2`.
3.  **Method Renaming**:
    *   **Issue**: JSI `SetRadius`. WASM `set_m_radius`.
    *   **Fix**: Aliased `b2CircleShape.prototype.SetRadius`.

### Native (JSI) Support
The `Physics.native.ts` adapter passes the `react-native-box2d` instance directly.
*   **Requirement**: Requires `expo-dev-client` (Native code).
*   **Verification**: Code follows JSI standard signatures.

## Example Breakdown

### 1. Falling Boxes
*   **Focus**: Basic rigid body dynamics, Polygon shapes.
*   **Key API**: `CreateBody`, `CreateFixture`, `Step`.

### 2. Double Pendulum
*   **Focus**: Constraints, Chaos, Compound Joints.
*   **Key API**: `b2RevoluteJoint`, `SetTransform`, `SetLinearVelocity`.

### 3. Bridge
*   **Focus**: Chained joints, Stability under load.
*   **Key API**: Multiple `b2RevoluteJoints`, High iteration count.

### 4. Car
*   **Focus**: Motors, Friction, Compound shapes (Chassis + Wheels).
*   **Key API**: `b2RevoluteJoint` (Motor Enabled), `MaxMotorTorque`, `MotorSpeed`.

### 5. Avalanche
*   **Focus**: Stress test (150+ bodies), Circle shapes.
*   **Key API**: High body count, `b2CircleShape`.

### 6. Newton's Cradle
*   **Focus**: Elasticity, Distance constraints.
*   **Key API**: `b2DistanceJoint`, `Restitution = 1.0`.

### 7. Dominoes
*   **Focus**: Stacking stability, Chain reactions.
*   **Key API**: High density, Friction, Solver stability.

## Next Steps
To achieve 100% coverage, future examples should implement:
1.  **Mouse Joint**: Dragging objects (requires handling touch coordinates -> world coordinates).
2.  **Raycasting**: Vision cones or laser tripwires.
3.  **Sensors**: Zones that trigger events (e.g., wind tunnel, water buoyancy).
