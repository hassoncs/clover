#pragma once

#include "box2d/b2_world_callbacks.h"
#include "box2d/b2_contact.h"

#include <jsi/jsi.h>
#include "jsi/Box2dJsiHostObject.h"
#include "JSIBox2dContact.h"

namespace Box2d {
    using namespace facebook;

    class JSIBox2dContactListener : public b2ContactListener {
    private:
        jsi::Runtime& runtime;
        std::shared_ptr<jsi::Function> beginContactCb;
        std::shared_ptr<jsi::Function> endContactCb;
        std::shared_ptr<jsi::Function> preSolveCb;
        std::shared_ptr<jsi::Function> postSolveCb;

    public:
        JSIBox2dContactListener(jsi::Runtime& rt) : runtime(rt) {}

        void setBeginContact(std::shared_ptr<jsi::Function> cb) {
            beginContactCb = cb;
        }

        void setEndContact(std::shared_ptr<jsi::Function> cb) {
            endContactCb = cb;
        }

        void setPreSolve(std::shared_ptr<jsi::Function> cb) {
            preSolveCb = cb;
        }

        void setPostSolve(std::shared_ptr<jsi::Function> cb) {
            postSolveCb = cb;
        }

        void BeginContact(b2Contact* contact) override {
            if (beginContactCb) {
                auto contactWrapper = jsi::Object::createFromHostObject(
                    runtime,
                    std::make_shared<JSIBox2dContact>(contact)
                );
                beginContactCb->call(runtime, contactWrapper);
            }
        }

        void EndContact(b2Contact* contact) override {
            if (endContactCb) {
                auto contactWrapper = jsi::Object::createFromHostObject(
                    runtime,
                    std::make_shared<JSIBox2dContact>(contact)
                );
                endContactCb->call(runtime, contactWrapper);
            }
        }

        void PreSolve(b2Contact* contact, const b2Manifold* oldManifold) override {
            if (preSolveCb) {
                auto contactWrapper = jsi::Object::createFromHostObject(
                    runtime,
                    std::make_shared<JSIBox2dContact>(contact)
                );
                preSolveCb->call(runtime, contactWrapper);
            }
        }

        void PostSolve(b2Contact* contact, const b2ContactImpulse* impulse) override {
            if (postSolveCb) {
                auto contactWrapper = jsi::Object::createFromHostObject(
                    runtime,
                    std::make_shared<JSIBox2dContact>(contact)
                );
                
                auto impulseObj = jsi::Object(runtime);
                auto normalImpulses = jsi::Array(runtime, impulse->count);
                auto tangentImpulses = jsi::Array(runtime, impulse->count);
                
                for (int i = 0; i < impulse->count; i++) {
                    normalImpulses.setValueAtIndex(runtime, i, jsi::Value((double)impulse->normalImpulses[i]));
                    tangentImpulses.setValueAtIndex(runtime, i, jsi::Value((double)impulse->tangentImpulses[i]));
                }
                
                impulseObj.setProperty(runtime, "normalImpulses", normalImpulses);
                impulseObj.setProperty(runtime, "tangentImpulses", tangentImpulses);
                impulseObj.setProperty(runtime, "count", impulse->count);
                
                postSolveCb->call(runtime, contactWrapper, impulseObj);
            }
        }
    };

    class JSIBox2dJSContactListener : public RNBox2dJsi::JsiHostObject {
    private:
        std::shared_ptr<JSIBox2dContactListener> nativeListener;

    public:
        JSIBox2dJSContactListener(jsi::Runtime& runtime)
            : nativeListener(std::make_shared<JSIBox2dContactListener>(runtime)) {}

        std::shared_ptr<JSIBox2dContactListener> getNativeListener() {
            return nativeListener;
        }

        B2D_JSI_PROPERTY_SET(BeginContact) {
            if (value.isObject() && value.asObject(runtime).isFunction(runtime)) {
                auto func = std::make_shared<jsi::Function>(value.asObject(runtime).asFunction(runtime));
                nativeListener->setBeginContact(func);
            }
        }

        B2D_JSI_PROPERTY_SET(EndContact) {
            if (value.isObject() && value.asObject(runtime).isFunction(runtime)) {
                auto func = std::make_shared<jsi::Function>(value.asObject(runtime).asFunction(runtime));
                nativeListener->setEndContact(func);
            }
        }

        B2D_JSI_PROPERTY_SET(PreSolve) {
            if (value.isObject() && value.asObject(runtime).isFunction(runtime)) {
                auto func = std::make_shared<jsi::Function>(value.asObject(runtime).asFunction(runtime));
                nativeListener->setPreSolve(func);
            }
        }

        B2D_JSI_PROPERTY_SET(PostSolve) {
            if (value.isObject() && value.asObject(runtime).isFunction(runtime)) {
                auto func = std::make_shared<jsi::Function>(value.asObject(runtime).asFunction(runtime));
                nativeListener->setPostSolve(func);
            }
        }

        B2D_JSI_EXPORT_PROPERTY_SETTERS(
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dJSContactListener, BeginContact),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dJSContactListener, EndContact),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dJSContactListener, PreSolve),
            B2D_JSI_EXPORT_PROP_SET(JSIBox2dJSContactListener, PostSolve)
        );

        static const jsi::HostFunctionType createCtor() {
            return B2D_JSI_HOST_FUNCTION_LAMBDA {
                return jsi::Object::createFromHostObject(
                    runtime,
                    std::make_shared<JSIBox2dJSContactListener>(runtime)
                );
            };
        };

        static std::shared_ptr<JSIBox2dContactListener> fromValue(jsi::Runtime& runtime, const jsi::Value& obj) {
            return obj.asObject(runtime)
                .asHostObject<JSIBox2dJSContactListener>(runtime)
                ->getNativeListener();
        }
    };
}
