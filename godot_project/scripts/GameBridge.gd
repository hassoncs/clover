extends Node

signal game_loaded(game_data: Dictionary)
signal entity_spawned(entity_id: String, node: Node2D)
signal entity_destroyed(entity_id: String)
signal collision_occurred(entity_a: String, entity_b: String, impulse: float)
signal query_result(request_id: int, result: Variant)
signal joint_created(request_id: int, joint_id: int)

var game_data: Dictionary = {}
var entities: Dictionary = {}
var templates: Dictionary = {}
var pixels_per_meter: float = 50.0
var game_root: Node2D = null

# Coordinate conversion helpers (Game uses center-origin with Y+ up, Godot uses Y+ down)
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

var _js_callbacks: Array = []
var _js_bridge_obj: JavaScriptObject = null

var _texture_cache: Dictionary = {}
var _pending_textures: Array = []
var _audio_cache: Dictionary = {}

# Joint management
var joints: Dictionary = {}
var joint_counter: int = 0

# Sensor management (Area2D nodes for isSensor entities)
var sensors: Dictionary = {}
var sensor_velocities: Dictionary = {}  # entity_id -> Vector2 (Godot coords)
var _js_sensor_begin_callback: JavaScriptObject = null
var _js_sensor_end_callback: JavaScriptObject = null
var _js_input_event_callback: JavaScriptObject = null
var _js_transform_sync_callback: JavaScriptObject = null

# Collision manifold tracking (for detailed contact info)
var _active_contacts: Dictionary = {}  # "entityA:entityB" -> last_impulse_time
const IMPULSE_THRESHOLD: float = 0.01  # Minimum impulse to report

# UI Button management
var _ui_buttons: Dictionary = {}  # button_id -> TextureButton node
var _js_ui_button_callback: JavaScriptObject = null

# Body ID tracking for Physics2D compatibility
var body_id_map: Dictionary = {}  # entity_id -> body_id (int)
var body_id_reverse: Dictionary = {}  # body_id -> entity_id
var next_body_id: int = 1

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

func _ready() -> void:
	_setup_camera()
	_setup_js_bridge()

# Handle native input events on web and relay them back to JS
func _input(event: InputEvent) -> void:
	if not OS.has_feature("web"):
		return
	
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var mouse_pos = event.position
		var game_pos = godot_to_game_pos(mouse_pos)
		
		# Check for hit entity
		var hit_entity_id: Variant = null
		var space = get_viewport().find_world_2d().direct_space_state
		if space:
			var query = PhysicsPointQueryParameters2D.new()
			query.position = mouse_pos
			query.collision_mask = 0xFFFFFFFF
			query.collide_with_bodies = true
			query.collide_with_areas = true
			var results = space.intersect_point(query, 1)
			if results.size() > 0:
				var collider = results[0].collider
				if collider and collider.name in entities:
					hit_entity_id = collider.name
		
		# Also queue for polling API
		_queue_event("input", {"type": "tap", "x": game_pos.x, "y": game_pos.y, "entityId": hit_entity_id})
		
		# Notify JS callback for web
		_notify_js_input_event("tap", game_pos.x, game_pos.y, hit_entity_id)

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
	
	# Create a result storage object for functions that need to return values
	# JavaScriptBridge.create_callback() doesn't pass return values back to JS,
	# so we use this workaround: store the result, then JS reads it
	_js_bridge_obj["_lastResult"] = null
	
	var load_game_cb = JavaScriptBridge.create_callback(_js_load_game)
	_js_callbacks.append(load_game_cb)
	_js_bridge_obj["loadGameJson"] = load_game_cb
	
	var clear_game_cb = JavaScriptBridge.create_callback(_js_clear_game)
	_js_callbacks.append(clear_game_cb)
	_js_bridge_obj["clearGame"] = clear_game_cb
	
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
	
	var on_transform_sync_cb = JavaScriptBridge.create_callback(_js_on_transform_sync)
	_js_callbacks.append(on_transform_sync_cb)
	_js_bridge_obj["onTransformSync"] = on_transform_sync_cb
	
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
	
	var clear_texture_cache_cb = JavaScriptBridge.create_callback(_js_clear_texture_cache)
	_js_callbacks.append(clear_texture_cache_cb)
	_js_bridge_obj["clearTextureCache"] = clear_texture_cache_cb
	
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
	
	window["GodotBridge"] = _js_bridge_obj

func _js_load_game(args: Array) -> bool:
	if args.size() < 1:
		return false
	var json_str = str(args[0])
	return load_game_json(json_str)

func _js_clear_game(_args: Array) -> void:
	clear_game()

func _js_spawn_entity(args: Array) -> void:
	if args.size() < 4:
		return
	spawn_entity_with_id(str(args[0]), float(args[1]), float(args[2]), str(args[3]))

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
	return {
		"x": game_pos.x,
		"y": game_pos.y,
		"angle": -node.rotation  # Flip angle back to game convention
	}

func _js_get_all_transforms(_args: Array) -> void:
	var transforms = get_all_transforms()
	_js_bridge_obj["_lastResult"] = transforms

func _js_on_transform_sync(args: Array) -> void:
	if args.size() >= 1:
		_js_transform_sync_callback = args[0]

func _notify_transform_sync() -> void:
	if _js_transform_sync_callback != null:
		var transforms = get_all_transforms()
		var json_str = JSON.stringify(transforms)
		_js_transform_sync_callback.call("call", null, json_str)

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

func set_linear_velocity(entity_id: String, vx: float, vy: float) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		var godot_vel = game_to_godot_vec(Vector2(vx, vy))
		if node is RigidBody2D:
			node.linear_velocity = godot_vel
		elif node is CharacterBody2D:
			node.velocity = godot_vel
		elif node is Area2D:
			# Area2D doesn't have built-in velocity - track it manually
			sensor_velocities[entity_id] = godot_vel

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
	print("[GameBridge] _notify_js_input_event: type=", input_type, " callback=", _js_input_event_callback)
	if _js_input_event_callback != null:
		var data = {
			"type": input_type,
			"x": x,
			"y": y,
			"entityId": entity_id
		}
		var json_str = JSON.stringify(data)
		_js_input_event_callback.call("call", null, json_str)

func _js_on_collision(args: Array) -> void:
	if args.size() >= 1:
		_js_collision_callback = args[0]

func _js_on_entity_destroyed(args: Array) -> void:
	if args.size() >= 1:
		_js_destroy_callback = args[0]

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
		
		contacts_by_body[entity_b].append({
			"point": {"x": game_contact_pos.x, "y": game_contact_pos.y},
			"normal": {"x": game_normal.x, "y": game_normal.y},
			"normalImpulse": normal_impulse / pixels_per_meter,
			"tangentImpulse": tangent_impulse / pixels_per_meter
		})
	
	# Emit collision events for each colliding body
	for entity_b in contacts_by_body:
		var contacts = contacts_by_body[entity_b]
		
		# Calculate total impulse for this collision pair
		var total_impulse = 0.0
		for contact in contacts:
			total_impulse += abs(contact["normalImpulse"])
		
		var collision_data = {
			"entityA": entity_a,
			"entityB": entity_b,
			"contacts": contacts
		}
		
		_notify_js_collision_detailed(collision_data)
		collision_occurred.emit(entity_a, entity_b, total_impulse)

func _notify_js_destroy(entity_id: String) -> void:
	if _js_destroy_callback != null:
		_js_destroy_callback.call("call", null, entity_id)
	else:
		# Native path: queue event for polling
		_queue_event("destroy", {"entityId": entity_id})

func _process(_delta: float) -> void:
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
	_setup_background(game_data.get("background", {}))
	
	# Load templates
	templates = game_data.get("templates", {})
	
	# Create entities
	var entities_data = game_data.get("entities", [])
	for entity_data in entities_data:
		_create_entity(entity_data)
	
	game_loaded.emit(game_data)
	return true

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

var _background_sprite: Sprite2D = null

func _setup_background(bg_data: Dictionary) -> void:
	if _background_sprite:
		_background_sprite.queue_free()
		_background_sprite = null
	
	if bg_data.is_empty():
		return
	
	var bg_type = bg_data.get("type", "")
	if bg_type != "static":
		return
	
	var image_url = bg_data.get("imageUrl", "")
	var color = bg_data.get("color", "")
	
	_background_sprite = Sprite2D.new()
	_background_sprite.z_index = -100
	_background_sprite.name = "Background"
	add_child(_background_sprite)
	
	var world_data = game_data.get("world", {})
	var bounds = world_data.get("bounds", {"width": 20, "height": 12})
	var target_width = bounds.get("width", 20) * pixels_per_meter
	var target_height = bounds.get("height", 12) * pixels_per_meter
	
	# Background centered at origin (0,0) in new coordinate system
	_background_sprite.position = Vector2.ZERO
	
	if image_url != "":
		_download_background_texture(image_url, target_width, target_height)
	elif color != "":
		var img = Image.create(int(target_width), int(target_height), false, Image.FORMAT_RGBA8)
		img.fill(Color.from_string(color, Color.GRAY))
		_background_sprite.texture = ImageTexture.create_from_image(img)

func _download_background_texture(url: String, target_width: float, target_height: float) -> void:
	if _texture_cache.has(url):
		var texture = _texture_cache[url]
		_apply_background_texture(texture, target_width, target_height)
		return
	
	var http = HTTPRequest.new()
	add_child(http)
	
	http.request_completed.connect(func(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
			push_error("[GameBridge] Failed to download background: " + url)
			return
		
		var image = Image.new()
		var err = image.load_png_from_buffer(body)
		if err != OK:
			err = image.load_jpg_from_buffer(body)
		if err != OK:
			err = image.load_webp_from_buffer(body)
		if err != OK:
			push_error("[GameBridge] Failed to parse background image: " + url)
			return
		
		var texture = ImageTexture.create_from_image(image)
		_texture_cache[url] = texture
		_apply_background_texture(texture, target_width, target_height)
	)
	
	var err = http.request(url)
	if err != OK:
		push_error("[GameBridge] Failed to start background download: " + url)
		http.queue_free()

func _apply_background_texture(texture: Texture2D, target_width: float, target_height: float) -> void:
	if not is_instance_valid(_background_sprite) or texture == null:
		return
	
	_background_sprite.texture = texture
	
	var tex_w = texture.get_width()
	var tex_h = texture.get_height()
	
	var scale_x = target_width / tex_w
	var scale_y = target_height / tex_h
	var uniform_scale = max(scale_x, scale_y)
	
	_background_sprite.scale = Vector2(uniform_scale, uniform_scale)

func _center_camera_on_world() -> void:
	if not camera:
		return
	
	# Get game world size in pixels
	var world_data = game_data.get("world", {})
	var bounds = world_data.get("bounds", {})
	var world_width = bounds.get("width", 20.0) * pixels_per_meter
	var world_height = bounds.get("height", 12.0) * pixels_per_meter
	
	# Position camera so game world is centered in viewport
	# Camera position = what world coordinate appears at viewport center
	# We want game center (world_width/2, world_height/2) at viewport center
	var center_x = world_width / 2.0
	var center_y = world_height / 2.0
	
	var target_pos = Vector2(center_x, center_y)
	camera.global_position = target_pos
	
	# Also update CameraEffects target position to prevent smoothing from fighting us
	if camera.has_method("move_to"):
		camera._target_position = target_pos
	
	camera_target_id = ""

func _create_entity(entity_data: Dictionary) -> Node2D:
	var entity_id = entity_data.get("id", "entity_" + str(randi()))
	var template_id = entity_data.get("template", "")
	var transform_data = entity_data.get("transform", {})
	
	# Merge template with entity data
	var merged = entity_data.duplicate(true)
	if template_id != "" and templates.has(template_id):
		var tmpl = templates[template_id]
		# Template provides defaults, entity_data overrides
		for key in tmpl:
			if not merged.has(key):
				merged[key] = tmpl[key]
		# Merge physics specifically
		if tmpl.has("physics") and merged.has("physics"):
			var merged_physics = tmpl.physics.duplicate(true)
			for key in merged.physics:
				merged_physics[key] = merged.physics[key]
			merged.physics = merged_physics
		elif tmpl.has("physics"):
			merged.physics = tmpl.physics.duplicate(true)
	
	var physics_data = merged.get("physics", null)
	var sprite_data = merged.get("sprite", null)
	
	var node: Node2D = null
	
	if physics_data:
		node = _create_physics_body(entity_id, physics_data, transform_data)
	else:
		node = Node2D.new()
		node.name = entity_id
	
	# Set transform (convert from game coords to Godot coords with Y-flip)
	var game_pos = Vector2(transform_data.get("x", 0), transform_data.get("y", 0))
	var godot_pos = game_to_godot_pos(game_pos)
	var angle = transform_data.get("angle", 0)
	node.position = godot_pos
	node.rotation = -angle  # Flip angle for Y-up convention
	
	# Add sprite visualization
	if sprite_data:
		_add_sprite(node, sprite_data, physics_data)
	
	# Add to scene
	if game_root:
		game_root.add_child(node)
	else:
		var main = get_tree().current_scene
		if main:
			main.add_child(node)
	
	# Apply initial velocity now that the body is in the scene tree
	if node is RigidBody2D and node.has_meta("_initial_velocity"):
		var initial_vel = node.get_meta("_initial_velocity") as Vector2
		node.linear_velocity = initial_vel
		node.remove_meta("_initial_velocity")
	
	entities[entity_id] = node
	entity_spawned.emit(entity_id, node)
	
	return node

func _create_physics_body(entity_id: String, physics_data: Dictionary, transform_data: Dictionary) -> Node2D:
	var body_type = physics_data.get("bodyType", "dynamic")
	var is_sensor = physics_data.get("isSensor", false)
	var node: Node2D
	
	# For sensors, use Area2D instead of physics body
	if is_sensor:
		var area = Area2D.new()
		area.name = entity_id
		area.body_shape_entered.connect(_on_sensor_body_shape_entered.bind(entity_id))
		area.body_shape_exited.connect(_on_sensor_body_shape_exited.bind(entity_id))
		
		var collision = CollisionShape2D.new()
		collision.shape = _create_shape(physics_data)
		area.add_child(collision)
		
		# Apply collision filtering
		area.collision_layer = physics_data.get("categoryBits", 1)
		area.collision_mask = physics_data.get("maskBits", 0xFFFFFFFF)
		
		sensors[entity_id] = area
		node = area
	else:
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
				
				# Set physics properties
				var density = physics_data.get("density", 1.0)
				var friction = physics_data.get("friction", 0.3)
				var restitution = physics_data.get("restitution", 0.0)
				
				# Create physics material
				var material = PhysicsMaterial.new()
				material.friction = friction
				material.bounce = restitution
				rigid.physics_material_override = material
				
				# Mass is calculated from density * area (simplified)
				var shape_type = physics_data.get("shape", "box")
				var area = 1.0
				if shape_type == "box":
					var w = physics_data.get("width", 1.0)
					var h = physics_data.get("height", 1.0)
					area = w * h
				elif shape_type == "circle":
					var r = physics_data.get("radius", 0.5)
					area = PI * r * r
				elif shape_type == "polygon":
					var vertices = physics_data.get("vertices", [])
					area = _calculate_polygon_area(vertices)
				rigid.mass = density * area
				
				# Linear/angular damping
				rigid.linear_damp = physics_data.get("linearDamping", 0.0)
				rigid.angular_damp = physics_data.get("angularDamping", 0.0)
				
				# Fixed rotation
				if physics_data.get("fixedRotation", false):
					rigid.lock_rotation = true
				
				# CCD for fast-moving objects
				if physics_data.get("bullet", false):
					rigid.continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY
				
				# Connect collision signals (kept for backward compatibility)
				rigid.body_entered.connect(_on_body_entered.bind(entity_id))
				
				# Apply initial velocity if specified (convert with Y-flip)
				var initial_vel = physics_data.get("initialVelocity", null)
				if initial_vel != null:
					# Store for deferred application (must be applied after body is in scene tree)
					var game_vel = Vector2(initial_vel.get("x", 0), initial_vel.get("y", 0))
					rigid.set_meta("_initial_velocity", game_to_godot_vec(game_vel))
				
				node = rigid
		
		node.name = entity_id
		
		# Add collision shape
		var collision = CollisionShape2D.new()
		collision.shape = _create_shape(physics_data)
		node.add_child(collision)
		
		# Apply collision filtering
		node.collision_layer = physics_data.get("categoryBits", 1)
		node.collision_mask = physics_data.get("maskBits", 0xFFFFFFFF)
	
	# Track body ID for Physics2D compatibility
	body_id_map[entity_id] = next_body_id
	body_id_reverse[next_body_id] = entity_id
	next_body_id += 1
	
	return node

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

func _create_polygon_texture(width: int, height: int, color: Color, padding: int = 0) -> ImageTexture:
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

func _add_sprite(node: Node2D, sprite_data: Dictionary, physics_data: Dictionary) -> void:
	var sprite_type = sprite_data.get("type", "rect")
	var color = Color.from_string(sprite_data.get("color", "#FF0000"), Color.RED)
	var opacity = sprite_data.get("opacity", 1.0)
	var z_index_val = sprite_data.get("zIndex", 0)
	
	match sprite_type:
		"rect":
			var polygon = Polygon2D.new()
			var w = sprite_data.get("width", physics_data.get("width", 1.0) if physics_data else 1.0) * pixels_per_meter
			var h = sprite_data.get("height", physics_data.get("height", 1.0) if physics_data else 1.0) * pixels_per_meter
			var hw = w / 2.0
			var hh = h / 2.0
			polygon.polygon = PackedVector2Array([
				Vector2(-hw, -hh),
				Vector2(hw, -hh),
				Vector2(hw, hh),
				Vector2(-hw, hh)
			])
			color.a = opacity
			polygon.z_index = z_index_val
			# Add texture for shader compatibility (WebGL needs valid TEXTURE_PIXEL_SIZE)
			# Bake the color INTO the texture with padding for edge-detection shaders
			var tex_size = max(int(w), int(h), 64)
			var padding = 16  # Transparent padding for outline/glow shaders
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE  # Don't multiply - color is in texture
			# UV maps to the padded texture (shape is offset by padding)
			polygon.uv = PackedVector2Array([
				Vector2(padding, padding),
				Vector2(tex_size + padding, padding),
				Vector2(tex_size + padding, tex_size + padding),
				Vector2(padding, tex_size + padding)
			])
			node.add_child(polygon)
		"circle":
			var polygon = Polygon2D.new()
			var radius = sprite_data.get("radius", physics_data.get("radius", 0.5) if physics_data else 0.5) * pixels_per_meter
			var points: PackedVector2Array = []
			var uvs: PackedVector2Array = []
			var tex_size = max(int(radius * 2), 64)
			var padding = 16  # Transparent padding for edge-detection shaders
			for i in range(32):
				var angle = i * TAU / 32
				points.append(Vector2(cos(angle), sin(angle)) * radius)
				# Map circle points to UV space, offset by padding
				uvs.append(Vector2(
					(cos(angle) + 1.0) * 0.5 * tex_size + padding,
					(sin(angle) + 1.0) * 0.5 * tex_size + padding
				))
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
				uvs.append(Vector2(
					(pt.x - min_pt.x) / poly_size.x * tex_size + padding if poly_size.x > 0 else padding,
					(pt.y - min_pt.y) / poly_size.y * tex_size + padding if poly_size.y > 0 else padding
				))
			polygon.uv = uvs
			node.add_child(polygon)
		"image":
			_add_image_sprite(node, sprite_data, opacity, z_index_val)
		"text":
			_add_text_sprite(node, sprite_data, opacity, z_index_val)

func _add_image_sprite(node: Node2D, sprite_data: Dictionary, opacity: float, z_index_val: int) -> void:
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

func _add_text_sprite(node: Node2D, sprite_data: Dictionary, opacity: float, z_index_val: int) -> void:
	var label = Label.new()
	label.text = sprite_data.get("text", "")
	
	var font_size = int(sprite_data.get("fontSize", 16) * pixels_per_meter / 50.0)
	label.add_theme_font_size_override("font_size", font_size)
	
	var text_color = Color.from_string(sprite_data.get("color", "#FFFFFF"), Color.WHITE)
	text_color.a = opacity
	label.add_theme_color_override("font_color", text_color)
	
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	
	label.pivot_offset = label.size / 2
	label.position = -label.size / 2
	
	label.z_index = z_index_val
	node.add_child(label)

func _queue_texture_download(sprite: Sprite2D, url: String, sprite_data: Dictionary) -> void:
	if _texture_cache.has(url):
		var texture = _texture_cache[url]
		sprite.texture = texture
		_apply_sprite_scale(sprite, sprite_data, texture)
		return
	
	var http = HTTPRequest.new()
	add_child(http)
	
	http.request_completed.connect(func(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
			push_error("[GameBridge] Failed to download texture: " + url + " (code: " + str(response_code) + ")")
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
		
	)
	
	var err = http.request(url)
	if err != OK:
		push_error("[GameBridge] Failed to start texture download: " + url)
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

func _js_clear_texture_cache(args: Array) -> void:
	if args.size() > 0 and str(args[0]) != "":
		var url = str(args[0])
		if _texture_cache.has(url):
			_texture_cache.erase(url)
	else:
		_texture_cache.clear()

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

func spawn_entity(template_id: String, x: float, y: float) -> Node2D:
	return spawn_entity_with_id(template_id, x, y, template_id + "_" + str(randi()))

func spawn_entity_with_id(template_id: String, x: float, y: float, entity_id: String) -> Node2D:
	if not templates.has(template_id):
		push_error("[GameBridge] Template not found: " + template_id)
		return null
	
	var entity_data = {
		"id": entity_id,
		"template": template_id,
		"transform": {"x": x, "y": y, "angle": 0}
	}
	
	return _create_entity(entity_data)

func destroy_entity(entity_id: String) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		entities.erase(entity_id)
		sensor_velocities.erase(entity_id)  # Clean up sensor velocity tracking
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
		return
	
	var http = HTTPRequest.new()
	add_child(http)
	
	http.request_completed.connect(func(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
			push_error("[GameBridge] Failed to download texture: " + url + " (code: " + str(response_code) + ")")
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

func set_entity_image_base64(entity_id: String, base64_data: String, width: float, height: float) -> void:
	
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


func set_entity_image_from_file(entity_id: String, file_path: String, width: float, height: float) -> void:
	
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
		push_error("[GameBridge] set_entity_image_from_file: failed to load image from " + file_path + " error=" + str(err))
		return
	
	var texture = ImageTexture.create_from_image(image)
	sprite.texture = texture
	var sprite_data = {"width": width, "height": height}
	_apply_sprite_scale(sprite, sprite_data, texture)


# Get all entity transforms (for syncing)
func get_all_transforms() -> Dictionary:
	var result = {}
	for entity_id in entities:
		var node = entities[entity_id]
		var game_pos = godot_to_game_pos(node.position)
		result[entity_id] = {
			"x": game_pos.x,
			"y": game_pos.y,
			"angle": -node.rotation  # Flip angle back to game convention
		}
	return result

# Clear all entities
func clear_game() -> void:
	# Clear joints first
	for joint_id in joints:
		var joint_node = joints[joint_id]
		if is_instance_valid(joint_node):
			joint_node.queue_free()
	joints.clear()
	
	# Clear sensors
	for sensor_id in sensors:
		var sensor_node = sensors[sensor_id]
		if is_instance_valid(sensor_node):
			sensor_node.queue_free()
	sensors.clear()
	sensor_velocities.clear()
	
	# Clear entities
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
	var game_pos = Vector2(float(args[1]), float(args[2]))
	var godot_pos = game_to_godot_pos(game_pos)
	var godot_angle = -float(args[3])  # Flip angle for Y-up convention
	
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.position = godot_pos
			node.rotation = godot_angle
		elif node is RigidBody2D:
			# For RigidBody2D, we need to use physics server or _integrate_forces
			PhysicsServer2D.body_set_state(node.get_rid(), PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(godot_angle, godot_pos))

func set_transform(entity_id: String, x: float, y: float, angle: float) -> void:
	var godot_pos = game_to_godot_pos(Vector2(x, y))
	var godot_angle = -angle  # Flip angle for Y-up convention
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.position = godot_pos
			node.rotation = godot_angle
		elif node is RigidBody2D:
			PhysicsServer2D.body_set_state(node.get_rid(), PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(godot_angle, godot_pos))

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
			PhysicsServer2D.body_set_state(node.get_rid(), PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(current_angle, godot_pos))
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
			PhysicsServer2D.body_set_state(node.get_rid(), PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(current_angle, godot_pos))
		else:
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
			PhysicsServer2D.body_set_state(node.get_rid(), PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(angle, current_pos))
		else:
			node.rotation = angle

func set_rotation(entity_id: String, angle: float) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.rotation = angle
		elif node is RigidBody2D:
			var current_pos = node.position
			PhysicsServer2D.body_set_state(node.get_rid(), PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(angle, current_pos))
		else:
			node.rotation = angle

func _js_get_linear_velocity(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			var game_vel = godot_to_game_vec(node.linear_velocity)
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

func _js_apply_torque(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	var torque = float(args[1])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.apply_torque(torque)

func apply_torque(entity_id: String, torque: float) -> void:
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.apply_torque(torque)

# =============================================================================
# JOINT SYSTEM
# =============================================================================

func _js_create_revolute_joint(args: Array) -> int:
	# args: [bodyA_id, bodyB_id, anchorX, anchorY, enableLimit, lowerAngle, upperAngle, enableMotor, motorSpeed, maxMotorTorque]
	if args.size() < 4:
		return -1
	
	var entity_a = str(args[0])
	var entity_b = str(args[1])
	var godot_anchor = game_to_godot_pos(Vector2(float(args[2]), float(args[3])))
	
	if not entities.has(entity_a) or not entities.has(entity_b):
		return -1
	
	var node_a = entities[entity_a]
	var node_b = entities[entity_b]
	
	var joint = PinJoint2D.new()
	joint.position = godot_anchor
	joint.node_a = node_a.get_path()
	joint.node_b = node_b.get_path()
	
	# Motor settings
	if args.size() > 7 and bool(args[7]):  # enableMotor
		joint.motor_enabled = true
		if args.size() > 8:
			joint.motor_target_velocity = float(args[8])
	
	# Angle limits (PinJoint2D doesn't have angle limits, would need custom implementation)
	
	var main = get_tree().current_scene
	if main:
		main.add_child(joint)
	
	joint_counter += 1
	joints[joint_counter] = joint
	return joint_counter

func _js_create_distance_joint(args: Array) -> int:
	# args: [bodyA_id, bodyB_id, anchorAX, anchorAY, anchorBX, anchorBY, length, stiffness, damping]
	if args.size() < 6:
		return -1
	
	var entity_a = str(args[0])
	var entity_b = str(args[1])
	var anchor_a = game_to_godot_pos(Vector2(float(args[2]), float(args[3])))
	var anchor_b = game_to_godot_pos(Vector2(float(args[4]), float(args[5])))
	
	if not entities.has(entity_a) or not entities.has(entity_b):
		return -1
	
	var node_a = entities[entity_a]
	var node_b = entities[entity_b]
	
	var joint = DampedSpringJoint2D.new()
	joint.position = anchor_a
	joint.node_a = node_a.get_path()
	joint.node_b = node_b.get_path()
	
	# Calculate length
	var length = anchor_a.distance_to(anchor_b)
	if args.size() > 6 and float(args[6]) > 0:
		length = float(args[6]) * pixels_per_meter
	joint.length = length
	joint.rest_length = length
	
	# Stiffness and damping
	if args.size() > 7:
		joint.stiffness = float(args[7])
	if args.size() > 8:
		joint.damping = float(args[8])
	
	var main = get_tree().current_scene
	if main:
		main.add_child(joint)
	
	joint_counter += 1
	joints[joint_counter] = joint
	return joint_counter

func _js_create_prismatic_joint(args: Array) -> int:
	# args: [bodyA_id, bodyB_id, anchorX, anchorY, axisX, axisY, enableLimit, lowerTrans, upperTrans, enableMotor, motorSpeed, maxMotorForce]
	# Godot doesn't have a direct prismatic joint, use GrooveJoint2D as approximation
	if args.size() < 6:
		return -1
	
	var entity_a = str(args[0])
	var entity_b = str(args[1])
	var anchor = game_to_godot_pos(Vector2(float(args[2]), float(args[3])))
	var game_axis = Vector2(float(args[4]), float(args[5]))
	var axis_vec = Vector2(game_axis.x, -game_axis.y).normalized()  # Flip Y for axis direction
	
	if not entities.has(entity_a) or not entities.has(entity_b):
		return -1
	
	var node_a = entities[entity_a]
	var node_b = entities[entity_b]
	
	var joint = GrooveJoint2D.new()
	joint.position = anchor
	joint.node_a = node_a.get_path()
	joint.node_b = node_b.get_path()
	
	# GrooveJoint2D slides along its local Y-axis. Rotate so local Y aligns with axis_vec.
	joint.rotation = Vector2(0, 1).angle_to(axis_vec)
	
	# Set groove length based on limits
	var lower = 0.0
	var upper = 100.0  # Default groove length
	if args.size() > 6 and bool(args[6]):  # enableLimit
		if args.size() > 7:
			lower = float(args[7]) * pixels_per_meter
		if args.size() > 8:
			upper = float(args[8]) * pixels_per_meter
	joint.length = upper - lower
	joint.initial_offset = -lower
	
	# Attach PrismaticJointDriver script for motor support
	joint.set_script(load("res://scripts/PrismaticJointDriver.gd"))
	
	# Set motor properties (args 9, 10, 11)
	var motor_enabled = false
	var motor_speed = 0.0
	var max_motor_force = 0.0
	if args.size() > 9:
		motor_enabled = bool(args[9])
	if args.size() > 10:
		motor_speed = float(args[10]) * pixels_per_meter
	if args.size() > 11:
		max_motor_force = float(args[11]) * pixels_per_meter
	
	joint.motor_enabled = motor_enabled
	joint.motor_speed = motor_speed
	joint.max_motor_force = max_motor_force
	
	var main = get_tree().current_scene
	if main:
		main.add_child(joint)
	
	joint_counter += 1
	joints[joint_counter] = joint
	return joint_counter

func _js_create_weld_joint(args: Array) -> int:
	# args: [bodyA_id, bodyB_id, anchorX, anchorY, stiffness, damping]
	# Simulate rigid weld using two PinJoint2Ds offset from each other to prevent rotation
	if args.size() < 4:
		return -1
	
	var entity_a = str(args[0])
	var entity_b = str(args[1])
	var anchor = game_to_godot_pos(Vector2(float(args[2]), float(args[3])))
	
	if not entities.has(entity_a) or not entities.has(entity_b):
		return -1
	
	var node_a = entities[entity_a]
	var node_b = entities[entity_b]
	
	# Validate both are physics bodies that support joints
	if not (node_a is RigidBody2D or node_a is StaticBody2D or node_a is CharacterBody2D):
		push_error("[GameBridge] createWeldJoint: node_a is not a physics body")
		return -1
	if not (node_b is RigidBody2D or node_b is StaticBody2D or node_b is CharacterBody2D):
		push_error("[GameBridge] createWeldJoint: node_b is not a physics body")
		return -1
	
	# Create a container Node2D to hold both joints (for easy cleanup)
	var container = Node2D.new()
	container.name = "WeldJoint_%d" % (joint_counter + 1)
	
	# Joint 1: PinJoint2D at the anchor point
	var joint1 = PinJoint2D.new()
	joint1.position = anchor
	joint1.node_a = node_a.get_path()
	joint1.node_b = node_b.get_path()
	container.add_child(joint1)
	
	# Joint 2: PinJoint2D offset by 10 pixels to prevent rotation
	var joint2 = PinJoint2D.new()
	joint2.position = anchor + Vector2(10, 0)
	joint2.node_a = node_a.get_path()
	joint2.node_b = node_b.get_path()
	container.add_child(joint2)
	
	var main = get_tree().current_scene
	if main:
		main.add_child(container)
	
	joint_counter += 1
	joints[joint_counter] = container
	return joint_counter

# Synchronous version for native (react-native-godot) - returns joint_id directly
func create_mouse_joint(entity_id: String, target_x: float, target_y: float, max_force: float, stiffness: float, damping: float) -> int:
	
	if not entities.has(entity_id):
		return -1
	
	joint_counter += 1
	joints[joint_counter] = {
		"type": "mouse",
		"entity_id": entity_id,
		"target": game_to_godot_pos(Vector2(target_x, target_y)),
		"max_force": max_force,
		"stiffness": stiffness,
		"damping": damping
	}
	return joint_counter

func set_mouse_target(joint_id: int, target_x: float, target_y: float) -> void:
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is Dictionary and joint.get("type") == "mouse":
			joint["target"] = game_to_godot_pos(Vector2(target_x, target_y))

func destroy_joint(joint_id: int) -> void:
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is Node:
			joint.queue_free()
		joints.erase(joint_id)

func _js_create_mouse_joint(args: Array) -> void:
	# args: [body_id, targetX, targetY, maxForce, stiffness, damping]
	# Mouse joint simulated by applying forces towards target
	if args.size() < 4:
		JavaScriptBridge.eval("window.GodotBridge._lastResult = -1;")
		return
	
	var entity_id = str(args[0])
	var godot_target = game_to_godot_pos(Vector2(float(args[1]), float(args[2])))
	var max_force = float(args[3])
	
	if not entities.has(entity_id):
		JavaScriptBridge.eval("window.GodotBridge._lastResult = -1;")
		return
	
	# Store mouse joint data (we'll apply forces in _physics_process)
	joint_counter += 1
	joints[joint_counter] = {
		"type": "mouse",
		"entity_id": entity_id,
		"target": godot_target,
		"max_force": max_force,
		"stiffness": float(args[4]) if args.size() > 4 else 5.0,
		"damping": float(args[5]) if args.size() > 5 else 0.7
	}
	JavaScriptBridge.eval("window.GodotBridge._lastResult = %d;" % joint_counter)

func _js_destroy_joint(args: Array) -> void:
	if args.size() < 1:
		return
	var joint_id = int(args[0])
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is Node:
			joint.queue_free()
		joints.erase(joint_id)

func _js_set_motor_speed(args: Array) -> void:
	if args.size() < 2:
		return
	var joint_id = int(args[0])
	var speed = float(args[1])
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is PinJoint2D:
			joint.motor_target_velocity = speed

func set_motor_speed(joint_id: int, speed: float) -> void:
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is PinJoint2D:
			joint.motor_target_velocity = speed

func create_revolute_joint(entity_a: String, entity_b: String, anchor_x: float, anchor_y: float, enable_limit: bool = false, lower_angle: float = 0.0, upper_angle: float = 0.0, enable_motor: bool = false, motor_speed: float = 0.0, max_motor_torque: float = 0.0) -> int:
	return _js_create_revolute_joint([entity_a, entity_b, anchor_x, anchor_y, enable_limit, lower_angle, upper_angle, enable_motor, motor_speed, max_motor_torque])

func create_distance_joint(entity_a: String, entity_b: String, anchor_ax: float, anchor_ay: float, anchor_bx: float, anchor_by: float, length: float = 0.0, stiffness: float = 0.0, damping: float = 0.0) -> int:
	return _js_create_distance_joint([entity_a, entity_b, anchor_ax, anchor_ay, anchor_bx, anchor_by, length, stiffness, damping])

func create_prismatic_joint(entity_a: String, entity_b: String, anchor_x: float, anchor_y: float, axis_x: float, axis_y: float, enable_limit: bool = false, lower_trans: float = 0.0, upper_trans: float = 0.0, enable_motor: bool = false, motor_speed: float = 0.0, max_motor_force: float = 0.0) -> int:
	return _js_create_prismatic_joint([entity_a, entity_b, anchor_x, anchor_y, axis_x, axis_y, enable_limit, lower_trans, upper_trans, enable_motor, motor_speed, max_motor_force])

func create_weld_joint(entity_a: String, entity_b: String, anchor_x: float, anchor_y: float, stiffness: float = 0.0, damping: float = 0.0) -> int:
	return _js_create_weld_joint([entity_a, entity_b, anchor_x, anchor_y, stiffness, damping])

func _js_set_mouse_target(args: Array) -> void:
	if args.size() < 3:
		return
	var joint_id = int(args[0])
	var godot_target = game_to_godot_pos(Vector2(float(args[1]), float(args[2])))
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is Dictionary and joint.get("type") == "mouse":
			joint["target"] = godot_target

# =============================================================================
# PHYSICS QUERIES
# =============================================================================

func _js_query_point(args: Array) -> Variant:
	if args.size() < 2:
		return null
	var godot_point = game_to_godot_pos(Vector2(float(args[0]), float(args[1])))
	
	var space = get_viewport().find_world_2d().direct_space_state
	var query = PhysicsPointQueryParameters2D.new()
	query.position = godot_point
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_point(query, 1)
	if results.size() > 0:
		var collider = results[0].collider
		if collider and collider.name in entities:
			var entity_id = collider.name
			if body_id_map.has(entity_id):
				return body_id_map[entity_id]
	return null

func _js_query_point_entity(args: Array) -> void:
	# JavaScriptBridge.create_callback() does NOT pass return values to JS!
	# Use JavaScriptBridge.eval() to set window.GodotBridge._lastResult directly
	if args.size() < 2:
		JavaScriptBridge.eval("window.GodotBridge._lastResult = null;")
		return
	var point = game_to_godot_pos(Vector2(float(args[0]), float(args[1])))
	
	# Debug: print entity positions
	for eid in entities:
		var e = entities[eid]
		if e is RigidBody2D:
			var shape_info = "no shape"
			for child in e.get_children():
				if child is CollisionShape2D:
					var s = child.shape
					if s is RectangleShape2D:
						shape_info = "rect size=%s" % s.size
					elif s is CircleShape2D:
						shape_info = "circle r=%s" % s.radius
	
	var space = get_viewport().find_world_2d().direct_space_state
	if not space:
		JavaScriptBridge.eval("window.GodotBridge._lastResult = null;")
		return
	
	var query = PhysicsPointQueryParameters2D.new()
	query.position = point
	query.collision_mask = 0xFFFFFFFF
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_point(query, 32)
	for i in range(results.size()):
		var collider = results[i].collider
	
	if results.size() > 0:
		var collider = results[0].collider
		if collider and collider.name in entities:
			var entity_name = collider.name
			var js_code = "console.log('[GDScript eval] Setting _lastResult to: %s'); window.GodotBridge._lastResult = '%s';" % [entity_name, entity_name]
			JavaScriptBridge.eval(js_code)
			return
	JavaScriptBridge.eval("console.log('[GDScript eval] Setting _lastResult to null'); window.GodotBridge._lastResult = null;")

# Synchronous version for native (react-native-godot) - returns entity_id directly
func query_point_entity(x: float, y: float) -> Variant:
	var godot_point = game_to_godot_pos(Vector2(x, y))
	
	var space = get_viewport().find_world_2d().direct_space_state
	if not space:
		return null
	
	var query = PhysicsPointQueryParameters2D.new()
	query.position = godot_point
	query.collision_mask = 0xFFFFFFFF
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_point(query, 32)
	
	if results.size() > 0:
		var collider = results[0].collider
		if collider and collider.name in entities:
			return collider.name
	return null

func query_point_entity_async(request_id: int, x: float, y: float) -> void:
	var godot_point = game_to_godot_pos(Vector2(x, y))
	
	var space = get_viewport().find_world_2d().direct_space_state
	if not space:
		emit_signal("query_result", request_id, null)
		return
	
	var query = PhysicsPointQueryParameters2D.new()
	query.position = godot_point
	query.collision_mask = 0xFFFFFFFF
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_point(query, 32)
	if results.size() > 0:
		var collider = results[0].collider
		if collider and collider.name in entities:
			emit_signal("query_result", request_id, collider.name)
			return
	emit_signal("query_result", request_id, null)

func create_mouse_joint_async(request_id: int, entity_id: String, target_x: float, target_y: float, max_force: float, stiffness: float, damping: float) -> void:
	if not entities.has(entity_id):
		emit_signal("joint_created", request_id, -1)
		return
	
	joint_counter += 1
	joints[joint_counter] = {
		"type": "mouse",
		"entity_id": entity_id,
		"target": game_to_godot_pos(Vector2(target_x, target_y)),
		"max_force": max_force,
		"stiffness": stiffness,
		"damping": damping
	}
	emit_signal("joint_created", request_id, joint_counter)

func _js_query_aabb(args: Array) -> Array:
	if args.size() < 4:
		return []
	# Convert AABB corners from game coords to Godot coords
	var game_min = Vector2(float(args[0]), float(args[1]))
	var game_max = Vector2(float(args[2]), float(args[3]))
	var godot_min = game_to_godot_pos(game_min)
	var godot_max = game_to_godot_pos(game_max)
	# After Y-flip, min/max may be swapped
	var actual_min = Vector2(min(godot_min.x, godot_max.x), min(godot_min.y, godot_max.y))
	var actual_max = Vector2(max(godot_min.x, godot_max.x), max(godot_min.y, godot_max.y))
	
	var space = get_viewport().find_world_2d().direct_space_state
	
	# Create a rectangle shape for AABB query
	var shape = RectangleShape2D.new()
	shape.size = actual_max - actual_min
	
	var query = PhysicsShapeQueryParameters2D.new()
	query.shape = shape
	query.transform = Transform2D(0, (actual_min + actual_max) / 2)
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_shape(query)
	var body_ids: Array = []
	for result in results:
		var collider = result.collider
		if collider and collider.name in entities:
			var entity_id = collider.name
			if body_id_map.has(entity_id):
				body_ids.append(body_id_map[entity_id])
	return body_ids

func _js_raycast(args: Array) -> Variant:
	if args.size() < 5:
		return null
	var godot_origin = game_to_godot_pos(Vector2(float(args[0]), float(args[1])))
	var game_dir = Vector2(float(args[2]), float(args[3]))
	var godot_dir = Vector2(game_dir.x, -game_dir.y).normalized()  # Flip Y for direction
	var max_distance = float(args[4]) * pixels_per_meter
	
	var end = godot_origin + godot_dir * max_distance
	
	var space = get_viewport().find_world_2d().direct_space_state
	var query = PhysicsRayQueryParameters2D.create(godot_origin, end)
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var result = space.intersect_ray(query)
	if result:
		var collider = result.collider
		if collider and collider.name in entities:
			var entity_id = collider.name
			var body_id = body_id_map.get(entity_id, -1)
			var collider_id = -1  # TODO: proper collider tracking
			var game_hit_point = godot_to_game_pos(result.position)
			var game_normal = Vector2(result.normal.x, -result.normal.y)  # Flip Y for normal
			var fraction = godot_origin.distance_to(result.position) / max_distance
			return {
				"bodyId": body_id,
				"colliderId": collider_id,
				"point": {"x": game_hit_point.x, "y": game_hit_point.y},
				"normal": {"x": game_normal.x, "y": game_normal.y},
				"fraction": fraction
			}
	return null

func query_point(x: float, y: float) -> Variant:
	var godot_point = game_to_godot_pos(Vector2(x, y))
	
	var space = get_viewport().find_world_2d().direct_space_state
	var query = PhysicsPointQueryParameters2D.new()
	query.position = godot_point
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_point(query, 1)
	if results.size() > 0:
		var collider = results[0].collider
		if collider and collider.name in entities:
			var entity_id = collider.name
			if body_id_map.has(entity_id):
				return body_id_map[entity_id]
	return null

func query_aabb(min_x: float, min_y: float, max_x: float, max_y: float) -> String:
	# Convert AABB corners from game coords to Godot coords
	var game_min = Vector2(min_x, min_y)
	var game_max = Vector2(max_x, max_y)
	var godot_min = game_to_godot_pos(game_min)
	var godot_max = game_to_godot_pos(game_max)
	# After Y-flip, min/max may be swapped
	var actual_min = Vector2(min(godot_min.x, godot_max.x), min(godot_min.y, godot_max.y))
	var actual_max = Vector2(max(godot_min.x, godot_max.x), max(godot_min.y, godot_max.y))
	
	var space = get_viewport().find_world_2d().direct_space_state
	
	var shape = RectangleShape2D.new()
	shape.size = actual_max - actual_min
	
	var query = PhysicsShapeQueryParameters2D.new()
	query.shape = shape
	query.transform = Transform2D(0, (actual_min + actual_max) / 2)
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_shape(query)
	var body_ids: Array = []
	for result in results:
		var collider = result.collider
		if collider and collider.name in entities:
			var entity_id = collider.name
			if body_id_map.has(entity_id):
				body_ids.append(body_id_map[entity_id])
	return JSON.stringify(body_ids)

func raycast(origin_x: float, origin_y: float, dir_x: float, dir_y: float, max_distance: float) -> Variant:
	var godot_origin = game_to_godot_pos(Vector2(origin_x, origin_y))
	var game_dir = Vector2(dir_x, dir_y)
	var godot_dir = Vector2(game_dir.x, -game_dir.y).normalized()  # Flip Y for direction
	var end = godot_origin + godot_dir * (max_distance * pixels_per_meter)
	
	var space = get_viewport().find_world_2d().direct_space_state
	var query = PhysicsRayQueryParameters2D.create(godot_origin, end)
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var result = space.intersect_ray(query)
	if result:
		var collider = result.collider
		if collider and collider.name in entities:
			var entity_id = collider.name
			var body_id = body_id_map.get(entity_id, -1)
			var collider_id = -1
			var game_hit_point = godot_to_game_pos(result.position)
			var game_normal = Vector2(result.normal.x, -result.normal.y)  # Flip Y for normal
			var fraction = godot_origin.distance_to(result.position) / (max_distance * pixels_per_meter)
			return JSON.stringify({
				"bodyId": body_id,
				"colliderId": collider_id,
				"point": {"x": game_hit_point.x, "y": game_hit_point.y},
				"normal": {"x": game_normal.x, "y": game_normal.y},
				"fraction": fraction
			})
	return null

# =============================================================================
# SENSOR SYSTEM
# =============================================================================

func _js_on_sensor_begin(args: Array) -> void:
	if args.size() >= 1:
		_js_sensor_begin_callback = args[0]

func _js_on_sensor_end(args: Array) -> void:
	if args.size() >= 1:
		_js_sensor_end_callback = args[0]

func _notify_sensor_begin(sensor_collider_id: int, other_entity: String, other_collider_id: int) -> void:
	var other_body_id = body_id_map.get(other_entity, -1)
	if _js_sensor_begin_callback != null:
		_js_sensor_begin_callback.call("call", null, sensor_collider_id, other_body_id, other_collider_id)
	else:
		# Native path: queue event for polling
		_queue_event("sensor_begin", {"sensorColliderId": sensor_collider_id, "otherBodyId": other_body_id, "otherColliderId": other_collider_id})

func _notify_sensor_end(sensor_collider_id: int, other_entity: String, other_collider_id: int) -> void:
	var other_body_id = body_id_map.get(other_entity, -1)
	if _js_sensor_end_callback != null:
		_js_sensor_end_callback.call("call", null, sensor_collider_id, other_body_id, other_collider_id)
	else:
		# Native path: queue event for polling
		_queue_event("sensor_end", {"sensorColliderId": sensor_collider_id, "otherBodyId": other_body_id, "otherColliderId": other_collider_id})

# =============================================================================
# BODY/COLLIDER MANAGEMENT (Physics2D API style)
# =============================================================================

func _js_create_body(args: Array) -> int:
	# args: [type, posX, posY, angle, linearDamping, angularDamping, fixedRotation, bullet, userData, group]
	if args.size() < 3:
		return -1
	
	var body_type = str(args[0])
	var godot_pos = game_to_godot_pos(Vector2(float(args[1]), float(args[2])))
	var game_angle = float(args[3]) if args.size() > 3 else 0.0
	var godot_angle = -game_angle  # Flip angle for Y-up convention
	
	var entity_id = "body_" + str(next_body_id)
	var node: Node2D
	
	match body_type:
		"static":
			node = StaticBody2D.new()
		"kinematic":
			node = CharacterBody2D.new()
		_:  # dynamic
			var rigid = RigidBody2D.new()
			rigid.gravity_scale = 1.0
			if args.size() > 4:
				rigid.linear_damp = float(args[4])
			if args.size() > 5:
				rigid.angular_damp = float(args[5])
			if args.size() > 6 and bool(args[6]):
				rigid.lock_rotation = true
			if args.size() > 7 and bool(args[7]):
				rigid.continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY
			rigid.body_entered.connect(_on_body_entered.bind(entity_id))
			node = rigid
	
	node.name = entity_id
	node.position = godot_pos
	node.rotation = godot_angle
	
	var main = get_tree().current_scene
	if main:
		main.add_child(node)
	
	entities[entity_id] = node
	body_id_map[entity_id] = next_body_id
	body_id_reverse[next_body_id] = entity_id
	
	# Store user data and group if provided
	if args.size() > 8:
		user_data[next_body_id] = args[8]
	if args.size() > 9:
		body_groups[next_body_id] = str(args[9])
	
	var result = next_body_id
	next_body_id += 1
	return result

func _js_add_fixture(args: Array) -> int:
	# args: [bodyId, shapeType, shapeData..., density, friction, restitution, isSensor, categoryBits, maskBits]
	if args.size() < 3:
		return -1
	
	var body_id = int(args[0])
	var shape_type = str(args[1])
	
	if not body_id_reverse.has(body_id):
		return -1
	
	var entity_id = body_id_reverse[body_id]
	var node = entities[entity_id]
	
	var shape: Shape2D
	var shape_data_end = 2
	
	match shape_type:
		"circle":
			var circle = CircleShape2D.new()
			circle.radius = float(args[2]) * pixels_per_meter
			shape = circle
			shape_data_end = 3
		"box":
			var rect = RectangleShape2D.new()
			rect.size = Vector2(float(args[2]) * 2, float(args[3]) * 2) * pixels_per_meter  # halfWidth, halfHeight
			shape = rect
			shape_data_end = 4
		"polygon":
			var polygon = ConvexPolygonShape2D.new()
			var vertex_count = int(args[2])
			var points: PackedVector2Array = []
			for i in range(vertex_count):
				var vx = float(args[3 + i * 2]) * pixels_per_meter
				var vy = -float(args[4 + i * 2]) * pixels_per_meter  # Flip Y for vertices
				points.append(Vector2(vx, vy))
			polygon.points = points
			shape = polygon
			shape_data_end = 3 + vertex_count * 2
		_:
			return -1
	
	var collision = CollisionShape2D.new()
	collision.shape = shape
	
	# Apply physics material properties if dynamic body
	if node is RigidBody2D:
		var density = float(args[shape_data_end]) if args.size() > shape_data_end else 1.0
		var friction = float(args[shape_data_end + 1]) if args.size() > shape_data_end + 1 else 0.3
		var restitution = float(args[shape_data_end + 2]) if args.size() > shape_data_end + 2 else 0.0
		
		var material = PhysicsMaterial.new()
		material.friction = friction
		material.bounce = restitution
		node.physics_material_override = material
		
		# Update mass based on density
		var area = _calculate_shape_area(shape)
		node.mass = density * area
	
	# Check for sensor mode
	var is_sensor = bool(args[shape_data_end + 3]) if args.size() > shape_data_end + 3 else false
	if is_sensor:
		# For sensors, create an Area2D instead
		var area = Area2D.new()
		area.name = entity_id + "_sensor"
		var sensor_collision = CollisionShape2D.new()
		sensor_collision.shape = shape
		area.add_child(sensor_collision)
		area.body_shape_entered.connect(_on_sensor_body_shape_entered.bind(entity_id))
		area.body_shape_exited.connect(_on_sensor_body_shape_exited.bind(entity_id))
		node.add_child(area)
		sensors[entity_id] = area
	else:
		node.add_child(collision)
	
	# Collision filtering
	var category_bits = int(args[shape_data_end + 4]) if args.size() > shape_data_end + 4 else 1
	var mask_bits = int(args[shape_data_end + 5]) if args.size() > shape_data_end + 5 else 0xFFFFFFFF
	node.collision_layer = category_bits
	node.collision_mask = mask_bits
	
	# Track collider
	var collider_id = next_collider_id
	collider_id_map[collider_id] = {"entity_id": entity_id, "node": collision if not is_sensor else sensors[entity_id]}
	next_collider_id += 1
	
	# Track shape index -> collider_id mapping for this entity
	if not entity_shape_map.has(entity_id):
		entity_shape_map[entity_id] = []
	entity_shape_map[entity_id].append(collider_id)
	
	return collider_id

func _calculate_shape_area(shape: Shape2D) -> float:
	if shape is CircleShape2D:
		return PI * shape.radius * shape.radius / (pixels_per_meter * pixels_per_meter)
	elif shape is RectangleShape2D:
		return shape.size.x * shape.size.y / (pixels_per_meter * pixels_per_meter)
	elif shape is ConvexPolygonShape2D:
		# Approximate polygon area using shoelace formula
		var points = shape.points
		var area = 0.0
		var n = points.size()
		for i in range(n):
			var j = (i + 1) % n
			area += points[i].x * points[j].y
			area -= points[j].x * points[i].y
		return abs(area) / 2.0 / (pixels_per_meter * pixels_per_meter)
	return 1.0

func _js_set_sensor(args: Array) -> void:
	if args.size() < 2:
		return
	var collider_id = int(args[0])
	var is_sensor = bool(args[1])
	# TODO: Convert existing collider to/from sensor

func set_sensor(collider_id: int, is_sensor: bool) -> void:
	# TODO: Convert existing collider to/from sensor
	pass

func add_fixture(body_id: int, shape_type: String, shape_param1: float = 0.0, shape_param2: float = 0.0, shape_param3: float = 0.0, shape_param4: float = 0.0, shape_param5: float = 0.0, shape_param6: float = 0.0, shape_param7: float = 0.0, shape_param8: float = 0.0, density: float = 1.0, friction: float = 0.3, restitution: float = 0.0, is_sensor: bool = false, category_bits: int = 1, mask_bits: int = 0xFFFFFFFF) -> int:
	var args: Array = [body_id, shape_type]
	match shape_type:
		"circle":
			args.append(shape_param1)
		"box":
			args.append(shape_param1)
			args.append(shape_param2)
		"polygon":
			var vertex_count = int(shape_param1)
			args.append(vertex_count)
			if vertex_count >= 1:
				args.append(shape_param2)
				args.append(shape_param3)
			if vertex_count >= 2:
				args.append(shape_param4)
				args.append(shape_param5)
			if vertex_count >= 3:
				args.append(shape_param6)
				args.append(shape_param7)
	args.append(density)
	args.append(friction)
	args.append(restitution)
	args.append(is_sensor)
	args.append(category_bits)
	args.append(mask_bits)
	return _js_add_fixture(args)

func _js_set_user_data(args: Array) -> void:
	if args.size() < 2:
		return
	var body_id = int(args[0])
	user_data[body_id] = args[1]

func _js_get_user_data(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var body_id = int(args[0])
	return user_data.get(body_id)

func create_body(body_type: String, pos_x: float, pos_y: float, angle: float = 0.0, linear_damping: float = 0.0, angular_damping: float = 0.0, fixed_rotation: bool = false, bullet: bool = false, user_data_json: String = "", group: String = "") -> int:
	var godot_pos = game_to_godot_pos(Vector2(pos_x, pos_y))
	var godot_angle = -angle  # Flip angle for Y-up convention
	
	var entity_id = "body_" + str(next_body_id)
	var node: Node2D
	
	match body_type:
		"static":
			node = StaticBody2D.new()
		"kinematic":
			node = CharacterBody2D.new()
		_:
			var rigid = RigidBody2D.new()
			rigid.gravity_scale = 1.0
			rigid.linear_damp = linear_damping
			rigid.angular_damp = angular_damping
			if fixed_rotation:
				rigid.lock_rotation = true
			if bullet:
				rigid.continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY
			rigid.body_entered.connect(_on_body_entered.bind(entity_id))
			node = rigid
	
	node.name = entity_id
	node.position = godot_pos
	node.rotation = godot_angle
	
	var main = get_tree().current_scene
	if main:
		main.add_child(node)
	
	entities[entity_id] = node
	body_id_map[entity_id] = next_body_id
	body_id_reverse[next_body_id] = entity_id
	
	if user_data_json != "":
		var json = JSON.new()
		if json.parse(user_data_json) == OK:
			user_data[next_body_id] = json.data
	if group != "":
		body_groups[next_body_id] = group
	
	var result = next_body_id
	next_body_id += 1
	return result

func set_user_data(body_id: int, data_json: String) -> void:
	if data_json == "":
		user_data.erase(body_id)
	else:
		var json = JSON.new()
		if json.parse(data_json) == OK:
			user_data[body_id] = json.data

func _js_get_all_bodies(args: Array) -> Array:
	var result: Array = []
	for body_id in body_id_reverse:
		result.append(body_id)
	return result

func _on_sensor_body_shape_entered(body_rid: RID, body: Node2D, body_shape_index: int, local_shape_index: int, sensor_entity_id: String) -> void:
	if body.name in entities:
		var sensor_collider_id = -1
		var other_collider_id = -1
		
		if entity_shape_map.has(sensor_entity_id) and local_shape_index < entity_shape_map[sensor_entity_id].size():
			sensor_collider_id = entity_shape_map[sensor_entity_id][local_shape_index]
		
		if entity_shape_map.has(body.name) and body_shape_index < entity_shape_map[body.name].size():
			other_collider_id = entity_shape_map[body.name][body_shape_index]
		
		_notify_sensor_begin(sensor_collider_id, body.name, other_collider_id)

func _on_sensor_body_shape_exited(body_rid: RID, body: Node2D, body_shape_index: int, local_shape_index: int, sensor_entity_id: String) -> void:
	if body.name in entities:
		var sensor_collider_id = -1
		var other_collider_id = -1
		
		if entity_shape_map.has(sensor_entity_id) and local_shape_index < entity_shape_map[sensor_entity_id].size():
			sensor_collider_id = entity_shape_map[sensor_entity_id][local_shape_index]
		
		if entity_shape_map.has(body.name) and body_shape_index < entity_shape_map[body.name].size():
			other_collider_id = entity_shape_map[body.name][body_shape_index]
		
		_notify_sensor_end(sensor_collider_id, body.name, other_collider_id)

# =============================================================================
# PHYSICS PROCESS (for mouse joints and other continuous effects)
# =============================================================================

var _transform_sync_timer: float = 0.0
const TRANSFORM_SYNC_INTERVAL: float = 0.033  # ~30fps sync rate

func _physics_process(delta: float) -> void:
	# Push transform updates to JS
	_transform_sync_timer += delta
	if _transform_sync_timer >= TRANSFORM_SYNC_INTERVAL:
		_transform_sync_timer = 0.0
		_notify_transform_sync()
	
	# Process mouse joints
	for joint_id in joints:
		var joint = joints[joint_id]
		if joint is Dictionary and joint.get("type") == "mouse":
			var entity_id = joint["entity_id"]
			if entities.has(entity_id):
				var node = entities[entity_id]
				if node is RigidBody2D:
					var target = joint["target"]
					var current_pos = node.global_position
					var diff = target - current_pos
					var force = diff * joint["stiffness"] - node.linear_velocity * joint["damping"]
					force = force.limit_length(joint["max_force"])
					node.apply_central_force(force)
	
	# Process CharacterBody2D movement (kinematic bodies)
	for entity_id in entities:
		var node = entities[entity_id]
		if node is CharacterBody2D and node.velocity.length() > 0.01:
			node.move_and_slide()
	
	# Process Area2D movement (sensors with velocity)
	for entity_id in sensor_velocities:
		if entities.has(entity_id):
			var node = entities[entity_id]
			var vel = sensor_velocities[entity_id]
			if node is Area2D and vel.length() > 0.01:
				node.position += vel * delta
	
	# Process camera follow
	if camera and camera_target_id != "" and entities.has(camera_target_id):
		var target_node = entities[camera_target_id]
		var target_pos = target_node.global_position
		camera.global_position = camera.global_position.lerp(target_pos, camera_smoothing * delta)

# =============================================================================
# CAMERA CONTROL
# =============================================================================

func _js_set_camera_target(args: Array) -> void:
	if args.size() < 1 or args[0] == null or str(args[0]) == "":
		camera_target_id = ""
	else:
		camera_target_id = str(args[0])

func _js_set_camera_position(args: Array) -> void:
	if args.size() < 2:
		return
	camera_target_id = ""
	var godot_pos = game_to_godot_pos(Vector2(float(args[0]), float(args[1])))
	if camera:
		camera.global_position = godot_pos

func _js_set_camera_zoom(args: Array) -> void:
	if args.size() < 1:
		return
	var zoom_level = float(args[0])
	if camera:
		camera.zoom = Vector2(zoom_level, zoom_level)

func set_camera_target(entity_id: String) -> void:
	if entity_id == "":
		camera_target_id = ""
	else:
		camera_target_id = entity_id

func set_camera_position(x: float, y: float) -> void:
	camera_target_id = ""
	if camera:
		camera.global_position = game_to_godot_pos(Vector2(x, y))

func set_camera_zoom(zoom_level: float) -> void:
	if camera:
		camera.zoom = Vector2(zoom_level, zoom_level)

# =============================================================================
# PARTICLE SYSTEM
# =============================================================================

func _js_spawn_particle(args: Array) -> void:
	if args.size() < 3:
		push_error("[GameBridge] spawnParticle requires 3 args: type, x, y")
		return
	
	var particle_type = str(args[0])
	var godot_pos = game_to_godot_pos(Vector2(float(args[1]), float(args[2])))
	
	var particles: CPUParticles2D = null
	
	var scene_path = "res://particles/" + particle_type + ".tscn"
	if ResourceLoader.exists(scene_path):
		var scene = load(scene_path)
		if scene:
			var instance = scene.instantiate()
			if instance is CPUParticles2D:
				particles = instance
			elif instance is GPUParticles2D:
				push_warning("[GameBridge] GPUParticles2D not supported, using fallback")
			else:
				for child in instance.get_children():
					if child is CPUParticles2D:
						particles = child
						child.get_parent().remove_child(child)
						instance.queue_free()
						break
				if particles == null:
					instance.queue_free()
	
	if particles == null:
		particles = CPUParticles2D.new()
		particles.amount = 16
		particles.explosiveness = 1.0
		particles.spread = 180.0
		particles.gravity = Vector2(0, 0)
		particles.initial_velocity_min = 50.0
		particles.initial_velocity_max = 100.0
		particles.scale_amount_min = 2.0
		particles.scale_amount_max = 4.0
		particles.color = Color.YELLOW
		particles.lifetime = 0.5
	
	particles.position = godot_pos
	particles.one_shot = true
	particles.emitting = false
	
	if game_root:
		game_root.add_child(particles)
	else:
		var main = get_tree().current_scene
		if main:
			main.add_child(particles)
	
	particles.emitting = true
	particles.finished.connect(particles.queue_free)

func spawn_particle(particle_type: String, x: float, y: float) -> void:
	_js_spawn_particle([particle_type, x, y])

# =============================================================================
# AUDIO SYSTEM
# =============================================================================

func _js_play_sound(args: Array) -> void:
	if args.size() < 1:
		push_error("[GameBridge] playSound requires 1 arg: resource_path")
		return
	
	var resource_path = str(args[0])
	
	var audio_stream: AudioStream = null
	if _audio_cache.has(resource_path):
		audio_stream = _audio_cache[resource_path]
	else:
		var resource = load(resource_path)
		if resource == null or not (resource is AudioStream):
			push_error("[GameBridge] playSound: failed to load audio resource: " + resource_path)
			return
		audio_stream = resource
		_audio_cache[resource_path] = audio_stream
	
	var player = AudioStreamPlayer.new()
	player.stream = audio_stream
	add_child(player)
	player.play()
	player.finished.connect(player.queue_free)

func play_sound(resource_path: String) -> void:
	_js_play_sound([resource_path])

# =============================================================================
# UI BUTTON SYSTEM
# =============================================================================

func _js_create_ui_button(args: Array) -> void:
	# args: [buttonId, normalImageUrl, pressedImageUrl, x, y, width, height]
	# x, y, width, height are in screen pixels (not world meters)
	if args.size() < 7:
		push_error("[GameBridge] createUIButton requires 7 args: buttonId, normalUrl, pressedUrl, x, y, width, height")
		return
	
	var button_id = str(args[0])
	var normal_url = str(args[1])
	var pressed_url = str(args[2])
	var pos_x = float(args[3])
	var pos_y = float(args[4])
	var btn_width = float(args[5])
	var btn_height = float(args[6])
	
	# Remove existing button with same ID
	if _ui_buttons.has(button_id):
		_ui_buttons[button_id].queue_free()
		_ui_buttons.erase(button_id)
	
	# Create TextureButton
	var button = TextureButton.new()
	button.name = button_id
	button.position = Vector2(pos_x, pos_y)
	button.custom_minimum_size = Vector2(btn_width, btn_height)
	button.size = Vector2(btn_width, btn_height)
	button.ignore_texture_size = true
	button.stretch_mode = TextureButton.STRETCH_SCALE
	
	var normal_tex = _create_placeholder_texture(normal_url, int(btn_width), int(btn_height))
	var pressed_tex = _create_placeholder_texture(pressed_url, int(btn_width), int(btn_height))
	
	button.texture_normal = normal_tex
	button.texture_pressed = pressed_tex
	
	# Connect signals
	button.button_down.connect(_on_ui_button_down.bind(button_id))
	button.button_up.connect(_on_ui_button_up.bind(button_id))
	button.pressed.connect(_on_ui_button_pressed.bind(button_id))
	
	# Add to a CanvasLayer for UI (screen-space positioning)
	var ui_layer = _get_or_create_ui_layer()
	ui_layer.add_child(button)
	_ui_buttons[button_id] = button
	
	print("[GameBridge] Created UI button: ", button_id, " at ", pos_x, ",", pos_y, " size ", btn_width, "x", btn_height)

func _js_destroy_ui_button(args: Array) -> void:
	if args.size() < 1:
		return
	var button_id = str(args[0])
	if _ui_buttons.has(button_id):
		_ui_buttons[button_id].queue_free()
		_ui_buttons.erase(button_id)
		print("[GameBridge] Destroyed UI button: ", button_id)

func create_ui_button(button_id: String, normal_url: String, pressed_url: String, pos_x: float, pos_y: float, btn_width: float, btn_height: float) -> void:
	if _ui_buttons.has(button_id):
		_ui_buttons[button_id].queue_free()
		_ui_buttons.erase(button_id)
	
	var button = TextureButton.new()
	button.name = button_id
	button.position = Vector2(pos_x, pos_y)
	button.custom_minimum_size = Vector2(btn_width, btn_height)
	button.size = Vector2(btn_width, btn_height)
	button.ignore_texture_size = true
	button.stretch_mode = TextureButton.STRETCH_SCALE
	
	var normal_tex = _create_placeholder_texture(normal_url, int(btn_width), int(btn_height))
	var pressed_tex = _create_placeholder_texture(pressed_url, int(btn_width), int(btn_height))
	button.texture_normal = normal_tex
	button.texture_pressed = pressed_tex
	
	button.button_down.connect(_on_ui_button_down.bind(button_id))
	button.button_up.connect(_on_ui_button_up.bind(button_id))
	button.pressed.connect(_on_ui_button_pressed.bind(button_id))
	
	var ui_layer = _get_or_create_ui_layer()
	ui_layer.add_child(button)
	_ui_buttons[button_id] = button

func destroy_ui_button(button_id: String) -> void:
	if _ui_buttons.has(button_id):
		_ui_buttons[button_id].queue_free()
		_ui_buttons.erase(button_id)

func _js_on_ui_button_event(args: Array) -> void:
	if args.size() >= 1:
		_js_ui_button_callback = args[0]

func _on_ui_button_down(button_id: String) -> void:
	print("[GameBridge] UI button down: ", button_id)
	_notify_ui_button_event("button_down", button_id)

func _on_ui_button_up(button_id: String) -> void:
	print("[GameBridge] UI button up: ", button_id)
	_notify_ui_button_event("button_up", button_id)

func _on_ui_button_pressed(button_id: String) -> void:
	print("[GameBridge] UI button pressed: ", button_id)
	_notify_ui_button_event("button_pressed", button_id)

func _notify_ui_button_event(event_type: String, button_id: String) -> void:
	if _js_ui_button_callback != null:
		_js_ui_button_callback.call("call", null, event_type, button_id)
	else:
		# Native path: queue event for polling
		_queue_event("ui_button", {"eventType": event_type, "buttonId": button_id})

func _get_or_create_ui_layer() -> CanvasLayer:
	var ui_layer = get_node_or_null("UILayer")
	if ui_layer:
		return ui_layer
	
	ui_layer = CanvasLayer.new()
	ui_layer.name = "UILayer"
	ui_layer.layer = 100  # On top of everything
	add_child(ui_layer)
	return ui_layer

func _create_placeholder_texture(url: String, width: int, height: int) -> ImageTexture:
	# Parse color from URL (supports dummyimage.com format or hex colors)
	var color = Color.GRAY
	
	# Try to extract color from dummyimage.com URL format: /200x200/COLOR/...
	if "dummyimage.com" in url:
		var parts = url.split("/")
		for i in range(parts.size()):
			if "x" in parts[i] and parts[i].is_valid_int() == false:
				# Found dimension like "200x200", next part should be color
				if i + 1 < parts.size():
					var color_str = parts[i + 1]
					if color_str.length() == 3 or color_str.length() == 6:
						color = Color.from_string("#" + color_str, Color.GRAY)
				break
	elif url.begins_with("#"):
		color = Color.from_string(url, Color.GRAY)
	
	# Create image with solid color
	var image = Image.create(max(width, 1), max(height, 1), false, Image.FORMAT_RGBA8)
	image.fill(color)
	
	var texture = ImageTexture.create_from_image(image)
	return texture

# =============================================================================
# EVENT QUEUE FOR NATIVE POLLING
# =============================================================================

func _queue_event(event_type: String, data: Dictionary) -> void:
	if _event_queue.size() >= MAX_EVENT_QUEUE_SIZE:
		_event_queue.pop_front()
	_event_queue.append({"type": event_type, "data": data})

func poll_events() -> String:
	# Return JSON string instead of Array (react-native-godot doesn't support arrays)
	if _event_queue.is_empty():
		return "[]"
	var events = _event_queue.duplicate()
	_event_queue.clear()
	return JSON.stringify(events)
