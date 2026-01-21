import type { Physics2D } from './Physics2D';
import type {
  BodyId,
  ColliderId,
  JointId,
  Vec2,
  Transform,
  BodyDef,
  FixtureDef,
  ShapeDef,
  RevoluteJointDef,
  DistanceJointDef,
  PrismaticJointDef,
  MouseJointDef,
  WeldJointDef,
  RaycastHit,
  CollisionCallback,
  SensorCallback,
  Unsubscribe,
  CollisionEvent,
  SensorEvent,
  ContactInfo,
} from './types';
import {
  createBodyId,
  createColliderId,
  createJointId,
  bodyTypeToBox2D,
} from './types';
import type { Box2DAPI, b2World, b2Body, b2Joint, b2Shape } from '../physics/types';

interface BodyRecord {
  body: b2Body;
  userData: unknown;
  group?: string;
  fixtures: Map<number, FixtureRecord>;
}

interface FixtureRecord {
  fixture: unknown;
  isSensor: boolean;
  bodyId: BodyId;
  shape: ShapeDef;
}

interface JointRecord {
  joint: b2Joint;
  type: string;
  setTargetWorks?: boolean;
  mouseJointBodyId?: BodyId;
  mouseJointTarget?: Vec2;
}

export class Box2DAdapter implements Physics2D {
  private box2d: Box2DAPI | null = null;
  private world: b2World | null = null;
  
  private nextBodyId = 1;
  private nextColliderId = 1;
  private nextJointId = 1;
  
  private bodies = new Map<number, BodyRecord>();
  private colliders = new Map<number, FixtureRecord>();
  private joints = new Map<number, JointRecord>();
  
  private box2dBodyToId = new WeakMap<b2Body, number>();
  
  private collisionBeginCallbacks: CollisionCallback[] = [];
  private collisionEndCallbacks: CollisionCallback[] = [];
  private sensorBeginCallbacks: SensorCallback[] = [];
  private sensorEndCallbacks: SensorCallback[] = [];

  constructor(box2dApi: Box2DAPI) {
    this.box2d = box2dApi;
  }

  createWorld(gravity: Vec2): void {
    if (!this.box2d) throw new Error('Box2D not initialized');
    const g = this.box2d.b2Vec2(gravity.x, gravity.y);
    this.world = this.box2d.b2World(g);
  }

  destroyWorld(): void {
    for (const [id] of this.bodies) {
      this.destroyBodyInternal(id);
    }
    this.bodies.clear();
    this.colliders.clear();
    this.joints.clear();
    this.world = null;
  }

  step(dt: number, velocityIterations = 8, positionIterations = 3): void {
    if (!this.world) return;
    
    this.applyMouseJointFallbackForces();
    
    this.world.Step(dt, velocityIterations, positionIterations);
  }
  
  private applyMouseJointFallbackForces(): void {
    if (!this.box2d) return;
    
    for (const [, record] of this.joints) {
      if (record.type !== 'mouse' || record.setTargetWorks !== false) continue;
      if (!record.mouseJointBodyId || !record.mouseJointTarget) continue;
      
      const bodyRecord = this.bodies.get(record.mouseJointBodyId.value);
      if (!bodyRecord) continue;
      
      const body = bodyRecord.body;
      const pos = body.GetPosition();
      const vel = body.GetLinearVelocity();
      const mass = (body as any).GetMass?.() ?? 1;
      
      const targetX = record.mouseJointTarget.x;
      const targetY = record.mouseJointTarget.y;
      
      const frequencyHz = 5;
      const dampingRatio = 0.7;
      const maxForce = 100000;
      
      const omega = 2 * Math.PI * frequencyHz;
      const k = mass * omega * omega;
      const c = 2 * mass * dampingRatio * omega;
      
      const errorX = pos.x - targetX;
      const errorY = pos.y - targetY;
      
      let forceX = -k * errorX - c * vel.x;
      let forceY = -k * errorY - c * vel.y;
      
      const forceMag = Math.sqrt(forceX * forceX + forceY * forceY);
      const maxF = maxForce * mass;
      if (forceMag > maxF) {
        const scale = maxF / forceMag;
        forceX *= scale;
        forceY *= scale;
      }
      
      const force = this.box2d.b2Vec2(forceX, forceY);
      (body as any).ApplyForceToCenter?.(force, true);
      (body as any).SetAwake?.(true);
    }
  }

  createBody(def: BodyDef): BodyId {
    if (!this.box2d || !this.world) throw new Error('World not created');
    
    const bodyDef = this.box2d.b2BodyDef();
    bodyDef.type = bodyTypeToBox2D(def.type);
    bodyDef.position = this.box2d.b2Vec2(def.position.x, def.position.y);
    if (def.angle !== undefined) bodyDef.angle = def.angle;
    if (def.linearDamping !== undefined) (bodyDef as any).linearDamping = def.linearDamping;
    if (def.angularDamping !== undefined) (bodyDef as any).angularDamping = def.angularDamping;
    if (def.fixedRotation !== undefined) (bodyDef as any).fixedRotation = def.fixedRotation;
    if (def.bullet !== undefined) (bodyDef as any).bullet = def.bullet;
    
    const body = this.world.CreateBody(bodyDef);
    const id = this.nextBodyId++;
    
    this.bodies.set(id, {
      body,
      userData: def.userData,
      group: def.group,
      fixtures: new Map(),
    });
    this.box2dBodyToId.set(body, id);
    
    return createBodyId(id);
  }

  destroyBody(id: BodyId): void {
    this.destroyBodyInternal(id.value);
  }

  private destroyBodyInternal(id: number): void {
    const record = this.bodies.get(id);
    if (!record || !this.world) return;
    
    for (const [colliderId] of record.fixtures) {
      this.colliders.delete(colliderId);
    }
    
    this.world.DestroyBody(record.body);
    this.bodies.delete(id);
  }

  addFixture(bodyId: BodyId, def: FixtureDef): ColliderId {
    if (!this.box2d) throw new Error('Box2D not initialized');
    
    const record = this.bodies.get(bodyId.value);
    if (!record) throw new Error(`Body ${bodyId.value} not found`);
    
    const shape = this.createShape(def.shape);
    const fixtureDef = this.box2d.b2FixtureDef();
    fixtureDef.shape = shape;
    fixtureDef.density = def.density ?? 1;
    fixtureDef.friction = def.friction ?? 0.3;
    fixtureDef.restitution = def.restitution ?? 0;
    (fixtureDef as any).isSensor = def.isSensor ?? false;
    
    if (def.categoryBits !== undefined || def.maskBits !== undefined) {
      const filter = (fixtureDef as any).filter || {};
      filter.categoryBits = def.categoryBits ?? 0x0001;
      filter.maskBits = def.maskBits ?? 0xFFFF;
      (fixtureDef as any).filter = filter;
    }
    
    const fixture = record.body.CreateFixture(fixtureDef);
    const colliderId = this.nextColliderId++;
    
    const fixtureRecord: FixtureRecord = {
      fixture,
      isSensor: def.isSensor ?? false,
      bodyId,
      shape: def.shape,
    };
    
    record.fixtures.set(colliderId, fixtureRecord);
    this.colliders.set(colliderId, fixtureRecord);
    
    return createColliderId(colliderId);
  }

  private createShape(def: ShapeDef): b2Shape {
    if (!this.box2d) throw new Error('Box2D not initialized');
    
    switch (def.type) {
      case 'circle': {
        const shape = this.box2d.b2CircleShape();
        shape.SetRadius(def.radius);
        return shape;
      }
      case 'box': {
        const shape = this.box2d.b2PolygonShape();
        shape.SetAsBox(def.halfWidth, def.halfHeight);
        return shape;
      }
      case 'polygon': {
        const shape = this.box2d.b2PolygonShape();
        const vertices = def.vertices.map(v => this.box2d!.b2Vec2(v.x, v.y));
        shape.Set(vertices);
        return shape;
      }
    }
  }

  removeFixture(id: ColliderId): void {
    const record = this.colliders.get(id.value);
    if (!record) return;
    
    const bodyRecord = this.bodies.get(record.bodyId.value);
    if (bodyRecord) {
      bodyRecord.fixtures.delete(id.value);
    }
    this.colliders.delete(id.value);
  }

  setSensor(id: ColliderId, isSensor: boolean): void {
    const record = this.colliders.get(id.value);
    if (!record) return;
    (record.fixture as any).SetSensor(isSensor);
    record.isSensor = isSensor;
  }

  getTransform(id: BodyId): Transform {
    const record = this.bodies.get(id.value);
    if (!record) return { position: { x: 0, y: 0 }, angle: 0 };
    
    const pos = record.body.GetPosition();
    const angle = record.body.GetAngle();
    return {
      position: { x: pos.x, y: pos.y },
      angle,
    };
  }

  setTransform(id: BodyId, transform: Transform): void {
    if (!this.box2d) return;
    const record = this.bodies.get(id.value);
    if (!record) return;
    
    const pos = this.box2d.b2Vec2(transform.position.x, transform.position.y);
    record.body.SetTransform(pos, transform.angle);
  }

  getLinearVelocity(id: BodyId): Vec2 {
    const record = this.bodies.get(id.value);
    if (!record) return { x: 0, y: 0 };
    
    const vel = record.body.GetLinearVelocity();
    return { x: vel.x, y: vel.y };
  }

  setLinearVelocity(id: BodyId, velocity: Vec2): void {
    if (!this.box2d) return;
    const record = this.bodies.get(id.value);
    if (!record) return;
    
    const vel = this.box2d.b2Vec2(velocity.x, velocity.y);
    record.body.SetLinearVelocity(vel);
  }

  getAngularVelocity(id: BodyId): number {
    const record = this.bodies.get(id.value);
    if (!record) return 0;
    return (record.body as any).GetAngularVelocity?.() ?? 0;
  }

  setAngularVelocity(id: BodyId, velocity: number): void {
    const record = this.bodies.get(id.value);
    if (!record) return;
    (record.body as any).SetAngularVelocity?.(velocity);
  }

  applyForce(id: BodyId, force: Vec2, worldPoint?: Vec2): void {
    if (!this.box2d) return;
    const record = this.bodies.get(id.value);
    if (!record) return;
    
    const f = this.box2d.b2Vec2(force.x, force.y);
    if (worldPoint) {
      const p = this.box2d.b2Vec2(worldPoint.x, worldPoint.y);
      (record.body as any).ApplyForce?.(f, p, true);
    } else {
      record.body.ApplyForceToCenter(f, true);
    }
  }

  applyForceToCenter(id: BodyId, force: Vec2): void {
    if (!this.box2d) return;
    const record = this.bodies.get(id.value);
    if (!record) return;
    
    const f = this.box2d.b2Vec2(force.x, force.y);
    record.body.ApplyForceToCenter(f, true);
  }

  applyImpulse(id: BodyId, impulse: Vec2, worldPoint?: Vec2): void {
    if (!this.box2d) return;
    const record = this.bodies.get(id.value);
    if (!record) return;
    
    const i = this.box2d.b2Vec2(impulse.x, impulse.y);
    if (worldPoint) {
      const p = this.box2d.b2Vec2(worldPoint.x, worldPoint.y);
      (record.body as any).ApplyLinearImpulse?.(i, p, true);
    } else {
      record.body.ApplyLinearImpulseToCenter(i, true);
    }
  }

  applyImpulseToCenter(id: BodyId, impulse: Vec2): void {
    if (!this.box2d) return;
    const record = this.bodies.get(id.value);
    if (!record) return;
    
    const i = this.box2d.b2Vec2(impulse.x, impulse.y);
    record.body.ApplyLinearImpulseToCenter(i, true);
  }

  applyTorque(id: BodyId, torque: number): void {
    const record = this.bodies.get(id.value);
    if (!record) return;
    (record.body as any).ApplyTorque?.(torque, true);
  }

  createRevoluteJoint(def: RevoluteJointDef): JointId {
    if (!this.box2d || !this.world) throw new Error('World not created');
    
    const bodyA = this.bodies.get(def.bodyA.value);
    const bodyB = this.bodies.get(def.bodyB.value);
    if (!bodyA || !bodyB) throw new Error('Bodies not found for joint');
    
    const jointDef = this.box2d.b2RevoluteJointDef();
    const anchor = this.box2d.b2Vec2(def.anchor.x, def.anchor.y);
    jointDef.Initialize(bodyA.body, bodyB.body, anchor);
    
    if (def.enableLimit !== undefined) jointDef.enableLimit = def.enableLimit;
    if (def.lowerAngle !== undefined) jointDef.lowerAngle = def.lowerAngle;
    if (def.upperAngle !== undefined) jointDef.upperAngle = def.upperAngle;
    if (def.enableMotor !== undefined) jointDef.enableMotor = def.enableMotor;
    if (def.motorSpeed !== undefined) jointDef.motorSpeed = def.motorSpeed;
    if (def.maxMotorTorque !== undefined) jointDef.maxMotorTorque = def.maxMotorTorque;
    if (def.collideConnected !== undefined) jointDef.collideConnected = def.collideConnected;
    
    const joint = this.world.CreateJoint(jointDef);
    const id = this.nextJointId++;
    
    this.joints.set(id, { joint, type: 'revolute' });
    return createJointId(id);
  }

  createDistanceJoint(def: DistanceJointDef): JointId {
    if (!this.box2d || !this.world) throw new Error('World not created');
    
    const bodyA = this.bodies.get(def.bodyA.value);
    const bodyB = this.bodies.get(def.bodyB.value);
    if (!bodyA || !bodyB) throw new Error('Bodies not found for joint');
    
    const jointDef = this.box2d.b2DistanceJointDef();
    const anchorA = this.box2d.b2Vec2(def.anchorA.x, def.anchorA.y);
    const anchorB = this.box2d.b2Vec2(def.anchorB.x, def.anchorB.y);
    jointDef.Initialize(bodyA.body, bodyB.body, anchorA, anchorB);
    
    if (def.length !== undefined) jointDef.length = def.length;
    if (def.stiffness !== undefined) jointDef.frequencyHz = def.stiffness;
    if (def.damping !== undefined) jointDef.dampingRatio = def.damping;
    if (def.collideConnected !== undefined) jointDef.collideConnected = def.collideConnected;
    
    const joint = this.world.CreateJoint(jointDef);
    const id = this.nextJointId++;
    
    this.joints.set(id, { joint, type: 'distance' });
    return createJointId(id);
  }

  createPrismaticJoint(def: PrismaticJointDef): JointId {
    throw new Error('Prismatic joint not implemented yet');
  }

  createMouseJoint(def: MouseJointDef): JointId {
    if (!this.box2d || !this.world) throw new Error('World not created');
    
    const bodyRecord = this.bodies.get(def.body.value);
    if (!bodyRecord) throw new Error('Body not found for mouse joint');
    
    const groundBody = this.findGroundBody();
    if (!groundBody) throw new Error('No ground body for mouse joint');
    
    const body = bodyRecord.body as any;
    if (typeof body.SetAwake === 'function') body.SetAwake(true);
    
    const mass = typeof body.GetMass === 'function' ? body.GetMass() : 'unknown';
    console.log('[Box2DAdapter] Body mass:', mass);
    
    const jointDef = this.box2d.b2MouseJointDef() as any;
    const target = this.box2d.b2Vec2(def.target.x, def.target.y);
    
    this.setJointDefProperty(jointDef, 'bodyA', groundBody);
    this.setJointDefProperty(jointDef, 'bodyB', bodyRecord.body);
    this.setJointDefProperty(jointDef, 'target', target);
    this.setJointDefProperty(jointDef, 'maxForce', def.maxForce);
    if (def.stiffness !== undefined) {
      this.setJointDefProperty(jointDef, 'frequencyHz', def.stiffness);
    }
    if (def.damping !== undefined) {
      this.setJointDefProperty(jointDef, 'dampingRatio', def.damping);
    }
    
    console.log('[Box2DAdapter] MouseJoint def - maxForce:', def.maxForce, 'stiffness:', def.stiffness, 'damping:', def.damping);
    
    const genericJoint = this.world.CreateJoint(jointDef);
    const id = this.nextJointId++;
    
    const mouseJoint = this.box2d.castToMouseJoint 
      ? this.box2d.castToMouseJoint(genericJoint)
      : genericJoint;
    
    let setTargetWorks = false;
    if (this.box2d.verifyMouseJoint) {
      setTargetWorks = this.box2d.verifyMouseJoint(mouseJoint as any, def.target.x + 0.001, def.target.y);
      console.log('[Box2DAdapter] MouseJoint SetTarget verification:', setTargetWorks ? 'WORKING' : 'BROKEN - will use force fallback');
    }
    
    this.joints.set(id, { 
      joint: mouseJoint, 
      type: 'mouse', 
      setTargetWorks,
      mouseJointBodyId: def.body,
      mouseJointTarget: { x: def.target.x, y: def.target.y },
    });
    return createJointId(id);
  }
  
  private setJointDefProperty(jointDef: any, name: string, value: any): void {
    const setter = `set_${name}`;
    if (typeof jointDef[setter] === 'function') {
      jointDef[setter](value);
    } else {
      jointDef[name] = value;
    }
  }

  createWeldJoint(def: WeldJointDef): JointId {
    throw new Error('Weld joint not implemented yet');
  }

  private findGroundBody(): b2Body | null {
    for (const [, record] of this.bodies) {
      const bodyType = (record.body as any).GetType?.() ?? 0;
      if (bodyType === 0) return record.body;
    }
    return null;
  }

  destroyJoint(id: JointId): void {
    const record = this.joints.get(id.value);
    if (!record || !this.world) return;
    
    this.world.DestroyJoint(record.joint);
    this.joints.delete(id.value);
  }

  setMotorSpeed(id: JointId, speed: number): void {
    const record = this.joints.get(id.value);
    if (!record) return;
    (record.joint as any).SetMotorSpeed?.(speed);
  }

  setMouseTarget(id: JointId, target: Vec2): void {
    if (!this.box2d) return;
    const record = this.joints.get(id.value);
    if (!record || record.type !== 'mouse') return;
    
    record.mouseJointTarget = { x: target.x, y: target.y };
    
    if (record.setTargetWorks === false) {
      return;
    }
    
    const t = this.box2d.b2Vec2(target.x, target.y);
    const joint = record.joint as any;
    
    if (typeof joint.SetTarget === 'function') {
      joint.SetTarget(t);
    } else if (typeof joint.set_m_targetA === 'function') {
      joint.set_m_targetA(t);
    } else if (typeof joint.set_m_target === 'function') {
      joint.set_m_target(t);
    }
  }
  
  private _loggedMouseJointMethods = false;

  queryPoint(point: Vec2): BodyId | null {
    for (const [id, record] of this.bodies) {
      const bodyType = (record.body as any).GetType?.() ?? 0;
      if (bodyType === 0) continue;
      
      const pos = record.body.GetPosition();
      const angle = record.body.GetAngle();
      
      const dx = point.x - pos.x;
      const dy = point.y - pos.y;
      const cosA = Math.cos(-angle);
      const sinA = Math.sin(-angle);
      const localX = dx * cosA - dy * sinA;
      const localY = dx * sinA + dy * cosA;
      
      for (const [, fixtureRecord] of record.fixtures) {
        if (this.testPointInShape(localX, localY, fixtureRecord.shape)) {
          return createBodyId(id);
        }
      }
    }
    return null;
  }

  private testPointInShape(localX: number, localY: number, shape: ShapeDef): boolean {
    switch (shape.type) {
      case 'circle': {
        const offsetX = shape.offset?.x ?? 0;
        const offsetY = shape.offset?.y ?? 0;
        const dx = localX - offsetX;
        const dy = localY - offsetY;
        return (dx * dx + dy * dy) <= (shape.radius * shape.radius);
      }
      case 'box': {
        const offsetX = shape.offset?.x ?? 0;
        const offsetY = shape.offset?.y ?? 0;
        const px = localX - offsetX;
        const py = localY - offsetY;
        return Math.abs(px) <= shape.halfWidth && Math.abs(py) <= shape.halfHeight;
      }
      case 'polygon': {
        return this.pointInPolygon(localX, localY, shape.vertices);
      }
    }
  }

  private pointInPolygon(x: number, y: number, vertices: Vec2[]): boolean {
    let inside = false;
    const n = vertices.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = vertices[i].x, yi = vertices[i].y;
      const xj = vertices[j].x, yj = vertices[j].y;
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  queryAABB(min: Vec2, max: Vec2): BodyId[] {
    const results: BodyId[] = [];
    for (const [id, record] of this.bodies) {
      const pos = record.body.GetPosition();
      if (pos.x >= min.x && pos.x <= max.x && pos.y >= min.y && pos.y <= max.y) {
        results.push(createBodyId(id));
      }
    }
    return results;
  }

  raycast(origin: Vec2, direction: Vec2, maxDistance: number): RaycastHit | null {
    if (!this.box2d || !this.world) return null;
    
    const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    const normDir = { x: direction.x / len, y: direction.y / len };
    const end = {
      x: origin.x + normDir.x * maxDistance,
      y: origin.y + normDir.y * maxDistance,
    };
    
    let closestHit: RaycastHit | null = null;
    let closestFraction = 1;
    
    const callback = {
      ReportFixture: (fixture: any, point: any, normal: any, fraction: number): number => {
        if (fraction < closestFraction) {
          const body = fixture.GetBody();
          const bodyId = this.box2dBodyToId.get(body);
          if (bodyId !== undefined) {
            closestFraction = fraction;
            closestHit = {
              bodyId: createBodyId(bodyId),
              colliderId: createColliderId(0),
              point: { x: point.x, y: point.y },
              normal: { x: normal.x, y: normal.y },
              fraction,
            };
          }
        }
        return 1;
      },
    };
    
    const p1 = this.box2d.b2Vec2(origin.x, origin.y);
    const p2 = this.box2d.b2Vec2(end.x, end.y);
    this.world.RayCast(callback, p1, p2);
    
    return closestHit;
  }

  onCollisionBegin(callback: CollisionCallback): Unsubscribe {
    this.collisionBeginCallbacks.push(callback);
    return () => {
      const idx = this.collisionBeginCallbacks.indexOf(callback);
      if (idx >= 0) this.collisionBeginCallbacks.splice(idx, 1);
    };
  }

  onCollisionEnd(callback: CollisionCallback): Unsubscribe {
    this.collisionEndCallbacks.push(callback);
    return () => {
      const idx = this.collisionEndCallbacks.indexOf(callback);
      if (idx >= 0) this.collisionEndCallbacks.splice(idx, 1);
    };
  }

  onSensorBegin(callback: SensorCallback): Unsubscribe {
    this.sensorBeginCallbacks.push(callback);
    return () => {
      const idx = this.sensorBeginCallbacks.indexOf(callback);
      if (idx >= 0) this.sensorBeginCallbacks.splice(idx, 1);
    };
  }

  onSensorEnd(callback: SensorCallback): Unsubscribe {
    this.sensorEndCallbacks.push(callback);
    return () => {
      const idx = this.sensorEndCallbacks.indexOf(callback);
      if (idx >= 0) this.sensorEndCallbacks.splice(idx, 1);
    };
  }

  getUserData<T = unknown>(id: BodyId): T | undefined {
    const record = this.bodies.get(id.value);
    return record?.userData as T | undefined;
  }

  setUserData(id: BodyId, data: unknown): void {
    const record = this.bodies.get(id.value);
    if (record) record.userData = data;
  }

  getGroup(id: BodyId): string | undefined {
    return this.bodies.get(id.value)?.group;
  }

  getAllBodies(): BodyId[] {
    return Array.from(this.bodies.keys()).map(createBodyId);
  }

  getBodiesInGroup(group: string): BodyId[] {
    const results: BodyId[] = [];
    for (const [id, record] of this.bodies) {
      if (record.group === group) {
        results.push(createBodyId(id));
      }
    }
    return results;
  }
}
