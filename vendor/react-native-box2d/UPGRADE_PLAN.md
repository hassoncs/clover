# react-native-box2d Upgrade Plan

## Overview

This fork aims to:
1. Fix compatibility with React Native 0.76+ New Architecture (bridgeless mode)
2. Add missing Box2D features (joints, world queries)
3. Fix namespace collisions with react-native-skia

## Current State

### Exposed APIs (working)
- `b2Vec2` - 2D vector
- `b2World` - Physics world (CreateBody, Step, DestroyBody)
- `b2BodyDef` - Body definition (position, type, angle, linearVelocity)
- `b2Body` - Rigid body (GetPosition, GetAngle, SetTransform, CreateFixture, ApplyForce, etc.)
- `b2PolygonShape` - Polygon collision shape (SetAsBox, Set)
- `b2CircleShape` - Circle collision shape (SetRadius)
- `b2FixtureDef` - Fixture definition (shape, density, friction, restitution)

### Missing APIs (needed)
- **Joints** - `b2RevoluteJointDef`, `b2DistanceJointDef`, `b2MouseJointDef`, `b2PrismaticJointDef`
- **World methods** - `CreateJoint`, `DestroyJoint`, `QueryAABB`, `RayCast`
- **Joint objects** - `b2Joint`, `b2RevoluteJoint`, `b2MouseJoint` (for SetTarget)

---

## Phase 1: Compatibility Fixes

### 1.1 Bridgeless Mode Fix (JS)

**File**: `src/Box2d.ts`

**Current** (line 62):
```typescript
if (global.nativeCallSyncHook == null || Box2dModule.install == null) {
```

**Fixed**:
```typescript
// Add to global declarations
declare global {
  var RN$Bridgeless: boolean | undefined;
}

// Update the check
if ((global.nativeCallSyncHook == null && !global.RN$Bridgeless) || Box2dModule.install == null) {
```

### 1.2 Namespace Collision Fix (C++)

To avoid symbol collisions with react-native-skia (which also uses `RNJsi` namespace):

1. Rename `cpp/jsi/JsiHostObject.h` → `cpp/jsi/Box2dJsiHostObject.h`
2. Rename `cpp/jsi/JsiHostObject.cpp` → `cpp/jsi/Box2dJsiHostObject.cpp`
3. Rename `cpp/jsi/JsiWrappingHostObjects.h` → `cpp/jsi/Box2dJsiWrappingHostObjects.h`
4. Change namespace `RNJsi` → `RNBox2dJsi`
5. Rename macros `JSI_*` → `B2D_JSI_*`

**See**: The patch file in `skia-physics-test/patches/react-native-box2d@0.2.5.patch` for exact changes.

---

## Phase 2: Add Joint Support

### 2.1 New Files to Create

```
cpp/
├── JSIBox2dJoint.h              # Base joint wrapper
├── JSIBox2dRevoluteJointDef.h   # Revolute joint definition
├── JSIBox2dDistanceJointDef.h   # Distance joint definition  
├── JSIBox2dMouseJointDef.h      # Mouse joint definition
├── JSIBox2dRevoluteJoint.h      # Revolute joint instance
└── JSIBox2dMouseJoint.h         # Mouse joint instance (for SetTarget)
```

### 2.2 JSIBox2dRevoluteJointDef.h

```cpp
#pragma once

#include "box2d/b2_revolute_joint.h"
#include "jsi/Box2dJsiHostObject.h"
#include "JSIBox2dBody.h"
#include "JSIBox2dVec2.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dRevoluteJointDef : public JsiWrappingSharedPtrHostObject<b2RevoluteJointDef> {
    public:
        B2D_JSI_HOST_FUNCTION(Initialize) {
            b2Body* bodyA = JSIBox2dBody::fromValue(runtime, arguments[0]);
            b2Body* bodyB = JSIBox2dBody::fromValue(runtime, arguments[1]);
            b2Vec2 anchor = *JSIBox2dVec2::fromValue(runtime, arguments[2]);
            getObject()->Initialize(bodyA, bodyB, anchor);
            return jsi::Value::undefined();
        }

        B2D_JSI_PROPERTY_SET(enableLimit) {
            getObject()->enableLimit = value.getBool();
        }

        B2D_JSI_PROPERTY_SET(enableMotor) {
            getObject()->enableMotor = value.getBool();
        }

        B2D_JSI_PROPERTY_SET(lowerAngle) {
            getObject()->lowerAngle = value.asNumber();
        }

        B2D_JSI_PROPERTY_SET(upperAngle) {
            getObject()->upperAngle = value.asNumber();
        }

        B2D_JSI_PROPERTY_SET(motorSpeed) {
            getObject()->motorSpeed = value.asNumber();
        }

        B2D_JSI_PROPERTY_SET(maxMotorTorque) {
            getObject()->maxMotorTorque = value.asNumber();
        }

        B2D_JSI_EXPORT_FUNCTIONS(
            B2D_JSI_EXPORT_FUNC(JSIBox2dRevoluteJointDef, Initialize)
        );

        B2D_JSI_EXPORT_PROPERTY_SETTERS(
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dRevoluteJointDef, enableLimit),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dRevoluteJointDef, enableMotor),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dRevoluteJointDef, lowerAngle),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dRevoluteJointDef, upperAngle),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dRevoluteJointDef, motorSpeed),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dRevoluteJointDef, maxMotorTorque)
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

### 2.3 JSIBox2dDistanceJointDef.h

```cpp
#pragma once

#include "box2d/b2_distance_joint.h"
#include "jsi/Box2dJsiHostObject.h"
#include "JSIBox2dBody.h"
#include "JSIBox2dVec2.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dDistanceJointDef : public JsiWrappingSharedPtrHostObject<b2DistanceJointDef> {
    public:
        B2D_JSI_HOST_FUNCTION(Initialize) {
            b2Body* bodyA = JSIBox2dBody::fromValue(runtime, arguments[0]);
            b2Body* bodyB = JSIBox2dBody::fromValue(runtime, arguments[1]);
            b2Vec2 anchorA = *JSIBox2dVec2::fromValue(runtime, arguments[2]);
            b2Vec2 anchorB = *JSIBox2dVec2::fromValue(runtime, arguments[3]);
            getObject()->Initialize(bodyA, bodyB, anchorA, anchorB);
            return jsi::Value::undefined();
        }

        B2D_JSI_PROPERTY_SET(length) {
            getObject()->length = value.asNumber();
        }

        B2D_JSI_PROPERTY_SET(minLength) {
            getObject()->minLength = value.asNumber();
        }

        B2D_JSI_PROPERTY_SET(maxLength) {
            getObject()->maxLength = value.asNumber();
        }

        B2D_JSI_PROPERTY_SET(stiffness) {
            getObject()->stiffness = value.asNumber();
        }

        B2D_JSI_PROPERTY_SET(damping) {
            getObject()->damping = value.asNumber();
        }

        B2D_JSI_EXPORT_FUNCTIONS(
            B2D_JSI_EXPORT_FUNC(JSIBox2dDistanceJointDef, Initialize)
        );

        B2D_JSI_EXPORT_PROPERTY_SETTERS(
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dDistanceJointDef, length),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dDistanceJointDef, minLength),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dDistanceJointDef, maxLength),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dDistanceJointDef, stiffness),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dDistanceJointDef, damping)
        );

        static const jsi::HostFunctionType createCtor() {
            return B2D_JSI_HOST_FUNCTION_LAMBDA {
                return jsi::Object::createFromHostObject(
                    runtime,
                    std::make_shared<JSIBox2dDistanceJointDef>()
                );
            };
        }
    };
}
```

### 2.4 JSIBox2dMouseJointDef.h

```cpp
#pragma once

#include "box2d/b2_mouse_joint.h"
#include "jsi/Box2dJsiHostObject.h"
#include "JSIBox2dBody.h"
#include "JSIBox2dVec2.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dMouseJointDef : public JsiWrappingSharedPtrHostObject<b2MouseJointDef> {
    public:
        B2D_JSI_PROPERTY_SET(bodyA) {
            getObject()->bodyA = JSIBox2dBody::fromValue(runtime, value);
        }

        B2D_JSI_PROPERTY_SET(bodyB) {
            getObject()->bodyB = JSIBox2dBody::fromValue(runtime, value);
        }

        B2D_JSI_PROPERTY_SET(target) {
            getObject()->target = *JSIBox2dVec2::fromValue(runtime, value);
        }

        B2D_JSI_PROPERTY_SET(maxForce) {
            getObject()->maxForce = value.asNumber();
        }

        B2D_JSI_PROPERTY_SET(stiffness) {
            getObject()->stiffness = value.asNumber();
        }

        B2D_JSI_PROPERTY_SET(damping) {
            getObject()->damping = value.asNumber();
        }

        B2D_JSI_EXPORT_PROPERTY_SETTERS(
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dMouseJointDef, bodyA),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dMouseJointDef, bodyB),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dMouseJointDef, target),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dMouseJointDef, maxForce),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dMouseJointDef, stiffness),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dMouseJointDef, damping)
        );

        static const jsi::HostFunctionType createCtor() {
            return B2D_JSI_HOST_FUNCTION_LAMBDA {
                return jsi::Object::createFromHostObject(
                    runtime,
                    std::make_shared<JSIBox2dMouseJointDef>()
                );
            };
        }
    };
}
```

### 2.5 JSIBox2dJoint.h (Base wrapper)

```cpp
#pragma once

#include "box2d/b2_joint.h"
#include "jsi/Box2dJsiHostObject.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dJoint : public JsiWrappingHostObject<b2Joint*> {
    public:
        JSIBox2dJoint(b2Joint* joint) : JsiWrappingHostObject<b2Joint*>(joint) {}

        B2D_JSI_HOST_FUNCTION(GetBodyA) {
            return jsi::Object::createFromHostObject(
                runtime,
                std::make_shared<JSIBox2dBody>(getObject()->GetBodyA())
            );
        }

        B2D_JSI_HOST_FUNCTION(GetBodyB) {
            return jsi::Object::createFromHostObject(
                runtime,
                std::make_shared<JSIBox2dBody>(getObject()->GetBodyB())
            );
        }

        B2D_JSI_EXPORT_FUNCTIONS(
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, GetBodyA),
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, GetBodyB)
        );

        static b2Joint* fromValue(jsi::Runtime& runtime, const jsi::Value& value) {
            return value.asObject(runtime)
                .asHostObject<JSIBox2dJoint>(runtime)
                ->getObject();
        }
    };
}
```

### 2.6 JSIBox2dMouseJoint.h

```cpp
#pragma once

#include "box2d/b2_mouse_joint.h"
#include "JSIBox2dJoint.h"
#include "JSIBox2dVec2.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dMouseJoint : public JSIBox2dJoint {
    public:
        JSIBox2dMouseJoint(b2MouseJoint* joint) : JSIBox2dJoint(joint) {}

        b2MouseJoint* getMouseJoint() {
            return static_cast<b2MouseJoint*>(getObject());
        }

        B2D_JSI_HOST_FUNCTION(SetTarget) {
            b2Vec2 target = *JSIBox2dVec2::fromValue(runtime, arguments[0]);
            getMouseJoint()->SetTarget(target);
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(GetTarget) {
            return JSIBox2dVec2::toValue(runtime, getMouseJoint()->GetTarget());
        }

        B2D_JSI_EXPORT_FUNCTIONS(
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, GetBodyA),
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, GetBodyB),
            B2D_JSI_EXPORT_FUNC(JSIBox2dMouseJoint, SetTarget),
            B2D_JSI_EXPORT_FUNC(JSIBox2dMouseJoint, GetTarget)
        );
    };
}
```

### 2.7 Update JSIBox2dWorld.h

Add these methods to `JSIBox2dWorld`:

```cpp
#include "JSIBox2dJoint.h"
#include "JSIBox2dMouseJoint.h"
#include "JSIBox2dRevoluteJointDef.h"
#include "JSIBox2dDistanceJointDef.h"
#include "JSIBox2dMouseJointDef.h"

// Inside class JSIBox2dWorld:

B2D_JSI_HOST_FUNCTION(CreateJoint) {
    auto jointDefObj = arguments[0].asObject(runtime);
    
    // Check joint type and create appropriate joint
    if (jointDefObj.isHostObject<JSIBox2dRevoluteJointDef>(runtime)) {
        auto def = jointDefObj.asHostObject<JSIBox2dRevoluteJointDef>(runtime);
        b2Joint* joint = world->CreateJoint(def->getObject().get());
        return jsi::Object::createFromHostObject(
            runtime,
            std::make_shared<JSIBox2dJoint>(joint)
        );
    }
    else if (jointDefObj.isHostObject<JSIBox2dDistanceJointDef>(runtime)) {
        auto def = jointDefObj.asHostObject<JSIBox2dDistanceJointDef>(runtime);
        b2Joint* joint = world->CreateJoint(def->getObject().get());
        return jsi::Object::createFromHostObject(
            runtime,
            std::make_shared<JSIBox2dJoint>(joint)
        );
    }
    else if (jointDefObj.isHostObject<JSIBox2dMouseJointDef>(runtime)) {
        auto def = jointDefObj.asHostObject<JSIBox2dMouseJointDef>(runtime);
        b2MouseJoint* joint = static_cast<b2MouseJoint*>(
            world->CreateJoint(def->getObject().get())
        );
        return jsi::Object::createFromHostObject(
            runtime,
            std::make_shared<JSIBox2dMouseJoint>(joint)
        );
    }
    
    throw jsi::JSError(runtime, "Unknown joint definition type");
}

B2D_JSI_HOST_FUNCTION(DestroyJoint) {
    b2Joint* joint = JSIBox2dJoint::fromValue(runtime, arguments[0]);
    world->DestroyJoint(joint);
    return jsi::Value::undefined();
}

// Update exports:
B2D_JSI_EXPORT_FUNCTIONS(
    B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, CreateBody),
    B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, Step),
    B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, DestroyBody),
    B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, CreateJoint),
    B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, DestroyJoint)
);
```

### 2.8 Update JSIBox2dApi.h

Register new constructors:

```cpp
#include "JSIBox2dRevoluteJointDef.h"
#include "JSIBox2dDistanceJointDef.h"
#include "JSIBox2dMouseJointDef.h"

// Inside JSIBox2dApi constructor:
JSIBox2dApi(jsi::Runtime &runtime) {
    // Existing
    installFunction("b2Vec2", JSIBox2dVec2::createCtor());
    installFunction("b2World", JSIBox2dWorld::createCtor());
    installFunction("b2BodyDef", JSIBox2dBodyDef::createCtor());
    installFunction("b2PolygonShape", JSIBox2dPolygonShape::createCtor());
    installFunction("b2CircleShape", JSIBox2dCircleShape::createCtor());
    installFunction("b2FixtureDef", JSIBox2dFixtureDef::createCtor());
    
    // NEW: Joint definitions
    installFunction("b2RevoluteJointDef", JSIBox2dRevoluteJointDef::createCtor());
    installFunction("b2DistanceJointDef", JSIBox2dDistanceJointDef::createCtor());
    installFunction("b2MouseJointDef", JSIBox2dMouseJointDef::createCtor());
}
```

---

## Phase 3: TypeScript Types

### 3.1 Update src/types.ts

Add these interfaces:

```typescript
// Joint definitions
export interface b2JointDef {
  bodyA?: b2Body;
  bodyB?: b2Body;
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

// Joint instances
export interface b2Joint {
  GetBodyA(): b2Body;
  GetBodyB(): b2Body;
}

export interface b2MouseJoint extends b2Joint {
  SetTarget(target: b2Vec2): void;
  GetTarget(): b2Vec2;
}

// Update b2World
export interface b2World {
  CreateBody: (def: b2BodyDef) => b2Body;
  DestroyBody: (b: b2Body) => void;
  Step: (dt: number, velocityIterations: number, positionIterations: number) => void;
  
  // NEW
  CreateJoint: (def: b2JointDef) => b2Joint;
  DestroyJoint: (joint: b2Joint) => void;
}
```

### 3.2 Update src/Box2d.ts

Add new constructors to the global declaration and exports:

```typescript
declare global {
  var Box2dApi:
    | undefined
    | {
        b2Vec2: (xIn: number, yIn: number) => b2Vec2;
        b2World: (vec: b2Vec2) => b2World;
        b2BodyDef: () => b2BodyDef;
        b2PolygonShape: () => b2PolygonShape;
        b2CircleShape: () => b2CircleShape;
        b2FixtureDef: () => b2FixtureDef;
        // NEW
        b2RevoluteJointDef: () => b2RevoluteJointDef;
        b2DistanceJointDef: () => b2DistanceJointDef;
        b2MouseJointDef: () => b2MouseJointDef;
      };
}
```

---

## Phase 4: Build Configuration

### 4.1 iOS (Podspec)

No changes needed - Box2D source already includes joint headers.

### 4.2 Android (CMakeLists.txt)

Add new source files to `android/CMakeLists.txt`:
```cmake
# No .cpp files for header-only implementations
# Just ensure headers are in include path
```

---

## Testing Checklist

After implementing all phases:

- [ ] Build iOS successfully
- [ ] Build Android successfully  
- [ ] FallingBoxes example works (basic physics)
- [ ] Bridge example works (revolute joints)
- [ ] Pendulum example works (revolute joints)
- [ ] Newton's Cradle works (distance joints)
- [ ] Interaction example works (mouse joint)
- [ ] Car example works (revolute + motor)

---

## Estimated Effort

| Phase | Time | Notes |
|-------|------|-------|
| Phase 1: Compatibility | 1-2h | Apply existing patches |
| Phase 2: Joint Support | 4-6h | Most work - 6 new files |
| Phase 3: TypeScript | 1h | Type definitions |
| Phase 4: Build Config | 1h | Test builds |
| Testing | 2-3h | All examples |
| **Total** | **9-13h** | |

With AI pair programming, this could be done in 1-2 focused sessions.
