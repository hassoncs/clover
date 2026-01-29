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

	# Download image texture helper (used by VisualRenderer and sprite loading)
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

	# Initialize visual renderer
	_visual_renderer = VisualRenderer.new(
		pixels_per_meter, _debug_show_shapes, _texture_cache, _font_cache, _download_image_texture
	)

	_debug_bridge = DebugBridge.new(self, _query_system)

	# Initialize background system
	_background_system = BackgroundSystem.new(self)

	# Initialize UI button system
	_ui_button_system = UIButtonSystem.new(self)

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
	if not OS.has_feature("web"):
		return

	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var screen_pos = event.position
		var world_pos = get_viewport().get_canvas_transform().affine_inverse() * screen_pos
		var game_pos = godot_to_game_pos(world_pos)

		if event.pressed:
			var hit_entity_id: Variant = null
			var space = get_viewport().find_world_2d().direct_space_state
			if space:
				var query = PhysicsPointQueryParameters2D.new()
				query.position = world_pos
				query.collision_mask = 0xFFFFFFFF
				query.collide_with_bodies = true
				query.collide_with_areas = true
				var results = space.intersect_point(query, 1)
				if results.size() > 0:
					var collider = results[0].collider
					if collider and collider.name in entities:
						hit_entity_id = collider.name

			_is_dragging = true
			_drag_entity_id = hit_entity_id
			_drag_start_pos = screen_pos
			_drag_start_time = Time.get_ticks_msec() / 1000.0

			_queue_event(
				"input",
				{"type": "drag_start", "x": game_pos.x, "y": game_pos.y, "entityId": hit_entity_id}
			)
			_notify_js_input_event("drag_start", game_pos.x, game_pos.y, hit_entity_id)

			if _devtools_overlay:
				_devtools_overlay.start_drag(world_pos, str(hit_entity_id) if hit_entity_id else "")
		else:
			_is_dragging = false

			# Detect tap: short duration + minimal movement
			var duration = (Time.get_ticks_msec() / 1000.0) - _drag_start_time
			var distance = screen_pos.distance_to(_drag_start_pos)
			var is_tap = duration < TAP_MAX_DURATION and distance < TAP_MAX_DISTANCE

			if is_tap:
				_queue_event(
					"input",
					{"type": "tap", "x": game_pos.x, "y": game_pos.y, "entityId": _drag_entity_id}
				)
				_notify_js_input_event("tap", game_pos.x, game_pos.y, _drag_entity_id)

				if _devtools_overlay:
					_devtools_overlay.add_tap_marker(
						world_pos, str(_drag_entity_id) if _drag_entity_id else ""
					)
					_devtools_overlay.end_drag(world_pos)
			else:
				_queue_event(
					"input",
					{
						"type": "drag_end",
						"x": game_pos.x,
						"y": game_pos.y,
						"entityId": _drag_entity_id
					}
				)
				_notify_js_input_event("drag_end", game_pos.x, game_pos.y, _drag_entity_id)

				if _devtools_overlay:
					_devtools_overlay.end_drag(world_pos)

			_drag_entity_id = null

	elif event is InputEventMouseMotion:
		var screen_pos = event.position
		var world_pos = get_viewport().get_canvas_transform().affine_inverse() * screen_pos
		var game_pos = godot_to_game_pos(world_pos)

		# Always send mouse move for continuous tracking (e.g., rotate_toward behavior)
		_queue_event("input", {"type": "mouse_move", "x": game_pos.x, "y": game_pos.y})
		_notify_js_input_event("mouse_move", game_pos.x, game_pos.y, null)

		if _is_dragging:
			_queue_event(
				"input",
				{"type": "drag_move", "x": game_pos.x, "y": game_pos.y, "entityId": _drag_entity_id}
			)
			_notify_js_input_event("drag_move", game_pos.x, game_pos.y, _drag_entity_id)

			if _devtools_overlay:
				_devtools_overlay.update_drag(world_pos)


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
	var create_ui_button_cb = JavaScriptBridge.create_callback(_js_create_ui_button_delegated)
	_js_callbacks.append(create_ui_button_cb)
	_js_bridge_obj["createUIButton"] = create_ui_button_cb

	var destroy_ui_button_cb = JavaScriptBridge.create_callback(_js_destroy_ui_button_delegated)
	_js_callbacks.append(destroy_ui_button_cb)
	_js_bridge_obj["destroyUIButton"] = destroy_ui_button_cb

	var on_ui_button_event_cb = JavaScriptBridge.create_callback(_js_on_ui_button_event_delegated)
	_js_callbacks.append(on_ui_button_event_cb)
	_js_bridge_obj["onUIButtonEvent"] = on_ui_button_event_cb

	var show_3d_model_cb = JavaScriptBridge.create_callback(_js_show_3d_model)
	_js_callbacks.append(show_3d_model_cb)
	_js_bridge_obj["show_3d_model"] = show_3d_model_cb

	var show_3d_model_from_url_cb = JavaScriptBridge.create_callback(_js_show_3d_model_from_url)
	_js_callbacks.append(show_3d_model_from_url_cb)
	_js_bridge_obj["show_3d_model_from_url"] = show_3d_model_from_url_cb

	var set_3d_viewport_position_cb = JavaScriptBridge.create_callback(_js_set_3d_viewport_position)
	_js_callbacks.append(set_3d_viewport_position_cb)
	_js_bridge_obj["set_3d_viewport_position"] = set_3d_viewport_position_cb

	var set_3d_viewport_size_cb = JavaScriptBridge.create_callback(_js_set_3d_viewport_size)
	_js_callbacks.append(set_3d_viewport_size_cb)
	_js_bridge_obj["set_3d_viewport_size"] = set_3d_viewport_size_cb

	var rotate_3d_model_cb = JavaScriptBridge.create_callback(_js_rotate_3d_model)
	_js_callbacks.append(rotate_3d_model_cb)
	_js_bridge_obj["rotate_3d_model"] = rotate_3d_model_cb

	var set_3d_camera_distance_cb = JavaScriptBridge.create_callback(_js_set_3d_camera_distance)
	_js_callbacks.append(set_3d_camera_distance_cb)
	_js_bridge_obj["set_3d_camera_distance"] = set_3d_camera_distance_cb

	var clear_3d_models_cb = JavaScriptBridge.create_callback(_js_clear_3d_models)
	_js_callbacks.append(clear_3d_models_cb)
	_js_bridge_obj["clear_3d_models"] = clear_3d_models_cb

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
		var json_str = JSON.stringify(properties)
		_js_property_sync_callback.call("call", null, json_str)
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
	if input_type == "tap":
		var hit_entity_id: Variant = null
		var godot_point = game_to_godot_pos(Vector2(x, y))
		var space = get_viewport().find_world_2d().direct_space_state
		if space:
			var query = PhysicsPointQueryParameters2D.new()
			query.position = godot_point
			query.collision_mask = 0xFFFFFFFF
			query.collide_with_bodies = true
			query.collide_with_areas = true
			var results = space.intersect_point(query, 1)
			if results.size() > 0:
				var collider = results[0].collider
				if collider and collider.name in entities:
					hit_entity_id = collider.name
		_queue_event("input", {"type": input_type, "x": x, "y": y, "entityId": hit_entity_id})
		_notify_js_input_event(input_type, x, y, hit_entity_id)


func _js_send_input(args: Array) -> void:
	if args.size() < 4:
		return
	var input_type = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	var provided_entity_id = str(args[3]) if args[3] != null else ""

	if input_type == "tap":
		var hit_entity_id: Variant = null

		var godot_point = game_to_godot_pos(Vector2(x, y))
		var space = get_viewport().find_world_2d().direct_space_state
		if space:
			var query = PhysicsPointQueryParameters2D.new()
			query.position = godot_point
			query.collision_mask = 0xFFFFFFFF
			query.collide_with_bodies = true
			query.collide_with_areas = true

			var results = space.intersect_point(query, 1)
			if results.size() > 0:
				var collider = results[0].collider
				if collider and collider.name in entities:
					hit_entity_id = collider.name

		_notify_js_input_event(input_type, x, y, hit_entity_id)


func _js_on_input_event(args: Array) -> void:
	if args.size() >= 1:
		_js_input_event_callback = args[0]


func _notify_js_input_event(input_type: String, x: float, y: float, entity_id: Variant) -> void:
	if _js_input_event_callback != null:
		var data = {"type": input_type, "x": x, "y": y, "entityId": entity_id}
		var json_str = JSON.stringify(data)
		_js_input_event_callback.call("call", null, json_str)


func _js_on_collision(args: Array) -> void:
	if args.size() >= 1:
		_js_collision_callback = args[0]


func _js_on_entity_destroyed(args: Array) -> void:
	if args.size() >= 1:
		_js_destroy_callback = args[0]


func _js_on_entity_spawned(args: Array) -> void:
	if args.size() >= 1:
		_js_entity_spawned_callback = args[0]


func _notify_js_collision(entity_a: String, entity_b: String, impulse: float) -> void:
	if _js_collision_callback != null:
		# Legacy format for backward compatibility
		_js_collision_callback.call("call", null, entity_a, entity_b, impulse)
	else:
		# Native path: queue event for polling
		_queue_event("collision", {"entityA": entity_a, "entityB": entity_b, "impulse": impulse})


func _notify_js_collision_detailed(collision_data: Dictionary) -> void:
	if _js_collision_callback != null:
		# New detailed format: { entityA, entityB, contacts: [{point, normal, normalImpulse, tangentImpulse}] }
		var json_str = JSON.stringify(collision_data)
		# Use legacy format which works - pass entityA, entityB, impulse separately
		var entity_a = collision_data.get("entityA", "")
		var entity_b = collision_data.get("entityB", "")
		var total_impulse = 0.0
		for contact in collision_data.get("contacts", []):
			total_impulse += abs(contact.get("normalImpulse", 0.0))
		_js_collision_callback.call("call", null, entity_a, entity_b, total_impulse)
	else:
		# Native path: queue event for polling
		_queue_event("collision_detailed", collision_data)


func _handle_collision_manifold(body_node: RigidBody2D, state: PhysicsDirectBodyState2D) -> void:
	var contact_count = state.get_contact_count()
	if contact_count == 0:
		return

	var entity_a = body_node.name
	if not entities.has(entity_a):
		return

	# Group contacts by colliding body
	var contacts_by_body: Dictionary = {}

	for i in range(contact_count):
		var collider = state.get_contact_collider_object(i)
		if collider == null or not (collider is Node2D):
			continue

		var entity_b = collider.name
		if not entities.has(entity_b):
			continue

		# Get contact data and convert to game coordinates
		var godot_contact_pos = state.get_contact_local_position(i)
		var game_contact_pos = godot_to_game_pos(godot_contact_pos)
		var godot_normal = state.get_contact_local_normal(i)
		var game_normal = Vector2(godot_normal.x, -godot_normal.y)  # Flip Y for normal
		var impulse_vec = state.get_contact_impulse(i)
		var normal_impulse = impulse_vec.dot(godot_normal)
		var tangent = Vector2(-godot_normal.y, godot_normal.x)
		var tangent_impulse = impulse_vec.dot(tangent)

		# Only report if impulse is significant (avoid spam for resting contacts)
		if abs(normal_impulse) < IMPULSE_THRESHOLD and abs(tangent_impulse) < IMPULSE_THRESHOLD:
			continue

		if not contacts_by_body.has(entity_b):
			contacts_by_body[entity_b] = []

		contacts_by_body[entity_b].append(
			{
				"point": {"x": game_contact_pos.x, "y": game_contact_pos.y},
				"normal": {"x": game_normal.x, "y": game_normal.y},
				"normalImpulse": normal_impulse / pixels_per_meter,
				"tangentImpulse": tangent_impulse / pixels_per_meter
			}
		)

	# Emit collision events for each colliding body
	for entity_b in contacts_by_body:
		var contacts = contacts_by_body[entity_b]

		# Calculate total impulse for this collision pair
		var total_impulse = 0.0
		for contact in contacts:
			total_impulse += abs(contact["normalImpulse"])

		var collision_data = {"entityA": entity_a, "entityB": entity_b, "contacts": contacts}

		_notify_js_collision_detailed(collision_data)
		collision_occurred.emit(entity_a, entity_b, total_impulse)

		# Process destroy_on_collision behaviors directly in Godot
		_process_collision_behaviors(entity_a, entity_b)
		_process_collision_behaviors(entity_b, entity_a)


func _notify_js_destroy(entity_id: String) -> void:
	if _js_destroy_callback != null:
		_js_destroy_callback.call("call", null, entity_id)
	else:
		# Native path: queue event for polling
		_queue_event("destroy", {"entityId": entity_id})


func _notify_js_entity_spawned(entity_id: String, snapshot: Dictionary) -> void:
	if _js_entity_spawned_callback != null:
		var json_str = JSON.stringify(snapshot)
		_js_entity_spawned_callback.call("call", null, json_str)
	else:
		# Native path: queue event for polling
		_queue_event("entity_spawned", snapshot)


func _setup_splat_map() -> void:
	if _splat_enabled:
		return

	_splat_viewport = SubViewport.new()
	_splat_viewport.name = "SplatMap"
	_splat_viewport.size = Vector2(512, 512)  # Low res is fine for splat map
	_splat_viewport.transparent_bg = false
	_splat_viewport.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE
	_splat_viewport.render_target_clear_mode = SubViewport.CLEAR_MODE_ALWAYS
	add_child(_splat_viewport)

	_splat_canvas = CanvasLayer.new()
	_splat_viewport.add_child(_splat_canvas)

	# Background black (no force)
	var bg = ColorRect.new()
	bg.color = Color.BLACK
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_splat_canvas.add_child(bg)

	_splat_enabled = true


func enable_splat_map() -> void:
	if not _splat_enabled:
		_setup_splat_map()


func disable_splat_map() -> void:
	if _splat_enabled and _splat_viewport:
		for proxy in _splat_proxies.values():
			proxy.queue_free()
		_splat_proxies.clear()
		_splat_viewport.queue_free()
		_splat_viewport = null
		_splat_canvas = null
		_splat_enabled = false


func get_splat_texture() -> Texture2D:
	return _splat_viewport.get_texture()


func _process(_delta: float) -> void:
	# Update splat proxies (only if enabled)
	if _splat_enabled and _splat_viewport and _splat_canvas:
		for entity_id in entities:
			var entity = entities[entity_id]

			# Skip stationary entities (optimization for 100+ entities)
			var vel = Vector2.ZERO
			if entity is RigidBody2D:
				vel = entity.linear_velocity
			elif entity is CharacterBody2D:
				vel = entity.velocity
			elif entity is Area2D and entity.has_meta("velocity"):
				vel = entity.get_meta("velocity")

			# Cull low-velocity entities (reduce updates)
			if vel.length_squared() < 0.01 and _splat_proxies.has(entity_id):
				continue  # Skip update for stationary entities

			if not _splat_proxies.has(entity_id):
				var proxy = SPLAT_PROXY_SCENE.instantiate()
				_splat_canvas.add_child(proxy)
				_splat_proxies[entity_id] = proxy

			var proxy = _splat_proxies[entity_id]

			# Sync position (map game world to viewport)
			if camera:
				var screen_pos = entity.get_global_transform_with_canvas().origin
				# Map screen pos to splat viewport
				var viewport_size = get_viewport().get_visible_rect().size
				var uv = screen_pos / viewport_size
				proxy.position = uv * Vector2(_splat_viewport.size)

			# Encode Velocity
			# R = X vel, G = Y vel, B = Presence
			# Normalize velocity (-20..20 -> 0..1)
			var r = clamp((vel.x / 40.0) + 0.5, 0.0, 1.0)
			var g = clamp((-vel.y / 40.0) + 0.5, 0.0, 1.0)  # Flip Y for texture space
			proxy.modulate = Color(r, g, 1.0, 1.0)

			# Scale proxy based on mass/size if possible, default to fixed size for now
			proxy.scale = Vector2(0.5, 0.5)

		# Clean up dead proxies
		var dead_ids = []
		for id in _splat_proxies:
			if not entities.has(id):
				dead_ids.append(id)
		for id in dead_ids:
			_splat_proxies[id].queue_free()
			_splat_proxies.erase(id)

	if ws:
		ws.poll()
		var state = ws.get_ready_state()
		if state == WebSocketPeer.STATE_OPEN:
			while ws.get_available_packet_count() > 0:
				var packet = ws.get_packet()
				_on_ws_message(packet.get_string_from_utf8())
		elif state == WebSocketPeer.STATE_CLOSED:
			ws = null


# Connect to WebSocket server
func connect_to_server(url: String = "") -> void:
	if url != "":
		ws_url = url
	ws = WebSocketPeer.new()
	var err = ws.connect_to_url(ws_url)
	if err != OK:
		ws = null


func _on_ws_message(message: String) -> void:
	var json = JSON.new()
	var err = json.parse(message)
	if err == OK:
		var data = json.data
		if data.has("type"):
			match data.type:
				"load_game":
					load_game_json(JSON.stringify(data.game))
				"spawn":
					spawn_entity(data.template, data.x, data.y)


# Main entry point: Load a game from JSON string
func load_game_json(json_string: String) -> bool:
	var json = JSON.new()
	var err = json.parse(json_string)
	if err != OK:
		push_error("[GameBridge] JSON parse error: " + json.get_error_message())
		return false

	game_data = json.data

	# Clear existing game
	clear_game()

	# Setup world
	_setup_world(game_data.get("world", {}))

	# Setup background
	_background_system.setup_background(game_data.get("background", {}))

	# Load templates
	templates = game_data.get("templates", {})
	print("[DEBUG] Loaded templates: ", templates.keys())
	for tmpl_id in templates:
		var tmpl = templates[tmpl_id]
		if tmpl.has("visual"):
			print(
				"[DEBUG] Template ", tmpl_id, " visual.type: ", tmpl.visual.get("type", "NO TYPE")
			)

	# Create entities
	var entities_data = game_data.get("entities", [])
	for entity_data in entities_data:
		_create_entity(entity_data)

	game_loaded.emit(game_data)
	return true


func load_custom_scene(scene_path: String) -> bool:
	if not ResourceLoader.exists(scene_path):
		push_error("[GameBridge] Scene not found: " + scene_path)
		return false

	var scene = load(scene_path)
	if not scene:
		push_error("[GameBridge] Failed to load scene: " + scene_path)
		return false

	if game_root:
		for child in game_root.get_children():
			child.queue_free()

		var instance = scene.instantiate()
		game_root.add_child(instance)
		return true
	else:
		push_error("[GameBridge] game_root not set")
		return false


func _setup_world(world_data: Dictionary) -> void:
	pixels_per_meter = world_data.get("pixelsPerMeter", 50.0)

	var gravity = world_data.get("gravity", {"x": 0, "y": -9.8})
	var gravity_vec = game_to_godot_vec(Vector2(gravity.x, gravity.y))

	PhysicsServer2D.area_set_param(
		get_viewport().find_world_2d().space,
		PhysicsServer2D.AREA_PARAM_GRAVITY,
		gravity_vec.length()
	)
	PhysicsServer2D.area_set_param(
		get_viewport().find_world_2d().space,
		PhysicsServer2D.AREA_PARAM_GRAVITY_VECTOR,
		gravity_vec.normalized()
	)

	if camera:
		camera.global_position = Vector2.ZERO


func _create_entity(entity_data: Dictionary) -> Node2D:
	if _entity_factory:
		return _entity_factory.create_entity(entity_data)

	# Fallback: legacy implementation when factory is not available
	var entity_id = entity_data.get("id", "entity_" + str(randi()))
	var template_id = entity_data.get("template", "")
	var transform_data = entity_data.get("transform", {})

	JavaScriptBridge.eval(
		"console.log('[Godot] Creating entity: " + entity_id + " template: " + template_id + "')"
	)

	# Merge template with entity data
	var merged = entity_data.duplicate(true)

	if template_id != "" and templates.has(template_id):
		var tmpl = templates[template_id]
		# Template provides defaults, entity_data overrides
		for key in tmpl:
			if not merged.has(key):
				merged[key] = tmpl[key]
		# Merge components specifically
		_merged_component(merged, tmpl, "physics")
		_merged_component(merged, tmpl, "collider")
		_merged_component(merged, tmpl, "visual")
		_merged_component(merged, tmpl, "character")
		_merged_component(merged, tmpl, "zone")

	var physics_data = merged.get("physics", null)
	var collider_data = merged.get("collider", null)
	var visual_data = merged.get("visual", null)
	var zone_data = merged.get("zone", null)
	var entity_type = merged.get("type", "")

	var node: Node2D = null

	# Create physics body if physics component exists
	if physics_data:
		node = _create_physics_body(entity_id, physics_data, collider_data, transform_data)
	# Create zone (legacy) if zone component exists
	elif entity_type == "zone" and zone_data:
		node = _create_zone_entity(entity_id, zone_data, transform_data)
	# Create sensor-only entity if collider with isSensor exists
	elif collider_data and collider_data.get("isSensor", false):
		node = _create_sensor_entity(entity_id, collider_data, transform_data)
	# Otherwise create plain Node2D
	else:
		node = Node2D.new()
		node.name = entity_id

	# Set transform (convert from game coords to Godot coords with Y-flip)
	var game_pos = Vector2(transform_data.get("x", 0), transform_data.get("y", 0))
	var godot_pos = game_to_godot_pos(game_pos)
	var angle = transform_data.get("angle", 0)
	node.position = godot_pos
	node.rotation = -angle

	# Add visual component
	if visual_data:
		print(
			"[DEBUG] Adding visual for entity: ",
			entity_id,
			" type: ",
			visual_data.get("type", "unknown"),
			" keys: ",
			visual_data.keys()
		)
		# Apply smart defaults: visual inherits from collider
		var resolved_visual = _resolve_visual_with_defaults(visual_data, collider_data)
		print("[DEBUG] Resolved visual type: ", resolved_visual.get("type", "NO TYPE"))
		_add_visual(node, resolved_visual)
	elif collider_data:
		# Auto-generate visual from collider if no visual specified
		var auto_visual = _generate_visual_from_collider(collider_data)
		_add_visual(node, auto_visual)
	else:
		print("[DEBUG] NO visual or collider for entity: ", entity_id)

	# Add collider shape if collider exists (and not already added by physics)
	if collider_data and not physics_data:
		var collision = CollisionShape2D.new()
		collision.shape = _create_collider_shape(collider_data)
		node.add_child(collision)

	# Add to scene
	if game_root:
		game_root.add_child(node)
	else:
		var main = get_tree().current_scene
		if main:
			main.add_child(node)

	# Apply initial velocity if specified
	if node is RigidBody2D and physics_data and physics_data.has("initialVelocity"):
		var initial_vel = physics_data.initialVelocity
		var game_vel = Vector2(initial_vel.get("x", 0), initial_vel.get("y", 0))
		node.linear_velocity = game_to_godot_vec(game_vel)

	# Set metadata for selectors
	if template_id != "":
		node.set_meta("template", template_id)
	if merged.has("tags"):
		node.set_meta("tags", merged.tags if merged.tags is Array else [])
	if merged.has("behaviors"):
		node.set_meta("behaviors", merged.behaviors if merged.behaviors is Array else [])

	entities[entity_id] = node

	# Track entity generation for pool safety
	var generation = next_generation
	next_generation += 1
	entity_generations[entity_id] = generation

	# Build snapshot for TypeScript
	var snapshot_pos = godot_to_game_pos(node.position)

	# Get physics IDs if available
	var body_id = body_id_map.get(entity_id, -1)
	var collider_id = -1
	if entity_shape_map.has(entity_id) and entity_shape_map[entity_id].size() > 0:
		collider_id = entity_shape_map[entity_id][0]

	var snapshot = {
		"entityId": entity_id,
		"template": template_id,
		"generation": generation,
		"tags": merged.get("tags", []),
		"transform":
		{
			"x": snapshot_pos.x,
			"y": snapshot_pos.y,
			"angle": -node.rotation,
			"scaleX": node.scale.x,
			"scaleY": node.scale.y
		}
	}

	# Add physics IDs if they exist
	if body_id >= 0:
		snapshot["bodyId"] = {"value": body_id}
	if collider_id >= 0:
		snapshot["colliderId"] = {"value": collider_id}

	# Emit signal and notify JS
	entity_spawned.emit(entity_id, node)
	_notify_js_entity_spawned(entity_id, snapshot)

	return node


func _create_physics_body(
	entity_id: String,
	physics_data: Dictionary,
	collider_data: Dictionary,
	transform_data: Dictionary
) -> Node2D:
	var body_type = physics_data.get("bodyType", "dynamic")
	var node: Node2D

	# Extract physics properties (needed outside match block)
	var density = physics_data.get("density", 1.0)
	var mass = physics_data.get("mass", 0.0)

	match body_type:
		"static":
			node = StaticBody2D.new()
		"kinematic":
			var char_body = CharacterBody2D.new()
			node = char_body
		_:  # dynamic
			var rigid = RigidBody2D.new()
			rigid.gravity_scale = physics_data.get("gravityScale", 1.0)

			# Enable contact monitoring for detailed collision data
			rigid.contact_monitor = true
			rigid.max_contacts_reported = 4

			# Attach PhysicsBody script for _integrate_forces callback
			rigid.set_script(load("res://scripts/PhysicsBody.gd"))

			# Linear/angular damping
			rigid.linear_damp = physics_data.get("linearDamping", 0.0)
			rigid.angular_damp = physics_data.get("angularDamping", 0.0)

			# Fixed rotation
			if physics_data.get("fixedRotation", false):
				rigid.lock_rotation = true

			# CCD for fast-moving objects
			if physics_data.get("ccd", false) or physics_data.get("bullet", false):
				rigid.continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY

			# Connect collision signals (kept for backward compatibility)
			rigid.body_entered.connect(_on_body_entered.bind(entity_id))

			# Apply initial velocity if specified
			var initial_vel = physics_data.get("initialVelocity", null)
			if initial_vel != null:
				var game_vel = Vector2(initial_vel.get("x", 0), initial_vel.get("y", 0))
				rigid.linear_velocity = game_to_godot_vec(game_vel)

			# Store user data and group if provided
			if physics_data.has("userData"):
				user_data[next_body_id] = physics_data.userData
			if physics_data.has("group"):
				body_groups[next_body_id] = physics_data.group

			node = rigid

	node.name = entity_id

	# Add collision shape from collider data
	if collider_data:
		var collision = CollisionShape2D.new()
		collision.shape = _create_collider_shape(collider_data)

		# Apply collider material properties (if dynamic body)
		if node is RigidBody2D:
			var friction = collider_data.get("friction", 0.5)
			var restitution = collider_data.get("restitution", 0.0)
			var material = PhysicsMaterial.new()
			material.friction = friction
			material.bounce = restitution
			node.physics_material_override = material

			# Calculate mass if density provided and no direct mass
			if mass <= 0 and density > 0:
				var shape_type = collider_data.get("shape", "box")
				var shape_area = 1.0
				if shape_type == "box":
					var w = collider_data.get("width", 1.0)
					var h = collider_data.get("height", 1.0)
					shape_area = w * h
				elif shape_type == "circle":
					var r = collider_data.get("radius", 0.5)
					shape_area = PI * r * r
				elif shape_type == "polygon":
					var vertices = collider_data.get("vertices", [])
					shape_area = _calculate_polygon_area(vertices)
				node.mass = density * shape_area
			elif mass > 0:
				node.mass = mass

		node.add_child(collision)

	# Apply collision filtering
	node.collision_layer = physics_data.get("categoryBits", 1)
	node.collision_mask = physics_data.get("maskBits", 0xFFFFFFFF)

	# Track body ID for Physics2D compatibility
	body_id_map[entity_id] = next_body_id
	body_id_reverse[next_body_id] = entity_id
	next_body_id += 1

	return node


func _create_zone_entity(
	entity_id: String, zone_data: Dictionary, transform_data: Dictionary
) -> Node2D:
	"""Create a zone entity (Area2D) for collision detection without physics response.
	Zones can have sprites and detect collisions but don't participate in physics simulation."""
	var movement_type = zone_data.get("movement", "static")
	var zone_shape = zone_data.get("shape", {"type": "box", "width": 1.0, "height": 1.0})

	var area = Area2D.new()
	area.name = entity_id

	# Connect collision signals for zone detection
	area.body_shape_entered.connect(_on_sensor_body_shape_entered.bind(entity_id))
	area.body_shape_exited.connect(_on_sensor_body_shape_exited.bind(entity_id))

	# Add collision shape
	var collision = CollisionShape2D.new()
	var shape_type = zone_shape.get("type", "box")

	match shape_type:
		"circle":
			var circle = CircleShape2D.new()
			circle.radius = zone_shape.get("radius", 0.5) * pixels_per_meter
			collision.shape = circle
		"polygon":
			var polygon = ConvexPolygonShape2D.new()
			var vertices = zone_shape.get("vertices", [])
			var points: PackedVector2Array = []
			for v in vertices:
				points.append(Vector2(v.x * pixels_per_meter, -v.y * pixels_per_meter))
			polygon.points = points
			collision.shape = polygon
		_:  # box
			var rect = RectangleShape2D.new()
			var w = zone_shape.get("width", 1.0) * pixels_per_meter
			var h = zone_shape.get("height", 1.0) * pixels_per_meter
			rect.size = Vector2(w, h)
			collision.shape = rect

	area.add_child(collision)

	# Apply collision filtering
	area.collision_layer = zone_data.get("categoryBits", 1)
	area.collision_mask = zone_data.get("maskBits", 0xFFFFFFFF)

	# Store zone metadata
	area.set_meta("entity_type", "zone")
	area.set_meta("zone_movement", movement_type)

	# Track body ID for compatibility
	body_id_map[entity_id] = next_body_id
	body_id_reverse[next_body_id] = entity_id
	next_body_id += 1

	return area


func _calculate_polygon_area(vertices: Array) -> float:
	if vertices.size() < 3:
		return 1.0
	var area = 0.0
	var n = vertices.size()
	for i in range(n):
		var j = (i + 1) % n
		area += vertices[i].x * vertices[j].y
		area -= vertices[j].x * vertices[i].y
	return abs(area) / 2.0


func _create_polygon_texture(
	width: int, height: int, color: Color, padding: int = 0
) -> ImageTexture:
	# Create texture with optional transparent padding for shader edge detection
	var tex_w = width + padding * 2
	var tex_h = height + padding * 2
	var image = Image.create(tex_w, tex_h, false, Image.FORMAT_RGBA8)
	image.fill(Color(0, 0, 0, 0))  # Start transparent
	# Fill the center region with the actual color
	for y in range(padding, tex_h - padding):
		for x in range(padding, tex_w - padding):
			image.set_pixel(x, y, color)
	return ImageTexture.create_from_image(image)


func _create_shape(physics_data: Dictionary) -> Shape2D:
	var shape_type = physics_data.get("shape", "box")
	var shape: Shape2D

	match shape_type:
		"circle":
			var circle = CircleShape2D.new()
			circle.radius = physics_data.get("radius", 0.5) * pixels_per_meter
			shape = circle
		"polygon":
			var polygon = ConvexPolygonShape2D.new()
			var vertices = physics_data.get("vertices", [])
			var points: PackedVector2Array = []
			for v in vertices:
				# Vertices are relative to entity center, just scale and flip Y
				points.append(Vector2(v.x * pixels_per_meter, -v.y * pixels_per_meter))
			polygon.points = points
			shape = polygon
		_:  # box
			var rect = RectangleShape2D.new()
			var w = physics_data.get("width", 1.0) * pixels_per_meter
			var h = physics_data.get("height", 1.0) * pixels_per_meter
			rect.size = Vector2(w, h)
			shape = rect

	return shape


func _add_sprite(
	node: Node2D, sprite_data: Dictionary, physics_data: Dictionary, zone_data = null
) -> void:
	print(
		"[DEBUG _add_sprite] Adding sprite type: ",
		sprite_data.get("type", "unknown"),
		" to node: ",
		node.name
	)
	var sprite_type = sprite_data.get("type", "rect")
	var color = Color.from_string(sprite_data.get("color", "#FF0000"), Color.RED)
	var opacity = sprite_data.get("opacity", 1.0)
	var z_index_val = sprite_data.get("zIndex", 0)

	# Helper function to get dimension from sprite_data, physics_data, zone_data, or default
	var _get_dimension = func(key: String, default_val: float):
		if sprite_data.has(key):
			return sprite_data.get(key)
		elif physics_data and physics_data.has(key):
			return physics_data.get(key)
		elif zone_data and zone_data.has("shape") and zone_data.shape.has(key):
			return zone_data.shape.get(key)
		else:
			return default_val

	match sprite_type:
		"rect":
			var polygon = Polygon2D.new()
			var w = _get_dimension.call("width", 1.0) * pixels_per_meter
			var h = _get_dimension.call("height", 1.0) * pixels_per_meter
			var hw = w / 2.0
			var hh = h / 2.0
			polygon.polygon = PackedVector2Array(
				[Vector2(-hw, -hh), Vector2(hw, -hh), Vector2(hw, hh), Vector2(-hw, hh)]
			)
			color.a = opacity
			polygon.z_index = z_index_val
			# Add texture for shader compatibility (WebGL needs valid TEXTURE_PIXEL_SIZE)
			# Bake the color INTO the texture with padding for edge-detection shaders
			var tex_size = max(int(w), int(h), 64)
			var padding = 16  # Transparent padding for outline/glow shaders
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE  # Don't multiply - color is in texture
			# UV maps to the padded texture (shape is offset by padding)
			polygon.uv = PackedVector2Array(
				[
					Vector2(padding, padding),
					Vector2(tex_size + padding, padding),
					Vector2(tex_size + padding, tex_size + padding),
					Vector2(padding, tex_size + padding)
				]
			)
			node.add_child(polygon)
		"circle":
			var polygon = Polygon2D.new()
			var radius = _get_dimension.call("radius", 0.5) * pixels_per_meter
			var points: PackedVector2Array = []
			var uvs: PackedVector2Array = []
			var tex_size = max(int(radius * 2), 64)
			var padding = 16  # Transparent padding for edge-detection shaders
			for i in range(32):
				var angle = i * TAU / 32
				points.append(Vector2(cos(angle), sin(angle)) * radius)
				# Map circle points to UV space, offset by padding
				uvs.append(
					Vector2(
						(cos(angle) + 1.0) * 0.5 * tex_size + padding,
						(sin(angle) + 1.0) * 0.5 * tex_size + padding
					)
				)
			polygon.polygon = points
			color.a = opacity
			polygon.z_index = z_index_val
			# Add texture for shader compatibility
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE  # Don't multiply - color is in texture
			polygon.uv = uvs
			node.add_child(polygon)
		"polygon":
			var polygon = Polygon2D.new()
			var vertices = sprite_data.get("vertices", [])
			var points: PackedVector2Array = []
			var min_pt = Vector2(INF, INF)
			var max_pt = Vector2(-INF, -INF)
			for v in vertices:
				var pt = Vector2(v.x, v.y) * pixels_per_meter
				points.append(pt)
				min_pt.x = min(min_pt.x, pt.x)
				min_pt.y = min(min_pt.y, pt.y)
				max_pt.x = max(max_pt.x, pt.x)
				max_pt.y = max(max_pt.y, pt.y)
			polygon.polygon = points
			color.a = opacity
			polygon.z_index = z_index_val
			# Add texture for shader compatibility
			var poly_size = max_pt - min_pt
			var tex_size = max(int(poly_size.x), int(poly_size.y), 64)
			var padding = 16  # Transparent padding for edge-detection shaders
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE  # Don't multiply - color is in texture
			var uvs: PackedVector2Array = []
			for pt in points:
				uvs.append(
					Vector2(
						(
							(pt.x - min_pt.x) / poly_size.x * tex_size + padding
							if poly_size.x > 0
							else padding
						),
						(
							(pt.y - min_pt.y) / poly_size.y * tex_size + padding
							if poly_size.y > 0
							else padding
						)
					)
				)
			polygon.uv = uvs
			node.add_child(polygon)
		"image":
			_add_image_sprite(node, sprite_data, opacity, z_index_val)
		"text":
			_add_text_sprite(node, sprite_data, opacity, z_index_val)


func _add_image_sprite(
	node: Node2D, sprite_data: Dictionary, opacity: float, z_index_val: int
) -> void:
	var sprite = Sprite2D.new()
	var url = sprite_data.get("imageUrl", sprite_data.get("url", ""))
	var img_width = sprite_data.get("imageWidth", sprite_data.get("width", 1.0))
	var img_height = sprite_data.get("imageHeight", sprite_data.get("height", 1.0))
	var asset_scale = sprite_data.get("scale", 1.0)
	var offset_x = sprite_data.get("offsetX", 0.0)
	var offset_y = sprite_data.get("offsetY", 0.0)

	if url == "":
		sprite.modulate.a = opacity
		sprite.z_index = z_index_val
		node.add_child(sprite)
		return

	if url.begins_with("res://"):
		var texture = load(url)
		if texture:
			sprite.texture = texture
			var local_sprite_data = {
				"width": img_width,
				"height": img_height,
				"scale": asset_scale,
				"offsetX": offset_x,
				"offsetY": offset_y
			}
			_apply_sprite_scale(sprite, local_sprite_data, texture)
	else:
		var normalized_data = {
			"width": img_width,
			"height": img_height,
			"scale": asset_scale,
			"offsetX": offset_x,
			"offsetY": offset_y
		}
		_queue_texture_download(sprite, url, normalized_data)

	sprite.modulate.a = opacity
	sprite.z_index = z_index_val
	node.add_child(sprite)


func _add_text_sprite(
	node: Node2D, sprite_data: Dictionary, opacity: float, z_index_val: int
) -> void:
	var label = Label.new()
	label.text = sprite_data.get("text", "")

	var font_size = int(sprite_data.get("fontSize", 16) * pixels_per_meter / 50.0)
	label.add_theme_font_size_override("font_size", font_size)

	var font_url = sprite_data.get("fontUrl", "")
	if font_url != "":
		_queue_font_download(label, font_url)

	var text_color = Color.from_string(sprite_data.get("color", "#FFFFFF"), Color.WHITE)
	label.modulate = text_color
	label.modulate.a = opacity
	label.z_index = z_index_val
	node.add_child(label)


func _add_visual(node: Node2D, visual_data: Dictionary) -> void:
	# Handles visual component for entities (including image-only entities without physics)
	var visual_type = visual_data.get("type", "rect")
	var color = Color.from_string(visual_data.get("color", "#FF0000"), Color.RED)
	var opacity = visual_data.get("opacity", 1.0)
	var z_index_val = visual_data.get("zIndex", 0)

	match visual_type:
		"rect":
			var polygon = Polygon2D.new()
			var w = visual_data.get("width", 1.0) * pixels_per_meter
			var h = visual_data.get("height", 1.0) * pixels_per_meter
			var hw = w / 2.0
			var hh = h / 2.0
			polygon.polygon = PackedVector2Array(
				[Vector2(-hw, -hh), Vector2(hw, -hh), Vector2(hw, hh), Vector2(-hw, hh)]
			)
			color.a = opacity
			polygon.z_index = z_index_val
			var tex_size = max(int(w), int(h), 64)
			var padding = 16
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE
			polygon.uv = PackedVector2Array(
				[
					Vector2(padding, padding),
					Vector2(tex_size + padding, padding),
					Vector2(tex_size + padding, tex_size + padding),
					Vector2(padding, tex_size + padding)
				]
			)
			node.add_child(polygon)
		"circle":
			var polygon = Polygon2D.new()
			var radius = visual_data.get("radius", 0.5) * pixels_per_meter
			var points: PackedVector2Array = []
			var uvs: PackedVector2Array = []
			var tex_size = max(int(radius * 2), 64)
			var padding = 16
			for i in range(32):
				var angle = i * TAU / 32
				points.append(Vector2(cos(angle), sin(angle)) * radius)
				uvs.append(
					Vector2(
						(cos(angle) + 1.0) * 0.5 * tex_size + padding,
						(sin(angle) + 1.0) * 0.5 * tex_size + padding
					)
				)
			polygon.polygon = points
			color.a = opacity
			polygon.z_index = z_index_val
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE
			polygon.uv = uvs
			node.add_child(polygon)
		"polygon":
			var polygon = Polygon2D.new()
			var vertices = visual_data.get("vertices", [])
			var points: PackedVector2Array = []
			var min_pt = Vector2(INF, INF)
			var max_pt = Vector2(-INF, -INF)
			for v in vertices:
				var pt = Vector2(v.x, v.y) * pixels_per_meter
				points.append(pt)
				min_pt.x = min(min_pt.x, pt.x)
				min_pt.y = min(min_pt.y, pt.y)
				max_pt.x = max(max_pt.x, pt.x)
				max_pt.y = max(max_pt.y, pt.y)
			polygon.polygon = points
			color.a = opacity
			polygon.z_index = z_index_val
			var poly_size = max_pt - min_pt
			var tex_size = max(int(poly_size.x), int(poly_size.y), 64)
			var padding = 16
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE
			var uvs: PackedVector2Array = []
			for pt in points:
				uvs.append(
					Vector2(
						(
							(pt.x - min_pt.x) / poly_size.x * tex_size + padding
							if poly_size.x > 0
							else padding
						),
						(
							(pt.y - min_pt.y) / poly_size.y * tex_size + padding
							if poly_size.y > 0
							else padding
						)
					)
				)
			polygon.uv = uvs
			node.add_child(polygon)
		"image":
			_add_image_sprite(node, visual_data, opacity, z_index_val)
		"text":
			_add_text_sprite(node, visual_data, opacity, z_index_val)


func _queue_texture_download(sprite: Sprite2D, url: String, sprite_data: Dictionary) -> void:
	_download_image_texture(
		url,
		func(texture: Texture2D):
			if is_instance_valid(sprite):
				sprite.texture = texture
				_apply_sprite_scale(sprite, sprite_data, texture)
	)


var _font_cache = {}


func _queue_font_download(label: Label, url: String) -> void:
	if _font_cache.has(url):
		label.add_theme_font_override("font", _font_cache[url])
		return

	var http = HTTPRequest.new()
	add_child(http)

	http.request_completed.connect(
		func(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
			http.queue_free()
			if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
				push_error(
					(
						"[GameBridge] Failed to download font: "
						+ url
						+ " (code: "
						+ str(response_code)
						+ ")"
					)
				)
				return

			var font = FontFile.new()
			font.data = body
			var err = OK
			if err != OK:
				push_error("[GameBridge] Failed to parse font: " + url)
				return

			_font_cache[url] = font

			if is_instance_valid(label):
				label.add_theme_font_override("font", font)
	)

	var err = http.request(url)
	if err != OK:
		push_error("[GameBridge] Failed to start font download: " + url)
		http.queue_free()


func _apply_sprite_scale(sprite: Sprite2D, sprite_data: Dictionary, texture: Texture2D) -> void:
	if texture == null:
		return

	# Get asset placement values (scale multiplier, offsets)
	var asset_scale = sprite_data.get("scale", 1.0)
	var offset_x = sprite_data.get("offsetX", 0.0) * pixels_per_meter
	var offset_y = sprite_data.get("offsetY", 0.0) * pixels_per_meter

	var target_w = sprite_data.get("width", 1.0) * pixels_per_meter * asset_scale
	var target_h = sprite_data.get("height", 1.0) * pixels_per_meter * asset_scale

	# Check if this is a generated asset (square texture with content that preserves aspect ratio)
	# Generated assets have content that fills 90% of the larger dimension, centered in canvas
	var tex_w = texture.get_width()
	var tex_h = texture.get_height()
	var is_square_texture = abs(tex_w - tex_h) < 2  # Allow 1px tolerance

	if is_square_texture and tex_w > 0:
		# For generated square textures (e.g., 512x512), use uniform scaling
		# The actual content fills 90% of canvas on the larger dimension
		var canvas_size = float(tex_w)
		var fill_ratio = 0.9
		var physics_w = sprite_data.get("width", 1.0)
		var physics_h = sprite_data.get("height", 1.0)
		var aspect_ratio = physics_w / physics_h if physics_h > 0 else 1.0

		# Calculate silhouette dimensions within the canvas (matches generation logic)
		var silhouette_w: float
		var silhouette_h: float
		if aspect_ratio >= 1.0:
			silhouette_w = canvas_size * fill_ratio
			silhouette_h = silhouette_w / aspect_ratio
		else:
			silhouette_h = canvas_size * fill_ratio
			silhouette_w = silhouette_h * aspect_ratio

		# Uniform scale: map silhouette pixels to target world pixels
		var uniform_scale = target_w / silhouette_w if silhouette_w > 0 else 1.0
		sprite.scale = Vector2(uniform_scale, uniform_scale)
	else:
		# Non-square textures: use uniform scaling to preserve aspect ratio (contain behavior)
		var scale_x = target_w / tex_w if tex_w > 0 else 1.0
		var scale_y = target_h / tex_h if tex_h > 0 else 1.0
		var uniform_scale = min(scale_x, scale_y)
		sprite.scale = Vector2(uniform_scale, uniform_scale)

	# Apply offset to position the sprite relative to physics body center
	sprite.position = Vector2(offset_x, offset_y)


func _hide_shape_children(node: Node2D) -> void:
	"""Hide Polygon2D shape children when a texture sprite is applied.
	This prevents double-rendering of shapes and textures."""
	for child in node.get_children():
		if child is Polygon2D:
			child.visible = false


func _apply_debug_visibility(node: Node2D) -> void:
	"""Apply current debug mode visibility to a node's children.
	When debug mode is ON: show Polygon2D shapes, hide Sprite2D textures.
	When debug mode is OFF: hide Polygon2D shapes, show Sprite2D textures."""
	for child in node.get_children():
		if child is Polygon2D:
			child.visible = _debug_show_shapes
		elif child is Sprite2D:
			child.visible = not _debug_show_shapes


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
	print("[GameBridge] _js_set_debug_settings called with args: ", args)
	if args.size() < 1:
		push_error("[GameBridge] setDebugSettings requires 1 arg: settings JSON string")
		return

	var json_str = str(args[0])
	print("[GameBridge] setDebugSettings JSON string: ", json_str)
	var json = JSON.new()
	var parse_result = json.parse(json_str)
	if parse_result != OK:
		push_error("[GameBridge] setDebugSettings: Invalid JSON: " + json_str)
		return

	var settings = json.data
	print("[GameBridge] setDebugSettings parsed: ", settings)
	if not settings is Dictionary:
		push_error("[GameBridge] setDebugSettings: Expected object, got: " + str(typeof(settings)))
		return

	if _devtools_overlay:
		print("[GameBridge] Forwarding to _devtools_overlay")
		_devtools_overlay.set_settings(settings)
	else:
		push_error("[GameBridge] _devtools_overlay is null!")


func clear_texture_cache(url: String = "") -> void:
	if url != "":
		if _texture_cache.has(url):
			_texture_cache.erase(url)
	else:
		_texture_cache.clear()


func _on_body_entered(body: Node, entity_id: String) -> void:
	if body.name in entities:
		collision_occurred.emit(entity_id, body.name, 0.0)
		_notify_js_collision(entity_id, body.name, 0.0)

		# Process destroy_on_collision behaviors directly in Godot
		_process_collision_behaviors(entity_id, body.name)
		_process_collision_behaviors(body.name, entity_id)


func spawn_entity(template_id: String, x: float, y: float) -> Node2D:
	return spawn_entity_with_id(template_id, x, y, template_id + "_" + str(randi()), "")


func spawn_entity_with_id(
	template_id: String, x: float, y: float, entity_id: String, initial_velocity_json: String = ""
) -> Node2D:
	if not templates.has(template_id):
		push_error("[GameBridge] Template not found: " + template_id)
		return null

	var entity_data = {
		"id": entity_id, "template": template_id, "transform": {"x": x, "y": y, "angle": 0}
	}

	# Parse and store initial velocity if provided
	if initial_velocity_json != "":
		var json = JSON.new()
		var err = json.parse(initial_velocity_json)
		if err == OK:
			var vel_data = json.data as Dictionary
			if vel_data.has("x") and vel_data.has("y"):
				var game_vel = Vector2(vel_data["x"], vel_data["y"])
				entity_data["_initial_velocity"] = game_to_godot_vec(game_vel)

	return _create_entity(entity_data)


func _process_collision_behaviors(entity_id: String, other_entity_id: String) -> void:
	if not entities.has(entity_id) or not entities.has(other_entity_id):
		return

	var node = entities[entity_id]
	var other_node = entities[other_entity_id]

	if not node.has_meta("behaviors"):
		return

	var behaviors = node.get_meta("behaviors") as Array
	var other_tags = other_node.get_meta("tags") if other_node.has_meta("tags") else []

	for behavior in behaviors:
		if behavior is Dictionary and behavior.get("type") == "destroy_on_collision":
			var with_tags = behavior.get("withTags", []) as Array
			var should_destroy = false

			for tag in with_tags:
				if tag in other_tags:
					should_destroy = true
					break

			if should_destroy:
				call_deferred("destroy_entity", entity_id)

				if behavior.get("destroyOther", false):
					call_deferred("destroy_entity", other_entity_id)
				return


func destroy_entity(entity_id: String) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		entities.erase(entity_id)
		node.queue_free()
		entity_destroyed.emit(entity_id)
		_notify_js_destroy(entity_id)


# Get entity node by ID
func get_entity(entity_id: String) -> Node2D:
	return entities.get(entity_id)


func set_entity_image(entity_id: String, url: String, width: float, height: float) -> void:
	if not entities.has(entity_id):
		push_error("[GameBridge] set_entity_image: entity not found: " + entity_id)
		return

	var node = entities[entity_id]
	var sprite: Sprite2D = null

	for child in node.get_children():
		if child is Sprite2D:
			sprite = child
			break

	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	var sprite_data = {"width": width, "height": height}

	if _texture_cache.has(url):
		var texture = _texture_cache[url]
		sprite.texture = texture
		_apply_sprite_scale(sprite, sprite_data, texture)
		_hide_shape_children(node)
		return

	var http = HTTPRequest.new()
	add_child(http)

	http.request_completed.connect(
		func(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
			http.queue_free()
			if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
				push_error(
					(
						"[GameBridge] Failed to download texture: "
						+ url
						+ " (code: "
						+ str(response_code)
						+ ")"
					)
				)
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

			if is_instance_valid(sprite):
				sprite.texture = texture
				_apply_sprite_scale(sprite, sprite_data, texture)
				var parent_node = sprite.get_parent()
				if parent_node:
					_hide_shape_children(parent_node)
	)

	var err = http.request(url)
	if err != OK:
		push_error("[GameBridge] Failed to start texture download: " + url)
		http.queue_free()


func _js_set_entity_image(args: Array) -> void:
	if args.size() < 4:
		push_error("[GameBridge] setEntityImage requires 4 args: entity_id, url, width, height")
		return
	set_entity_image(str(args[0]), str(args[1]), float(args[2]), float(args[3]))


func set_entity_atlas_region(
	entity_id: String, atlas_url: String, region_dict: Dictionary, sprite_data: Dictionary = {}
) -> void:
	if not entities.has(entity_id):
		push_error("[GameBridge] set_entity_atlas_region: entity not found: " + entity_id)
		return

	var node = entities[entity_id]
	var sprite: Sprite2D = null

	for child in node.get_children():
		if child is Sprite2D:
			sprite = child
			break

	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	if _texture_cache.has(atlas_url):
		_apply_atlas_region(sprite, _texture_cache[atlas_url], region_dict, sprite_data)
		_hide_shape_children(node)
	else:
		_download_atlas_texture(sprite, atlas_url, region_dict, sprite_data)


func _apply_atlas_region(
	sprite: Sprite2D, texture: Texture2D, region_dict: Dictionary, sprite_data: Dictionary = {}
) -> void:
	var atlas_texture = AtlasTexture.new()
	atlas_texture.atlas = texture
	atlas_texture.region = Rect2(
		region_dict.get("x", 0),
		region_dict.get("y", 0),
		region_dict.get("w", 0),
		region_dict.get("h", 0)
	)
	sprite.texture = atlas_texture
	_apply_sprite_scale(sprite, sprite_data, atlas_texture)


func _download_atlas_texture(
	sprite: Sprite2D, url: String, region_dict: Dictionary, sprite_data: Dictionary = {}
) -> void:
	_download_image_texture(
		url,
		func(texture: Texture2D):
			if is_instance_valid(sprite):
				_apply_atlas_region(sprite, texture, region_dict, sprite_data)
				var node = sprite.get_parent()
				if node:
					_hide_shape_children(node)
	)


func _js_set_entity_atlas_region(args: Array) -> void:
	if args.size() < 8:
		push_error(
			"[GameBridge] setEntityAtlasRegion requires 8 args: entity_id, atlas_url, x, y, w, h, width, height"
		)
		return
	var entity_id = str(args[0])
	var atlas_url = str(args[1])
	var region_dict = {
		"x": float(args[2]), "y": float(args[3]), "w": float(args[4]), "h": float(args[5])
	}
	var sprite_data = {"width": float(args[6]), "height": float(args[7])}
	set_entity_atlas_region(entity_id, atlas_url, region_dict, sprite_data)


func set_entity_image_base64(
	entity_id: String, base64_data: String, width: float, height: float
) -> void:
	if not entities.has(entity_id):
		push_error("[GameBridge] set_entity_image_base64: entity not found: " + entity_id)
		return

	var node = entities[entity_id]
	var sprite: Sprite2D = null

	for child in node.get_children():
		if child is Sprite2D:
			sprite = child
			break

	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	var raw_data = Marshalls.base64_to_raw(base64_data)
	if raw_data.is_empty():
		push_error("[GameBridge] set_entity_image_base64: failed to decode base64")
		return

	var image = Image.new()
	var err = image.load_png_from_buffer(raw_data)
	if err != OK:
		err = image.load_jpg_from_buffer(raw_data)
	if err != OK:
		err = image.load_webp_from_buffer(raw_data)
	if err != OK:
		push_error("[GameBridge] set_entity_image_base64: failed to parse image data")
		return

	var texture = ImageTexture.create_from_image(image)
	sprite.texture = texture
	var sprite_data = {"width": width, "height": height}
	_apply_sprite_scale(sprite, sprite_data, texture)


func set_entity_image_from_file(
	entity_id: String, file_path: String, width: float, height: float
) -> void:
	if not entities.has(entity_id):
		push_error("[GameBridge] set_entity_image_from_file: entity not found: " + entity_id)
		return

	var node = entities[entity_id]
	var sprite: Sprite2D = null

	for child in node.get_children():
		if child is Sprite2D:
			sprite = child
			break

	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	var image = Image.new()
	var err = image.load(file_path)
	if err != OK:
		push_error(
			(
				"[GameBridge] set_entity_image_from_file: failed to load image from "
				+ file_path
				+ " error="
				+ str(err)
			)
		)
		return

	var texture = ImageTexture.create_from_image(image)
	sprite.texture = texture
	var sprite_data = {"width": width, "height": height}
	_apply_sprite_scale(sprite, sprite_data, texture)


func set_entity_atlas_region_from_file(
	entity_id: String,
	file_path: String,
	region_x: float,
	region_y: float,
	region_w: float,
	region_h: float,
	sprite_width: float,
	sprite_height: float
) -> void:
	if not entities.has(entity_id):
		push_error("[GameBridge] set_entity_atlas_region_from_file: entity not found: " + entity_id)
		return

	var node = entities[entity_id]
	var sprite: Sprite2D = null

	for child in node.get_children():
		if child is Sprite2D:
			sprite = child
			break

	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	var image = Image.new()
	var err = image.load(file_path)
	if err != OK:
		push_error(
			(
				"[GameBridge] set_entity_atlas_region_from_file: failed to load image from "
				+ file_path
				+ " error="
				+ str(err)
			)
		)
		return

	var texture = ImageTexture.create_from_image(image)
	_texture_cache[file_path] = texture

	var region_dict = {"x": region_x, "y": region_y, "w": region_w, "h": region_h}
	var sprite_data = {"width": sprite_width, "height": sprite_height}
	_apply_atlas_region(sprite, texture, region_dict, sprite_data)
	_hide_shape_children(node)


# Get all entity transforms (for syncing)
func get_all_transforms() -> Dictionary:
	var result = {}
	for entity_id in entities:
		var node = entities[entity_id]
		var game_pos = godot_to_game_pos(node.position)
		result[entity_id] = {"x": game_pos.x, "y": game_pos.y, "angle": -node.rotation}  # Flip angle back to game convention
	return result


# Clear all entities
func clear_game() -> void:
	# Clear joints first
	for joint_id in joints:
		var joint_node = joints[joint_id]
		if is_instance_valid(joint_node):
			joint_node.queue_free()
	joints.clear()

	# Clear entities (including Area2D sensors stored in entities dict)
	for entity_id in entities:
		var node = entities[entity_id]
		if is_instance_valid(node):
			node.queue_free()
	entities.clear()
	templates.clear()

	# Reset ID tracking
	body_id_map.clear()
	body_id_reverse.clear()
	collider_id_map.clear()
	entity_shape_map.clear()
	user_data.clear()
	body_groups.clear()


# =============================================================================
# TRANSFORM CONTROL
# =============================================================================


func _js_set_transform(args: Array) -> void:
	if args.size() < 4:
		return
	var entity_id = str(args[0])
	var godot_pos = game_to_godot_pos(Vector2(float(args[1]), float(args[2])))
	var godot_angle = -float(args[3])  # Flip angle for Y-up convention

	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.position = godot_pos
			node.rotation = godot_angle
		elif node is RigidBody2D:
			# For RigidBody2D, we need to use physics server or _integrate_forces
			PhysicsServer2D.body_set_state(
				node.get_rid(),
				PhysicsServer2D.BODY_STATE_TRANSFORM,
				Transform2D(godot_angle, godot_pos)
			)


func set_transform(entity_id: String, x: float, y: float, angle: float) -> void:
	var godot_pos = game_to_godot_pos(Vector2(x, y))
	var godot_angle = -angle  # Flip angle for Y-up convention
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.position = godot_pos
			node.rotation = godot_angle
		elif node is RigidBody2D:
			PhysicsServer2D.body_set_state(
				node.get_rid(),
				PhysicsServer2D.BODY_STATE_TRANSFORM,
				Transform2D(godot_angle, godot_pos)
			)


func _js_set_position(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	var godot_pos = game_to_godot_pos(Vector2(float(args[1]), float(args[2])))

	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.position = godot_pos
		elif node is RigidBody2D:
			var current_angle = node.rotation
			PhysicsServer2D.body_set_state(
				node.get_rid(),
				PhysicsServer2D.BODY_STATE_TRANSFORM,
				Transform2D(current_angle, godot_pos)
			)
		else:
			node.position = godot_pos


func set_position(entity_id: String, x: float, y: float) -> void:
	var godot_pos = game_to_godot_pos(Vector2(x, y))
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.position = godot_pos
		elif node is RigidBody2D:
			var current_angle = node.rotation
			PhysicsServer2D.body_set_state(
				node.get_rid(),
				PhysicsServer2D.BODY_STATE_TRANSFORM,
				Transform2D(current_angle, godot_pos)
			)
		else:
			# For Area2D and other node types, just set position directly
			node.position = godot_pos


func _js_set_rotation(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	var angle = float(args[1])

	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.rotation = angle
		elif node is RigidBody2D:
			var current_pos = node.position
			PhysicsServer2D.body_set_state(
				node.get_rid(),
				PhysicsServer2D.BODY_STATE_TRANSFORM,
				Transform2D(angle, current_pos)
			)
		else:
			# For Area2D and other node types, just set rotation directly
			node.rotation = angle


func set_rotation(entity_id: String, angle: float) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.rotation = angle
		elif node is RigidBody2D:
			var current_pos = node.position
			PhysicsServer2D.body_set_state(
				node.get_rid(),
				PhysicsServer2D.BODY_STATE_TRANSFORM,
				Transform2D(angle, current_pos)
			)
		else:
			# For Area2D and other node types, just set rotation directly
			node.rotation = angle


func _js_set_scale(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	var scale_x = float(args[1])
	var scale_y = float(args[2])
	set_scale_entity(entity_id, scale_x, scale_y)


func set_scale_entity(entity_id: String, scale_x: float, scale_y: float) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		# Find the sprite child to scale (scaling physics bodies directly causes issues)
		var sprite = _find_sprite_in_entity(node)
		if sprite:
			sprite.scale = Vector2(scale_x, scale_y)


func _find_sprite_in_entity(node: Node) -> CanvasItem:
	if node is Sprite2D or node is AnimatedSprite2D:
		return node
	for child in node.get_children():
		if child is Sprite2D or child is AnimatedSprite2D:
			return child
		var found = _find_sprite_in_entity(child)
		if found:
			return found
	return null


func _js_get_linear_velocity(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			var game_vel = godot_to_game_vec(node.linear_velocity)
			return {"x": game_vel.x, "y": game_vel.y}
		elif node is Area2D and node.has_meta("velocity"):
			var godot_vel = node.get_meta("velocity") as Vector2
			var game_vel = godot_to_game_vec(godot_vel)
			return {"x": game_vel.x, "y": game_vel.y}
	return null


func _js_get_angular_velocity(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			return node.angular_velocity
	return null
