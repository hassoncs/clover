#pragma once

#include "box2d/b2_body.h"

#include "JSIBox2dVec2.h"
#include "JSIBox2dFixtureDef.h"

#include <jsi/jsi.h>
#include "jsi/Box2dJsiWrappingHostObjects.h"
#include "utils.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dBody : public JsiWrappingHostObject<b2Body *> {
    public:
        JSIBox2dBody(b2Body *body)
                : JsiWrappingHostObject<b2Body *>(body) {}

        B2D_JSI_HOST_FUNCTION(GetPosition) {
            return JSIBox2dVec2::toValue(runtime, getObject()->GetPosition());
        }

        B2D_JSI_HOST_FUNCTION(GetAngle) {
            return jsi::Value((double) getObject()->GetAngle());
        }

        B2D_JSI_HOST_FUNCTION(CreateFixture) {
            if (arguments[0].isObject()) {
                const auto obj = arguments[0].asObject(runtime);
                if (obj.isHostObject<JSIBox2dFixtureDef>(runtime)) {
                    getObject()->CreateFixture(
                            JSIBox2dFixtureDef::fromValue(runtime, arguments[0]).get());
                    return jsi::Value::undefined();
                }
            }

            throw jsi::JSError(runtime, "Unsupported shape type");
        }

        B2D_JSI_HOST_FUNCTION(CreateFixture2) {
            b2Shape *shape = Utils::getShape(runtime, arguments[0]);
            getObject()->CreateFixture(shape, arguments[1].asNumber());
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(SetLinearVelocity) {
            auto vector = JSIBox2dVec2::fromValue(runtime, arguments[0]).get();
            getObject()->SetLinearVelocity(*vector);
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(GetLinearVelocity) {
            return JSIBox2dVec2::toValue(runtime, getObject()->GetLinearVelocity());
        }

        B2D_JSI_HOST_FUNCTION(SetLinearDamping) {
            auto linearDamping = arguments[0].asNumber();
            getObject()->SetLinearDamping(linearDamping);
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(SetTransform) {
            auto position = JSIBox2dVec2::fromValue(runtime, arguments[0]).get();
            auto angle = arguments[1].asNumber();
            getObject()->SetTransform(*position, angle);
            return jsi::Value::undefined();
        }

//        B2D_JSI_HOST_FUNCTION(GetTransform) {
//            b2Transform transform;
//            getObject()->GetTransform(&transform);
//            return JSIBox2dTransform::toValue(runtime, transform);
//        }

        B2D_JSI_HOST_FUNCTION(ApplyForceToCenter) {
            auto vector = JSIBox2dVec2::fromValue(runtime, arguments[0]).get();
            getObject()->ApplyForceToCenter(*vector, arguments[1].getBool());
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(ApplyLinearImpulseToCenter) {
            auto vector = JSIBox2dVec2::fromValue(runtime, arguments[0]).get();
            getObject()->ApplyLinearImpulseToCenter(*vector, arguments[1].getBool());
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(ApplyForce) {
            auto force = JSIBox2dVec2::fromValue(runtime, arguments[0]).get();
            auto point = JSIBox2dVec2::fromValue(runtime, arguments[1]).get();
            bool wake = count > 2 ? arguments[2].getBool() : true;
            getObject()->ApplyForce(*force, *point, wake);
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(ApplyLinearImpulse) {
            auto impulse = JSIBox2dVec2::fromValue(runtime, arguments[0]).get();
            auto point = JSIBox2dVec2::fromValue(runtime, arguments[1]).get();
            bool wake = count > 2 ? arguments[2].getBool() : true;
            getObject()->ApplyLinearImpulse(*impulse, *point, wake);
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(ApplyTorque) {
            float torque = arguments[0].asNumber();
            bool wake = count > 1 ? arguments[1].getBool() : true;
            getObject()->ApplyTorque(torque, wake);
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(ApplyAngularImpulse) {
            float impulse = arguments[0].asNumber();
            bool wake = count > 1 ? arguments[1].getBool() : true;
            getObject()->ApplyAngularImpulse(impulse, wake);
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(GetAngularVelocity) {
            return jsi::Value((double)getObject()->GetAngularVelocity());
        }

        B2D_JSI_HOST_FUNCTION(SetAngularVelocity) {
            getObject()->SetAngularVelocity(arguments[0].asNumber());
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(GetMass) {
            return jsi::Value((double)getObject()->GetMass());
        }

        B2D_JSI_HOST_FUNCTION(GetType) {
            return jsi::Value((int)getObject()->GetType());
        }

        B2D_JSI_HOST_FUNCTION(SetType) {
            getObject()->SetType((b2BodyType)arguments[0].asNumber());
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(IsAwake) {
            return jsi::Value(getObject()->IsAwake());
        }

        B2D_JSI_HOST_FUNCTION(SetAwake) {
            getObject()->SetAwake(arguments[0].getBool());
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(GetUserData) {
            return jsi::Value((double)getObject()->GetUserData().pointer);
        }

        B2D_JSI_HOST_FUNCTION(SetUserData) {
            getObject()->GetUserData().pointer = (uintptr_t)arguments[0].asNumber();
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(IsEnabled) {
            return jsi::Value(getObject()->IsEnabled());
        }

        B2D_JSI_HOST_FUNCTION(SetEnabled) {
            getObject()->SetEnabled(arguments[0].getBool());
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(IsBullet) {
            return jsi::Value(getObject()->IsBullet());
        }

        B2D_JSI_HOST_FUNCTION(SetBullet) {
            getObject()->SetBullet(arguments[0].getBool());
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(IsFixedRotation) {
            return jsi::Value(getObject()->IsFixedRotation());
        }

        B2D_JSI_HOST_FUNCTION(SetFixedRotation) {
            getObject()->SetFixedRotation(arguments[0].getBool());
            return jsi::Value::undefined();
        }

        B2D_JSI_EXPORT_FUNCTIONS(B2D_JSI_EXPORT_FUNC(JSIBox2dBody, GetAngle),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, GetPosition),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, CreateFixture),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, CreateFixture2),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, SetLinearVelocity),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, GetLinearVelocity),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, SetLinearDamping),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, SetTransform),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, ApplyForceToCenter),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, ApplyLinearImpulseToCenter),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, ApplyForce),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, ApplyLinearImpulse),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, ApplyTorque),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, ApplyAngularImpulse),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, GetAngularVelocity),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, SetAngularVelocity),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, GetMass),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, GetType),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, SetType),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, IsAwake),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, SetAwake),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, GetUserData),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, SetUserData),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, IsEnabled),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, SetEnabled),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, IsBullet),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, SetBullet),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, IsFixedRotation),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dBody, SetFixedRotation)
        );

        /**
        * Returns the underlying object from a host object of this type
        */
        static b2Body* fromValue(jsi::Runtime &runtime,
                                                 const jsi::Value &obj) {
            return obj.asObject(runtime)
                    .asHostObject<JSIBox2dBody>(runtime)
                    ->getObject();
        }

    };
}
