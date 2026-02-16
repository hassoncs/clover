extends Node

signal game_loaded(game_data: Dictionary)
signal entity_spawned(entity_id: String, node: Node2D)
signal entity_destroyed(entity_id: String)
signal collision_occurred(entity_a: String, entity_b: String, impulse: float)
signal sensor_entered(sensor_id: String, body_id: String)
signal sensor_exited(sensor_id: String, body_id: String)
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

var _entity_factory_3d: EntityFactory3D = null
var _world_3d_system: World3DSystem = null
var _visual_renderer_3d: VisualRenderer3D = null
var _voxel_system: VoxelSystem = null
var _camera_3d_controller: CameraController3D = null
var _movement_controller_3d = null
var _collision_system_3d: CollisionSystem3D = null

# ============================================================================
# CORE STATE
# ============================================================================
var game_data: Dictionary = {}
var entity_registry: Dictionary = {}  # entity_id -> EntityRecord (single source of truth)
var prefabs: Dictionary = {}
var pixels_per_meter: float = 50.0
var game_root: Node2D = null
var camera: Camera2D = null
var game_root_3d: Node3D = null
var camera_3d: Camera3D = null
var _main_3d_scene: Node3D = null
var _entities_3d: Dictionary = {}
var _is_3d: bool = false

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

func get_entity_node(entity_id: String) -> Node:
	var record = get_record(entity_id)
	return record.node if record else null

var _js_callbacks: Array = []
var _js_bridge_obj: JavaScriptObject = null
var _debug_show_shapes: bool = false
var _method_map: Dictionary = {}
var _debug_enabled: bool = false

func _ready() -> void:
	_init_modules()
	_camera_controller.setup_camera()
	_build_method_map()
	# Defer JS bridge exposure to end of frame so ALL autoload _ready() calls
	# complete first (e.g., GameBridgeEffects registers its query handlers).
	# window.GodotBridge appearing IS the single "fully ready" signal for JS.
	call_deferred("_finalize_js_bridge")

func _finalize_js_bridge() -> void:
	_validate_method_map()
	_setup_js_bridge()
	if OS.is_debug_build():
		_log_physics_diagnostics()
		_log_bridge_registry()

func set_inspect_mode(enabled: bool) -> void:
	if _debug_bridge: _debug_bridge.get_time_module().set_inspect_mode(enabled)

func emit_sensor_entered(sensor_id: String, body_id: String) -> void:
	sensor_entered.emit(sensor_id, body_id)

func emit_sensor_exited(sensor_id: String, body_id: String) -> void:
	sensor_exited.emit(sensor_id, body_id)

func pause_physics() -> void: Engine.time_scale = 0.0
func resume_physics() -> void: Engine.time_scale = 1.0

func enable_debug() -> Dictionary:
	if _debug_enabled:
		return {"ok": true, "wasAlreadyEnabled": true, "methodsRegistered": 0}

	_debug_bridge = DebugBridge.new(self, _query_system)
	_debug_enabled = true

	return {"ok": true, "wasAlreadyEnabled": false, "methodsRegistered": 33}

func disable_debug() -> Dictionary:
	if not _debug_enabled:
		return {"ok": true, "wasAlreadyEnabled": false, "methodsUnregistered": 0}

	if _debug_bridge:
		_debug_bridge.unregister_handlers()
		_debug_bridge = null

	_debug_enabled = false

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
	_viewport_3d.set_bridge(self)
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
	_entity_factory_3d = EntityFactory3D.new(self)
	_world_3d_system = World3DSystem.new(self)
	_visual_renderer_3d = VisualRenderer3D.new(self)
	_voxel_system = VoxelSystem.new()
	_camera_3d_controller = CameraController3D.new()
	_camera_3d_controller.name = "CameraController3D"
	_camera_3d_controller.set_bridge(self)
	add_child(_camera_3d_controller)
	_movement_controller_3d = load("res://scripts/input/MovementController3D.gd").new()
	_movement_controller_3d.name = "MovementController3D"
	_movement_controller_3d.set_bridge(self)
	add_child(_movement_controller_3d)
	_collision_system_3d = CollisionSystem3D.new(self)

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
	_query_system.register_handler("preloadTextures", func(args):
		var urls = args[0] if args.size() > 0 else []
		if urls is String:
			urls = JSON.parse_string(urls)
			if urls == null: urls = []
		if urls is Array:
			_visual_renderer.preload_textures(urls)
		return {"ok": true}
	)

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
	_method_map = _auto_register_bridge_methods([
		self, _entity_manager, _transform_system, _physics_controller, _joint_manager,
		_visual_renderer, _ui_manager, _camera_controller, _input_router,
		_sync_system, _property_collector, _event_emitter, _physics_queries,
		_pixel_buffer_manager, _debug_bridge, _viewport_3d,
		_entity_factory_3d, _camera_3d_controller, _movement_controller_3d, _world_3d_system, _collision_system_3d, _voxel_system,
	])


func _validate_method_map() -> void:
	var camel_map: Dictionary = {}
	for key in _method_map: camel_map[_to_camel_case(key)] = true
	var missing = BridgeMethodMap.get_missing_methods(camel_map)
	if missing.size() > 0:
		push_error("[GameBridge] %d missing bridge methods: %s" % [missing.size(), ", ".join(missing)])

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
		return {"error": "unknown_method", "method": method_name}
	return _method_map[method_name].call(args)

func native_dispatch(method_name: String, args_json: String) -> Variant:
	if not _method_map.has(method_name):
		return JSON.stringify({"error": "unknown_method", "method": method_name})
	var args: Array = []
	if args_json != "[]" and args_json != "":
		var json = JSON.new()
		if json.parse(args_json) != OK:
			push_warning("[GameBridge] Invalid JSON in args: " + args_json.substr(0, 100))
			return JSON.stringify({"error": "invalid_json", "message": json.get_error_message()})
		args = json.data if json.data is Array else [json.data]
	var result = _method_map[method_name].call(args)
	if result == null:
		return "null"
	if result is Dictionary or result is Array:
		return JSON.stringify(result)
	return result

func _input(event: InputEvent) -> void:
	if _is_3d:
		return
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

func _js_load_game_json(args: Array) -> bool: return load_game_json(str(args[0])) if args.size() > 0 else false
func _js_clear_game(_args: Array) -> void: clear_game()
func _js_soft_reset(_args: Array) -> void: clear_game()
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

func _js_call_rpc(args: Array) -> Variant: return _handle_rpc(args)
func _js_spawn_entity_with_id(args: Array) -> Node2D: return spawn_entity_with_id(str(args[0]), float(args[1]), float(args[2]), str(args[3])) if args.size() >= 4 else null
func _js_enable_debug(_args: Array) -> Dictionary: return enable_debug()
func _js_disable_debug(_args: Array) -> Dictionary: return disable_debug()
func _js_is_debug_enabled(_args: Array) -> bool: return is_debug_enabled()
func _js_get_bridge_methods(_args: Array) -> Dictionary: return get_bridge_methods()
func _js_screen_to_world(args: Array) -> Dictionary: return _screen_to_world_impl(float(args[0]), float(args[1])) if args.size() >= 2 else {"x": 0, "y": 0}

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
	elif method_name.begins_with("spawn_particle") or method_name.begins_with("play_sound") or method_name.begins_with("play_music") or method_name.begins_with("stop_music") or method_name.begins_with("create_ui") or method_name.begins_with("destroy_ui") or method_name.begins_with("on_ui_button_event") or method_name.begins_with("create_themed_ui") or method_name.begins_with("destroy_themed_ui"):
		return "UIManager"
	elif method_name.begins_with("show_3d") or method_name.begins_with("set_3d") or method_name.begins_with("rotate_3d") or method_name.begins_with("clear_3d"):
		return "Viewport3D"
	elif method_name.begins_with("get_all_properties"):
		return "PropertyCollector"
	elif method_name == "load_game_json" or method_name == "clear_game" or method_name == "set_inspect_mode" or method_name == "pause_physics" or method_name == "resume_physics" or method_name == "load_custom_scene" or method_name == "setup_world" or method_name == "register_prefabs" or method_name == "load_entities" or method_name == "clear_entities":
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
	if _splat_map_system: _splat_map_system.process(delta)
	if _ws_system: _ws_system.process(delta)

func connect_to_server(url: String = "") -> void: if _ws_system: _ws_system.connect_to_server(url)

func load_game_json(json_string: String) -> bool:
	var json = JSON.new()
	if json.parse(json_string) != OK:
		push_error("[GameBridge] Failed to parse game JSON")
		return false
	game_data = json.data
	var scene_type = str(game_data.get("sceneType", "2d")).to_lower()
	var next_is_3d = scene_type == "3d"
	clear_game()
	_is_3d = next_is_3d
	if _is_3d:
		_load_game_3d(game_data)
	else:
		if game_root:
			game_root.visible = true
		setup_world(game_data.get("world", {}), game_data.get("background", {}))
		register_prefabs(game_data.get("prefabs", {}))
		load_entities(game_data.get("entities", []))
	game_loaded.emit(game_data)
	return true

# ============================================================================
# SECTIONED LOADING METHODS
# ============================================================================

func setup_world(world_data: Dictionary, background_data: Dictionary = {}) -> void:
	if _world_system:
		_world_system.setup_world(world_data)
	_visual_renderer.setup_background(background_data)

func register_prefabs(prefabs_data: Dictionary) -> void:
	prefabs = prefabs_data
	_entity_factory.update_state()

func load_entities(entities_data: Array) -> int:
	var created_count = 0
	for entity_data in entities_data:
		var record = _entity_factory.create_entity(entity_data)
		if record:
			entity_registry[record.entity_id] = record
			created_count += 1
	return created_count

func clear_entities() -> void:
	if _is_3d:
		for entity_id in _entities_3d.keys():
			var node = _entities_3d[entity_id]
			if node and is_instance_valid(node):
				node.queue_free()
		_entities_3d.clear()
		entity_registry.clear()
		return

	if _joint_manager: _joint_manager.clear_all()
	if _entity_manager: _entity_manager.clear_all()
	entity_registry.clear()

func _js_setup_world(args: Array) -> void:
	if args.size() < 1: return
	var world_json = args[0]
	if world_json is String:
		var json = JSON.new()
		if json.parse(world_json) != OK: return
		world_json = json.data
	var bg_data = {}
	if args.size() >= 2:
		var bg_json = args[1]
		if bg_json is String:
			var json2 = JSON.new()
			if json2.parse(bg_json) == OK:
				bg_data = json2.data
		elif bg_json is Dictionary:
			bg_data = bg_json
	setup_world(world_json, bg_data)

func _js_register_prefabs(args: Array) -> void:
	if args.size() < 1: return
	var prefabs_json = args[0]
	if prefabs_json is String:
		var json = JSON.new()
		if json.parse(prefabs_json) != OK: return
		prefabs_json = json.data
	register_prefabs(prefabs_json)

func _js_load_entities(args: Array) -> int:
	if args.size() < 1: return 0
	var entities_json = args[0]
	if entities_json is String:
		var json = JSON.new()
		if json.parse(entities_json) != OK: return 0
		entities_json = json.data
	return load_entities(entities_json)

func _js_clear_entities(_args: Array) -> void:
	clear_entities()

func load_custom_scene(scene_path: String) -> bool:
	if not ResourceLoader.exists(scene_path) or not game_root: return false
	var scene = load(scene_path)
	if not scene: return false
	for child in game_root.get_children(): child.queue_free()
	game_root.add_child(scene.instantiate())
	return true

func spawn_entity(prefab_id: String, x: float, y: float) -> Node2D:
	return spawn_entity_with_id(prefab_id, x, y, prefab_id + "_" + str(randi()))

func spawn_entity_with_id(prefab_id: String, x: float, y: float, entity_id: String) -> Node2D:
	if _entity_manager: return _entity_manager.spawn_entity(prefab_id, x, y, entity_id)
	return null

func destroy_entity(entity_id: String) -> void:
	if _is_3d:
		var node = _entities_3d.get(entity_id, null)
		if node and is_instance_valid(node):
			node.queue_free()
		_entities_3d.erase(entity_id)
		entity_registry.erase(entity_id)
		entity_destroyed.emit(entity_id)
		return
	if _entity_manager:
		_entity_manager.destroy_entity(entity_id)

func get_entity(entity_id: String) -> Node:
	return get_entity_node(entity_id)

func clear_game() -> void:
	if _is_3d:
		clear_entities()
		_cleanup_3d_scene()
	else:
		if _joint_manager: _joint_manager.clear_all()
		if _entity_manager: _entity_manager.clear_all()
	entity_registry.clear()
	_entities_3d.clear()
	prefabs.clear()
	var effects_bridge = get_node_or_null("/root/GameBridgeEffects")
	if effects_bridge:
		if effects_bridge.has_method("clear_all_sprite_effects"):
			effects_bridge.clear_all_sprite_effects()
		if effects_bridge.has_method("clear_plan"):
			effects_bridge.clear_plan()
			effects_bridge.reset_graph()

	if game_root:
		game_root.visible = true

func _cleanup_3d_scene() -> void:
	if _main_3d_scene and is_instance_valid(_main_3d_scene):
		_main_3d_scene.queue_free()
	_main_3d_scene = null
	game_root_3d = null
	camera_3d = null

func _physics_process(delta: float) -> void:
	if _is_3d:
		return
	if _sync_system: _sync_system.process_sync()
	if _joint_manager: _joint_manager.process_mouse_joints(delta)
	if _physics_controller: _physics_controller.process_physics(delta, entity_registry)

func _queue_event(event_type: String, data: Dictionary) -> void:
	if _event_queue_module: _event_queue_module.queue_event(event_type, data)

func poll_events() -> String: return _event_queue_module.poll_events() if _event_queue_module else "[]"

func _get_entity_transform_impl(entity_id: String) -> Variant:
	var record = get_record(entity_id)
	if not record:
		return null
	var node = record.node
	if not node: return null
	if node is Node3D:
		return {
			"x": node.position.x,
			"y": node.position.y,
			"z": node.position.z,
			"rotationX": node.rotation_degrees.x,
			"rotationY": node.rotation_degrees.y,
			"rotationZ": node.rotation_degrees.z
		}
	var game_pos = godot_to_game_pos(node.position)
	return {"x": game_pos.x, "y": game_pos.y, "angle": -node.rotation}

func _screen_to_world_impl(screen_x: float, screen_y: float) -> Dictionary:
	if _is_3d and camera_3d:
		var origin = camera_3d.project_ray_origin(Vector2(screen_x, screen_y))
		var direction = camera_3d.project_ray_normal(Vector2(screen_x, screen_y))
		if abs(direction.y) > 0.0001:
			var t = -origin.y / direction.y
			var world_pos = origin + direction * t
			return {"x": world_pos.x, "y": world_pos.y, "z": world_pos.z}
		return {"x": origin.x, "y": origin.y, "z": origin.z}
	var screen_pos = Vector2(screen_x, screen_y)
	var godot_world_pos = get_viewport().get_canvas_transform().affine_inverse() * screen_pos
	var game_pos = godot_to_game_pos(godot_world_pos)
	return {"x": game_pos.x, "y": game_pos.y}

func _resolve_movement_target_3d(input3d_data: Dictionary, camera_data: Dictionary, entities_data: Array, prefabs_data: Dictionary) -> String:
	var movement_cfg = input3d_data.get("movement", {})
	if movement_cfg is Dictionary:
		var explicit_target = str(movement_cfg.get("target", ""))
		if explicit_target != "":
			return explicit_target

	var follow_cfg = camera_data.get("follow", {})
	if follow_cfg is Dictionary:
		var follow_target = str(follow_cfg.get("target", ""))
		if follow_target != "":
			return follow_target

	for entity_data in entities_data:
		if not (entity_data is Dictionary):
			continue

		var physics_data = entity_data.get("physics", null)
		if physics_data == null:
			var prefab_id = str(entity_data.get("prefab", ""))
			if prefab_id != "":
				var prefab_data = prefabs_data.get(prefab_id, null)
				if prefab_data is Dictionary:
					physics_data = prefab_data.get("physics", null)

		if physics_data is Dictionary and str(physics_data.get("bodyType", "")) == "kinematic":
			return str(entity_data.get("id", ""))

	return ""

func _load_game_3d(data: Dictionary) -> void:
	_cleanup_3d_scene()

	var main_3d_scene_resource = load("res://scenes/Main3D.tscn")
	if not (main_3d_scene_resource is PackedScene):
		push_error("[GameBridge] Failed to load Main3D scene")
		return

	_main_3d_scene = main_3d_scene_resource.instantiate()
	if get_tree().current_scene:
		get_tree().current_scene.add_child(_main_3d_scene)
	else:
		add_child(_main_3d_scene)

	game_root_3d = _main_3d_scene.get_node_or_null("GameRoot3D")
	camera_3d = _main_3d_scene.get_node_or_null("Camera3D")
	var env_node: WorldEnvironment = _main_3d_scene.get_node_or_null("WorldEnvironment")
	var light_node: DirectionalLight3D = _main_3d_scene.get_node_or_null("DirectionalLight3D")

	if game_root:
		game_root.visible = false

	var world_data = data.get("world", {})
	var camera_data = data.get("camera3d", {})
	var input3d_data = data.get("input3d", {})
	var prefabs_data = data.get("prefabs", {})
	var entities_data = data.get("entities", [])

	prefabs = prefabs_data
	_entities_3d.clear()
	entity_registry.clear()

	_entity_factory_3d.setup(_entities_3d, prefabs_data, game_root_3d)
	_world_3d_system.setup(world_data, game_root_3d, env_node, light_node)
	_voxel_system.setup(game_root_3d)

	_camera_3d_controller.set_bridge(self)
	_camera_3d_controller.setup(camera_data, camera_3d)

	for entity_data in entities_data:
		var record = _entity_factory_3d.create_entity(entity_data)
		if record:
			entity_registry[record.entity_id] = record

	_camera_3d_controller.bind_target_from_entities(_entities_3d)

	if _movement_controller_3d:
		var movement_target_id = _resolve_movement_target_3d(input3d_data, camera_data, entities_data, prefabs_data)
		_movement_controller_3d.setup(input3d_data, camera_3d, _camera_3d_controller, _entities_3d, movement_target_id)
