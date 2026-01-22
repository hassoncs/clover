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

  // Polyfill b2MouseJoint SetTarget
  const b2MouseJoint = box2dInstance.b2MouseJoint;
  if (b2MouseJoint && !b2MouseJoint.prototype.SetTarget) {
    if (b2MouseJoint.prototype.set_m_targetA) {
      b2MouseJoint.prototype.SetTarget = b2MouseJoint.prototype.set_m_targetA;
    } else if (b2MouseJoint.prototype.SetTargetA) {
      b2MouseJoint.prototype.SetTarget = b2MouseJoint.prototype.SetTargetA;
    }
  }

  const { getPointer } = box2dInstance;
  
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
    
    JSContactListener: box2dInstance.JSContactListener,
    b2Contact: box2dInstance.b2Contact,
    wrapPointer: box2dInstance.wrapPointer,
    
    castToMouseJoint: (joint: any) => {
      const b2MouseJoint = box2dInstance.b2MouseJoint;
      if (!b2MouseJoint) {
        console.warn('[Physics.web] b2MouseJoint class not available');
        return joint;
      }
      
      const ptr = getPointer(joint);
      if (ptr && wrapPointer) {
        const wrapped = wrapPointer(ptr, b2MouseJoint);
        console.log('[Physics.web] castToMouseJoint - ptr:', ptr, 'hasSetTarget:', typeof wrapped.SetTarget);
        return wrapped;
      }
      
      console.warn('[Physics.web] castToMouseJoint fallback - no getPointer/wrapPointer');
      return joint;
    },
    
    verifyMouseJoint: (joint: any, testX: number, testY: number): boolean => {
      try {
        const testTarget = new b2Vec2(testX, testY);
        joint.SetTarget(testTarget);
        
        const retrieved = joint.GetTarget();
        const rx = retrieved.get_x ? retrieved.get_x() : retrieved.x;
        const ry = retrieved.get_y ? retrieved.get_y() : retrieved.y;
        
        box2dInstance.destroy(testTarget);
        
        const works = Math.abs(rx - testX) < 0.01 && Math.abs(ry - testY) < 0.01;
        console.log('[Physics.web] verifyMouseJoint - SetTarget works:', works, 'got:', rx, ry, 'expected:', testX, testY);
        return works;
      } catch (e) {
        console.error('[Physics.web] verifyMouseJoint failed:', e);
        return false;
      }
    },
  };
};
