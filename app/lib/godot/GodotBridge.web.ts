import type { GameDefinition, PropertySyncPayload } from "@slopcade/shared";
import type {
  GodotBridge,
  CollisionEvent,
  ContactInfo,
  SensorEvent,
  EntityTransform,
  Vec2,
  RaycastHit,
  RevoluteJointDef,
  DistanceJointDef,
  PrismaticJointDef,
  WeldJointDef,
  MouseJointDef,
  BodyDef,
  FixtureDef,
  DynamicShaderResult,
} from "./types";
import { injectGodotDebugBridge } from "./debug";
import { queryAsync as sharedQueryAsync, setupQueryResolver, getGodotBridge as getSharedGodotBridge, type GodotBridgeBase } from "./query";

declare global {
  interface Window {
    GodotBridge?: {
      _lastResult: unknown;
      _pendingQueries?: Map<string, (result: unknown) => void>;
      query: (requestId: string, method: string, argsJson: string) => void;
      loadGameJson: (json: string) => boolean;
      clearGame: () => void;
      spawnEntity: (
        templateId: string,
        x: number,
        y: number,
        entityId: string,
      ) => void;
      destroyEntity: (entityId: string) => void;
      getEntityTransform: (entityId: string) => EntityTransform | null;
      getAllTransforms: () => Record<string, EntityTransform>;
      getAllProperties: () => PropertySyncPayload;
      onPropertySync: (callback: (propertiesJson: string) => void) => void;
      setWatchConfig: (configJson: string) => void;
      setTransform: (
        entityId: string,
        x: number,
        y: number,
        angle: number,
      ) => void;
      setPosition: (entityId: string, x: number, y: number) => void;
      setRotation: (entityId: string, angle: number) => void;
      setScale: (entityId: string, scaleX: number, scaleY: number) => void;
      getLinearVelocity: (entityId: string) => { x: number; y: number } | null;
      setLinearVelocity: (entityId: string, vx: number, vy: number) => void;
      getAngularVelocity: (entityId: string) => number | null;
      setAngularVelocity: (entityId: string, v: number) => void;
      applyImpulse: (entityId: string, ix: number, iy: number) => void;
      applyForce: (entityId: string, fx: number, fy: number) => void;
      applyTorque: (entityId: string, torque: number) => void;
      createRevoluteJoint: (...args: (string | number | boolean)[]) => number;
      createDistanceJoint: (...args: (string | number)[]) => number;
      createPrismaticJoint: (...args: (string | number | boolean)[]) => number;
      createWeldJoint: (...args: (string | number)[]) => number;
      createMouseJoint: (...args: (string | number)[]) => number;
      destroyJoint: (jointId: number) => void;
      setMotorSpeed: (jointId: number, speed: number) => void;
      setMouseTarget: (jointId: number, x: number, y: number) => void;
      queryPoint: (x: number, y: number) => number | null;
      queryPointEntity: (x: number, y: number) => void;
      queryAABB: (
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
      ) => number[];
      raycast: (
        originX: number,
        originY: number,
        dirX: number,
        dirY: number,
        maxDist: number,
      ) => RaycastHit | null;
      createBody: (...args: (string | number | boolean | unknown)[]) => number;
      addFixture: (...args: (number | string | boolean)[]) => number;
      setSensor: (colliderId: number, isSensor: boolean) => void;
      setUserData: (bodyId: number, data: unknown) => void;
      getUserData: (bodyId: number) => unknown;
      getAllBodies: () => number[];
      sendInput: (type: string, x: number, y: number, entityId: string) => void;
      onCollision: (
        callback: (
          dataOrEntityA: string,
          entityB?: string,
          impulse?: number,
        ) => void,
      ) => void;
      onEntityDestroyed: (callback: (entityId: string) => void) => void;
      onSensorBegin: (
        callback: (
          sensorId: number,
          bodyId: number,
          colliderId: number,
        ) => void,
      ) => void;
      onSensorEnd: (
        callback: (
          sensorId: number,
          bodyId: number,
          colliderId: number,
        ) => void,
      ) => void;
      onInputEvent: (
        callback: (jsonStr: string) => void,
      ) => void;
      onTransformSync: (callback: (transformsJson: string) => void) => void;
      setEntityImage: (
        entityId: string,
        url: string,
        width: number,
        height: number,
      ) => void;
      setEntityAtlasRegion: (
        entityId: string,
        atlasUrl: string,
        x: number,
        y: number,
        w: number,
        h: number,
        width: number,
        height: number,
      ) => void;
       clearTextureCache: (url: string) => void;
       setDebugShowShapes: (show: boolean) => void;
       setCameraTarget: (entityId: string) => void;
      setCameraPosition: (x: number, y: number) => void;
      setCameraZoom: (zoom: number) => void;
      spawnParticle: (type: string, x: number, y: number) => void;
      playSound: (resourcePath: string) => void;
      applySpriteEffect: (
        entityId: string,
        effectName: string,
        paramsJson?: string,
      ) => void;
      updateSpriteEffectParam: (
        entityId: string,
        paramName: string,
        value: unknown,
      ) => void;
      clearSpriteEffect: (entityId: string) => void;
      setPostEffect: (
        effectName: string,
        paramsJson?: string,
        layer?: string,
      ) => void;
      updatePostEffectParam: (
        paramName: string,
        value: unknown,
        layer?: string,
      ) => void;
      clearPostEffect: (layer?: string) => void;
      screenShake: (intensity: number, duration?: number) => void;
      zoomPunch: (intensity?: number, duration?: number) => void;
      triggerShockwave: (
        worldX: number,
        worldY: number,
        duration?: number,
      ) => void;
      flashScreen: (color?: number[], duration?: number) => void;
      createDynamicShader: (shaderId: string, shaderCode: string) => void;
      applyDynamicShader: (
        entityId: string,
        shaderId: string,
        paramsJson?: string,
      ) => void;
      applyDynamicPostShader: (shaderCode: string, paramsJson?: string) => void;
      spawnParticlePreset: (
        presetName: string,
        worldX: number,
        worldY: number,
        paramsJson?: string,
      ) => void;
      getAvailableEffects: () => void;
      createUIButton: (
        buttonId: string,
        normalUrl: string,
        pressedUrl: string,
        x: number,
        y: number,
        width: number,
        height: number,
      ) => void;
      destroyUIButton: (buttonId: string) => void;
      onUIButtonEvent: (
        callback: (eventType: string, buttonId: string) => void,
      ) => void;
      show_3d_model: (path: string) => boolean;
      show_3d_model_from_url: (url: string) => void;
      set_3d_viewport_position: (x: number, y: number) => void;
      set_3d_viewport_size: (width: number, height: number) => void;
      rotate_3d_model: (x: number, y: number, z: number) => void;
      set_3d_camera_distance: (distance: number) => void;
      clear_3d_models: () => void;
      captureScreenshot: (withOverlays: boolean, overlayTypesJson: string) => void;
      getWorldInfo: () => void;
      getCameraInfo: () => void;
      getViewportInfo: () => void;
    };
  }
}



export function createWebGodotBridge(): GodotBridge {
  const collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
  const destroyCallbacks: ((entityId: string) => void)[] = [];
  const sensorBeginCallbacks: ((event: SensorEvent) => void)[] = [];
  const sensorEndCallbacks: ((event: SensorEvent) => void)[] = [];
  const inputEventCallbacks: ((
    type: string,
    x: number,
    y: number,
    entityId: string | null,
  ) => void)[] = [];
  const uiButtonCallbacks: ((
    eventType: "button_down" | "button_up" | "button_pressed",
    buttonId: string,
  ) => void)[] = [];
  const transformSyncCallbacks: ((
    transforms: Record<string, EntityTransform>,
  ) => void)[] = [];
  const propertySyncCallbacks: ((
    properties: PropertySyncPayload,
  ) => void)[] = [];

  const getGodotBridge = (): Window["GodotBridge"] | null => {
    const iframe = document.querySelector(
      'iframe[title="Godot Game Engine"]',
    ) as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      return (iframe.contentWindow as Window).GodotBridge ?? null;
    }
    return window.GodotBridge ?? null;
  };

  const queryAsync = <T>(method: string, args: unknown[] = [], timeoutMs = 5000): Promise<T> => {
    const bridge = getSharedGodotBridge() as GodotBridgeBase | null;
    if (!bridge) {
      return Promise.reject(new Error("Godot bridge not available"));
    }
    return sharedQueryAsync<T>(bridge, method, args, { timeoutMs });
  };

  const bridge: GodotBridge = {
    async initialize() {
      setupQueryResolver();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Godot WASM load timeout")),
          30000,
        );

        const checkReady = setInterval(() => {
          const godotBridge = getGodotBridge();
          if (godotBridge) {
            clearInterval(checkReady);
            clearTimeout(timeout);

            godotBridge.onCollision(
              (dataOrEntityA: string, entityB?: string, impulse?: number) => {
                let event: CollisionEvent;

                if (!dataOrEntityA) {
                  return;
                }

                const isNewJsonFormat = entityB === undefined;
                if (isNewJsonFormat) {
                  try {
                    const parsed = JSON.parse(dataOrEntityA);
                    event = {
                      entityA: parsed.entityA,
                      entityB: parsed.entityB,
                      contacts: parsed.contacts as ContactInfo[],
                    };
                  } catch {
                    console.warn(
                      "[GodotBridge.web] Failed to parse collision data:",
                      dataOrEntityA,
                    );
                    return;
                  }
                } else {
                  event = {
                    entityA: dataOrEntityA,
                    entityB: entityB,
                    contacts: [
                      {
                        point: { x: 0, y: 0 },
                        normal: { x: 0, y: 1 },
                        normalImpulse: impulse ?? 0,
                        tangentImpulse: 0,
                      },
                    ],
                  };
                }

                for (const cb of collisionCallbacks) cb(event);
              },
            );

            godotBridge.onEntityDestroyed((entityId) => {
              for (const cb of destroyCallbacks) cb(entityId);
            });

            godotBridge.onSensorBegin((sensorId, bodyId, colliderId) => {
              const event: SensorEvent = {
                sensorColliderId: sensorId,
                otherBodyId: bodyId,
                otherColliderId: colliderId,
              };
              for (const cb of sensorBeginCallbacks) cb(event);
            });

            godotBridge.onSensorEnd((sensorId, bodyId, colliderId) => {
              const event: SensorEvent = {
                sensorColliderId: sensorId,
                otherBodyId: bodyId,
                otherColliderId: colliderId,
              };
              for (const cb of sensorEndCallbacks) cb(event);
            });

            godotBridge.onInputEvent((jsonStr: unknown) => {
              try {
                const data = JSON.parse(jsonStr as string) as {
                  type: string;
                  x: number;
                  y: number;
                  entityId: string | null;
                };
                for (const cb of inputEventCallbacks) cb(data.type, data.x, data.y, data.entityId);
              } catch {
              }
            });

            godotBridge.onTransformSync((transformsJson: string) => {
              try {
                const transforms = JSON.parse(transformsJson) as Record<
                  string,
                  EntityTransform
                >;
                for (const cb of transformSyncCallbacks) cb(transforms);
              } catch {}
            });

            godotBridge.onPropertySync((propertiesJson: string) => {
              try {
                const properties = JSON.parse(propertiesJson) as PropertySyncPayload;
                for (const cb of propertySyncCallbacks) cb(properties);
              } catch {}
            });

            // Auto-inject debug bridge in dev mode or when ?debug=true
            if (
              process.env.NODE_ENV === "development" ||
              (typeof window !== "undefined" &&
                window.location?.search?.includes("debug=true"))
            ) {
              injectGodotDebugBridge();
              console.log(
                "[GodotBridge.web] Debug bridge auto-injected (dev mode)",
              );
            }

            resolve();
          }
        }, 100);
      });
    },

    dispose() {
      collisionCallbacks.length = 0;
      destroyCallbacks.length = 0;
      sensorBeginCallbacks.length = 0;
      sensorEndCallbacks.length = 0;
      inputEventCallbacks.length = 0;
    },

    async loadGame(definition: GameDefinition) {
      const godotBridge = getGodotBridge();
      if (!godotBridge) throw new Error("Godot not initialized");
      godotBridge.loadGameJson(JSON.stringify(definition));
    },

    clearGame() {
      getGodotBridge()?.clearGame();
    },

    spawnEntity(templateId: string, x: number, y: number): string {
      const entityId = `${templateId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      getGodotBridge()?.spawnEntity(templateId, x, y, entityId);
      return entityId;
    },

    destroyEntity(entityId: string) {
      getGodotBridge()?.destroyEntity(entityId);
    },

    async getEntityTransform(
      entityId: string,
    ): Promise<EntityTransform | null> {
      return getGodotBridge()?.getEntityTransform(entityId) ?? null;
    },

    async getAllTransforms(): Promise<Record<string, EntityTransform>> {
      try {
        return await queryAsync<Record<string, EntityTransform>>("getAllTransforms");
      } catch {
        return {};
      }
    },

    async getAllProperties(): Promise<PropertySyncPayload> {
      try {
        return await queryAsync<PropertySyncPayload>("getAllProperties");
      } catch {
        return { frameId: 0, timestamp: 0, entities: {} };
      }
    },

    setTransform(entityId: string, x: number, y: number, angle: number) {
      getGodotBridge()?.setTransform(entityId, x, y, angle);
    },

    setPosition(entityId: string, x: number, y: number) {
      getGodotBridge()?.setPosition(entityId, x, y);
    },

    setRotation(entityId: string, angle: number) {
      getGodotBridge()?.setRotation(entityId, angle);
    },

    setScale(entityId: string, scaleX: number, scaleY: number) {
      getGodotBridge()?.setScale(entityId, scaleX, scaleY);
    },

    async getLinearVelocity(entityId: string): Promise<Vec2 | null> {
      return getGodotBridge()?.getLinearVelocity(entityId) ?? null;
    },

    setLinearVelocity(entityId: string, velocity: Vec2) {
      getGodotBridge()?.setLinearVelocity(entityId, velocity.x, velocity.y);
    },

    async getAngularVelocity(entityId: string): Promise<number | null> {
      return getGodotBridge()?.getAngularVelocity(entityId) ?? null;
    },

    setAngularVelocity(entityId: string, velocity: number) {
      getGodotBridge()?.setAngularVelocity(entityId, velocity);
    },

    applyImpulse(entityId: string, impulse: Vec2) {
      getGodotBridge()?.applyImpulse(entityId, impulse.x, impulse.y);
    },

    applyForce(entityId: string, force: Vec2) {
      getGodotBridge()?.applyForce(entityId, force.x, force.y);
    },

    applyTorque(entityId: string, torque: number) {
      getGodotBridge()?.applyTorque(entityId, torque);
    },

    createRevoluteJoint(def: RevoluteJointDef): number {
      return (
        getGodotBridge()?.createRevoluteJoint(
          def.bodyA,
          def.bodyB,
          def.anchor.x,
          def.anchor.y,
          def.enableLimit ?? false,
          def.lowerAngle ?? 0,
          def.upperAngle ?? 0,
          def.enableMotor ?? false,
          def.motorSpeed ?? 0,
          def.maxMotorTorque ?? 0,
        ) ?? -1
      );
    },

    createDistanceJoint(def: DistanceJointDef): number {
      return (
        getGodotBridge()?.createDistanceJoint(
          def.bodyA,
          def.bodyB,
          def.anchorA.x,
          def.anchorA.y,
          def.anchorB.x,
          def.anchorB.y,
          def.length ?? 0,
          def.stiffness ?? 0,
          def.damping ?? 0,
        ) ?? -1
      );
    },

    createPrismaticJoint(def: PrismaticJointDef): number {
      return (
        getGodotBridge()?.createPrismaticJoint(
          def.bodyA,
          def.bodyB,
          def.anchor.x,
          def.anchor.y,
          def.axis.x,
          def.axis.y,
          def.enableLimit ?? false,
          def.lowerTranslation ?? 0,
          def.upperTranslation ?? 0,
          def.enableMotor ?? false,
          def.motorSpeed ?? 0,
          def.maxMotorForce ?? 0,
        ) ?? -1
      );
    },

    createWeldJoint(def: WeldJointDef): number {
      return (
        getGodotBridge()?.createWeldJoint(
          def.bodyA,
          def.bodyB,
          def.anchor.x,
          def.anchor.y,
          def.stiffness ?? 0,
          def.damping ?? 0,
        ) ?? -1
      );
    },

    createMouseJoint(def: MouseJointDef): number {
      const godotBridge = getGodotBridge();
      if (!godotBridge) return -1;
      godotBridge.createMouseJoint(
        def.body,
        def.target.x,
        def.target.y,
        def.maxForce,
        def.stiffness ?? 5,
        def.damping ?? 0.7,
      );
      return (godotBridge._lastResult as number) ?? -1;
    },

    async createMouseJointAsync(def: MouseJointDef): Promise<number> {
      return this.createMouseJoint(def);
    },

    destroyJoint(jointId: number) {
      getGodotBridge()?.destroyJoint(jointId);
    },

    setMotorSpeed(jointId: number, speed: number) {
      getGodotBridge()?.setMotorSpeed(jointId, speed);
    },

    setMouseTarget(jointId: number, target: Vec2) {
      getGodotBridge()?.setMouseTarget(jointId, target.x, target.y);
    },

    async queryPoint(point: Vec2): Promise<number | null> {
      return getGodotBridge()?.queryPoint(point.x, point.y) ?? null;
    },

    async queryPointEntity(point: Vec2): Promise<string | null> {
      return await queryAsync<string | null>("queryPointEntity", [point.x, point.y]);
    },

    async queryAABB(min: Vec2, max: Vec2): Promise<number[]> {
      return getGodotBridge()?.queryAABB(min.x, min.y, max.x, max.y) ?? [];
    },

    async raycast(
      origin: Vec2,
      direction: Vec2,
      maxDistance: number,
    ): Promise<RaycastHit | null> {
      return (
        getGodotBridge()?.raycast(
          origin.x,
          origin.y,
          direction.x,
          direction.y,
          maxDistance,
        ) ?? null
      );
    },

    createBody(def: BodyDef): number {
      return (
        getGodotBridge()?.createBody(
          def.type,
          def.position.x,
          def.position.y,
          def.angle ?? 0,
          def.linearDamping ?? 0,
          def.angularDamping ?? 0,
          def.fixedRotation ?? false,
          def.bullet ?? false,
          def.userData,
          def.group,
        ) ?? -1
      );
    },

    addFixture(bodyId: number, def: FixtureDef): number {
      const shape = def.shape;
      let args: (number | string | boolean)[] = [bodyId, shape.type];

      if (shape.type === "circle") {
        args.push(shape.radius ?? 0.5);
      } else if (shape.type === "box") {
        args.push(shape.halfWidth ?? 0.5, shape.halfHeight ?? 0.5);
      } else if (shape.type === "polygon" && shape.vertices) {
        args.push(shape.vertices.length);
        for (const v of shape.vertices) {
          args.push(v.x, v.y);
        }
      }

      args.push(
        def.density ?? 1,
        def.friction ?? 0.3,
        def.restitution ?? 0,
        def.isSensor ?? false,
        def.categoryBits ?? 1,
        def.maskBits ?? 0xffffffff,
      );

      return getGodotBridge()?.addFixture(...args) ?? -1;
    },

    setSensor(colliderId: number, isSensor: boolean) {
      getGodotBridge()?.setSensor(colliderId, isSensor);
    },

    setUserData(bodyId: number, data: unknown) {
      getGodotBridge()?.setUserData(bodyId, data);
    },

    async getUserData(bodyId: number): Promise<unknown> {
      return getGodotBridge()?.getUserData(bodyId);
    },

    async getAllBodies(): Promise<number[]> {
      return getGodotBridge()?.getAllBodies() ?? [];
    },

    onCollision(callback: (event: CollisionEvent) => void): () => void {
      collisionCallbacks.push(callback);
      return () => {
        const index = collisionCallbacks.indexOf(callback);
        if (index >= 0) collisionCallbacks.splice(index, 1);
      };
    },

    onEntityDestroyed(callback: (entityId: string) => void): () => void {
      destroyCallbacks.push(callback);
      return () => {
        const index = destroyCallbacks.indexOf(callback);
        if (index >= 0) destroyCallbacks.splice(index, 1);
      };
    },

    onSensorBegin(callback: (event: SensorEvent) => void): () => void {
      sensorBeginCallbacks.push(callback);
      return () => {
        const index = sensorBeginCallbacks.indexOf(callback);
        if (index >= 0) sensorBeginCallbacks.splice(index, 1);
      };
    },

    onSensorEnd(callback: (event: SensorEvent) => void): () => void {
      sensorEndCallbacks.push(callback);
      return () => {
        const index = sensorEndCallbacks.indexOf(callback);
        if (index >= 0) sensorEndCallbacks.splice(index, 1);
      };
    },

    onTransformSync(
      callback: (transforms: Record<string, EntityTransform>) => void,
    ): () => void {
      transformSyncCallbacks.push(callback);
      return () => {
        const index = transformSyncCallbacks.indexOf(callback);
        if (index >= 0) transformSyncCallbacks.splice(index, 1);
      };
    },

    onPropertySync(
      callback: (properties: PropertySyncPayload) => void,
    ): () => void {
      propertySyncCallbacks.push(callback);
      return () => {
        const index = propertySyncCallbacks.indexOf(callback);
        if (index >= 0) propertySyncCallbacks.splice(index, 1);
      };
    },

    setWatchConfig(config: unknown): void {
      getGodotBridge()?.setWatchConfig(JSON.stringify(config));
    },

    sendInput(type, data) {
      getGodotBridge()?.sendInput(type, data.x, data.y, data.entityId ?? "");
    },

    onInputEvent(
      callback: (
        type: string,
        x: number,
        y: number,
        entityId: string | null,
      ) => void,
    ): () => void {
      inputEventCallbacks.push(callback);
      return () => {
        const index = inputEventCallbacks.indexOf(callback);
        if (index >= 0) inputEventCallbacks.splice(index, 1);
      };
    },

    setEntityImage(
      entityId: string,
      url: string,
      width: number,
      height: number,
    ) {
      getGodotBridge()?.setEntityImage(entityId, url, width, height);
    },

    setEntityAtlasRegion(
      entityId: string,
      atlasUrl: string,
      x: number,
      y: number,
      w: number,
      h: number,
      width: number,
      height: number,
    ) {
      getGodotBridge()?.setEntityAtlasRegion(entityId, atlasUrl, x, y, w, h, width, height);
    },

    clearTextureCache(url?: string) {
      getGodotBridge()?.clearTextureCache(url ?? "");
    },

    setDebugShowShapes(show: boolean) {
      getGodotBridge()?.setDebugShowShapes(show);
    },

    setCameraTarget(entityId: string | null) {
      getGodotBridge()?.setCameraTarget(entityId ?? "");
    },

    setCameraPosition(x: number, y: number) {
      getGodotBridge()?.setCameraPosition(x, y);
    },

    setCameraZoom(zoom: number) {
      getGodotBridge()?.setCameraZoom(zoom);
    },

    spawnParticle(type: string, x: number, y: number) {
      getGodotBridge()?.spawnParticle(type, x, y);
    },

    playSound(resourcePath: string) {
      getGodotBridge()?.playSound(resourcePath);
    },

    applySpriteEffect(
      entityId: string,
      effectName: string,
      params?: Record<string, unknown>,
    ) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.applySpriteEffect) {
        godotBridge.applySpriteEffect(
          entityId,
          effectName,
          params ? JSON.stringify(params) : undefined,
        );
      }
    },

    updateSpriteEffectParam(
      entityId: string,
      paramName: string,
      value: unknown,
    ) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.updateSpriteEffectParam) {
        godotBridge.updateSpriteEffectParam(entityId, paramName, value);
      }
    },

    clearSpriteEffect(entityId: string) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.clearSpriteEffect) {
        godotBridge.clearSpriteEffect(entityId);
      }
    },

    setPostEffect(
      effectName: string,
      params?: Record<string, unknown>,
      layer?: string,
    ) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.setPostEffect) {
        godotBridge.setPostEffect(
          effectName,
          params ? JSON.stringify(params) : undefined,
          layer,
        );
      }
    },

    updatePostEffectParam(paramName: string, value: unknown, layer?: string) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.updatePostEffectParam) {
        godotBridge.updatePostEffectParam(paramName, value, layer);
      }
    },

    clearPostEffect(layer?: string) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.clearPostEffect) {
        godotBridge.clearPostEffect(layer);
      }
    },

    screenShake(intensity: number, duration?: number) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.screenShake) {
        godotBridge.screenShake(intensity, duration);
      }
    },

    zoomPunch(intensity?: number, duration?: number) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.zoomPunch) {
        godotBridge.zoomPunch(intensity, duration);
      }
    },

    triggerShockwave(worldX: number, worldY: number, duration?: number) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.triggerShockwave) {
        godotBridge.triggerShockwave(worldX, worldY, duration);
      }
    },

    flashScreen(color?: [number, number, number, number?], duration?: number) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.flashScreen) {
        const colorArray = color
          ? [color[0], color[1], color[2], color[3] ?? 1.0]
          : undefined;
        godotBridge.flashScreen(colorArray, duration);
      }
    },

    async createDynamicShader(
      shaderId: string,
      shaderCode: string,
    ): Promise<DynamicShaderResult> {
      const godotBridge = getGodotBridge();
      if (!godotBridge?.createDynamicShader) {
        return {
          success: false,
          shader_id: shaderId,
          error: "Godot bridge not initialized",
        };
      }

      godotBridge.createDynamicShader(shaderId, shaderCode);

      // Wait a frame for Godot to process and set _lastResult
      await new Promise((resolve) => setTimeout(resolve, 16));

      const result = godotBridge._lastResult as DynamicShaderResult | undefined;
      if (result && typeof result === "object" && "success" in result) {
        return result;
      }

      // Fallback if no result (shouldn't happen)
      return { success: true, shader_id: shaderId };
    },

    applyDynamicShader(
      entityId: string,
      shaderId: string,
      params?: Record<string, unknown>,
    ) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.applyDynamicShader) {
        godotBridge.applyDynamicShader(
          entityId,
          shaderId,
          params ? JSON.stringify(params) : undefined,
        );
      }
    },

    applyDynamicPostShader(
      shaderCode: string,
      params?: Record<string, unknown>,
    ) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.applyDynamicPostShader) {
        godotBridge.applyDynamicPostShader(
          shaderCode,
          params ? JSON.stringify(params) : undefined,
        );
      }
    },

    spawnParticlePreset(
      presetName: string,
      worldX: number,
      worldY: number,
      params?: Record<string, unknown>,
    ) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.spawnParticlePreset) {
        godotBridge.spawnParticlePreset(
          presetName,
          worldX,
          worldY,
          params ? JSON.stringify(params) : undefined,
        );
      }
    },

    async getAvailableEffects(): Promise<{
      sprite: string[];
      post: string[];
      particles: string[];
    }> {
      const godotBridge = getGodotBridge();
      if (!godotBridge?.getAvailableEffects) {
        return { sprite: [], post: [], particles: [] };
      }
      godotBridge.getAvailableEffects();
      const result = godotBridge._lastResult;
      if (result && typeof result === "object") {
        return result as {
          sprite: string[];
          post: string[];
          particles: string[];
        };
      }
      return { sprite: [], post: [], particles: [] };
    },

    createUIButton(
      buttonId: string,
      normalImageUrl: string,
      pressedImageUrl: string,
      x: number,
      y: number,
      width: number,
      height: number,
    ) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.createUIButton) {
        godotBridge.createUIButton(
          buttonId,
          normalImageUrl,
          pressedImageUrl,
          x,
          y,
          width,
          height,
        );
      }
    },

    destroyUIButton(buttonId: string) {
      const godotBridge = getGodotBridge();
      if (godotBridge?.destroyUIButton) {
        godotBridge.destroyUIButton(buttonId);
      }
    },

    onUIButtonEvent(
      callback: (
        eventType: "button_down" | "button_up" | "button_pressed",
        buttonId: string,
      ) => void,
    ): () => void {
      uiButtonCallbacks.push(callback);

      const godotBridge = getGodotBridge();
      if (godotBridge?.onUIButtonEvent && uiButtonCallbacks.length === 1) {
        godotBridge.onUIButtonEvent((...args: unknown[]) => {
          let eventType: string;
          let buttonId: string;

          if (Array.isArray(args[0])) {
            const arr = args[0] as string[];
            eventType = arr[0];
            buttonId = arr[1];
          } else {
            eventType = args[0] as string;
            buttonId = args[1] as string;
          }

          for (const cb of uiButtonCallbacks) {
            cb(
              eventType as "button_down" | "button_up" | "button_pressed",
              buttonId,
            );
          }
        });
      }

      return () => {
        const index = uiButtonCallbacks.indexOf(callback);
        if (index >= 0) uiButtonCallbacks.splice(index, 1);
      };
    },

    show3DModel(path: string): boolean {
      const godotBridge = getGodotBridge();
      return godotBridge?.show_3d_model?.(path) ?? false;
    },

    show3DModelFromUrl(url: string): void {
      const godotBridge = getGodotBridge();
      godotBridge?.show_3d_model_from_url?.(url);
    },

    set3DViewportPosition(x: number, y: number): void {
      const godotBridge = getGodotBridge();
      godotBridge?.set_3d_viewport_position?.(x, y);
    },

    set3DViewportSize(width: number, height: number): void {
      const godotBridge = getGodotBridge();
      godotBridge?.set_3d_viewport_size?.(width, height);
    },

    rotate3DModel(x: number, y: number, z: number): void {
      const godotBridge = getGodotBridge();
      godotBridge?.rotate_3d_model?.(x, y, z);
    },

    set3DCameraDistance(distance: number): void {
      const godotBridge = getGodotBridge();
      godotBridge?.set_3d_camera_distance?.(distance);
    },

    clear3DModels(): void {
      const godotBridge = getGodotBridge();
      godotBridge?.clear_3d_models?.();
    },
  };

  return bridge;
}
