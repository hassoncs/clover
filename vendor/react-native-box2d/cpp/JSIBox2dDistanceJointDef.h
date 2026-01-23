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

        // Constructor needed for JsiWrappingSharedPtrHostObject
        JSIBox2dDistanceJointDef() 
            : JsiWrappingSharedPtrHostObject<b2DistanceJointDef>(std::make_shared<b2DistanceJointDef>()) {}
    };
}
