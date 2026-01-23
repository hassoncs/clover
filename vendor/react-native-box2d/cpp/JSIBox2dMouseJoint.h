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
