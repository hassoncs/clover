# react-native-box2d Fork Strategy

## Current State

**Original repo**: `nickovchinnikov/react-native-box2d` (v0.2.5, last updated 2023)

**What works**:
- Basic physics: `b2World`, `b2Body`, `b2BodyDef`
- Shapes: `b2PolygonShape`, `b2CircleShape`
- Fixtures: `b2FixtureDef`
- Body operations: `CreateFixture`, `GetPosition`, `GetAngle`, `SetTransform`, `ApplyForce`, etc.

**What's missing** (needed for our examples):
- Joints: `b2RevoluteJointDef`, `b2DistanceJointDef`, `b2MouseJointDef`, `b2PrismaticJointDef`
- World queries: `QueryAABB`, `RayCast`
- Contact listeners
- Many body/fixture methods

**What we've patched**:
1. C++ namespace collision fix (`RNJsi` → `RNBox2dJsi`, `JSI_*` → `B2D_JSI_*`)
2. Bridgeless mode JSI check (`global.RN$Bridgeless` support)

## Fork Strategy

### Phase 1: Initial Fork Setup (1-2 hours)

1. **Fork the repo**
   ```bash
   gh repo fork nickovchinnikov/react-native-box2d --clone --remote
   cd react-native-box2d
   ```

2. **Apply existing patches**
   - Copy our C++ namespace fixes from `patches/react-native-box2d@0.2.5.patch`
   - Apply the bridgeless mode JS fix

3. **Update package metadata**
   ```json
   {
     "name": "@skia-physics/react-native-box2d",
     "version": "0.3.0"
   }
   ```

4. **Update dependencies**
   - Bump to support RN 0.81+
   - Test with Expo SDK 54

### Phase 2: Add Joint Support (4-8 hours)

Required files to create:

```
cpp/
├── JSIBox2dRevoluteJointDef.h    # NEW
├── JSIBox2dDistanceJointDef.h    # NEW
├── JSIBox2dMouseJointDef.h       # NEW
├── JSIBox2dJoint.h               # NEW (base class)
└── JSIBox2dWorld.h               # MODIFY (add CreateJoint, DestroyJoint)

src/
├── types.ts                       # MODIFY (add joint types)
└── Box2d.ts                       # MODIFY (export new constructors)
```

**Implementation pattern** (following existing code style):

```cpp
// JSIBox2dRevoluteJointDef.h
#pragma once
#include "box2d/b2_revolute_joint.h"
#include "jsi/Box2dJsiHostObject.h"
#include "JSIBox2dBody.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dRevoluteJointDef : public JsiWrappingSharedPtrHostObject<b2RevoluteJointDef> {
    public:
        B2D_JSI_HOST_FUNCTION(Initialize) {
            auto bodyA = JSIBox2dBody::fromValue(runtime, arguments[0]);
            auto bodyB = JSIBox2dBody::fromValue(runtime, arguments[1]);
            auto anchor = JSIBox2dVec2::fromValue(runtime, arguments[2]);
            getObject()->Initialize(bodyA, bodyB, *anchor);
            return jsi::Value::undefined();
        }

        B2D_JSI_PROPERTY_SET(enableLimit) {
            getObject()->enableLimit = value.getBool();
        }
        
        B2D_JSI_PROPERTY_SET(enableMotor) {
            getObject()->enableMotor = value.getBool();
        }
        
        // ... more properties

        B2D_JSI_EXPORT_FUNCTIONS(
            B2D_JSI_EXPORT_FUNC(JSIBox2dRevoluteJointDef, Initialize)
        );
        
        B2D_JSI_EXPORT_PROPERTY_SETTERS(
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dRevoluteJointDef, enableLimit),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dRevoluteJointDef, enableMotor)
        );

        static const jsi::HostFunctionType createCtor() {
            return B2D_JSI_HOST_FUNCTION_LAMBDA {
                return jsi::Object::createFromHostObject(
                    runtime,
                    std::make_shared<JSIBox2dRevoluteJointDef>()
                );
            };
        }
    };
}
```

**TypeScript types to add**:

```typescript
export interface b2JointDef {
  bodyA: b2Body;
  bodyB: b2Body;
  collideConnected?: boolean;
}

export interface b2RevoluteJointDef extends b2JointDef {
  Initialize(bodyA: b2Body, bodyB: b2Body, anchor: b2Vec2): void;
  enableLimit: boolean;
  enableMotor: boolean;
  lowerAngle: number;
  upperAngle: number;
  motorSpeed: number;
  maxMotorTorque: number;
}

export interface b2DistanceJointDef extends b2JointDef {
  Initialize(bodyA: b2Body, bodyB: b2Body, anchorA: b2Vec2, anchorB: b2Vec2): void;
  length: number;
  minLength: number;
  maxLength: number;
  stiffness: number;
  damping: number;
}

export interface b2MouseJointDef extends b2JointDef {
  target: b2Vec2;
  maxForce: number;
  stiffness: number;
  damping: number;
}

export interface b2Joint {
  GetBodyA(): b2Body;
  GetBodyB(): b2Body;
}

export interface b2MouseJoint extends b2Joint {
  SetTarget(target: b2Vec2): void;
  GetTarget(): b2Vec2;
}
```

### Phase 3: Add World Query Methods (2-4 hours)

```cpp
// Add to JSIBox2dWorld.h
B2D_JSI_HOST_FUNCTION(QueryAABB) {
    // Implement AABB query for touch detection
}

B2D_JSI_HOST_FUNCTION(RayCast) {
    // Implement ray casting
}

B2D_JSI_HOST_FUNCTION(CreateJoint) {
    // Create joint from joint def
}

B2D_JSI_HOST_FUNCTION(DestroyJoint) {
    // Destroy joint
}
```

### Phase 4: Testing & Polish (2-4 hours)

1. Build and test on iOS simulator
2. Build and test on Android emulator
3. Test all existing examples:
   - FallingBoxes (basic)
   - Bridge (revolute joints)
   - Pendulum (revolute joints)
   - Newton's Cradle (distance joints)
   - Car (revolute + prismatic joints)
   - Interaction (mouse joint)

## File Structure After Fork

```
@skia-physics/react-native-box2d/
├── cpp/
│   ├── box2d/                    # Box2D C++ library (unchanged)
│   ├── jsi/                      # JSI helpers (with B2D_ prefix)
│   ├── JSIBox2dApi.h             # Main API entry
│   ├── JSIBox2dWorld.h           # World + CreateJoint
│   ├── JSIBox2dBody.h
│   ├── JSIBox2dBodyDef.h
│   ├── JSIBox2dFixtureDef.h
│   ├── JSIBox2dPolygonShape.h
│   ├── JSIBox2dCircleShape.h
│   ├── JSIBox2dVec2.h
│   ├── JSIBox2dJoint.h           # NEW: Base joint
│   ├── JSIBox2dRevoluteJointDef.h # NEW
│   ├── JSIBox2dDistanceJointDef.h # NEW
│   ├── JSIBox2dMouseJointDef.h    # NEW
│   └── utils.h
├── src/
│   ├── index.ts
│   ├── Box2d.ts                  # Updated with new exports
│   └── types.ts                  # Updated with joint types
├── ios/
├── android/
└── package.json
```

## Usage in Project

After forking, update `app/package.json`:

```json
{
  "dependencies": {
    "@skia-physics/react-native-box2d": "github:your-org/react-native-box2d#main"
  }
}
```

Or publish to npm:

```json
{
  "dependencies": {
    "@skia-physics/react-native-box2d": "^0.3.0"
  }
}
```

## Estimated Total Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Phase 1: Fork Setup | 1-2h | Low |
| Phase 2: Joint Support | 4-8h | Medium |
| Phase 3: World Queries | 2-4h | Medium |
| Phase 4: Testing | 2-4h | Low |
| **Total** | **9-18h** | Medium |

With AI assistance, this could realistically be done in 1-2 focused sessions.

## Alternative: Use Rapier Instead

If the Box2D fork becomes too complex, consider switching to [Rapier](https://rapier.rs/):
- `@dimforge/rapier2d` has WebAssembly support
- Could use similar native/web adapter pattern
- More actively maintained
- But would require rewriting all physics code

For now, forking react-native-box2d is the lower-risk path since:
1. Our adapter layer (`Physics2D`) already abstracts Box2D
2. We have working examples that just need joint support
3. The C++ implementation pattern is clear and repeatable
