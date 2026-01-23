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

        JSIBox2dMouseJointDef() 
            : JsiWrappingSharedPtrHostObject<b2MouseJointDef>(std::make_shared<b2MouseJointDef>()) {}
    };
}
