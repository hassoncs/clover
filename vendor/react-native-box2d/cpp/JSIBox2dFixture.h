#pragma once

#include "box2d/b2_fixture.h"

#include <jsi/jsi.h>
#include "jsi/Box2dJsiHostObject.h"
#include "jsi/Box2dJsiWrappingHostObjects.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dBody;

    class JSIBox2dFixture : public JsiWrappingHostObject<b2Fixture*> {
    public:
        JSIBox2dFixture(b2Fixture* fixture)
            : JsiWrappingHostObject<b2Fixture*>(fixture) {}

        B2D_JSI_HOST_FUNCTION(GetBody) {
            b2Body* body = getObject()->GetBody();
            return jsi::Object::createFromHostObject(
                runtime,
                std::make_shared<JSIBox2dBody>(body)
            );
        }

        B2D_JSI_HOST_FUNCTION(IsSensor) {
            return jsi::Value(getObject()->IsSensor());
        }

        B2D_JSI_HOST_FUNCTION(GetDensity) {
            return jsi::Value((double)getObject()->GetDensity());
        }

        B2D_JSI_HOST_FUNCTION(GetFriction) {
            return jsi::Value((double)getObject()->GetFriction());
        }

        B2D_JSI_HOST_FUNCTION(GetRestitution) {
            return jsi::Value((double)getObject()->GetRestitution());
        }

        B2D_JSI_HOST_FUNCTION(GetFilterData) {
            const b2Filter& filter = getObject()->GetFilterData();
            auto filterObj = jsi::Object(runtime);
            filterObj.setProperty(runtime, "categoryBits", (int)filter.categoryBits);
            filterObj.setProperty(runtime, "maskBits", (int)filter.maskBits);
            filterObj.setProperty(runtime, "groupIndex", (int)filter.groupIndex);
            return filterObj;
        }

        B2D_JSI_HOST_FUNCTION(SetSensor) {
            getObject()->SetSensor(arguments[0].getBool());
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(SetFilterData) {
            auto filterObj = arguments[0].asObject(runtime);
            b2Filter filter;
            if (filterObj.hasProperty(runtime, "categoryBits")) {
                filter.categoryBits = (uint16)filterObj.getProperty(runtime, "categoryBits").asNumber();
            }
            if (filterObj.hasProperty(runtime, "maskBits")) {
                filter.maskBits = (uint16)filterObj.getProperty(runtime, "maskBits").asNumber();
            }
            if (filterObj.hasProperty(runtime, "groupIndex")) {
                filter.groupIndex = (int16)filterObj.getProperty(runtime, "groupIndex").asNumber();
            }
            getObject()->SetFilterData(filter);
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(TestPoint) {
            auto point = JSIBox2dVec2::fromValue(runtime, arguments[0]);
            return jsi::Value(getObject()->TestPoint(*point));
        }

        B2D_JSI_EXPORT_FUNCTIONS(
            B2D_JSI_EXPORT_FUNC(JSIBox2dFixture, GetBody),
            B2D_JSI_EXPORT_FUNC(JSIBox2dFixture, IsSensor),
            B2D_JSI_EXPORT_FUNC(JSIBox2dFixture, SetSensor),
            B2D_JSI_EXPORT_FUNC(JSIBox2dFixture, GetDensity),
            B2D_JSI_EXPORT_FUNC(JSIBox2dFixture, GetFriction),
            B2D_JSI_EXPORT_FUNC(JSIBox2dFixture, GetRestitution),
            B2D_JSI_EXPORT_FUNC(JSIBox2dFixture, GetFilterData),
            B2D_JSI_EXPORT_FUNC(JSIBox2dFixture, SetFilterData),
            B2D_JSI_EXPORT_FUNC(JSIBox2dFixture, TestPoint)
        );

        static b2Fixture* fromValue(jsi::Runtime& runtime, const jsi::Value& obj) {
            return obj.asObject(runtime)
                .asHostObject<JSIBox2dFixture>(runtime)
                ->getObject();
        }
    };
}
