import Box2DLib from "box2d-wasm";
import {
  Box2DAPI,
  b2Vec2,
  b2World,
  b2BodyDef,
  b2PolygonShape,
  b2CircleShape,
  b2FixtureDef,
} from "./types";

let box2dInstance: any = null;

export const initPhysics = async (): Promise<Box2DAPI> => {
  if (!box2dInstance) {
    box2dInstance = await Box2DLib({
      locateFile: (url: string) => {
        if (url.endsWith(".wasm")) {
          return "/box2d.wasm";
        }
        return url;
      },
    });
  }

  const {
    b2Vec2,
    b2World,
    b2BodyDef,
    b2PolygonShape,
    b2CircleShape,
    b2FixtureDef,
    b2RevoluteJointDef,
    b2DistanceJointDef,
    b2MouseJointDef,
    _malloc,
    HEAPF32,
    wrapPointer,
  } = box2dInstance;

  // --- MONKEY PATCHING FOR COMPATIBILITY ---
  // JSI (native) uses properties .x/.y, WASM uses .get_x()/.get_y()
  if (!Object.getOwnPropertyDescriptor(b2Vec2.prototype, "x")) {
    Object.defineProperty(b2Vec2.prototype, "x", {
      get() {
        return this.get_x();
      },
      set(value) {
        this.set_x(value);
      },
    });
    Object.defineProperty(b2Vec2.prototype, "y", {
      get() {
        return this.get_y();
      },
      set(value) {
        this.set_y(value);
      },
    });
  }

  // Alias SetRadius -> set_m_radius if needed
  if (!b2CircleShape.prototype.SetRadius && b2CircleShape.prototype.set_m_radius) {
    b2CircleShape.prototype.SetRadius = b2CircleShape.prototype.set_m_radius;
  }
  // Also JSI might use GetRadius -> get_m_radius
  if (!b2CircleShape.prototype.GetRadius && b2CircleShape.prototype.get_m_radius) {
    b2CircleShape.prototype.GetRadius = b2CircleShape.prototype.get_m_radius;
  }

  // Polyfill CreateFixture2 (shape, density) -> CreateFixture(def)
  // JSI exposes CreateFixture2 as a convenience.
  if (!b2World.prototype.CreateBody && b2World.prototype.CreateBody_2) {
      // Sometimes emscripten overloads are named differently, but usually standard names exist.
      // If needed, check box2d-wasm docs. But likely CreateBody is fine.
  }

  // The b2Body comes from world.CreateBody(), so we need to patch b2Body.prototype.
  // However, b2Body might not be directly exposed in the same way if it's an internal class? 
  // No, we destructured it from box2dInstance, but wait... b2Body is NOT in the destructuring list!
  
  // We need to get b2Body from the instance to patch it.
  const b2Body = box2dInstance.b2Body;
  if (b2Body && !b2Body.prototype.CreateFixture2) {
    b2Body.prototype.CreateFixture2 = function(shape: any, density: number) {
      const def = new b2FixtureDef();
      def.shape = shape;
      def.density = density;
      return this.CreateFixture(def);
    };
  }

  return {
    b2Vec2: (x: number, y: number) => new b2Vec2(x, y),
    b2World: (gravity: b2Vec2) => new b2World(gravity),
    b2BodyDef: () => new b2BodyDef(),
    b2PolygonShape: () => new b2PolygonShape(),
    b2CircleShape: () => new b2CircleShape(),
    b2FixtureDef: () => new b2FixtureDef(),
    b2RevoluteJointDef: () => new b2RevoluteJointDef(),
    b2DistanceJointDef: () => new b2DistanceJointDef(),
    b2MouseJointDef: () => new b2MouseJointDef(),
  };
};
