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
        
        // Constructor needed for JsiWrappingSharedPtrHostObject
        JSIBox2dRevoluteJointDef() 
            : JsiWrappingSharedPtrHostObject<b2RevoluteJointDef>(std::make_shared<b2RevoluteJointDef>()) {}
    };
}
