#pragma once

#include "box2d/b2_joint.h"
#include "box2d/b2_revolute_joint.h"
#include "box2d/b2_prismatic_joint.h"
#include "box2d/b2_wheel_joint.h"
#include "jsi/Box2dJsiHostObject.h"
#include "JSIBox2dBody.h"

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

        B2D_JSI_HOST_FUNCTION(GetType) {
            return jsi::Value((int)getObject()->GetType());
        }

        B2D_JSI_HOST_FUNCTION(IsEnabled) {
            return jsi::Value(getObject()->IsEnabled());
        }

        B2D_JSI_HOST_FUNCTION(SetMotorSpeed) {
            float speed = arguments[0].asNumber();
            b2JointType type = getObject()->GetType();
            
            switch (type) {
                case e_revoluteJoint:
                    static_cast<b2RevoluteJoint*>(getObject())->SetMotorSpeed(speed);
                    break;
                case e_prismaticJoint:
                    static_cast<b2PrismaticJoint*>(getObject())->SetMotorSpeed(speed);
                    break;
                case e_wheelJoint:
                    static_cast<b2WheelJoint*>(getObject())->SetMotorSpeed(speed);
                    break;
                default:
                    break;
            }
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(GetMotorSpeed) {
            b2JointType type = getObject()->GetType();
            
            switch (type) {
                case e_revoluteJoint:
                    return jsi::Value((double)static_cast<b2RevoluteJoint*>(getObject())->GetMotorSpeed());
                case e_prismaticJoint:
                    return jsi::Value((double)static_cast<b2PrismaticJoint*>(getObject())->GetMotorSpeed());
                case e_wheelJoint:
                    return jsi::Value((double)static_cast<b2WheelJoint*>(getObject())->GetMotorSpeed());
                default:
                    return jsi::Value(0.0);
            }
        }

        B2D_JSI_HOST_FUNCTION(EnableMotor) {
            bool enable = arguments[0].getBool();
            b2JointType type = getObject()->GetType();
            
            switch (type) {
                case e_revoluteJoint:
                    static_cast<b2RevoluteJoint*>(getObject())->EnableMotor(enable);
                    break;
                case e_prismaticJoint:
                    static_cast<b2PrismaticJoint*>(getObject())->EnableMotor(enable);
                    break;
                case e_wheelJoint:
                    static_cast<b2WheelJoint*>(getObject())->EnableMotor(enable);
                    break;
                default:
                    break;
            }
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(SetMaxMotorTorque) {
            float torque = arguments[0].asNumber();
            b2JointType type = getObject()->GetType();
            
            switch (type) {
                case e_revoluteJoint:
                    static_cast<b2RevoluteJoint*>(getObject())->SetMaxMotorTorque(torque);
                    break;
                case e_wheelJoint:
                    static_cast<b2WheelJoint*>(getObject())->SetMaxMotorTorque(torque);
                    break;
                default:
                    break;
            }
            return jsi::Value::undefined();
        }

        B2D_JSI_EXPORT_FUNCTIONS(
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, GetBodyA),
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, GetBodyB),
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, GetType),
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, IsEnabled),
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, SetMotorSpeed),
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, GetMotorSpeed),
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, EnableMotor),
            B2D_JSI_EXPORT_FUNC(JSIBox2dJoint, SetMaxMotorTorque)
        );

        static b2Joint* fromValue(jsi::Runtime& runtime, const jsi::Value& value) {
            return value.asObject(runtime)
                .asHostObject<JSIBox2dJoint>(runtime)
                ->getObject();
        }
    };
}
