export interface b2Vec2 {
  x: number;
  y: number;
}

export interface b2BodyDef {
  /**
   * The world angle of the body in radians.
   **/
  angle: number;
  /**
   * The linear velocity of the body's origin in world co-ordinates.
   **/
  linearVelocity: b2Vec2;
  /**
   * The world position of the body. Avoid creating bodies at the origin since this can lead to many overlapping shapes.
   **/
  position: b2Vec2;
  /**
   * The body type: static (0), kinematic (1), or dynamic (2).
   * @note If a dynamic body would have zero mass, the mass is set to one.
   **/
  type: number;
}

export interface b2Shape {
  _brand: 'b2Shape';
}

export interface b2PolygonShape extends b2Shape {
  /**
   * Build vertices to represent an axis-aligned box.
   * @param hx The half-width.
   * @param hy The half-height.
   * @return Box polygon shape.
   **/
  SetAsBox(hx: number, hy: number): void;

  /**
   * Create a convex hull from the given array of local points. The count must be in the range [3, b2_maxPolygonVertices].
   * @param points The array of local points.
   * @return Polygon shape.
   **/
  Set(points: b2Vec2[]): void;
}

export interface b2CircleShape extends b2Shape {
  /**
   * Set the radius of the circle.
   * @param r Radius of the circle.
   * @return Circle shape.
   **/
  SetRadius(r: number): void;
}

export interface b2FixtureDef {
  /**
   * The density, usually in kg/m^2.
   **/
  density: number;

  /**
   * The friction coefficient, usually in the range [0,1].
   **/
  friction: number;

  /**
   * The restitution (elasticity) usually in the range [0,1].
   **/
  restitution: number;

  /**
   * The shape, this must be set. The shape will be cloned, so you can create the shape on the stack.
   **/
  shape: b2Shape;
}

export interface b2Fixture {
  GetBody(): b2Body;
  IsSensor(): boolean;
  SetSensor(isSensor: boolean): void;
  GetDensity(): number;
  GetFriction(): number;
  GetRestitution(): number;
  GetFilterData(): { categoryBits: number; maskBits: number; groupIndex: number };
  SetFilterData(filter: { categoryBits?: number; maskBits?: number; groupIndex?: number }): void;
  TestPoint(point: b2Vec2): boolean;
}

export interface b2Contact {
  GetFixtureA(): b2Fixture;
  GetFixtureB(): b2Fixture;
  IsTouching(): boolean;
  IsEnabled(): boolean;
  SetEnabled(enabled: boolean): void;
  GetManifold(): { pointCount: number; localNormal: b2Vec2; localPoint: b2Vec2 };
  GetWorldManifold(): { normal: b2Vec2; points: b2Vec2[]; separations: number[] };
  GetFriction(): number;
  GetRestitution(): number;
}

export interface b2ContactListener {
  BeginContact?: (contact: b2Contact) => void;
  EndContact?: (contact: b2Contact) => void;
  PreSolve?: (contact: b2Contact) => void;
  PostSolve?: (contact: b2Contact, impulse: { normalImpulses: number[]; tangentImpulses: number[]; count: number }) => void;
}

export interface b2Body {
  ApplyForceToCenter(force: b2Vec2, wake: boolean): void;
  ApplyLinearImpulseToCenter(impulse: b2Vec2, wake: boolean): void;
  ApplyForce(force: b2Vec2, point: b2Vec2, wake?: boolean): void;
  ApplyLinearImpulse(impulse: b2Vec2, point: b2Vec2, wake?: boolean): void;
  ApplyTorque(torque: number, wake?: boolean): void;
  ApplyAngularImpulse(impulse: number, wake?: boolean): void;
  CreateFixture(def: b2FixtureDef): b2Fixture;
  CreateFixture2(shape: b2Shape, density?: number): b2Fixture;
  GetAngle(): number;
  GetLinearVelocity(): b2Vec2;
  GetAngularVelocity(): number;
  SetAngularVelocity(velocity: number): void;
  GetPosition(): b2Vec2;
  SetLinearVelocity(v: b2Vec2): void;
  SetLinearDamping(linearDamping: number): void;
  SetTransform(position: b2Vec2, angle: number): void;
  GetMass(): number;
  GetType(): number;
  SetType(type: number): void;
  IsAwake(): boolean;
  SetAwake(awake: boolean): void;
  GetUserData(): number;
  SetUserData(data: number): void;
  IsEnabled(): boolean;
  SetEnabled(enabled: boolean): void;
  IsBullet(): boolean;
  SetBullet(bullet: boolean): void;
  IsFixedRotation(): boolean;
  SetFixedRotation(fixed: boolean): void;
}

export interface b2RayCastCallback {
  ReportFixture(fixture: b2Fixture, point: b2Vec2, normal: b2Vec2, fraction: number): number;
}

export interface b2QueryCallback {
  ReportFixture(fixture: b2Fixture): boolean;
}

export interface b2World {
  CreateBody: (def: b2BodyDef) => b2Body;
  DestroyBody: (b: b2Body) => void;
  Step: (dt: number, velocityIterations: number, positionIterations: number) => void;
  CreateJoint: (def: b2JointDef) => b2Joint;
  DestroyJoint: (joint: b2Joint) => void;
  SetContactListener: (listener: b2ContactListener) => void;
  RayCast: (callback: b2RayCastCallback, p1: b2Vec2, p2: b2Vec2) => void;
  QueryAABB: (callback: b2QueryCallback, lowerBound: b2Vec2, upperBound: b2Vec2) => void;
}

// Joint definitions
export interface b2JointDef {
  bodyA?: b2Body;
  bodyB?: b2Body;
  collideConnected?: boolean;
}

export interface b2RevoluteJointDef extends b2JointDef {
  Initialize(bodyA: b2Body, bodyB: b2Body, anchor: b2Vec2): void;
  enableLimit: boolean;
  enableMotor: boolean;
  lowerAngle: number;
  upperAngle: number;
  motorSpeed: number;
  maxMotorTorque: number;
}

export interface b2DistanceJointDef extends b2JointDef {
  Initialize(
    bodyA: b2Body,
    bodyB: b2Body,
    anchorA: b2Vec2,
    anchorB: b2Vec2
  ): void;
  length: number;
  minLength: number;
  maxLength: number;
  stiffness: number;
  damping: number;
}

export interface b2MouseJointDef extends b2JointDef {
  target: b2Vec2;
  maxForce: number;
  stiffness: number;
  damping: number;
}

export interface b2Joint {
  GetBodyA(): b2Body;
  GetBodyB(): b2Body;
  GetType(): number;
  IsEnabled(): boolean;
  SetMotorSpeed(speed: number): void;
  GetMotorSpeed(): number;
  EnableMotor(enable: boolean): void;
  SetMaxMotorTorque(torque: number): void;
}

export interface b2MouseJoint extends b2Joint {
  SetTarget(target: b2Vec2): void;
  GetTarget(): b2Vec2;
}
