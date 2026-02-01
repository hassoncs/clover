extends Node

signal game_loaded(game_data: Dictionary)
signal entity_spawned(entity_id: String, node: Node2D)
signal entity_destroyed(entity_id: String)
signal collision_occurred(entity_a: String, entity_b: String, impulse: float)
signal query_result(request_id: int, result: Variant)
signal joint_created(request_id: int, joint_id: int)

# ============================================================================
# MODULE INSTANCES
# ============================================================================
var _event_queue_module: EventQueue = null
var _event_emitter: EventEmitter = null
var _sync_system: SyncSystem = null
var _viewport_3d: Viewport3D = null
var _property_collector: PropertyCollector = null
var _query_system: QuerySystem = null
var _debug_bridge: DebugBridge = null
var _physics_queries: PhysicsQueries = null
var _devtools_overlay: DebugOverlay = null

# NEW MODULES - Refactored functionality
var _physics_controller: PhysicsController = null
var _entity_manager: EntityManager = null
var _entity_factory: EntityFactory = null
var _transform_system: TransformSystem = null
var _joint_manager: JointManager = null
var _visual_renderer: VisualRenderer = null
var _ui_manager: UIManager = null
var _camera_controller: CameraController = null
var _input_router: InputRouter = null
var _splat_map_system: SplatMapSystem = null
var _ws_system: WebSocketSystem = null
var _collision_system: CollisionSystem = null
var _world_system: WorldSystem = null

# ============================================================================
# CORE STATE
# ============================================================================
var game_data: Dictionary = {}
var entity_registry: Dictionary = {}  # entity_id -> EntityRecord (single source of truth)
var templates: Dictionary = {}
var pixels_per_meter: float = 50.0
var game_root: Node2D = null

# Backward compatibility: entities property that maps to entity_registry nodes
var entities: Dictionary:
	get:
		var result = {}
		for entity_id in entity_registry:
			var record = entity_registry[entity_id]
			if record and record.is_valid():
				result[entity_id] = record.node
		return result

# Coordinate conversion helpers
func game_to_godot_pos(game_pos: Vector2) -> Vector2:
	return Vector2(game_pos.x * pixels_per_meter, -game_pos.y * pixels_per_meter)

func godot_to_game_pos(godot_pos: Vector2) -> Vector2:
	return Vector2(godot_pos.x / pixels_per_meter, -godot_pos.y / pixels_per_meter)

func game_to_godot_vec(game_vec: Vector2) -> Vector2:
	return Vector2(game_vec.x * pixels_per_meter, -game_vec.y * pixels_per_meter)

func godot_to_game_vec(godot_vec: Vector2) -> Vector2:
	return Vector2(godot_vec.x / pixels_per_meter, -godot_vec.y / pixels_per_meter)

func get_record(entity_id: String) -> EntityRecord:
	var record = entity_registry.get(entity_id)
	if record and record.is_valid(): return record
	return null

func get_entity_node(entity_id: String) -> Node2D:
	var record = get_record(entity_id)
	return record.node if record else null

var _js_callbacks: Array = []
var _js_bridge_obj: JavaScriptObject = null
var _debug_show_shapes: bool = false

func _ready() -> void:
	_init_modules()
	_camera_controller.setup_camera()
	_setup_js_bridge()

func set_inspect_mode(enabled: bool) -> void:
	if _debug_bridge: _debug_bridge.get_time_module().set_inspect_mode(enabled)

func pause_physics() -> void: Engine.time_scale = 0.0
func resume_physics() -> void: Engine.time_scale = 1.0

func _init_modules() -> void:
	_event_queue_module = EventQueue.new()
	_event_emitter = EventEmitter.new(self)
	_sync_system = SyncSystem.new(self)
	_viewport_3d = Viewport3D.new()
	_viewport_3d.name = "Viewport3D"
	_viewport_3d.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(_viewport_3d)
	_property_collector = PropertyCollector.new(self)
	_physics_queries = PhysicsQueries.new(self)
	_query_system = QuerySystem.new()
	_register_core_query_handlers()
	_debug_bridge = DebugBridge.new(self, _query_system)
	_devtools_overlay = DebugOverlay.new()
	_devtools_overlay.setup(self)
	
	_physics_controller = PhysicsController.new(self)
	_entity_manager = EntityManager.new(self)
	_entity_factory = EntityFactory.new(self)
	_transform_system = TransformSystem.new(self)
	_joint_manager = JointManager.new(self)
	_visual_renderer = VisualRenderer.new(self)
	_ui_manager = UIManager.new(self)
	_camera_controller = CameraController.new(self)
	_input_router = InputRouter.new(self)
	_splat_map_system = SplatMapSystem.new(self)
	_ws_system = WebSocketSystem.new(self)
	_collision_system = CollisionSystem.new(self, _event_emitter)
	_world_system = WorldSystem.new(self)
	
	_devtools_overlay.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(_devtools_overlay)

func _register_core_query_handlers() -> void:
	_query_system.register_handler("getAllTransforms", func(_args): return _transform_system.get_all_transforms())
	_query_system.register_handler("getAllProperties", func(_args): return _property_collector.collect_properties(0))
	_query_system.register_handler("getWorldInfo", func(_args): return _debug_bridge.get_world_info())
	_query_system.register_handler("getCameraInfo", func(_args): return _camera_controller.get_info())
	_query_system.register_handler("getViewportInfo", func(_args): return _debug_bridge.get_viewport_info())
	_query_system.register_handler("getEntityTransform", func(args): return _get_entity_transform_impl(str(args[0])) if args.size() > 0 else null)
	_query_system.register_handler("queryPointEntity", func(args): return _physics_queries.query_point_entity(float(args[0]), float(args[1])) if args.size() >= 2 else null)
	_query_system.register_handler("screenToWorld", func(args): return _screen_to_world_impl(float(args[0]), float(args[1])) if args.size() >= 2 else null)
	_query_system.register_handler("getSplatTexture", func(_args): return get_splat_texture())

func _input(event: InputEvent) -> void:
	if not OS.has_feature("web") or not _input_router: return
	var input_data = _input_router.process_input_event(event)
	if input_data.has("type"):
		var input_type = input_data["type"]
		var x = input_data["x"]
		var y = input_data["y"]
		var entity_id = input_data["entityId"]
		var world_pos = input_data.get("world_pos", Vector2.ZERO)
		_queue_event("input", {"type": input_type, "x": x, "y": y, "entityId": entity_id})
		_event_emitter.emit_input_event(input_type, x, y, entity_id)
		if _devtools_overlay:
			if input_type == "drag_start": _devtools_overlay.start_drag(world_pos, str(entity_id) if entity_id else "")
			elif input_type == "tap":
				_devtools_overlay.add_tap_marker(world_pos, str(entity_id) if entity_id else "")
				_devtools_overlay.end_drag(world_pos)
			elif input_type == "drag_end": _devtools_overlay.end_drag(world_pos)
			elif input_type == "drag_move": _devtools_overlay.update_drag(world_pos)

func _setup_js_bridge() -> void:
	if not OS.has_feature("web"): return
	var window = JavaScriptBridge.get_interface("window")
	if window == null: return
	_js_bridge_obj = JavaScriptBridge.create_object("Object")
	_query_system.setup_js_bridge(_js_bridge_obj)
	var callbacks = {
		"loadGameJson": _js_load_game, "clearGame": _js_clear_game, "setInspectMode": _js_set_inspect_mode,
		"pausePhysics": _js_pause_physics, "resumePhysics": _js_resume_physics, "loadCustomScene": _js_load_custom_scene,
		"spawnEntity": _entity_manager._js_spawn_entity, "destroyEntity": _entity_manager._js_destroy_entity,
		"getEntityTransform": _entity_manager._js_get_entity_transform, "getAllTransforms": _transform_system._js_get_all_transforms,
		"getAllProperties": _property_collector._js_get_all_properties, "onTransformSync": _sync_system._js_on_transform_sync,
		"onPropertySync": _sync_system._js_on_property_sync, "setWatchConfig": _property_collector._js_set_watch_config,
		"getTransform": _sync_system._js_get_transform, "getTransforms": _sync_system._js_get_transforms,
		"setTrackedEntities": _sync_system._js_set_tracked_entities, "setLinearVelocity": _physics_controller._js_set_linear_velocity,
		"setAngularVelocity": _physics_controller._js_set_angular_velocity, "applyImpulse": _physics_controller._js_apply_impulse,
		"applyForce": _physics_controller._js_apply_force, "sendInput": _input_router._js_send_input,
		"onInputEvent": _event_emitter._js_on_input_event, "onCollision": _event_emitter._js_on_collision,
		"onEntityDestroyed": _event_emitter._js_on_entity_destroyed, "setTransform": _transform_system._js_set_transform,
		"setPosition": _transform_system._js_set_position, "setRotation": _transform_system._js_set_rotation,
		"setScale": _transform_system._js_set_scale, "setOpacity": _visual_renderer._js_set_opacity,
		"getLinearVelocity": _physics_controller._js_get_linear_velocity, "getAngularVelocity": _physics_controller._js_get_angular_velocity,
		"applyTorque": _physics_controller._js_apply_torque, "createRevoluteJoint": _joint_manager._js_create_revolute_joint,
		"createDistanceJoint": _joint_manager._js_create_distance_joint, "createPrismaticJoint": _joint_manager._js_create_prismatic_joint,
		"createWeldJoint": _joint_manager._js_create_weld_joint, "createMouseJoint": _joint_manager._js_create_mouse_joint,
		"destroyJoint": _joint_manager._js_destroy_joint, "destroyMouseJointForEntity": _joint_manager._js_destroy_mouse_joint_for_entity,
		"setMotorSpeed": _joint_manager._js_set_motor_speed,
		"setMouseTarget": _joint_manager._js_set_mouse_target, "getLastJointId": _joint_manager._js_get_last_joint_id,
		"queryPoint": _physics_queries._js_query_point,
		"queryPointEntity": _physics_queries._js_query_point_entity, "queryAABB": _physics_queries._js_query_aabb,
		"raycast": _physics_queries._js_raycast, "onSensorBegin": _event_emitter._js_on_sensor_begin,
		"onSensorEnd": _event_emitter._js_on_sensor_end, "setUserData": _entity_manager._js_set_user_data,
		"getUserData": _entity_manager._js_get_user_data, "getAllBodies": _entity_manager._js_get_all_bodies,
		"setEntityImage": _visual_renderer._js_set_entity_image, "setEntityAtlasRegion": _visual_renderer._js_set_entity_atlas_region,
		"preloadTextures": _visual_renderer._js_preload_textures, "setDebugShowShapes": _visual_renderer._js_set_debug_show_shapes,
		"setDebugSettings": _visual_renderer._js_set_debug_settings, "setCameraTarget": _camera_controller._js_set_camera_target,
		"setCameraPosition": _camera_controller._js_set_camera_position, "setCameraZoom": _camera_controller._js_set_camera_zoom,
		"spawnParticle": _ui_manager._js_spawn_particle, "playSound": _ui_manager._js_play_sound,
		"createUIButton": _ui_manager._js_create_ui_button, "destroyUIButton": _ui_manager._js_destroy_ui_button,
		"onUIButtonEvent": _ui_manager._js_on_ui_button_event
	}
	for key in callbacks:
		var cb = JavaScriptBridge.create_callback(callbacks[key])
		_js_callbacks.append(cb)
		_js_bridge_obj[key] = cb
	
	var extra_callbacks = {
		"clearTextureCache": func(args): _visual_renderer.clear_texture_cache(str(args[0]) if args.size() > 0 else ""),
		"show_3d_model": func(args): return _viewport_3d.load_glb(str(args[0])) != null if _viewport_3d and args.size() > 0 else false,
		"show_3d_model_from_url": func(args): if _viewport_3d and args.size() > 0: _viewport_3d.load_glb_async(str(args[0])),
		"set_3d_viewport_position": func(args): if _viewport_3d and args.size() >= 2: _viewport_3d.position = game_to_godot_pos(Vector2(float(args[0]), float(args[1]))),
		"set_3d_viewport_size": func(args): if _viewport_3d and args.size() >= 2: _viewport_3d.set_viewport_size(int(args[0]), int(args[1])),
		"rotate_3d_model": func(args): if _viewport_3d and args.size() >= 3: _viewport_3d.set_model_rotation(Vector3(float(args[0]), float(args[1]), float(args[2]))),
		"set_3d_camera_distance": func(args): if _viewport_3d and args.size() > 0: _viewport_3d.set_camera_distance(float(args[0])),
		"clear_3d_models": func(_args): if _viewport_3d: _viewport_3d.clear_models()
	}
	for key in extra_callbacks:
		var cb = JavaScriptBridge.create_callback(extra_callbacks[key])
		_js_callbacks.append(cb)
		_js_bridge_obj[key] = cb
	
	window["GodotBridge"] = _js_bridge_obj

func _js_load_game(args: Array) -> bool: return load_game_json(str(args[0])) if args.size() > 0 else false
func _js_clear_game(_args: Array) -> void: clear_game()
func _js_set_inspect_mode(args: Array) -> void: if args.size() >= 1: set_inspect_mode(bool(args[0]))
func _js_pause_physics(_args: Array) -> void: pause_physics()
func _js_resume_physics(_args: Array) -> void: resume_physics()
func _js_load_custom_scene(args: Array) -> bool: return load_custom_scene(str(args[0])) if args.size() > 0 else false

func enable_splat_map() -> void: if _splat_map_system: _splat_map_system.enable()
func disable_splat_map() -> void: if _splat_map_system: _splat_map_system.disable()
func get_splat_texture() -> Texture2D: return _splat_map_system.get_texture() if _splat_map_system else null

func _process(delta: float) -> void:
	if _splat_map_system: _splat_map_system.process(delta)
	if _ws_system: _ws_system.process(delta)

func connect_to_server(url: String = "") -> void: if _ws_system: _ws_system.connect_to_server(url)

func load_game_json(json_string: String) -> bool:
	var json = JSON.new()
	if json.parse(json_string) != OK: return false
	game_data = json.data
	clear_game()
	if _world_system: _world_system.setup_world(game_data.get("world", {}))
	_visual_renderer.setup_background(game_data.get("background", {}))
	templates = game_data.get("templates", {})
	# Sync state to EntityFactory before creating entities
	_entity_factory.update_state()
	for entity_data in game_data.get("entities", []):
		var record = _entity_factory.create_entity(entity_data)
		if record: entity_registry[record.entity_id] = record
	game_loaded.emit(game_data)
	return true

func load_custom_scene(scene_path: String) -> bool:
	if not ResourceLoader.exists(scene_path) or not game_root: return false
	var scene = load(scene_path)
	if not scene: return false
	for child in game_root.get_children(): child.queue_free()
	game_root.add_child(scene.instantiate())
	return true

func spawn_entity(template_id: String, x: float, y: float) -> Node2D:
	return spawn_entity_with_id(template_id, x, y, template_id + "_" + str(randi()))

func spawn_entity_with_id(template_id: String, x: float, y: float, entity_id: String) -> Node2D:
	if _entity_manager: return _entity_manager.spawn_entity(template_id, x, y, entity_id)
	return null

func destroy_entity(entity_id: String) -> void: if _entity_manager: _entity_manager.destroy_entity(entity_id)
func get_entity(entity_id: String) -> Node2D: return get_entity_node(entity_id)

func clear_game() -> void:
	if _joint_manager: _joint_manager.clear_all()
	if _entity_manager: _entity_manager.clear_all()
	entity_registry.clear()
	templates.clear()

func _physics_process(delta: float) -> void:
	if _sync_system: _sync_system.process_sync()
	if _joint_manager: _joint_manager.process_mouse_joints(delta)
	if _physics_controller: _physics_controller.process_physics(delta, entity_registry)

func _queue_event(event_type: String, data: Dictionary) -> void:
	if _event_queue_module: _event_queue_module.queue_event(event_type, data)

func poll_events() -> String: return _event_queue_module.poll_events() if _event_queue_module else "[]"

func _get_entity_transform_impl(entity_id: String) -> Variant:
	var node = get_entity_node(entity_id)
	if not node: return null
	var game_pos = godot_to_game_pos(node.position)
	return {"x": game_pos.x, "y": game_pos.y, "angle": -node.rotation}

func _screen_to_world_impl(screen_x: float, screen_y: float) -> Dictionary:
	var screen_pos = Vector2(screen_x, screen_y)
	var godot_world_pos = get_viewport().get_canvas_transform().affine_inverse() * screen_pos
	var game_pos = godot_to_game_pos(godot_world_pos)
	return {"x": game_pos.x, "y": game_pos.y}
