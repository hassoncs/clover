import type GodotHeadlessDriver from "./GodotHeadlessDriver.js";

// ---------------------------------------------------------------------------
// Return type interfaces
// ---------------------------------------------------------------------------

export interface Transform2D {
  x: number;
  y: number;
  angle: number;
}

export interface FullTransform2D extends Transform2D {
  scaleX: number;
  scaleY: number;
}

export interface Velocity2D {
  x: number;
  y: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface RaycastHit {
  hit: true;
  point: Point2D;
  normal: Point2D;
  fraction: number;
  entityId: string;
}

export interface BridgeMethodRegistryEntry {
  name: string;
  owner: string;
}

export interface BridgeMethodRegistry {
  methods: BridgeMethodRegistryEntry[];
  byModule: Record<string, string[]>;
  total: number;
}

export interface SyncConfig {
  enabled?: boolean;
  entityIds?: string[];
  interval?: number;
}

export interface WatchConfig {
  frameProperties?: string[];
  changeProperties?: Record<string, unknown>;
}

export interface PropertySnapshot {
  frameId: number;
  timestamp: number;
  entities: Record<string, Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// TypedBridgeClient
// ---------------------------------------------------------------------------

export class TypedBridgeClient {
  constructor(private driver: GodotHeadlessDriver) {}

  // =========================================================================
  // Lifecycle
  // =========================================================================

  async loadGameJson(json: string): Promise<boolean> {
    return this.driver.call("load_game_json", [json]) as Promise<boolean>;
  }

  async clearGame(): Promise<void> {
    await this.driver.call("clear_game", []);
  }

  async setInspectMode(enabled: boolean): Promise<void> {
    await this.driver.call("set_inspect_mode", [enabled]);
  }

  async pausePhysics(): Promise<void> {
    await this.driver.call("pause_physics", []);
  }

  async resumePhysics(): Promise<void> {
    await this.driver.call("resume_physics", []);
  }

  async loadCustomScene(scenePath: string): Promise<boolean> {
    return this.driver.call("load_custom_scene", [scenePath]) as Promise<boolean>;
  }

  // =========================================================================
  // Entity Management
  // =========================================================================

  async getAllBodies(): Promise<string[]> {
    return this.driver.call("get_all_bodies", []) as Promise<string[]>;
  }

  async spawnEntity(
    templateId: string,
    x: number,
    y: number,
    entityId: string,
  ): Promise<void> {
    await this.driver.call("spawn_entity", [templateId, x, y, entityId]);
  }

  async spawnEntityWithId(
    templateId: string,
    x: number,
    y: number,
    entityId: string,
  ): Promise<unknown> {
    return this.driver.call("spawn_entity_with_id", [templateId, x, y, entityId]);
  }

  async destroyEntity(entityId: string): Promise<void> {
    await this.driver.call("destroy_entity", [entityId]);
  }

  async getEntityTransform(entityId: string): Promise<Transform2D | Record<string, never>> {
    return this.driver.call("get_entity_transform", [entityId]) as Promise<
      Transform2D | Record<string, never>
    >;
  }

  async setUserData(bodyId: number, data: unknown): Promise<void> {
    await this.driver.call("set_user_data", [bodyId, data]);
  }

  async getUserData(bodyId: number): Promise<unknown> {
    return this.driver.call("get_user_data", [bodyId]);
  }

  // =========================================================================
  // Transform
  // =========================================================================

  async setTransform(
    entityId: string,
    x: number,
    y: number,
    angle: number,
  ): Promise<void> {
    await this.driver.call("set_transform", [entityId, x, y, angle]);
  }

  async setPosition(entityId: string, x: number, y: number): Promise<void> {
    await this.driver.call("set_position", [entityId, x, y]);
  }

  async setRotation(entityId: string, angle: number): Promise<void> {
    await this.driver.call("set_rotation", [entityId, angle]);
  }

  async setScale(entityId: string, scaleX: number, scaleY: number): Promise<void> {
    await this.driver.call("set_scale", [entityId, scaleX, scaleY]);
  }

  async getAllTransforms(): Promise<Record<string, Transform2D>> {
    return this.driver.call("get_all_transforms", []) as Promise<
      Record<string, Transform2D>
    >;
  }

  // =========================================================================
  // Physics
  // =========================================================================

  async setLinearVelocity(
    entityId: string,
    vx: number,
    vy: number,
  ): Promise<void> {
    await this.driver.call("set_linear_velocity", [entityId, vx, vy]);
  }

  async setAngularVelocity(entityId: string, velocity: number): Promise<void> {
    await this.driver.call("set_angular_velocity", [entityId, velocity]);
  }

  async getLinearVelocity(entityId: string): Promise<Velocity2D | null> {
    return this.driver.call("get_linear_velocity", [entityId]) as Promise<
      Velocity2D | null
    >;
  }

  async getAngularVelocity(entityId: string): Promise<number | null> {
    return this.driver.call("get_angular_velocity", [entityId]) as Promise<
      number | null
    >;
  }

  async applyImpulse(entityId: string, ix: number, iy: number): Promise<void> {
    await this.driver.call("apply_impulse", [entityId, ix, iy]);
  }

  async applyForce(entityId: string, fx: number, fy: number): Promise<void> {
    await this.driver.call("apply_force", [entityId, fx, fy]);
  }

  async applyTorque(entityId: string, torque: number): Promise<void> {
    await this.driver.call("apply_torque", [entityId, torque]);
  }

  // =========================================================================
  // Physics Queries
  // =========================================================================

  async queryPoint(x: number, y: number): Promise<string | null> {
    return this.driver.call("query_point", [x, y]) as Promise<string | null>;
  }

  async queryPointEntity(x: number, y: number): Promise<string | null> {
    return this.driver.call("query_point_entity", [x, y]) as Promise<string | null>;
  }

  async queryAabb(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): Promise<string[]> {
    return this.driver.call("query_aabb", [minX, minY, maxX, maxY]) as Promise<
      string[]
    >;
  }

  async raycast(
    originX: number,
    originY: number,
    dirX: number,
    dirY: number,
    maxDistance: number,
  ): Promise<RaycastHit | null> {
    return this.driver.call("raycast", [
      originX,
      originY,
      dirX,
      dirY,
      maxDistance,
    ]) as Promise<RaycastHit | null>;
  }

  async screenToWorld(screenX: number, screenY: number): Promise<Point2D> {
    return this.driver.call("screen_to_world", [screenX, screenY]) as Promise<Point2D>;
  }

  // =========================================================================
  // Joints
  // =========================================================================

  async createRevoluteJoint(
    bodyAId: string,
    bodyBId: string,
    anchorX: number,
    anchorY: number,
    enableLimit?: boolean,
    lowerAngle?: number,
    upperAngle?: number,
    enableMotor?: boolean,
    motorSpeed?: number,
    maxMotorTorque?: number,
  ): Promise<number> {
    const args: unknown[] = [bodyAId, bodyBId, anchorX, anchorY];
    if (enableLimit !== undefined) args.push(enableLimit);
    if (lowerAngle !== undefined) args.push(lowerAngle);
    if (upperAngle !== undefined) args.push(upperAngle);
    if (enableMotor !== undefined) args.push(enableMotor);
    if (motorSpeed !== undefined) args.push(motorSpeed);
    if (maxMotorTorque !== undefined) args.push(maxMotorTorque);
    return this.driver.call("create_revolute_joint", args) as Promise<number>;
  }

  async createDistanceJoint(
    bodyAId: string,
    bodyBId: string,
    anchorAX: number,
    anchorAY: number,
    anchorBX: number,
    anchorBY: number,
    length?: number,
    stiffness?: number,
    damping?: number,
  ): Promise<number> {
    const args: unknown[] = [bodyAId, bodyBId, anchorAX, anchorAY, anchorBX, anchorBY];
    if (length !== undefined) args.push(length);
    if (stiffness !== undefined) args.push(stiffness);
    if (damping !== undefined) args.push(damping);
    return this.driver.call("create_distance_joint", args) as Promise<number>;
  }

  async createPrismaticJoint(
    bodyAId: string,
    bodyBId: string,
    anchorX: number,
    anchorY: number,
    axisX: number,
    axisY: number,
    enableLimit?: boolean,
    lowerTrans?: number,
    upperTrans?: number,
    enableMotor?: boolean,
    motorSpeed?: number,
    maxMotorForce?: number,
  ): Promise<number> {
    const args: unknown[] = [bodyAId, bodyBId, anchorX, anchorY, axisX, axisY];
    if (enableLimit !== undefined) args.push(enableLimit);
    if (lowerTrans !== undefined) args.push(lowerTrans);
    if (upperTrans !== undefined) args.push(upperTrans);
    if (enableMotor !== undefined) args.push(enableMotor);
    if (motorSpeed !== undefined) args.push(motorSpeed);
    if (maxMotorForce !== undefined) args.push(maxMotorForce);
    return this.driver.call("create_prismatic_joint", args) as Promise<number>;
  }

  async createWeldJoint(
    bodyAId: string,
    bodyBId: string,
    anchorX: number,
    anchorY: number,
    stiffness?: number,
    damping?: number,
  ): Promise<number> {
    const args: unknown[] = [bodyAId, bodyBId, anchorX, anchorY];
    if (stiffness !== undefined) args.push(stiffness);
    if (damping !== undefined) args.push(damping);
    return this.driver.call("create_weld_joint", args) as Promise<number>;
  }

  async createMouseJoint(
    entityId: string,
    targetX: number,
    targetY: number,
    maxForce: number,
    stiffness?: number,
    damping?: number,
  ): Promise<number> {
    const args: unknown[] = [entityId, targetX, targetY, maxForce];
    if (stiffness !== undefined) args.push(stiffness);
    if (damping !== undefined) args.push(damping);
    return this.driver.call("create_mouse_joint", args) as Promise<number>;
  }

  async destroyJoint(jointId: number): Promise<void> {
    await this.driver.call("destroy_joint", [jointId]);
  }

  async destroyMouseJointForEntity(entityId: string): Promise<void> {
    await this.driver.call("destroy_mouse_joint_for_entity", [entityId]);
  }

  async setMotorSpeed(jointId: number, speed: number): Promise<void> {
    await this.driver.call("set_motor_speed", [jointId, speed]);
  }

  async setMouseTarget(
    jointId: number,
    targetX: number,
    targetY: number,
  ): Promise<void> {
    await this.driver.call("set_mouse_target", [jointId, targetX, targetY]);
  }

  async getLastJointId(): Promise<number> {
    return this.driver.call("get_last_joint_id", []) as Promise<number>;
  }

  // =========================================================================
  // Sync System
  // =========================================================================

  async getTransform(entityId: string): Promise<FullTransform2D | null> {
    return this.driver.call("get_transform", [entityId]) as Promise<
      FullTransform2D | null
    >;
  }

  async getTransforms(entityIds: string[]): Promise<Record<string, FullTransform2D>> {
    return this.driver.call("get_transforms", [entityIds]) as Promise<
      Record<string, FullTransform2D>
    >;
  }

  async setTrackedEntities(
    entityIds: string[],
    config?: SyncConfig,
  ): Promise<void> {
    const args: unknown[] = [entityIds];
    if (config !== undefined) args.push(config);
    await this.driver.call("set_tracked_entities", args);
  }

  async onTransformSync(callback: unknown): Promise<void> {
    await this.driver.call("on_transform_sync", [callback]);
  }

  async onPropertySync(callback: unknown): Promise<void> {
    await this.driver.call("on_property_sync", [callback]);
  }

  async setWatchConfig(configJson: string): Promise<void> {
    await this.driver.call("set_watch_config", [configJson]);
  }

  // =========================================================================
  // Properties
  // =========================================================================

  async getAllProperties(): Promise<void> {
    await this.driver.call("get_all_properties", []);
  }

  // =========================================================================
  // Visual Renderer
  // =========================================================================

  async setEntityImage(
    entityId: string,
    url: string,
    width: number,
    height: number,
  ): Promise<void> {
    await this.driver.call("set_entity_image", [entityId, url, width, height]);
  }

  async setEntityImageFromFile(
    entityId: string,
    filePath: string,
    width: number,
    height: number,
  ): Promise<void> {
    await this.driver.call("set_entity_image_from_file", [
      entityId,
      filePath,
      width,
      height,
    ]);
  }

  async setEntityAtlasRegion(
    entityId: string,
    atlasUrl: string,
    x: number,
    y: number,
    w: number,
    h: number,
    width: number,
    height: number,
  ): Promise<void> {
    await this.driver.call("set_entity_atlas_region", [
      entityId,
      atlasUrl,
      x,
      y,
      w,
      h,
      width,
      height,
    ]);
  }

  async setEntityAtlasRegionFromFile(
    entityId: string,
    filePath: string,
    x: number,
    y: number,
    w: number,
    h: number,
    width: number,
    height: number,
  ): Promise<void> {
    await this.driver.call("set_entity_atlas_region_from_file", [
      entityId,
      filePath,
      x,
      y,
      w,
      h,
      width,
      height,
    ]);
  }

  async setOpacity(entityId: string, opacity: number): Promise<void> {
    await this.driver.call("set_opacity", [entityId, opacity]);
  }

  async setVisible(entityId: string, visible: boolean): Promise<void> {
    await this.driver.call("set_visible", [entityId, visible]);
  }

  async setDebugShowShapes(enabled: boolean): Promise<void> {
    await this.driver.call("set_debug_show_shapes", [enabled]);
  }

  async setDebugSettings(settingsJson: string): Promise<void> {
    await this.driver.call("set_debug_settings", [settingsJson]);
  }

  async clearTextureCache(url?: string): Promise<void> {
    await this.driver.call("clear_texture_cache", [url ?? ""]);
  }

  async preloadTextures(urlsJson: string, callback?: unknown): Promise<void> {
    const args: unknown[] = [urlsJson];
    if (callback !== undefined) args.push(callback);
    await this.driver.call("preload_textures", args);
  }

  // =========================================================================
  // Pixel Buffer
  // =========================================================================

  async createPixelBuffer(
    entityId: string,
    width: number,
    height: number,
    clearColor: string,
    worldW?: number,
    worldH?: number,
  ): Promise<void> {
    const args: unknown[] = [entityId, width, height, clearColor];
    if (worldW !== undefined) args.push(worldW);
    if (worldH !== undefined) args.push(worldH);
    await this.driver.call("createPixelBuffer", args);
  }

  async pixelBufferDraw(entityId: string, commandsJson: string): Promise<void> {
    await this.driver.call("pixelBufferDraw", [entityId, commandsJson]);
  }

  async pixelBufferClear(entityId: string, color: string): Promise<void> {
    await this.driver.call("pixelBufferClear", [entityId, color]);
  }

  async destroyPixelBuffer(entityId: string): Promise<void> {
    await this.driver.call("destroyPixelBuffer", [entityId]);
  }

  // =========================================================================
  // Input / Events
  // =========================================================================

  async sendInput(
    inputType: string,
    x: number,
    y: number,
    extra?: unknown,
  ): Promise<void> {
    await this.driver.call("send_input", [inputType, x, y, extra ?? null]);
  }

  async onInputEvent(callback: unknown): Promise<void> {
    await this.driver.call("on_input_event", [callback]);
  }

  async onCollision(callback: unknown): Promise<void> {
    await this.driver.call("on_collision", [callback]);
  }

  async onEntityDestroyed(callback: unknown): Promise<void> {
    await this.driver.call("on_entity_destroyed", [callback]);
  }

  async onSensorBegin(callback: unknown): Promise<void> {
    await this.driver.call("on_sensor_begin", [callback]);
  }

  async onSensorEnd(callback: unknown): Promise<void> {
    await this.driver.call("on_sensor_end", [callback]);
  }

  // =========================================================================
  // Camera
  // =========================================================================

  async setCameraTarget(entityId: string): Promise<void> {
    await this.driver.call("set_camera_target", [entityId]);
  }

  async setCameraPosition(x: number, y: number): Promise<void> {
    await this.driver.call("set_camera_position", [x, y]);
  }

  async setCameraZoom(zoom: number): Promise<void> {
    await this.driver.call("set_camera_zoom", [zoom]);
  }

  async startCamera(
    entityId: string,
    width?: number,
    height?: number,
  ): Promise<void> {
    const args: unknown[] = [entityId];
    if (width !== undefined) args.push(width);
    if (height !== undefined) args.push(height);
    await this.driver.call("start_camera", args);
  }

  async stopCamera(): Promise<void> {
    await this.driver.call("stop_camera", []);
  }

  // =========================================================================
  // UI
  // =========================================================================

  async createUiButton(
    buttonId: string,
    normalImageUrl: string,
    pressedImageUrl: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<void> {
    await this.driver.call("create_ui_button", [
      buttonId,
      normalImageUrl,
      pressedImageUrl,
      x,
      y,
      width,
      height,
    ]);
  }

  async destroyUiButton(buttonId: string): Promise<void> {
    await this.driver.call("destroy_ui_button", [buttonId]);
  }

  async onUiButtonEvent(callback: unknown): Promise<void> {
    await this.driver.call("on_ui_button_event", [callback]);
  }

  async spawnParticle(particleType: string, x: number, y: number): Promise<void> {
    await this.driver.call("spawn_particle", [particleType, x, y]);
  }

  async playSound(resourcePath: string, volume?: number): Promise<void> {
    const args: unknown[] = [resourcePath];
    if (volume !== undefined) args.push(volume);
    await this.driver.call("play_sound", args);
  }

  async createThemedUiComponent(
    componentId: string,
    componentType: number,
    metadataUrl: string,
    posX: number,
    posY: number,
    width: number,
    height: number,
    labelText?: string,
  ): Promise<void> {
    const args: unknown[] = [
      componentId,
      componentType,
      metadataUrl,
      posX,
      posY,
      width,
      height,
    ];
    if (labelText !== undefined) args.push(labelText);
    await this.driver.call("create_themed_ui_component", args);
  }

  async destroyThemedUiComponent(componentId: string): Promise<void> {
    await this.driver.call("destroy_themed_ui_component", [componentId]);
  }

  // =========================================================================
  // 3D Viewport
  // =========================================================================

  async show3DModel(resourcePath: string): Promise<boolean> {
    return this.driver.call("show_3d_model", [resourcePath]) as Promise<boolean>;
  }

  async show3DModelFromUrl(url: string): Promise<void> {
    await this.driver.call("show_3d_model_from_url", [url]);
  }

  async set3DViewportPosition(x: number, y: number): Promise<void> {
    await this.driver.call("set_3d_viewport_position", [x, y]);
  }

  async set3DViewportSize(width: number, height: number): Promise<void> {
    await this.driver.call("set_3d_viewport_size", [width, height]);
  }

  async rotate3DModel(rx: number, ry: number, rz: number): Promise<void> {
    await this.driver.call("rotate_3d_model", [rx, ry, rz]);
  }

  async set3DCameraDistance(distance: number): Promise<void> {
    await this.driver.call("set_3d_camera_distance", [distance]);
  }

  async set3DCameraSize(size: number): Promise<void> {
    await this.driver.call("set_3d_camera_size", [size]);
  }

  async clear3DModels(): Promise<void> {
    await this.driver.call("clear_3d_models", []);
  }

  // =========================================================================
  // Diagnostics
  // =========================================================================

  async getBridgeMethods(): Promise<BridgeMethodRegistry> {
    return this.driver.call("get_bridge_methods", []) as Promise<BridgeMethodRegistry>;
  }
}
