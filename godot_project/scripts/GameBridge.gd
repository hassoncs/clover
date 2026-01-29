extends Node

signal game_loaded(game_data: Dictionary)
signal entity_spawned(entity_id: String, node: Node2D)
signal entity_destroyed(entity_id: String)
signal collision_occurred(entity_a: String, entity_b: String, impulse: float)
signal query_result(request_id: int, result: Variant)
signal joint_created(request_id: int, joint_id: int)

# ============================================================================
# MODULE INSTANCES
# These modules handle specific domains and receive a reference to this bridge.
# Modules are defined in scripts/bridge/, scripts/entity/, scripts/physics/, etc.
# ============================================================================
var _event_queue_module: EventQueue = null
var _glb_loader: GLBLoader = null
var _viewport_3d: Viewport3D = null
var _property_collector: PropertyCollector = null
var _query_system: QuerySystem = null
var _debug_bridge: DebugBridge = null
var _physics_queries: PhysicsQueries = null
var _devtools_overlay: DebugOverlay = null
var _entity_factory: EntityFactory = null
var _visual_renderer: VisualRenderer = null
var _background_system: BackgroundSystem = null
var _ui_button_system: UIButtonSystem = null
var _splat_map_system: SplatMapSystem = null
var _input_system: InputSystem = null
var _collision_system: CollisionSystem = null
var _joint_manager: JointManager = null

# ============================================================================
# CORE STATE
# ============================================================================
var game_data: Dictionary = {}
var entities: Dictionary = {}
var templates: Dictionary = {}
var pixels_per_meter: float = 50.0
var game_root: Node2D = null


# Coordinate conversion helpers (Game uses center-origin with Y+ up, Godot uses Y+ down)
# Note: These delegate to CoordinateUtils for consistency with modules
func game_to_godot_pos(game_pos: Vector2) -> Vector2:
	return Vector2(game_pos.x * pixels_per_meter, -game_pos.y * pixels_per_meter)


func godot_to_game_pos(godot_pos: Vector2) -> Vector2:
	return Vector2(godot_pos.x / pixels_per_meter, -godot_pos.y / pixels_per_meter)


func game_to_godot_vec(game_vec: Vector2) -> Vector2:
	return Vector2(game_vec.x * pixels_per_meter, -game_vec.y * pixels_per_meter)


func godot_to_game_vec(godot_vec: Vector2) -> Vector2:
	return Vector2(godot_vec.x / pixels_per_meter, -godot_vec.y / pixels_per_meter)


var ws: WebSocketPeer = null
var ws_url: String = "ws://localhost:8789"

var _js_collision_callback: JavaScriptObject = null
var _js_destroy_callback: JavaScriptObject = null
var _js_entity_spawned_callback: JavaScriptObject = null

var _js_callbacks: Array = []
var _js_bridge_obj: JavaScriptObject = null

var _texture_cache: Dictionary = {}
var _pending_textures: Array = []
var _audio_cache: Dictionary = {}
var _font_cache: Dictionary = {}

# Joint management
var joints: Dictionary = {}
var joint_counter: int = 0

# Sensor callback (for isSensor entities)
var _js_sensor_begin_callback: JavaScriptObject = null
var _js_sensor_end_callback: JavaScriptObject = null
var _js_input_event_callback: JavaScriptObject = null
var _js_transform_sync_callback: JavaScriptObject = null
var _js_property_sync_callback: JavaScriptObject = null

# Collision manifold tracking (for detailed contact info)
var _active_contacts: Dictionary = {}  # "entityA:entityB" -> last_impulse_time
const IMPULSE_THRESHOLD: float = 0.01  # Minimum impulse to report

# UI Button management
var _ui_buttons: Dictionary = {}  # button_id -> TextureButton node
var _js_ui_button_callback: JavaScriptObject = null

# Splat Map System (Lazy-initialized)
var _splat_enabled: bool = false
var _splat_viewport: SubViewport = null
var _splat_canvas: CanvasLayer = null
var _splat_proxies: Dictionary = {}  # entity_id -> SplatProxy node
const SPLAT_PROXY_SCENE = preload("res://scenes/SplatProxy.tscn")

# Debug mode - toggle between showing physics shapes and textures
var _debug_show_shapes: bool = false

# Body ID tracking for Physics2D compatibility
var body_id_map: Dictionary = {}  # entity_id -> body_id (int)
var body_id_reverse: Dictionary = {}  # body_id -> entity_id
var next_body_id: int = 1

# Entity generation tracking for pool safety (prevents stale entity references)
var entity_generations: Dictionary = {}  # entity_id -> generation (int)
var next_generation: int = 1

# Collider ID tracking
var collider_id_map: Dictionary = {}  # collider_id -> {entity_id, node}
var next_collider_id: int = 1

# User data storage
var user_data: Dictionary = {}  # body_id -> arbitrary data
var body_groups: Dictionary = {}  # body_id -> group string

# Shape index to collider ID mapping (for precise sensor collision reporting)
var entity_shape_map: Dictionary = {}  # entity_id -> Array[collider_id]

# Camera control
var camera: Camera2D = null
var camera_target_id: String = ""
var camera_smoothing: float = 5.0

# Event queue for native polling (react-native-godot doesn't support JS callbacks)
var _event_queue: Array = []
const MAX_EVENT_QUEUE_SIZE: int = 100

# Physics pause state (for pre-game loading)
var _physics_paused: bool = false
var _stored_time_scale: float = 1.0


func _ready() -> void:
	_init_modules()
	_setup_camera()
	_setup_js_bridge()


func _download_image_texture(url: String, callback: Callable) -> void:
	if _texture_cache.has(url):
		var texture = _texture_cache[url]
		callback.call(texture)
		return

	var http = HTTPRequest.new()
	add_child(http)

	http.request_completed.connect(
		func(
			result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray
		):
			http.queue_free()
			if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
				push_error("[GameBridge] Failed to download image: " + url)
				return

			var image = Image.new()
			var err = image.load_png_from_buffer(body)
			if err != OK:
				err = image.load_jpg_from_buffer(body)
			if err != OK:
				err = image.load_webp_from_buffer(body)
			if err != OK:
				push_error("[GameBridge] Failed to parse image: " + url)
				return

			var texture = ImageTexture.create_from_image(image)
			_texture_cache[url] = texture
			callback.call(texture)
	)

	var err = http.request(url)
	if err != OK:
		push_error("[GameBridge] Failed to start image download: " + url)
		http.queue_free()


func _init_modules() -> void:
	_event_queue_module = EventQueue.new()
	_glb_loader = GLBLoader.new(self)
	_viewport_3d = Viewport3D.new()
	_viewport_3d.name = "Viewport3D"
	add_child(_viewport_3d)
	_property_collector = PropertyCollector.new(self)
	_physics_queries = PhysicsQueries.new(self)
	_query_system = QuerySystem.new()
	_register_core_query_handlers()

	# Initialize entity factory
	_entity_factory = EntityFactory.new(self)
	_update_entity_factory_state()

	# Initialize visual renderer
	_visual_renderer = VisualRenderer.new(
		pixels_per_meter, _debug_show_shapes, _texture_cache, _font_cache, _download_image_texture
	)

	_debug_bridge = DebugBridge.new(self, _query_system)

	# Initialize background system
	_background_system = BackgroundSystem.new(self)

	# Initialize UI button system
	_ui_button_system = UIButtonSystem.new(self)

	# Initialize splat map system
	_splat_map_system = SplatMapSystem.new(self)

	# Initialize input system
	_input_system = InputSystem.new(self)

	# Initialize collision system
	_collision_system = CollisionSystem.new(self)

	# Initialize joint manager
	_joint_manager = JointManager.new(self)

	_devtools_overlay = DebugOverlay.new()
	_devtools_overlay.setup(self)
	add_child(_devtools_overlay)


func _register_core_query_handlers() -> void:
	# Core game queries - always available
	_query_system.register_handler("getAllTransforms", func(args): return get_all_transforms())
	_query_system.register_handler("getAllProperties", func(args): return collect_all_properties())
	_query_system.register_handler("getWorldInfo", func(args): return get_world_info())
	_query_system.register_handler("getCameraInfo", func(args): return get_camera_info())
	_query_system.register_handler("getViewportInfo", func(args): return get_viewport_info())
	_query_system.register_handler(
		"getEntityTransform",
		func(args):
			if args.size() > 0:
				return _get_entity_transform_impl(str(args[0]))
			return null
	)
	_query_system.register_handler(
		"queryPointEntity",
		func(args):
			if args.size() >= 2:
				return _physics_queries.query_point_entity(float(args[0]), float(args[1]))
			return null
	)
	_query_system.register_handler(
		"screenToWorld",
		func(args):
			if args.size() >= 2:
				return _screen_to_world_impl(float(args[0]), float(args[1]))
			return null
	)
	_query_system.register_handler("getSplatTexture", func(args): return get_splat_texture())


# Handle native input events on web and relay them back to JS
var _is_dragging: bool = false
var _drag_entity_id: Variant = null
var _drag_start_pos: Vector2 = Vector2.ZERO
var _drag_start_time: float = 0.0
const TAP_MAX_DISTANCE: float = 10.0  # pixels
const TAP_MAX_DURATION: float = 0.3  # seconds


func _input(event: InputEvent) -> void:
	if _input_system:
		_input_system.process_input(event, entities)


func _setup_camera() -> void:
	var camera_script = load("res://scripts/effects/CameraEffects.gd")
	camera = Camera2D.new()
	camera.set_script(camera_script)
	camera.name = "GameCamera"
	camera.enabled = true
	camera.global_position = Vector2.ZERO
	add_child(camera)
	camera.make_current()
	if camera.has_method("move_to"):
		camera._target_position = Vector2.ZERO


func _setup_js_bridge() -> void:
	if not OS.has_feature("web"):
		return

	var window = JavaScriptBridge.get_interface("window")
	if window == null:
		push_error("[GameBridge] Could not get window object")
		return

	_js_bridge_obj = JavaScriptBridge.create_object("Object")

	# Legacy: _lastResult for backward compatibility (deprecated - use query instead)
	_js_bridge_obj["_lastResult"] = null

	# Setup QuerySystem to handle async queries via shared infrastructure
	_query_system.setup_js_bridge(_js_bridge_obj)

	var load_game_cb = JavaScriptBridge.create_callback(_js_load_game)
	_js_callbacks.append(load_game_cb)
	_js_bridge_obj["loadGameJson"] = load_game_cb

	var clear_game_cb = JavaScriptBridge.create_callback(_js_clear_game)
	_js_callbacks.append(clear_game_cb)
	_js_bridge_obj["clearGame"] = clear_game_cb

	var load_scene_cb = JavaScriptBridge.create_callback(_js_load_custom_scene)
	_js_callbacks.append(load_scene_cb)
	_js_bridge_obj["loadCustomScene"] = load_scene_cb

	var spawn_cb = JavaScriptBridge.create_callback(_js_spawn_entity)
	_js_callbacks.append(spawn_cb)
	_js_bridge_obj["spawnEntity"] = spawn_cb

	var destroy_cb = JavaScriptBridge.create_callback(_js_destroy_entity)
	_js_callbacks.append(destroy_cb)
	_js_bridge_obj["destroyEntity"] = destroy_cb

	var get_transform_cb = JavaScriptBridge.create_callback(_js_get_entity_transform)
	_js_callbacks.append(get_transform_cb)
	_js_bridge_obj["getEntityTransform"] = get_transform_cb

	var get_all_cb = JavaScriptBridge.create_callback(_js_get_all_transforms)
	_js_callbacks.append(get_all_cb)
	_js_bridge_obj["getAllTransforms"] = get_all_cb

	var get_all_properties_cb = JavaScriptBridge.create_callback(_js_get_all_properties)
	_js_callbacks.append(get_all_properties_cb)
	_js_bridge_obj["getAllProperties"] = get_all_properties_cb

	var on_transform_sync_cb = JavaScriptBridge.create_callback(_js_on_transform_sync)
	_js_callbacks.append(on_transform_sync_cb)
	_js_bridge_obj["onTransformSync"] = on_transform_sync_cb

	var on_property_sync_cb = JavaScriptBridge.create_callback(_js_on_property_sync)
	_js_callbacks.append(on_property_sync_cb)
	_js_bridge_obj["onPropertySync"] = on_property_sync_cb

	var set_watch_config_cb = JavaScriptBridge.create_callback(_js_set_watch_config)
	_js_callbacks.append(set_watch_config_cb)
	_js_bridge_obj["setWatchConfig"] = set_watch_config_cb

	var set_lin_vel_cb = JavaScriptBridge.create_callback(_js_set_linear_velocity)
	_js_callbacks.append(set_lin_vel_cb)
	_js_bridge_obj["setLinearVelocity"] = set_lin_vel_cb

	var set_ang_vel_cb = JavaScriptBridge.create_callback(_js_set_angular_velocity)
	_js_callbacks.append(set_ang_vel_cb)
	_js_bridge_obj["setAngularVelocity"] = set_ang_vel_cb

	var impulse_cb = JavaScriptBridge.create_callback(_js_apply_impulse)
	_js_callbacks.append(impulse_cb)
	_js_bridge_obj["applyImpulse"] = impulse_cb

	var force_cb = JavaScriptBridge.create_callback(_js_apply_force)
	_js_callbacks.append(force_cb)
	_js_bridge_obj["applyForce"] = force_cb

	var input_cb = JavaScriptBridge.create_callback(_js_send_input)
	_js_callbacks.append(input_cb)
	_js_bridge_obj["sendInput"] = input_cb

	var on_input_event_cb = JavaScriptBridge.create_callback(_js_on_input_event)
	_js_callbacks.append(on_input_event_cb)
	_js_bridge_obj["onInputEvent"] = on_input_event_cb

	var on_collision_cb = JavaScriptBridge.create_callback(_js_on_collision)
	_js_callbacks.append(on_collision_cb)
	_js_bridge_obj["onCollision"] = on_collision_cb

	var on_destroy_cb = JavaScriptBridge.create_callback(_js_on_entity_destroyed)
	_js_callbacks.append(on_destroy_cb)
	_js_bridge_obj["onEntityDestroyed"] = on_destroy_cb

	var on_spawned_cb = JavaScriptBridge.create_callback(_js_on_entity_spawned)
	_js_callbacks.append(on_spawned_cb)
	_js_bridge_obj["onEntitySpawned"] = on_spawned_cb

	# Transform control
	var set_transform_cb = JavaScriptBridge.create_callback(_js_set_transform)
	_js_callbacks.append(set_transform_cb)
	_js_bridge_obj["setTransform"] = set_transform_cb

	var set_position_cb = JavaScriptBridge.create_callback(_js_set_position)
	_js_callbacks.append(set_position_cb)
	_js_bridge_obj["setPosition"] = set_position_cb

	var set_rotation_cb = JavaScriptBridge.create_callback(_js_set_rotation)
	_js_callbacks.append(set_rotation_cb)
	_js_bridge_obj["setRotation"] = set_rotation_cb

	var set_scale_cb = JavaScriptBridge.create_callback(_js_set_scale)
	_js_callbacks.append(set_scale_cb)
	_js_bridge_obj["setScale"] = set_scale_cb

	var get_lin_vel_cb = JavaScriptBridge.create_callback(_js_get_linear_velocity)
	_js_callbacks.append(get_lin_vel_cb)
	_js_bridge_obj["getLinearVelocity"] = get_lin_vel_cb

	var get_ang_vel_cb = JavaScriptBridge.create_callback(_js_get_angular_velocity)
	_js_callbacks.append(get_ang_vel_cb)
	_js_bridge_obj["getAngularVelocity"] = get_ang_vel_cb

	var apply_torque_cb = JavaScriptBridge.create_callback(_js_apply_torque)
	_js_callbacks.append(apply_torque_cb)
	_js_bridge_obj["applyTorque"] = apply_torque_cb

	# Joint methods
	var create_revolute_cb = JavaScriptBridge.create_callback(_js_create_revolute_joint)
	_js_callbacks.append(create_revolute_cb)
	_js_bridge_obj["createRevoluteJoint"] = create_revolute_cb

	var create_distance_cb = JavaScriptBridge.create_callback(_js_create_distance_joint)
	_js_callbacks.append(create_distance_cb)
	_js_bridge_obj["createDistanceJoint"] = create_distance_cb

	var create_prismatic_cb = JavaScriptBridge.create_callback(_js_create_prismatic_joint)
	_js_callbacks.append(create_prismatic_cb)
	_js_bridge_obj["createPrismaticJoint"] = create_prismatic_cb

	var create_weld_cb = JavaScriptBridge.create_callback(_js_create_weld_joint)
	_js_callbacks.append(create_weld_cb)
	_js_bridge_obj["createWeldJoint"] = create_weld_cb

	var create_mouse_cb = JavaScriptBridge.create_callback(_js_create_mouse_joint)
	_js_callbacks.append(create_mouse_cb)
	_js_bridge_obj["createMouseJoint"] = create_mouse_cb

	var destroy_joint_cb = JavaScriptBridge.create_callback(_js_destroy_joint)
	_js_callbacks.append(destroy_joint_cb)
	_js_bridge_obj["destroyJoint"] = destroy_joint_cb

	var set_motor_speed_cb = JavaScriptBridge.create_callback(_js_set_motor_speed)
	_js_callbacks.append(set_motor_speed_cb)
	_js_bridge_obj["setMotorSpeed"] = set_motor_speed_cb

	var set_mouse_target_cb = JavaScriptBridge.create_callback(_js_set_mouse_target)
	_js_callbacks.append(set_mouse_target_cb)
	_js_bridge_obj["setMouseTarget"] = set_mouse_target_cb

	# Query methods
	var query_point_cb = JavaScriptBridge.create_callback(_js_query_point)
	_js_callbacks.append(query_point_cb)
	_js_bridge_obj["queryPoint"] = query_point_cb

	var query_point_entity_cb = JavaScriptBridge.create_callback(_js_query_point_entity)
	_js_callbacks.append(query_point_entity_cb)
	_js_bridge_obj["queryPointEntity"] = query_point_entity_cb

	var query_aabb_cb = JavaScriptBridge.create_callback(_js_query_aabb)
	_js_callbacks.append(query_aabb_cb)
	_js_bridge_obj["queryAABB"] = query_aabb_cb

	var raycast_cb = JavaScriptBridge.create_callback(_js_raycast)
	_js_callbacks.append(raycast_cb)
	_js_bridge_obj["raycast"] = raycast_cb

	# Sensor callbacks
	var on_sensor_begin_cb = JavaScriptBridge.create_callback(_js_on_sensor_begin)
	_js_callbacks.append(on_sensor_begin_cb)
	_js_bridge_obj["onSensorBegin"] = on_sensor_begin_cb

	var on_sensor_end_cb = JavaScriptBridge.create_callback(_js_on_sensor_end)
	_js_callbacks.append(on_sensor_end_cb)
	_js_bridge_obj["onSensorEnd"] = on_sensor_end_cb

	# Body/collider management
	var create_body_cb = JavaScriptBridge.create_callback(_js_create_body)
	_js_callbacks.append(create_body_cb)
	_js_bridge_obj["createBody"] = create_body_cb

	var add_fixture_cb = JavaScriptBridge.create_callback(_js_add_fixture)
	_js_callbacks.append(add_fixture_cb)
	_js_bridge_obj["addFixture"] = add_fixture_cb

	var set_sensor_cb = JavaScriptBridge.create_callback(_js_set_sensor)
	_js_callbacks.append(set_sensor_cb)
	_js_bridge_obj["setSensor"] = set_sensor_cb

	var set_user_data_cb = JavaScriptBridge.create_callback(_js_set_user_data)
	_js_callbacks.append(set_user_data_cb)
	_js_bridge_obj["setUserData"] = set_user_data_cb

	var get_user_data_cb = JavaScriptBridge.create_callback(_js_get_user_data)
	_js_callbacks.append(get_user_data_cb)
	_js_bridge_obj["getUserData"] = get_user_data_cb

	var get_all_bodies_cb = JavaScriptBridge.create_callback(_js_get_all_bodies)
	_js_callbacks.append(get_all_bodies_cb)
	_js_bridge_obj["getAllBodies"] = get_all_bodies_cb

	var set_entity_image_cb = JavaScriptBridge.create_callback(_js_set_entity_image)
	_js_callbacks.append(set_entity_image_cb)
	_js_bridge_obj["setEntityImage"] = set_entity_image_cb

	var set_entity_atlas_region_cb = JavaScriptBridge.create_callback(_js_set_entity_atlas_region)
	_js_callbacks.append(set_entity_atlas_region_cb)
	_js_bridge_obj["setEntityAtlasRegion"] = set_entity_atlas_region_cb

	var clear_texture_cache_cb = JavaScriptBridge.create_callback(_js_clear_texture_cache)
	_js_callbacks.append(clear_texture_cache_cb)
	_js_bridge_obj["clearTextureCache"] = clear_texture_cache_cb

	var preload_textures_cb = JavaScriptBridge.create_callback(_js_preload_textures)
	_js_callbacks.append(preload_textures_cb)
	_js_bridge_obj["preloadTextures"] = preload_textures_cb

	var set_debug_show_shapes_cb = JavaScriptBridge.create_callback(_js_set_debug_show_shapes)
	_js_callbacks.append(set_debug_show_shapes_cb)
	_js_bridge_obj["setDebugShowShapes"] = set_debug_show_shapes_cb

	var set_debug_settings_cb = JavaScriptBridge.create_callback(_js_set_debug_settings)
	_js_callbacks.append(set_debug_settings_cb)
	_js_bridge_obj["setDebugSettings"] = set_debug_settings_cb

	var set_camera_target_cb = JavaScriptBridge.create_callback(_js_set_camera_target)
	_js_callbacks.append(set_camera_target_cb)
	_js_bridge_obj["setCameraTarget"] = set_camera_target_cb

	var set_camera_position_cb = JavaScriptBridge.create_callback(_js_set_camera_position)
	_js_callbacks.append(set_camera_position_cb)
	_js_bridge_obj["setCameraPosition"] = set_camera_position_cb

	var set_camera_zoom_cb = JavaScriptBridge.create_callback(_js_set_camera_zoom)
	_js_callbacks.append(set_camera_zoom_cb)
	_js_bridge_obj["setCameraZoom"] = set_camera_zoom_cb

	var spawn_particle_cb = JavaScriptBridge.create_callback(_js_spawn_particle)
	_js_callbacks.append(spawn_particle_cb)
	_js_bridge_obj["spawnParticle"] = spawn_particle_cb

	var play_sound_cb = JavaScriptBridge.create_callback(_js_play_sound)
	_js_callbacks.append(play_sound_cb)
	_js_bridge_obj["playSound"] = play_sound_cb

	# UI Button methods
	var create_ui_button_cb = JavaScriptBridge.create_callback(_js_create_ui_button)
	_js_callbacks.append(create_ui_button_cb)
	_js_bridge_obj["createUIButton"] = create_ui_button_cb

	var destroy_ui_button_cb = JavaScriptBridge.create_callback(_js_destroy_ui_button)
	_js_callbacks.append(destroy_ui_button_cb)
	_js_bridge_obj["destroyUIButton"] = destroy_ui_button_cb

	var on_ui_button_event_cb = JavaScriptBridge.create_callback(_js_on_ui_button_event)
	_js_callbacks.append(on_ui_button_event_cb)
	_js_bridge_obj["onUIButtonEvent"] = on_ui_button_event_cb

	var show_3d_model_cb = JavaScriptBridge.create_callback(_js_show_3d_model)
	_js_callbacks.append(show_3d_model_cb)
	_js_bridge_obj["show3DModel"] = show_3d_model_cb

	var show_3d_model_from_url_cb = JavaScriptBridge.create_callback(_js_show_3d_model_from_url)
	_js_callbacks.append(show_3d_model_from_url_cb)
	_js_bridge_obj["show3DModelFromURL"] = show_3d_model_from_url_cb

	var set_3d_viewport_position_cb = JavaScriptBridge.create_callback(_js_set_3d_viewport_position)
	_js_callbacks.append(set_3d_viewport_position_cb)
	_js_bridge_obj["set3DViewportPosition"] = set_3d_viewport_position_cb

	var set_3d_viewport_size_cb = JavaScriptBridge.create_callback(_js_set_3d_viewport_size)
	_js_callbacks.append(set_3d_viewport_size_cb)
	_js_bridge_obj["set3DViewportSize"] = set_3d_viewport_size_cb

	var rotate_3d_model_cb = JavaScriptBridge.create_callback(_js_rotate_3d_model)
	_js_callbacks.append(rotate_3d_model_cb)
	_js_bridge_obj["rotate3DModel"] = rotate_3d_model_cb

	var set_3d_camera_distance_cb = JavaScriptBridge.create_callback(_js_set_3d_camera_distance)
	_js_callbacks.append(set_3d_camera_distance_cb)
	_js_bridge_obj["set3DCameraDistance"] = set_3d_camera_distance_cb

	var clear_3d_models_cb = JavaScriptBridge.create_callback(_js_clear_3d_models)
	_js_callbacks.append(clear_3d_models_cb)
	_js_bridge_obj["clear3DModels"] = clear_3d_models_cb

	var capture_screenshot_cb = JavaScriptBridge.create_callback(_js_capture_screenshot)
	_js_callbacks.append(capture_screenshot_cb)
	_js_bridge_obj["captureScreenshot"] = capture_screenshot_cb

	var get_world_info_cb = JavaScriptBridge.create_callback(_js_get_world_info)
	_js_callbacks.append(get_world_info_cb)
	_js_bridge_obj["getWorldInfo"] = get_world_info_cb

	var get_camera_info_cb = JavaScriptBridge.create_callback(_js_get_camera_info)
	_js_callbacks.append(get_camera_info_cb)
	_js_bridge_obj["getCameraInfo"] = get_camera_info_cb

	var get_viewport_info_cb = JavaScriptBridge.create_callback(_js_get_viewport_info)
	_js_callbacks.append(get_viewport_info_cb)
	_js_bridge_obj["getViewportInfo"] = get_viewport_info_cb

	var pause_physics_cb = JavaScriptBridge.create_callback(_js_pause_physics)
	_js_callbacks.append(pause_physics_cb)
	_js_bridge_obj["pausePhysics"] = pause_physics_cb

	var resume_physics_cb = JavaScriptBridge.create_callback(_js_resume_physics)
	_js_callbacks.append(resume_physics_cb)
	_js_bridge_obj["resumePhysics"] = resume_physics_cb

	window["GodotBridge"] = _js_bridge_obj


func _js_load_game(args: Array) -> bool:
	if args.size() < 1:
		return false
	var json_str = str(args[0])
	return load_game_json(json_str)


func _js_clear_game(_args: Array) -> void:
	clear_game()


func _js_pause_physics(_args: Array) -> void:
	pause_physics()


func _js_resume_physics(_args: Array) -> void:
	resume_physics()


# Pause the physics simulation (freeze entities in place)
func pause_physics() -> void:
	if _physics_paused:
		return
	_physics_paused = true
	_stored_time_scale = Engine.time_scale
	Engine.time_scale = 0.0
	get_tree().paused = true


# Resume the physics simulation
func resume_physics() -> void:
	if not _physics_paused:
		return
	_physics_paused = false
	Engine.time_scale = _stored_time_scale
	get_tree().paused = false


func _js_load_custom_scene(args: Array) -> bool:
	if args.size() < 1:
		return false
	return load_custom_scene(str(args[0]))


func _js_spawn_entity(args: Array) -> void:
	if args.size() < 4:
		return

	var template_id = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	var entity_id = str(args[3])

	# Get initial velocity from args[4] if provided
	var initial_velocity_json = ""
	if args.size() >= 5 and args[4] != null:
		initial_velocity_json = str(args[4])

	spawn_entity_with_id(template_id, x, y, entity_id, initial_velocity_json)


func _js_destroy_entity(args: Array) -> void:
	if args.size() < 1:
		return
	destroy_entity(str(args[0]))


func _js_get_entity_transform(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	if not entities.has(entity_id):
		return null
	var node = entities[entity_id]
	var game_pos = godot_to_game_pos(node.position)
	return {"x": game_pos.x, "y": game_pos.y, "angle": -node.rotation}  # Flip angle back to game convention


func _js_get_all_transforms(_args: Array) -> void:
	var transforms = get_all_transforms()
	_js_bridge_obj["_lastResult"] = transforms


func _js_get_all_properties(_args: Array) -> void:
	var properties = collect_all_properties()
	_js_bridge_obj["_lastResult"] = properties


func _js_on_transform_sync(args: Array) -> void:
	if args.size() >= 1:
		_js_transform_sync_callback = args[0]


func _notify_transform_sync() -> void:
	if _js_transform_sync_callback != null:
		var transforms = get_all_transforms()
		var json_str = JSON.stringify(transforms)
		_js_transform_sync_callback.call("call", null, json_str)
	else:
		_queue_event("transform_sync", get_all_transforms())


func _js_on_property_sync(args: Array) -> void:
	if args.size() >= 1:
		_js_property_sync_callback = args[0]


func _js_set_watch_config(args: Array) -> void:
	if args.size() >= 1:
		var config_json = str(args[0])
		var config = JSON.parse_string(config_json)
		if config:
			set_watch_config(config)


func _notify_property_sync() -> void:
	var properties = collect_all_properties()

	if _js_property_sync_callback != null:
		_js_property_sync_callback.call("call", null, JSON.stringify(properties))
	else:
		_queue_event("property_sync", properties)


func _js_set_linear_velocity(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		var game_vel = Vector2(float(args[1]), float(args[2]))
		var godot_vel = game_to_godot_vec(game_vel)
		if node is RigidBody2D:
			node.linear_velocity = godot_vel
		elif node is CharacterBody2D:
			node.velocity = godot_vel
		elif node is Area2D:
			# Area2D doesn't have built-in velocity - track it via metadata
			node.set_meta("velocity", godot_vel)


func set_linear_velocity(entity_id: String, vx: float, vy: float) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.linear_velocity = game_to_godot_vec(Vector2(vx, vy))
		elif node is CharacterBody2D:
			node.velocity = game_to_godot_vec(Vector2(vx, vy))
		elif node is Area2D:
			# Area2D doesn't have built-in velocity - track it via metadata
			node.set_meta("velocity", game_to_godot_vec(Vector2(vx, vy)))


func _js_set_angular_velocity(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.angular_velocity = float(args[1])


func set_angular_velocity(entity_id: String, velocity: float) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.angular_velocity = velocity


func _js_apply_impulse(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			var game_impulse = Vector2(float(args[1]), float(args[2]))
			node.apply_central_impulse(game_to_godot_vec(game_impulse))


func apply_impulse(entity_id: String, ix: float, iy: float) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.apply_central_impulse(game_to_godot_vec(Vector2(ix, iy)))


func _js_apply_force(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			var game_force = Vector2(float(args[1]), float(args[2]))
			node.apply_central_force(game_to_godot_vec(game_force))


func apply_force(entity_id: String, fx: float, fy: float) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.apply_central_force(game_to_godot_vec(Vector2(fx, fy)))


func send_input(input_type: String, x: float, y: float, entity_id: String = "") -> void:
	if _input_system:
		_input_system.send_input(input_type, x, y, entity_id, entities)


func _js_send_input(args: Array) -> void:
	if _input_system:
		_input_system._js_send_input(args, entities)


func _js_on_input_event(args: Array) -> void:
	if _input_system:
		_input_system._js_on_input_event(args)


func _notify_js_input_event(input_type: String, x: float, y: float, entity_id: Variant) -> void:
	if _input_system:
		_input_system._notify_js_input_event(input_type, x, y, entity_id)


func _js_on_collision(args: Array) -> void:
	if _collision_system:
		_collision_system._js_on_collision(args)


func _notify_js_collision(entity_a: String, entity_b: String, impulse: float) -> void:
	if _collision_system:
		_collision_system._notify_js_collision(entity_a, entity_b, impulse)


func _notify_js_collision_detailed(collision_data: Dictionary) -> void:
	if _collision_system:
		_collision_system._notify_js_collision_detailed(collision_data)


func _handle_collision_manifold(body_node: RigidBody2D, state: PhysicsDirectBodyState2D) -> void:
	if _collision_system:
		_collision_system._handle_collision_manifold(body_node, state, entities)


func _js_on_entity_destroyed(args: Array) -> void:
	if args.size() >= 1:
		_js_destroy_callback = args[0]


func _js_on_entity_spawned(args: Array) -> void:
	if args.size() >= 1:
		_js_entity_spawned_callback = args[0]


func _js_clear_texture_cache(args: Array) -> void:
	if args.size() > 0 and str(args[0]) != "":
		var url = str(args[0])
		if _texture_cache.has(url):
			_texture_cache.erase(url)
	else:
		_texture_cache.clear()


var _preload_pending_count: int = 0
var _preload_completed_count: int = 0
var _preload_failed_count: int = 0
var _js_preload_progress_callback: JavaScriptObject = null


func _js_preload_textures(args: Array) -> void:
	if args.size() < 1:
		push_error("[GameBridge] preloadTextures requires at least 1 arg: urls (JSON string)")
		return

	var urls_json = str(args[0])
	var urls = JSON.parse_string(urls_json)
	if urls == null or not (urls is Array):
		push_error("[GameBridge] preloadTextures: failed to parse URLs from JSON")
		return
	if urls.size() == 0:
		if args.size() > 1 and args[1] != null:
			var cb = args[1]
			if cb is JavaScriptObject:
				cb.call("call", null, 100, 0, 0)
		return

	# Store callback if provided
	if args.size() > 1 and args[1] != null:
		_js_preload_progress_callback = args[1]
	else:
		_js_preload_progress_callback = null

	_preload_pending_count = urls.size()
	_preload_completed_count = 0
	_preload_failed_count = 0

	for url_variant in urls:
		var url = str(url_variant)
		if url == "":
			_on_preload_complete(url, false)
			continue

		# Skip if already cached
		if _texture_cache.has(url):
			_on_preload_complete(url, true)
			continue

		# Download the texture
		var http = HTTPRequest.new()
		add_child(http)

		http.request_completed.connect(
			func(
				result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray
			):
				http.queue_free()
				if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
					push_warning(
						(
							"[GameBridge] Failed to preload texture: "
							+ url
							+ " (result: "
							+ str(result)
							+ ", code: "
							+ str(response_code)
							+ ")"
						)
					)
					_on_preload_complete(url, false)
					return

				if body.size() == 0:
					push_warning("[GameBridge] Empty body for texture: " + url)
					_on_preload_complete(url, false)
					return

				var image = Image.new()
				var err = image.load_png_from_buffer(body)
				if err != OK:
					err = image.load_jpg_from_buffer(body)
				if err != OK:
					err = image.load_webp_from_buffer(body)
				if err != OK:
					push_warning(
						(
							"[GameBridge] All image formats failed for: "
							+ url
							+ " (size: "
							+ str(body.size())
							+ ")"
						)
					)
					_on_preload_complete(url, false)
					return

				var texture = ImageTexture.create_from_image(image)
				_texture_cache[url] = texture
				_on_preload_complete(url, true)
		)

		var err = http.request(url)
		if err != OK:
			push_warning("[GameBridge] Failed to start preload request: " + url)
			http.queue_free()
			_on_preload_complete(url, false)


func _on_preload_complete(url: String, success: bool) -> void:
	if success:
		_preload_completed_count += 1
	else:
		_preload_failed_count += 1

	var total_done = _preload_completed_count + _preload_failed_count
	var percent = int((float(total_done) / float(_preload_pending_count)) * 100.0)

	if _js_preload_progress_callback != null:
		_js_preload_progress_callback.call(
			"call", null, percent, _preload_completed_count, _preload_failed_count
		)
	else:
		print("[GameBridge] No progress callback registered!")


func _js_set_debug_show_shapes(args: Array) -> void:
	"""Toggle debug mode to show physics shapes or textures.
	args[0]: boolean - true to show shapes, false to show textures"""
	if args.size() < 1:
		push_error("[GameBridge] setDebugShowShapes requires 1 arg: show_shapes (boolean)")
		return

	_debug_show_shapes = bool(args[0])

	# Apply debug visibility to all existing entities
	for entity_id in entities:
		var node = entities[entity_id]
		if node:
			_apply_debug_visibility(node)


func _js_set_debug_settings(args: Array) -> void:
	if args.size() < 1:
		push_error("[GameBridge] setDebugSettings requires 1 arg: settings JSON string")
		return

	var json_str = str(args[0])
	var json = JSON.new()
	var parse_result = json.parse(json_str)
	if parse_result != OK:
		push_error("[GameBridge] setDebugSettings: Invalid JSON: " + json_str)
		return

	var settings = json.data
	if not settings is Dictionary:
		push_error("[GameBridge] setDebugSettings: Expected object, got: " + str(typeof(settings)))
		return

	if _devtools_overlay:
		_devtools_overlay.set_settings(settings)
	else:
		push_error("[GameBridge] _devtools_overlay is null!")