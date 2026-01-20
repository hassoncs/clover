export interface b2Vec2 {
  x: number;
  y: number;
}

export interface b2BodyDef {
  angle: number;
  linearVelocity: b2Vec2;
  position: b2Vec2;
  type: number;
}

export interface b2Shape {}

export interface b2PolygonShape extends b2Shape {
  SetAsBox(hx: number, hy: number): void;
  Set(points: b2Vec2[]): void;
}

export interface b2CircleShape extends b2Shape {
  SetRadius(r: number): void;
  GetRadius(): number;
}

export interface b2FixtureDef {
  density: number;
  friction: number;
  restitution: number;
  shape: b2Shape;
}

export interface b2Body {
  ApplyForceToCenter(force: b2Vec2, wake: boolean): void;
  ApplyLinearImpulseToCenter(impulse: b2Vec2, wake: boolean): void;
  CreateFixture(def: b2FixtureDef): void;
  CreateFixture2(shape: b2Shape, density?: number): void;
  GetAngle(): number;
  GetLinearVelocity(): b2Vec2;
  GetPosition(): b2Vec2;
  SetLinearVelocity(v: b2Vec2): void;
  SetLinearDamping(damping: number): void;
  SetTransform(position: b2Vec2, angle: number): void;
  SetType(type: number): void;
  GetMass(): number;
  _radius?: number;
  _color?: string;
}

// Joints
export interface b2JointDef {
  type?: number;
  userData?: any;
  bodyA: b2Body;
  bodyB: b2Body;
  collideConnected: boolean;
}

export interface b2RevoluteJointDef extends b2JointDef {
  localAnchorA: b2Vec2;
  localAnchorB: b2Vec2;
  enableLimit: boolean;
  lowerAngle: number;
  upperAngle: number;
  enableMotor: boolean;
  motorSpeed: number;
  maxMotorTorque: number;
  Initialize(bodyA: b2Body, bodyB: b2Body, anchor: b2Vec2): void;
}

export interface b2DistanceJointDef extends b2JointDef {
  localAnchorA: b2Vec2;
  localAnchorB: b2Vec2;
  length: number;
  frequencyHz: number;
  dampingRatio: number;
  Initialize(bodyA: b2Body, bodyB: b2Body, anchorA: b2Vec2, anchorB: b2Vec2): void;
}

export interface b2MouseJointDef extends b2JointDef {
  target: b2Vec2;
  maxForce: number;
  frequencyHz: number;
  dampingRatio: number;
}

export interface b2Joint {
  GetBodyA(): b2Body;
  GetBodyB(): b2Body;
}

export interface b2MouseJoint extends b2Joint {
  SetTarget(target: b2Vec2): void;
}

export interface b2RevoluteJoint extends b2Joint {}
export interface b2DistanceJoint extends b2Joint {}

// RayCast
export interface b2RayCastInput {
  p1: b2Vec2;
  p2: b2Vec2;
  maxFraction: number;
}

export interface b2RayCastOutput {
  normal: b2Vec2;
  fraction: number;
}

export interface b2RayCastCallback {
  ReportFixture(fixture: any, point: b2Vec2, normal: b2Vec2, fraction: number): number;
}

export interface b2World {
  CreateBody: (def: b2BodyDef) => b2Body;
  DestroyBody: (b: b2Body) => void;
  CreateJoint: (def: b2JointDef) => b2Joint;
  DestroyJoint: (j: b2Joint) => void;
  Step: (
    dt: number,
    velocityIterations: number,
    positionIterations: number
  ) => void;
  RayCast: (callback: b2RayCastCallback, point1: b2Vec2, point2: b2Vec2) => void;
}

export interface Box2DAPI {
  b2Vec2: (x: number, y: number) => b2Vec2;
  b2World: (gravity: b2Vec2) => b2World;
  b2BodyDef: () => b2BodyDef;
  b2PolygonShape: () => b2PolygonShape;
  b2CircleShape: () => b2CircleShape;
  b2FixtureDef: () => b2FixtureDef;
  
  // Joints
  b2RevoluteJointDef: () => b2RevoluteJointDef;
  b2DistanceJointDef: () => b2DistanceJointDef;
  b2MouseJointDef: () => b2MouseJointDef;
}
