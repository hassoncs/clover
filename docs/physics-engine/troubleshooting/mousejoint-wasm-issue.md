# MouseJoint Investigation: box2d-wasm SetTarget Issue

## Overview

We're implementing drag-to-move functionality for physics bodies using Box2D's `b2MouseJoint`. The joint is created successfully, but `SetTarget()` doesn't update the target position - the body stays anchored to the initial click point instead of following the cursor.

## Expected Behavior

1. User clicks on a body → MouseJoint created with initial target at click point
2. User drags → `SetTarget(newPosition)` updates the joint's target
3. Body is pulled toward the current cursor position via spring force

## Actual Behavior

1. User clicks on a body → MouseJoint created ✓
2. User drags → `SetTarget()` is called (confirmed via logs) ✓
3. Body stays anchored to **initial click point**, not current cursor ✗

The body appears to have TWO rubber bands:

- One pulling toward the initial click point (working)
- One pulling toward current cursor (not working)

## What We Tried

### 1. Direct Property Assignment

```typescript
jointDef.target = box2d.b2Vec2(x, y);
jointDef.maxForce = 100000;
```

**Result**: Joint created, but SetTarget doesn't update target.

### 2. Setter Methods (Emscripten Pattern)

```typescript
this.setJointDefProperty(jointDef, "target", vec);
// Tries jointDef.set_target(vec) then falls back to jointDef.target = vec
```

**Result**: Same behavior.

### 3. Multiple SetTarget Method Names

```typescript
if (joint.SetTarget) joint.SetTarget(t);
else if (joint.set_m_targetA) joint.set_m_targetA(t);
else if (joint.set_m_target) joint.set_m_target(t);
```

**Result**: `SetTarget` exists and is called, but doesn't work.

### 4. Joint Casting (b2Joint → b2MouseJoint)

```typescript
const mouseJoint = box2d.castToMouseJoint
  ? box2d.castToMouseJoint(genericJoint)
  : genericJoint;
```

Using `castObject` or `wrapPointer` to properly cast the joint.

**Result**: Cast returns object with **empty methods list**, but `SetTarget` still exists on original joint. Casting may not be working correctly.

### 5. Waking the Body

```typescript
body.SetAwake(true);
```

**Result**: No change.

## Console Log Evidence

```
[Interaction] Touch at screen: 1576 919 world: 31.52 18.38
[Interaction] queryPoint result: body 7
[Interaction] Creating mouse joint for body 7
[Box2DAdapter] MouseJoint created (casted). Methods:     ← EMPTY!
[Interaction] Mouse joint created: 4
[Box2DAdapter] setMouseTarget via SetTarget: 31.52 18.36
[Box2DAdapter] setMouseTarget via SetTarget: 31.54 18.08
[Box2DAdapter] setMouseTarget via SetTarget: 31.70 15.20  ← Y changing (dragging up)
[Box2DAdapter] setMouseTarget via SetTarget: 32.04 9.24
[Interaction] Destroying mouse joint
```

Key observations:

- `Methods:` is **empty** after casting - the cast isn't working
- `SetTarget` IS being called with changing coordinates
- But the body doesn't follow

## Hypotheses

### H1: SetTarget Method Signature Mismatch

The emscripten-generated `SetTarget` might expect a different parameter type:

- Raw pointer instead of wrapped b2Vec2?
- Separate x, y parameters instead of vec?
- The b2Vec2 we create might not be compatible

### H2: Joint Not Actually a MouseJoint

`world.CreateJoint()` returns a generic `b2Joint*`. In emscripten:

- The returned object might be a base class wrapper
- `SetTarget` might exist but dispatch to wrong vtable
- Need proper downcasting with `castObject(joint, b2MouseJoint)`

### H3: Emscripten Binding Bug

The box2d-wasm `SetTarget` binding might be broken:

- Method exists but doesn't actually call the C++ implementation
- Internal state (`m_targetA`) might not be updated

### H4: JointDef Not Fully Configured

The jointDef might be missing required properties:

- `collideConnected`?
- Proper bodyA/bodyB assignment?
- Some property using wrong setter pattern?

## Box2D MouseJoint Internals

From Box2D source, MouseJoint should:

```cpp
void b2MouseJoint::SetTarget(const b2Vec2& target) {
    if (target != m_targetA) {
        m_bodyB->SetAwake(true);
        m_targetA = target;
    }
}
```

The target is stored in `m_targetA` and used in `SolveVelocityConstraints()` to compute spring force pulling bodyB toward the target.

## Potential Future Approaches

### 1. Check box2d-wasm Source/Issues

- Look at how SetTarget is bound in the emscripten IDL
- Search for existing issues about MouseJoint
- Check if there's a working example in their tests

### 2. Use Raw Pointers

```typescript
const ptr = Box2D.getPointer(joint);
const mouseJoint = Box2D.wrapPointer(ptr, Box2D.b2MouseJoint);
```

### 3. Direct Memory Manipulation

If bindings are broken, could potentially write directly to m_targetA:

```typescript
// Dangerous but might work
joint.set_m_targetA(vec); // or similar internal accessor
```

### 4. Different WASM Build

- Try a different box2d-wasm version
- Try building box2d-wasm ourselves with correct bindings
- Try a different Box2D WASM port (e.g., box2d.js, planck.js)

### 5. Verify with Minimal Reproduction

Create minimal test case:

- Just Box2D, no React/Skia
- Single body, single MouseJoint
- Log everything to isolate the issue

## Current Workaround

We implemented **force-based drag** that bypasses MouseJoint entirely:

```typescript
const stepPhysics = (dt: number) => {
  if (dragState) {
    const bodyPos = physics.getTransform(dragState.bodyId).position;
    const velocity = physics.getLinearVelocity(dragState.bodyId);

    const dx = dragState.targetWorldX - bodyPos.x;
    const dy = dragState.targetWorldY - bodyPos.y;

    const stiffness = 50;
    const damping = 5;

    const forceX = dx * stiffness - velocity.x * damping;
    const forceY = dy * stiffness - velocity.y * damping;

    physics.applyForceToCenter(dragState.bodyId, vec2(forceX, forceY));
  }

  physics.step(dt, 8, 3);
};
```

This manually implements the spring-damper behavior that MouseJoint should provide.

## Files Involved

- `app/lib/physics/Physics.web.ts` - Box2D WASM initialization and polyfills
- `app/lib/physics2d/Box2DAdapter.ts` - Physics2D implementation
- `app/components/examples/Interaction.tsx` - Demo using drag interaction

## References

- [box2d-wasm GitHub](https://github.com/nicksrandall/box2d-wasm)
- [Box2D Manual - Joints](https://box2d.org/documentation/md__d_1__git_hub_box2d_docs_dynamics.html#autotoc_md61)
- [Emscripten Embind](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html)
