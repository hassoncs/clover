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
var _camera_receiver: Node = null
var _camera_manager: Node = null
var _pixel_buffer_manager: PixelBufferManager = null

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
var _method_map: Dictionary = {}
var _debug_enabled: bool = false

var _diag_process_frames: int = 0
var _diag_physics_frames: int = 0
var _diag_logged: bool = false

func _ready() -> void:
	print("[GameBridge] _ready() starting...")
	print("[GameBridge] Platform: ", OS.get_name())
	print("[GameBridge] Is web: ", OS.has_feature("web"))
	print("[GameBridge] Physics engine setting: ", ProjectSettings.get_setting("physics/2d/physics_engine", "DEFAULT"))
	_init_modules()
	print("[GameBridge] Modules initialized")
	_camera_controller.setup_camera()
	print("[GameBridge] Camera setup complete")
	_build_method_map()
	_setup_js_bridge()
	print("[GameBridge] JS Bridge setup complete")
	_log_physics_diagnostics()
	_log_bridge_registry()

func set_inspect_mode(enabled: bool) -> void:
	if _debug_bridge: _debug_bridge.get_time_module().set_inspect_mode(enabled)

func pause_physics() -> void: Engine.time_scale = 0.0
func resume_physics() -> void: Engine.time_scale = 1.0

func enable_debug() -> Dictionary:
	if _debug_enabled:
		return {"ok": true, "wasAlreadyEnabled": true, "methodsRegistered": 0}

	_debug_bridge = DebugBridge.new(self, _query_system)
	_debug_enabled = true

	print("[GameBridge] Debug mode enabled")
	return {"ok": true, "wasAlreadyEnabled": false, "methodsRegistered": 33}

func disable_debug() -> Dictionary:
	if not _debug_enabled:
		return {"ok": true, "wasAlreadyEnabled": false, "methodsUnregistered": 0}

	if _debug_bridge:
		_debug_bridge.unregister_handlers()
		_debug_bridge = null

	_debug_enabled = false

	print("[GameBridge] Debug mode disabled")
	return {"ok": true, "wasAlreadyEnabled": true, "methodsUnregistered": 33}

func is_debug_enabled() -> bool:
	return _debug_enabled

func _get_world_info_impl() -> Dictionary:
	return {
		"pixelsPerMeter": pixels_per_meter,
		"gravity": {"x": 0, "y": -9.8},
		"bounds": game_data.get("world", {}),
		"entityCount": entity_registry.size()
	}

func _get_viewport_info_impl() -> Dictionary:
	var viewport = get_viewport()
	if viewport:
		return {"width": viewport.size.x, "height": viewport.size.y}
	return {"width": 0, "height": 0}

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
	# DebugBridge is created on-demand via enable_debug()
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
	_pixel_buffer_manager = PixelBufferManager.new(self)

	_camera_receiver = load("res://scripts/camera/WebCameraReceiver.gd").new()
	_camera_receiver.name = "WebCameraReceiver"
	add_child(_camera_receiver)

	_camera_manager = load("res://scripts/camera/CameraManager.gd").new()
	_camera_manager.name = "CameraManager"
	add_child(_camera_manager)

	_devtools_overlay.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(_devtools_overlay)

func _register_core_query_handlers() -> void:
	_query_system.register_handler("getAllTransforms", func(_args): return _transform_system.get_all_transforms())
	_query_system.register_handler("getAllProperties", func(_args): return _property_collector.collect_properties(0))
	_query_system.register_handler("getWorldInfo", func(_args): return _get_world_info_impl())
	_query_system.register_handler("getCameraInfo", func(_args): return _camera_controller.get_info())
	_query_system.register_handler("getViewportInfo", func(_args): return _get_viewport_info_impl())
	_query_system.register_handler("getEntityTransform", func(args): return _get_entity_transform_impl(str(args[0])) if args.size() > 0 else null)
	_query_system.register_handler("queryPointEntity", func(args): return _physics_queries.query_point_entity(float(args[0]), float(args[1])) if args.size() >= 2 else null)
	_query_system.register_handler("screenToWorld", func(args): return _screen_to_world_impl(float(args[0]), float(args[1])) if args.size() >= 2 else null)
	_query_system.register_handler("getSplatTexture", func(_args): return get_splat_texture())

func _auto_register_bridge_methods(modules: Array) -> Dictionary:
	var registry = {}
	for module in modules:
		if module == null:
			continue
		var method_list = module.get_method_list()
		for method_info in method_list:
			var method_name = method_info.name
			if method_name.begins_with("_js_"):
				var bridge_name = method_name.substr(4)
				if registry.has(bridge_name):
					push_warning("[GameBridge][AUTO-REG] COLLISION: Method '%s' found in multiple modules" % bridge_name)
				else:
					registry[bridge_name] = Callable(module, method_name)
	return registry

func _build_method_map() -> void:
	var is_dev = OS.is_debug_build()

	# Step 1: Auto-register bridge methods from modules with _js_ prefix
	var modules = [
		_entity_manager, _transform_system, _physics_controller, _joint_manager,
		_visual_renderer, _ui_manager, _camera_controller, _input_router,
		_sync_system, _property_collector, _event_emitter, _physics_queries,
		_pixel_buffer_manager, _debug_bridge
	]
	_method_map = _auto_register_bridge_methods(modules)

	# Step 2: Apply manual overrides for methods needing custom handling
	var overrides = {
		"callRpc": _handle_rpc,
		# Core lifecycle
		"load_game_json": func(args): return load_game_json(str(args[0])) if args.size() > 0 else false,
		"clear_game": func(_args): clear_game(),
		"set_inspect_mode": func(args): set_inspect_mode(bool(args[0])) if args.size() >= 1 else null,
		"pause_physics": func(_args): pause_physics(),
		"resume_physics": func(_args): resume_physics(),
		"load_custom_scene": func(args): return load_custom_scene(str(args[0])) if args.size() > 0 else false,
		# Entity management
		"spawn_entity": _entity_manager._js_spawn_entity,
		"spawn_entity_with_id": func(args): return spawn_entity_with_id(str(args[0]), float(args[1]), float(args[2]), str(args[3])) if args.size() >= 4 else null,
		"destroy_entity": _entity_manager._js_destroy_entity,
		"get_entity_transform": _entity_manager._js_get_entity_transform,
		"get_all_transforms": _transform_system._js_get_all_transforms,
		"get_all_properties": _property_collector._js_get_all_properties,
		"get_all_bodies": _entity_manager._js_get_all_bodies,
		"set_user_data": _entity_manager._js_set_user_data,
		"get_user_data": _entity_manager._js_get_user_data,
		# Sync
		"on_transform_sync": _sync_system._js_on_transform_sync,
		"on_property_sync": _sync_system._js_on_property_sync,
		"set_watch_config": _property_collector._js_set_watch_config,
		"get_transform": _sync_system._js_get_transform,
		"get_transforms": _sync_system._js_get_transforms,
		"set_tracked_entities": _sync_system._js_set_tracked_entities,
		# Physics
		"set_linear_velocity": _physics_controller._js_set_linear_velocity,
		"set_angular_velocity": _physics_controller._js_set_angular_velocity,
		"apply_impulse": _physics_controller._js_apply_impulse,
		"apply_force": _physics_controller._js_apply_force,
		"apply_torque": _physics_controller._js_apply_torque,
		"get_linear_velocity": _physics_controller._js_get_linear_velocity,
		"get_angular_velocity": _physics_controller._js_get_angular_velocity,
		# Transform
		"set_transform": _transform_system._js_set_transform,
		"set_position": _transform_system._js_set_position,
		"set_rotation": _transform_system._js_set_rotation,
		"set_scale": _transform_system._js_set_scale,
		# Visual
		"set_opacity": _visual_renderer._js_set_opacity,
		"set_visible": _visual_renderer._js_set_visible,
		"set_entity_image": _visual_renderer._js_set_entity_image,
		"set_entity_image_from_file": func(args): _visual_renderer.set_entity_image_from_file(str(args[0]), str(args[1]), float(args[2]), float(args[3])) if args.size() >= 4 else null,
		"set_entity_atlas_region": _visual_renderer._js_set_entity_atlas_region,
		"set_entity_atlas_region_from_file": func(args): _visual_renderer.set_entity_atlas_region_from_file(str(args[0]), str(args[1]), float(args[2]), float(args[3]), float(args[4]), float(args[5]), float(args[6]), float(args[7])) if args.size() >= 8 else null,
		"preload_textures": _visual_renderer._js_preload_textures,
		"set_debug_show_shapes": _visual_renderer._js_set_debug_show_shapes,
		"set_debug_settings": _visual_renderer._js_set_debug_settings,
		"clear_texture_cache": func(args): _visual_renderer.clear_texture_cache(str(args[0]) if args.size() > 0 else ""),
		# Pixel Buffer
		"createPixelBuffer": _pixel_buffer_manager._js_create_pixel_buffer,
		"pixelBufferDraw": _pixel_buffer_manager._js_draw_commands,
		"pixelBufferClear": _pixel_buffer_manager._js_clear,
		"destroyPixelBuffer": _pixel_buffer_manager._js_destroy,
		# Joints
		"create_revolute_joint": _joint_manager._js_create_revolute_joint,
		"create_distance_joint": _joint_manager._js_create_distance_joint,
		"create_prismatic_joint": _joint_manager._js_create_prismatic_joint,
		"create_weld_joint": _joint_manager._js_create_weld_joint,
		"create_mouse_joint": _joint_manager._js_create_mouse_joint,
		"destroy_joint": _joint_manager._js_destroy_joint,
		"destroy_mouse_joint_for_entity": _joint_manager._js_destroy_mouse_joint_for_entity,
		"set_motor_speed": _joint_manager._js_set_motor_speed,
		"set_mouse_target": _joint_manager._js_set_mouse_target,
		"get_last_joint_id": _joint_manager._js_get_last_joint_id,
		# Queries
		"query_point": _physics_queries._js_query_point,
		"query_point_entity": _physics_queries._js_query_point_entity,
		"query_aabb": _physics_queries._js_query_aabb,
		"raycast": _physics_queries._js_raycast,
		"screen_to_world": func(args): return _screen_to_world_impl(float(args[0]), float(args[1])) if args.size() >= 2 else {"x": 0, "y": 0},
		# Input
		"send_input": _input_router._js_send_input,
		"on_input_event": _event_emitter._js_on_input_event,
		"on_collision": _event_emitter._js_on_collision,
		"on_entity_destroyed": _event_emitter._js_on_entity_destroyed,
		"on_sensor_begin": _event_emitter._js_on_sensor_begin,
		"on_sensor_end": _event_emitter._js_on_sensor_end,
		# Camera
		"set_camera_target": _camera_controller._js_set_camera_target,
		"set_camera_position": _camera_controller._js_set_camera_position,
		"set_camera_zoom": _camera_controller._js_set_camera_zoom,
		"start_camera": _js_start_camera,
		"stop_camera": _js_stop_camera,
		# UI
		"spawn_particle": _ui_manager._js_spawn_particle,
		"play_sound": _ui_manager._js_play_sound,
		"create_ui_button": _ui_manager._js_create_ui_button,
		"destroy_ui_button": _ui_manager._js_destroy_ui_button,
		"on_ui_button_event": _ui_manager._js_on_ui_button_event,
		"create_themed_ui_component": func(args): _ui_manager.create_themed_ui_component(str(args[0]), int(args[1]), str(args[2]), float(args[3]), float(args[4]), float(args[5]), float(args[6]), str(args[7]) if args.size() > 7 else "") if args.size() >= 7 else null,
		"destroy_themed_ui_component": func(args): _ui_manager.destroy_themed_ui_component(str(args[0])) if args.size() >= 1 else null,
		# 3D
		"show_3d_model": func(args): return _viewport_3d.load_glb(str(args[0])) != null if _viewport_3d and args.size() > 0 else false,
		"show_3d_model_from_url": func(args): if _viewport_3d and args.size() > 0: _viewport_3d.load_glb_async(str(args[0])),
		"set_3d_viewport_position": func(args): if _viewport_3d and args.size() >= 2: _viewport_3d.position = game_to_godot_pos(Vector2(float(args[0]), float(args[1]))),
		"set_3d_viewport_size": func(args): if _viewport_3d and args.size() >= 2: _viewport_3d.set_viewport_size(int(args[0]), int(args[1])),
		"rotate_3d_model": func(args): if _viewport_3d and args.size() >= 3: _viewport_3d.set_model_rotation(Vector3(float(args[0]), float(args[1]), float(args[2]))),
		"set_3d_model_position": func(args): if _viewport_3d and args.size() >= 3: _viewport_3d.set_model_position(float(args[0]), float(args[1]), float(args[2])),
		"set_3d_camera_distance": func(args): if _viewport_3d and args.size() > 0: _viewport_3d.set_camera_distance(float(args[0])),
		"set_3d_camera_size": func(args): if _viewport_3d and args.size() > 0: _viewport_3d.set_camera_size(float(args[0])),
		"set_3d_camera_position": func(args): if _viewport_3d and args.size() >= 3: _viewport_3d.set_camera_position(float(args[0]), float(args[1]), float(args[2])),
		"set_3d_camera_look_at": func(args): if _viewport_3d and args.size() >= 3: _viewport_3d.set_camera_look_at(float(args[0]), float(args[1]), float(args[2])),
		"clear_3d_models": func(_args): if _viewport_3d: _viewport_3d.clear_models(),
		"create_3d_floor": func(args): if _viewport_3d: _viewport_3d.create_floor(float(args[0]) if args.size() > 0 else 10.0, str(args[1]) if args.size() > 1 else "555555", str(args[2]) if args.size() > 2 else "plain"),
		"create_3d_cube": func(args): if _viewport_3d and args.size() >= 3: _viewport_3d.create_cube(float(args[0]), float(args[1]), float(args[2]), float(args[3]) if args.size() > 3 else 0.5, str(args[4]) if args.size() > 4 else "ff0000"),
		"clear_3d_cubes": func(_args): if _viewport_3d: _viewport_3d.clear_cubes(),
		# Debug control
		"enable_debug": func(_args): return enable_debug(),
		"disable_debug": func(_args): return disable_debug(),
		"is_debug_enabled": func(_args): return is_debug_enabled(),
		# Runtime diagnostics
		"get_bridge_methods": func(_args): return get_bridge_methods(),
	}

	# Step 3: Apply overrides to method map (manual entries take precedence)
	for method_name in overrides:
		_method_map[method_name] = overrides[method_name]

	# Log registration summary
	if is_dev:
		print("[GameBridge][REGISTRY] Built method map with ", _method_map.size(), " methods")
		print("[GameBridge][REGISTRY] Auto-registered from modules, manual overrides applied")

func _handle_rpc(args: Array) -> Variant:
	if args.size() == 0:
		return {"error": "missing_rpc_args"}
	var rpc_data = args[0]
	if rpc_data is String:
		var json := JSON.new()
		if json.parse(rpc_data) == OK:
			rpc_data = json.data
	if rpc_data is Dictionary:
		var method := str(rpc_data.get("method", ""))
		var params = rpc_data.get("params", {})
		var query_args: Array = [params] if params != null else []
		if _query_system and method != "":
			return _query_system.dispatch(method, query_args)
	return {"error": "invalid_rpc"}

func dispatch_raw(method_name: String, args: Array) -> Variant:
	if not _method_map.has(method_name):
		push_warning("[GameBridge] Unknown native method: " + method_name)
		return {"error": "unknown_method", "method": method_name}
	return _method_map[method_name].call(args)

func native_dispatch(method_name: String, args_json: String) -> Variant:
	print("[GB] native_dispatch: %s (known=%s)" % [method_name, str(_method_map.has(method_name))])
	if not _method_map.has(method_name):
		print("[GB] Unknown method: %s. Known methods: %s" % [method_name, str(_method_map.keys())])
		return {"error": "unknown_method", "method": method_name}
	var args: Array = []
	if args_json != "[]" and args_json != "":
		var json = JSON.new()
		if json.parse(args_json) != OK:
			push_warning("[GameBridge] Invalid JSON in args: " + args_json.substr(0, 100))
			return {"error": "invalid_json", "message": json.get_error_message()}
		args = json.data if json.data is Array else [json.data]
	return _method_map[method_name].call(args)

func _input(event: InputEvent) -> void:
	if not _input_router: return
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
	_js_callbacks.clear()

	for method_name in _method_map:
		var js_name = _to_camel_case(method_name)
		var cb = JavaScriptBridge.create_callback(
			func(args): return dispatch_raw(method_name, args)
		)
		_js_callbacks.append(cb)
		_js_bridge_obj[js_name] = cb
	window["GodotBridge"] = _js_bridge_obj
	print("[GameBridge] JS Bridge registered ", _method_map.size(), " methods")

func _to_camel_case(snake: String) -> String:
	# Convert snake_case to camelCase for JavaScript compatibility
	# Handles special cases: "3d" -> "3D", "2d" -> "2D"
	var parts = snake.split("_")
	if parts.size() == 1:
		return snake
	var result = parts[0]
	for i in range(1, parts.size()):
		var part = parts[i]
		if part == "3d":
			result += "3D"
		elif part == "2d":
			result += "2D"
		else:
			result += part.capitalize()
	return result

func _js_load_game(args: Array) -> bool: return load_game_json(str(args[0])) if args.size() > 0 else false
func _js_clear_game(_args: Array) -> void: clear_game()
func _js_set_inspect_mode(args: Array) -> void: if args.size() >= 1: set_inspect_mode(bool(args[0]))
func _js_pause_physics(_args: Array) -> void: pause_physics()
func _js_resume_physics(_args: Array) -> void: resume_physics()
func _js_load_custom_scene(args: Array) -> bool: return load_custom_scene(str(args[0])) if args.size() > 0 else false

func _js_start_camera(args: Array) -> void:
	if args.size() < 1: return
	var entity_id = str(args[0])
	var width = int(args[1]) if args.size() > 1 else 640
	var height = int(args[2]) if args.size() > 2 else 480

	if OS.has_feature("web"):
		# Web path: use WebCameraReceiver + JS bridge
		if _camera_receiver:
			_camera_receiver.setup(entity_id)
		var window = JavaScriptBridge.get_interface("window")
		if window:
			window.startCamera(entity_id, width, height)
	else:
		# Native path: use CameraManager
		if _camera_manager:
			_camera_manager.start_camera(entity_id, width, height)

func _js_stop_camera(_args: Array) -> void:
	if OS.has_feature("web"):
		# Web path: use WebCameraReceiver + JS bridge
		if _camera_receiver:
			_camera_receiver.stop()
		var window = JavaScriptBridge.get_interface("window")
		if window:
			window.stopCamera()
	else:
		# Native path: use CameraManager
		if _camera_manager:
			_camera_manager.stop_camera()

func _log_physics_diagnostics() -> void:
	print("[GameBridge][DIAG] === PHYSICS DIAGNOSTICS ===")
	var space = get_viewport().find_world_2d().space
	var gravity = PhysicsServer2D.area_get_param(space, PhysicsServer2D.AREA_PARAM_GRAVITY)
	var gravity_vec = PhysicsServer2D.area_get_param(space, PhysicsServer2D.AREA_PARAM_GRAVITY_VECTOR)
	print("[GameBridge][DIAG] Gravity magnitude: ", gravity)
	print("[GameBridge][DIAG] Gravity vector: ", gravity_vec)
	print("[GameBridge][DIAG] Engine physics FPS: ", Engine.physics_ticks_per_second)
	print("[GameBridge][DIAG] Engine time scale: ", Engine.time_scale)
	print("[GameBridge][DIAG] Engine physics frames so far: ", Engine.get_physics_frames())
	# Check if Rapier2D is loaded by looking for its classes
	var rapier_loaded = ClassDB.class_exists("RapierPhysicsServer2D") or ClassDB.class_exists("Rapier2D")
	print("[GameBridge][DIAG] Rapier2D class exists: ", rapier_loaded)
	# Check available physics server
	var physics_server = PhysicsServer2D
	print("[GameBridge][DIAG] PhysicsServer2D class: ", physics_server.get_class())
	# List registered GDExtension classes that contain 'rapier' or 'Rapier'
	var rapier_classes = []
	for cls in ClassDB.get_class_list():
		if "rapier" in cls.to_lower():
			rapier_classes.append(cls)
	print("[GameBridge][DIAG] Rapier-related classes: ", rapier_classes)
	print("[GameBridge][DIAG] === END DIAGNOSTICS ===")

func _log_bridge_registry() -> void:
	var is_dev = OS.is_debug_build()
	if not is_dev:
		return

	print("[GameBridge][REGISTRY] === BRIDGE METHOD REGISTRY ===")
	print("[GameBridge][REGISTRY] Total methods: ", _method_map.size())

	# Group methods by module owner
	var by_module = {}
	for method_name in _method_map:
		var owner = _get_method_owner(method_name)
		if not by_module.has(owner):
			by_module[owner] = []
		by_module[owner].append(method_name)

	# Print summary by module
	for module in by_module:
		var methods = by_module[module]
		print("[GameBridge][REGISTRY]   ", module, ": ", methods.size(), " methods")
		if methods.size() <= 5:
			for method in methods:
				print("[GameBridge][REGISTRY]     - ", method)

	print("[GameBridge][REGISTRY] === END REGISTRY ===")

func _get_method_owner(method_name: String) -> String:
	# Determine module owner based on method name patterns
	if method_name.begins_with("spawn_") or method_name.begins_with("destroy_") or method_name.begins_with("get_entity") or method_name.begins_with("get_all_bodies") or method_name.begins_with("set_user_data") or method_name.begins_with("get_user_data"):
		return "EntityManager"
	elif method_name.begins_with("set_linear_velocity") or method_name.begins_with("set_angular_velocity") or method_name.begins_with("apply_") or method_name.begins_with("get_linear_velocity") or method_name.begins_with("get_angular_velocity"):
		return "PhysicsController"
	elif method_name.begins_with("set_transform") or method_name.begins_with("set_position") or method_name.begins_with("set_rotation") or method_name.begins_with("set_scale") or method_name.begins_with("get_all_transforms"):
		return "TransformSystem"
	elif method_name.begins_with("set_opacity") or method_name.begins_with("set_visible") or method_name.begins_with("set_entity_image") or method_name.begins_with("set_entity_atlas") or method_name.begins_with("preload_textures") or method_name.begins_with("set_debug") or method_name.begins_with("clear_texture_cache"):
		return "VisualRenderer"
	elif method_name.begins_with("createPixelBuffer") or method_name.begins_with("pixelBuffer") or method_name.begins_with("destroyPixelBuffer"):
		return "PixelBufferManager"
	elif method_name.begins_with("create_") and ("joint" in method_name or method_name.begins_with("destroy_joint") or method_name.begins_with("destroy_mouse_joint") or method_name.begins_with("set_motor_speed") or method_name.begins_with("set_mouse_target") or method_name.begins_with("get_last_joint_id")):
		return "JointManager"
	elif method_name.begins_with("query_") or method_name.begins_with("raycast") or method_name.begins_with("screen_to_world"):
		return "PhysicsQueries"
	elif method_name.begins_with("on_transform_sync") or method_name.begins_with("on_property_sync") or method_name.begins_with("set_watch_config") or method_name.begins_with("get_transform") or method_name.begins_with("get_transforms") or method_name.begins_with("set_tracked_entities"):
		return "SyncSystem"
	elif method_name.begins_with("send_input") or method_name.begins_with("on_input_event") or method_name.begins_with("on_collision") or method_name.begins_with("on_entity_destroyed") or method_name.begins_with("on_sensor"):
		return "EventEmitter/InputRouter"
	elif method_name.begins_with("set_camera") or method_name.begins_with("start_camera") or method_name.begins_with("stop_camera"):
		return "CameraController"
	elif method_name.begins_with("spawn_particle") or method_name.begins_with("play_sound") or method_name.begins_with("create_ui") or method_name.begins_with("destroy_ui") or method_name.begins_with("on_ui_button_event") or method_name.begins_with("create_themed_ui") or method_name.begins_with("destroy_themed_ui"):
		return "UIManager"
	elif method_name.begins_with("show_3d") or method_name.begins_with("set_3d") or method_name.begins_with("rotate_3d") or method_name.begins_with("clear_3d"):
		return "Viewport3D"
	elif method_name.begins_with("get_all_properties"):
		return "PropertyCollector"
	elif method_name == "load_game_json" or method_name == "clear_game" or method_name == "set_inspect_mode" or method_name == "pause_physics" or method_name == "resume_physics" or method_name == "load_custom_scene":
		return "GameBridge"
	else:
		return "Unknown"

func get_bridge_methods() -> Dictionary:
	var result = {
		"methods": [],
		"byModule": {},
		"total": _method_map.size()
	}

	for method_name in _method_map:
		var owner = _get_method_owner(method_name)
		result.methods.append({
			"name": method_name,
			"owner": owner
		})

		if not result.byModule.has(owner):
			result.byModule[owner] = []
		result.byModule[owner].append(method_name)

	return result

func enable_splat_map() -> void: if _splat_map_system: _splat_map_system.enable()
func disable_splat_map() -> void: if _splat_map_system: _splat_map_system.disable()
func get_splat_texture() -> Texture2D: return _splat_map_system.get_texture() if _splat_map_system else null

func _process(delta: float) -> void:
	_diag_process_frames += 1
	if _splat_map_system: _splat_map_system.process(delta)
	if _ws_system: _ws_system.process(delta)

func connect_to_server(url: String = "") -> void: if _ws_system: _ws_system.connect_to_server(url)

func load_game_json(json_string: String) -> bool:
	print("[GameBridge][DIAG] load_game_json called, json length=", json_string.length())
	var json = JSON.new()
	if json.parse(json_string) != OK:
		print("[GameBridge][DIAG] JSON parse FAILED")
		return false
	game_data = json.data
	print("[GameBridge][DIAG] JSON parsed OK. World: ", game_data.get("world", {}))
	print("[GameBridge][DIAG] Templates: ", game_data.get("templates", {}).keys())
	print("[GameBridge][DIAG] Entity count: ", game_data.get("entities", []).size())
	clear_game()
	if _world_system:
		_world_system.setup_world(game_data.get("world", {}))
		print("[GameBridge][DIAG] World setup complete")
	_visual_renderer.setup_background(game_data.get("background", {}))
	templates = game_data.get("templates", {})
	_entity_factory.update_state()
	var created_count = 0
	for entity_data in game_data.get("entities", []):
		var record = _entity_factory.create_entity(entity_data)
		if record:
			entity_registry[record.entity_id] = record
			created_count += 1
			print("[GameBridge][DIAG] Created entity '", record.entity_id, "' archetype=", record.archetype, " node_type=", record.node.get_class())
	print("[GameBridge][DIAG] Total entities created: ", created_count)
	# Log post-creation physics state
	var space = get_viewport().find_world_2d().space
	var gravity = PhysicsServer2D.area_get_param(space, PhysicsServer2D.AREA_PARAM_GRAVITY)
	var gravity_vec = PhysicsServer2D.area_get_param(space, PhysicsServer2D.AREA_PARAM_GRAVITY_VECTOR)
	print("[GameBridge][DIAG] Post-load gravity: ", gravity, " vec: ", gravity_vec)
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
	_diag_physics_frames += 1
	if _diag_physics_frames == 1 or _diag_physics_frames % 120 == 0:
		if _diag_physics_frames == 1 or _diag_physics_frames % 600 == 0:
			for entity_id in entity_registry:
				var record = entity_registry[entity_id]
				if record and record.is_valid():
					var node = record.node
					var node_type = node.get_class()
					var pos = node.position
					var vel_str = ""
					if node is RigidBody2D:
						vel_str = " vel=" + str(node.linear_velocity) + " sleeping=" + str(node.sleeping)
					print("[GameBridge][DIAG]   Entity '", entity_id, "' type=", node_type, " pos=", pos, vel_str)
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
