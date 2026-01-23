#pragma once

#include "box2d/b2_world.h"
#include "JSIBox2dVec2.h"
#include "JSIBox2dBodyDef.h"
#include "JSIBox2dBody.h"
#include "JSIBox2dJoint.h"
#include "JSIBox2dMouseJoint.h"
#include "JSIBox2dRevoluteJointDef.h"
#include "JSIBox2dDistanceJointDef.h"
#include "JSIBox2dMouseJointDef.h"
#include "JSIBox2dContactListener.h"
#include "JSIBox2dFixture.h"

#include <jsi/jsi.h>
#include "jsi/Box2dJsiHostObject.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dWorld : public JsiHostObject {
    private:
        b2World *world;
        std::shared_ptr<JSIBox2dContactListener> contactListener;
    public:
        B2D_JSI_HOST_FUNCTION(CreateBody) {
            b2Body *body = world->CreateBody(
                    JSIBox2dBodyDef::fromValue(runtime, arguments[0]).get());
            return jsi::Object::createFromHostObject(
                    runtime,
                    std::make_shared<JSIBox2dBody>(std::move(body))
            );
        }

        B2D_JSI_HOST_FUNCTION(Step) {
            world->Step(
                    arguments[0].asNumber(),
                    arguments[1].asNumber(),
                    arguments[2].asNumber()
            );
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(DestroyBody) {
            world->DestroyBody(
                    JSIBox2dBody::fromValue(runtime, arguments[0])
            );
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(CreateJoint) {
            auto jointDefObj = arguments[0].asObject(runtime);
            
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

        B2D_JSI_HOST_FUNCTION(SetContactListener) {
            if (arguments[0].isObject()) {
                auto listenerObj = arguments[0].asObject(runtime);
                if (listenerObj.isHostObject<JSIBox2dJSContactListener>(runtime)) {
                    contactListener = listenerObj.asHostObject<JSIBox2dJSContactListener>(runtime)->getNativeListener();
                    world->SetContactListener(contactListener.get());
                }
            }
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(RayCast) {
            auto callbackObj = arguments[0].asObject(runtime);
            auto p1 = JSIBox2dVec2::fromValue(runtime, arguments[1]);
            auto p2 = JSIBox2dVec2::fromValue(runtime, arguments[2]);
            
            if (!callbackObj.hasProperty(runtime, "ReportFixture")) {
                throw jsi::JSError(runtime, "RayCast callback must have ReportFixture method");
            }
            
            auto reportFunc = callbackObj.getPropertyAsFunction(runtime, "ReportFixture");
            
            class JSRayCastCallback : public b2RayCastCallback {
            public:
                jsi::Runtime& rt;
                jsi::Function& callback;
                
                JSRayCastCallback(jsi::Runtime& runtime, jsi::Function& func) 
                    : rt(runtime), callback(func) {}
                
                float ReportFixture(b2Fixture* fixture, const b2Vec2& point, 
                                   const b2Vec2& normal, float fraction) override {
                    auto fixtureWrapper = jsi::Object::createFromHostObject(
                        rt, std::make_shared<JSIBox2dFixture>(fixture));
                    auto pointObj = JSIBox2dVec2::toValue(rt, point);
                    auto normalObj = JSIBox2dVec2::toValue(rt, normal);
                    
                    auto result = callback.call(rt, fixtureWrapper, pointObj, normalObj, 
                                               jsi::Value((double)fraction));
                    
                    if (result.isNumber()) {
                        return (float)result.asNumber();
                    }
                    return 1.0f;
                }
            };
            
            JSRayCastCallback jsCallback(runtime, reportFunc);
            world->RayCast(&jsCallback, *p1, *p2);
            
            return jsi::Value::undefined();
        }

        B2D_JSI_HOST_FUNCTION(QueryAABB) {
            auto callbackObj = arguments[0].asObject(runtime);
            auto lowerBound = JSIBox2dVec2::fromValue(runtime, arguments[1]);
            auto upperBound = JSIBox2dVec2::fromValue(runtime, arguments[2]);
            
            if (!callbackObj.hasProperty(runtime, "ReportFixture")) {
                throw jsi::JSError(runtime, "QueryAABB callback must have ReportFixture method");
            }
            
            auto reportFunc = callbackObj.getPropertyAsFunction(runtime, "ReportFixture");
            
            class JSQueryCallback : public b2QueryCallback {
            public:
                jsi::Runtime& rt;
                jsi::Function& callback;
                
                JSQueryCallback(jsi::Runtime& runtime, jsi::Function& func) 
                    : rt(runtime), callback(func) {}
                
                bool ReportFixture(b2Fixture* fixture) override {
                    auto fixtureWrapper = jsi::Object::createFromHostObject(
                        rt, std::make_shared<JSIBox2dFixture>(fixture));
                    
                    auto result = callback.call(rt, fixtureWrapper);
                    
                    if (result.isBool()) {
                        return result.getBool();
                    }
                    return true;
                }
            };
            
            b2AABB aabb;
            aabb.lowerBound = *lowerBound;
            aabb.upperBound = *upperBound;
            
            JSQueryCallback jsCallback(runtime, reportFunc);
            world->QueryAABB(&jsCallback, aabb);
            
            return jsi::Value::undefined();
        }

        B2D_JSI_EXPORT_FUNCTIONS(B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, CreateBody),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, Step),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, DestroyBody),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, CreateJoint),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, DestroyJoint),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, SetContactListener),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, RayCast),
                             B2D_JSI_EXPORT_FUNC(JSIBox2dWorld, QueryAABB));

        JSIBox2dWorld(b2Vec2 *gravity) {
            this->world = new b2World(*gravity);
        }

        static const jsi::HostFunctionType
        createCtor() {
            return B2D_JSI_HOST_FUNCTION_LAMBDA {
                auto gravity = JSIBox2dVec2::fromValue(runtime, arguments[0]);

                return jsi::Object::createFromHostObject(
                        runtime,
                        std::make_shared<JSIBox2dWorld>(gravity.get())
                );
            };
        };
    };
}
