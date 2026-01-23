#pragma once

#include "box2d/b2_contact.h"
#include "box2d/b2_collision.h"

#include <jsi/jsi.h>
#include "jsi/Box2dJsiHostObject.h"
#include "jsi/Box2dJsiWrappingHostObjects.h"
#include "JSIBox2dFixture.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dWorldManifold : public RNBox2dJsi::JsiHostObject {
    private:
        b2WorldManifold manifold;
        int pointCount;
    public:
        JSIBox2dWorldManifold(const b2WorldManifold& m, int count)
            : manifold(m), pointCount(count) {}

        B2D_JSI_HOST_FUNCTION(get_normal) {
            auto normalObj = jsi::Object(runtime);
            normalObj.setProperty(runtime, "x", (double)manifold.normal.x);
            normalObj.setProperty(runtime, "y", (double)manifold.normal.y);
            return normalObj;
        }

        B2D_JSI_HOST_FUNCTION(get_points) {
            auto pointsArr = jsi::Array(runtime, pointCount);
            for (int i = 0; i < pointCount; i++) {
                auto pointObj = jsi::Object(runtime);
                pointObj.setProperty(runtime, "x", (double)manifold.points[i].x);
                pointObj.setProperty(runtime, "y", (double)manifold.points[i].y);
                pointsArr.setValueAtIndex(runtime, i, pointObj);
            }
            return pointsArr;
        }

        B2D_JSI_HOST_FUNCTION(get_separations) {
            auto sepArr = jsi::Array(runtime, pointCount);
            for (int i = 0; i < pointCount; i++) {
                sepArr.setValueAtIndex(runtime, i, jsi::Value((double)manifold.separations[i]));
            }
            return sepArr;
        }

        B2D_JSI_EXPORT_FUNCTIONS(
            B2D_JSI_EXPORT_FUNC(JSIBox2dWorldManifold, get_normal),
            B2D_JSI_EXPORT_FUNC(JSIBox2dWorldManifold, get_points),
            B2D_JSI_EXPORT_FUNC(JSIBox2dWorldManifold, get_separations)
        );
    };

    class JSIBox2dContact : public JsiWrappingHostObject<b2Contact*> {
    public:
        JSIBox2dContact(b2Contact* contact)
            : JsiWrappingHostObject<b2Contact*>(contact) {}

        B2D_JSI_HOST_FUNCTION(GetFixtureA) {
            b2Fixture* fixture = getObject()->GetFixtureA();
            return jsi::Object::createFromHostObject(
                runtime,
                std::make_shared<JSIBox2dFixture>(fixture)
            );
        }

        B2D_JSI_HOST_FUNCTION(GetFixtureB) {
            b2Fixture* fixture = getObject()->GetFixtureB();
            return jsi::Object::createFromHostObject(
                runtime,
                std::make_shared<JSIBox2dFixture>(fixture)
            );
        }

        B2D_JSI_HOST_FUNCTION(IsTouching) {
            return jsi::Value(getObject()->IsTouching());
        }

        B2D_JSI_HOST_FUNCTION(IsEnabled) {
            return jsi::Value(getObject()->IsEnabled());
        }

        B2D_JSI_HOST_FUNCTION(SetEnabled) {
            bool enabled = arguments[0].getBool();
            getObject()->SetEnabled(enabled);
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(GetManifold) {
            const b2Manifold* manifold = getObject()->GetManifold();
            auto manifoldObj = jsi::Object(runtime);
            manifoldObj.setProperty(runtime, "pointCount", (int)manifold->pointCount);
            
            auto localNormal = jsi::Object(runtime);
            localNormal.setProperty(runtime, "x", (double)manifold->localNormal.x);
            localNormal.setProperty(runtime, "y", (double)manifold->localNormal.y);
            manifoldObj.setProperty(runtime, "localNormal", localNormal);
            
            auto localPoint = jsi::Object(runtime);
            localPoint.setProperty(runtime, "x", (double)manifold->localPoint.x);
            localPoint.setProperty(runtime, "y", (double)manifold->localPoint.y);
            manifoldObj.setProperty(runtime, "localPoint", localPoint);
            
            return manifoldObj;
        }

        B2D_JSI_HOST_FUNCTION(GetWorldManifold) {
            b2WorldManifold worldManifold;
            getObject()->GetWorldManifold(&worldManifold);
            const b2Manifold* manifold = getObject()->GetManifold();
            
            return jsi::Object::createFromHostObject(
                runtime,
                std::make_shared<JSIBox2dWorldManifold>(worldManifold, manifold->pointCount)
            );
        }

        B2D_JSI_HOST_FUNCTION(GetFriction) {
            return jsi::Value((double)getObject()->GetFriction());
        }

        B2D_JSI_HOST_FUNCTION(GetRestitution) {
            return jsi::Value((double)getObject()->GetRestitution());
        }

        B2D_JSI_EXPORT_FUNCTIONS(
            B2D_JSI_EXPORT_FUNC(JSIBox2dContact, GetFixtureA),
            B2D_JSI_EXPORT_FUNC(JSIBox2dContact, GetFixtureB),
            B2D_JSI_EXPORT_FUNC(JSIBox2dContact, IsTouching),
            B2D_JSI_EXPORT_FUNC(JSIBox2dContact, IsEnabled),
            B2D_JSI_EXPORT_FUNC(JSIBox2dContact, SetEnabled),
            B2D_JSI_EXPORT_FUNC(JSIBox2dContact, GetManifold),
            B2D_JSI_EXPORT_FUNC(JSIBox2dContact, GetWorldManifold),
            B2D_JSI_EXPORT_FUNC(JSIBox2dContact, GetFriction),
            B2D_JSI_EXPORT_FUNC(JSIBox2dContact, GetRestitution)
        );

        static b2Contact* fromValue(jsi::Runtime& runtime, const jsi::Value& obj) {
            return obj.asObject(runtime)
                .asHostObject<JSIBox2dContact>(runtime)
                ->getObject();
        }
    };
}
