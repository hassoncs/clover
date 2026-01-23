#pragma once

#include "jsi/Box2dJsiHostObject.h"

#include "JSIBox2dVec2.h"
#include "JSIBox2dWorld.h"
#include "JSIBox2dBodyDef.h"
#include "JSIBox2dPolygonShape.h"
#include "JSIBox2dCircleShape.h"
#include "JSIBox2dFixtureDef.h"
#include "JSIBox2dRevoluteJointDef.h"
#include "JSIBox2dDistanceJointDef.h"
#include "JSIBox2dMouseJointDef.h"
#include "JSIBox2dContactListener.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dApi : public RNBox2dJsi::JsiHostObject {
    public:
        JSIBox2dApi(jsi::Runtime &runtime) {
            installFunction("b2Vec2", JSIBox2dVec2::createCtor());
            installFunction("b2World", JSIBox2dWorld::createCtor());
            installFunction("b2BodyDef", JSIBox2dBodyDef::createCtor());
            installFunction("b2PolygonShape", JSIBox2dPolygonShape::createCtor());
            installFunction("b2CircleShape", JSIBox2dCircleShape::createCtor());
            installFunction("b2FixtureDef", JSIBox2dFixtureDef::createCtor());
            installFunction("b2RevoluteJointDef", JSIBox2dRevoluteJointDef::createCtor());
            installFunction("b2DistanceJointDef", JSIBox2dDistanceJointDef::createCtor());
            installFunction("b2MouseJointDef", JSIBox2dMouseJointDef::createCtor());
            installFunction("JSContactListener", JSIBox2dJSContactListener::createCtor());
        }
    };
}
