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

var ws: WebSocketPeer = null
var ws_url: String = "ws://localhost:8789"

var _js_collision_callback: JavaScriptObject = null
var _js_destroy_callback: JavaScriptObject = null

var _js_callbacks: Array = []
var _js_bridge_obj: JavaScriptObject = null

var _texture_cache: Dictionary = {}
var _pending_textures: Array = []

# Joint management
var joints: Dictionary = {}
var joint_counter: int = 0

# Sensor management (Area2D nodes for isSensor entities)
var sensors: Dictionary = {}
var _js_sensor_begin_callback: JavaScriptObject = null
var _js_sensor_end_callback: JavaScriptObject = null
var _js_input_event_callback: JavaScriptObject = null

# Collision manifold tracking (for detailed contact info)
var _active_contacts: Dictionary = {}  # "entityA:entityB" -> last_impulse_time
const IMPULSE_THRESHOLD: float = 0.01  # Minimum impulse to report

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

func _ready() -> void:
	print("[GameBridge] Initialized")
	_setup_js_bridge()

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
	
	window["GodotBridge"] = _js_bridge_obj
	print("[GameBridge] JavaScript bridge exposed as window.GodotBridge")

func _js_load_game(args: Array) -> bool:
	print("[GameBridge] _js_load_game called with ", args.size(), " args")
	if args.size() < 1:
		print("[GameBridge] No args provided")
		return false
	var json_str = str(args[0])
	print("[GameBridge] JSON length: ", json_str.length())
	return load_game_json(json_str)

func _js_clear_game(_args: Array) -> void:
	clear_game()

func _js_spawn_entity(args: Array) -> void:
	print("[GameBridge] _js_spawn_entity called with ", args.size(), " args")
	if args.size() < 4:
		print("[GameBridge] Not enough args for spawn")
		return
	print("[GameBridge] Spawning ", str(args[0]), " at ", float(args[1]), ", ", float(args[2]))
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
	return {
		"x": node.position.x / pixels_per_meter,
		"y": node.position.y / pixels_per_meter,
		"angle": node.rotation
	}

func _js_get_all_transforms(_args: Array) -> Dictionary:
	return get_all_transforms()

func _js_set_linear_velocity(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.linear_velocity = Vector2(float(args[1]), float(args[2])) * pixels_per_meter

func _js_set_angular_velocity(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.angular_velocity = float(args[1])

func _js_apply_impulse(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.apply_central_impulse(Vector2(float(args[1]), float(args[2])) * pixels_per_meter)

func _js_apply_force(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			node.apply_central_force(Vector2(float(args[1]), float(args[2])) * pixels_per_meter)

func _js_send_input(args: Array) -> void:
	if args.size() < 4:
		return
	var input_type = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	var provided_entity_id = str(args[3]) if args[3] != null else ""
	
	if input_type == "tap":
		var hit_entity_id: Variant = null
		
		var point = Vector2(x, y) * pixels_per_meter
		var space = get_viewport().find_world_2d().direct_space_state
		if space:
			var query = PhysicsPointQueryParameters2D.new()
			query.position = point
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
		_js_input_event_callback.call("call", null, [input_type, x, y, entity_id])

func _js_on_collision(args: Array) -> void:
	if args.size() >= 1:
		_js_collision_callback = args[0]

func _js_on_entity_destroyed(args: Array) -> void:
	if args.size() >= 1:
		_js_destroy_callback = args[0]

func _notify_js_collision(entity_a: String, entity_b: String, impulse: float) -> void:
	if _js_collision_callback != null:
		# Legacy format for backward compatibility
		_js_collision_callback.call("call", null, [entity_a, entity_b, impulse])

func _notify_js_collision_detailed(collision_data: Dictionary) -> void:
	if _js_collision_callback != null:
		# New detailed format: { entityA, entityB, contacts: [{point, normal, normalImpulse, tangentImpulse}] }
		var json_str = JSON.stringify(collision_data)
		_js_collision_callback.call("call", null, [json_str])

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
		
		# Get contact data
		var contact_pos = state.get_contact_local_position(i) / pixels_per_meter
		var contact_normal = state.get_contact_local_normal(i)
		var impulse_vec = state.get_contact_impulse(i)
		var normal_impulse = impulse_vec.dot(contact_normal)
		var tangent = Vector2(-contact_normal.y, contact_normal.x)
		var tangent_impulse = impulse_vec.dot(tangent)
		
		# Only report if impulse is significant (avoid spam for resting contacts)
		if abs(normal_impulse) < IMPULSE_THRESHOLD and abs(tangent_impulse) < IMPULSE_THRESHOLD:
			continue
		
		if not contacts_by_body.has(entity_b):
			contacts_by_body[entity_b] = []
		
		contacts_by_body[entity_b].append({
			"point": {"x": contact_pos.x, "y": contact_pos.y},
			"normal": {"x": contact_normal.x, "y": contact_normal.y},
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
		_js_destroy_callback.call("call", null, [entity_id])

func _process(_delta: float) -> void:
	if ws:
		ws.poll()
		var state = ws.get_ready_state()
		if state == WebSocketPeer.STATE_OPEN:
			while ws.get_available_packet_count() > 0:
				var packet = ws.get_packet()
				_on_ws_message(packet.get_string_from_utf8())
		elif state == WebSocketPeer.STATE_CLOSED:
			print("[GameBridge] WebSocket closed: ", ws.get_close_code(), " ", ws.get_close_reason())
			ws = null

# Connect to WebSocket server
func connect_to_server(url: String = "") -> void:
	if url != "":
		ws_url = url
	ws = WebSocketPeer.new()
	var err = ws.connect_to_url(ws_url)
	if err != OK:
		print("[GameBridge] WebSocket connection failed: ", err)
		ws = null
	else:
		print("[GameBridge] Connecting to ", ws_url)

func _on_ws_message(message: String) -> void:
	print("[GameBridge] WS Message: ", message)
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
	print("[GameBridge] Loading game: ", game_data.get("metadata", {}).get("title", "Untitled"))
	
	# Clear existing game
	clear_game()
	
	# Setup world
	_setup_world(game_data.get("world", {}))
	
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
	
	var gravity = world_data.get("gravity", {"x": 0, "y": 9.8})
	var gravity_vec = Vector2(gravity.x, gravity.y) * pixels_per_meter
	
	# Set physics gravity
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
	print("[GameBridge] World gravity set to: ", gravity_vec)

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
	
	# Set transform (convert from meters to pixels)
	var x = transform_data.get("x", 0) * pixels_per_meter
	var y = transform_data.get("y", 0) * pixels_per_meter
	var angle = transform_data.get("angle", 0)
	node.position = Vector2(x, y)
	node.rotation = angle
	
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
	
	entities[entity_id] = node
	entity_spawned.emit(entity_id, node)
	
	print("[GameBridge] Created entity: ", entity_id, " at ", node.position)
	return node

func _create_physics_body(entity_id: String, physics_data: Dictionary, transform_data: Dictionary) -> Node2D:
	var body_type = physics_data.get("bodyType", "dynamic")
	var is_sensor = physics_data.get("isSensor", false)
	var node: Node2D
	
	# For sensors, use Area2D instead of physics body
	if is_sensor:
		var area = Area2D.new()
		area.name = entity_id
		area.body_entered.connect(_on_sensor_body_entered.bind(entity_id))
		area.body_exited.connect(_on_sensor_body_exited.bind(entity_id))
		
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
				points.append(Vector2(v.x, v.y) * pixels_per_meter)
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
			polygon.color = color
			polygon.z_index = z_index_val
			node.add_child(polygon)
		"circle":
			var polygon = Polygon2D.new()
			var radius = sprite_data.get("radius", physics_data.get("radius", 0.5) if physics_data else 0.5) * pixels_per_meter
			var points: PackedVector2Array = []
			for i in range(32):
				var angle = i * TAU / 32
				points.append(Vector2(cos(angle), sin(angle)) * radius)
			polygon.polygon = points
			color.a = opacity
			polygon.color = color
			polygon.z_index = z_index_val
			node.add_child(polygon)
		"polygon":
			var polygon = Polygon2D.new()
			var vertices = sprite_data.get("vertices", [])
			var points: PackedVector2Array = []
			for v in vertices:
				points.append(Vector2(v.x, v.y) * pixels_per_meter)
			polygon.polygon = points
			color.a = opacity
			polygon.color = color
			polygon.z_index = z_index_val
			node.add_child(polygon)
		"image":
			_add_image_sprite(node, sprite_data, opacity, z_index_val)
		"text":
			_add_text_sprite(node, sprite_data, opacity, z_index_val)

func _add_image_sprite(node: Node2D, sprite_data: Dictionary, opacity: float, z_index_val: int) -> void:
	var sprite = Sprite2D.new()
	var url = sprite_data.get("url", "")
	
	if url.begins_with("res://"):
		var texture = load(url)
		if texture:
			sprite.texture = texture
			var target_w = sprite_data.get("width", 1.0) * pixels_per_meter
			var target_h = sprite_data.get("height", 1.0) * pixels_per_meter
			sprite.scale = Vector2(
				target_w / texture.get_width(),
				target_h / texture.get_height()
			)
	else:
		_queue_texture_download(sprite, url, sprite_data)
	
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
		
		print("[GameBridge] Loaded texture: ", url)
	)
	
	var err = http.request(url)
	if err != OK:
		push_error("[GameBridge] Failed to start texture download: " + url)
		http.queue_free()

func _apply_sprite_scale(sprite: Sprite2D, sprite_data: Dictionary, texture: Texture2D) -> void:
	if texture == null:
		return
	var target_w = sprite_data.get("width", 1.0) * pixels_per_meter
	var target_h = sprite_data.get("height", 1.0) * pixels_per_meter
	sprite.scale = Vector2(
		target_w / texture.get_width(),
		target_h / texture.get_height()
	)

func _js_set_entity_image(args: Array) -> void:
	if args.size() < 4:
		push_error("[GameBridge] setEntityImage requires 4 args: entity_id, url, width, height")
		return
	var entity_id = str(args[0])
	var url = str(args[1])
	var width = float(args[2])
	var height = float(args[3])
	
	if not entities.has(entity_id):
		push_error("[GameBridge] setEntityImage: entity not found: " + entity_id)
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
		print("[GameBridge] setEntityImage: applied cached texture for ", entity_id)
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
		
		print("[GameBridge] setEntityImage: loaded texture for ", entity_id, " from ", url)
	)
	
	var err = http.request(url)
	if err != OK:
		push_error("[GameBridge] Failed to start texture download: " + url)
		http.queue_free()

func _js_clear_texture_cache(args: Array) -> void:
	if args.size() > 0 and str(args[0]) != "":
		var url = str(args[0])
		if _texture_cache.has(url):
			_texture_cache.erase(url)
			print("[GameBridge] Cleared texture cache for: ", url)
	else:
		_texture_cache.clear()
		print("[GameBridge] Cleared entire texture cache")

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
		node.queue_free()
		entity_destroyed.emit(entity_id)
		_notify_js_destroy(entity_id)

# Get entity node by ID
func get_entity(entity_id: String) -> Node2D:
	return entities.get(entity_id)

# Get all entity transforms (for syncing)
func get_all_transforms() -> Dictionary:
	var result = {}
	for entity_id in entities:
		var node = entities[entity_id]
		result[entity_id] = {
			"x": node.position.x / pixels_per_meter,
			"y": node.position.y / pixels_per_meter,
			"angle": node.rotation
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
	user_data.clear()
	body_groups.clear()

# =============================================================================
# TRANSFORM CONTROL
# =============================================================================

func _js_set_transform(args: Array) -> void:
	if args.size() < 4:
		return
	var entity_id = str(args[0])
	var x = float(args[1]) * pixels_per_meter
	var y = float(args[2]) * pixels_per_meter
	var angle = float(args[3])
	
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.position = Vector2(x, y)
			node.rotation = angle
		elif node is RigidBody2D:
			# For RigidBody2D, we need to use physics server or _integrate_forces
			PhysicsServer2D.body_set_state(node.get_rid(), PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(angle, Vector2(x, y)))

func _js_set_position(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	var x = float(args[1]) * pixels_per_meter
	var y = float(args[2]) * pixels_per_meter
	
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is CharacterBody2D:
			node.position = Vector2(x, y)
		elif node is RigidBody2D:
			var current_angle = node.rotation
			PhysicsServer2D.body_set_state(node.get_rid(), PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(current_angle, Vector2(x, y)))
		else:
			node.position = Vector2(x, y)

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

func _js_get_linear_velocity(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	if entities.has(entity_id):
		var node = entities[entity_id]
		if node is RigidBody2D:
			var vel = node.linear_velocity / pixels_per_meter
			return {"x": vel.x, "y": vel.y}
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

# =============================================================================
# JOINT SYSTEM
# =============================================================================

func _js_create_revolute_joint(args: Array) -> int:
	# args: [bodyA_id, bodyB_id, anchorX, anchorY, enableLimit, lowerAngle, upperAngle, enableMotor, motorSpeed, maxMotorTorque]
	if args.size() < 4:
		return -1
	
	var entity_a = str(args[0])
	var entity_b = str(args[1])
	var anchor_x = float(args[2]) * pixels_per_meter
	var anchor_y = float(args[3]) * pixels_per_meter
	
	if not entities.has(entity_a) or not entities.has(entity_b):
		return -1
	
	var node_a = entities[entity_a]
	var node_b = entities[entity_b]
	
	var joint = PinJoint2D.new()
	joint.position = Vector2(anchor_x, anchor_y)
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
	var anchor_a = Vector2(float(args[2]), float(args[3])) * pixels_per_meter
	var anchor_b = Vector2(float(args[4]), float(args[5])) * pixels_per_meter
	
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
	var anchor = Vector2(float(args[2]), float(args[3])) * pixels_per_meter
	var axis_vec = Vector2(float(args[4]), float(args[5])).normalized()
	
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
	var anchor = Vector2(float(args[2]), float(args[3])) * pixels_per_meter
	
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
	print("[GameBridge] create_mouse_joint: entity='%s', target=(%s, %s)" % [entity_id, target_x, target_y])
	
	if not entities.has(entity_id):
		print("[GameBridge] create_mouse_joint: entity '%s' not found" % entity_id)
		return -1
	
	joint_counter += 1
	joints[joint_counter] = {
		"type": "mouse",
		"entity_id": entity_id,
		"target": Vector2(target_x, target_y) * pixels_per_meter,
		"max_force": max_force,
		"stiffness": stiffness,
		"damping": damping
	}
	print("[GameBridge] create_mouse_joint: created joint %d for entity '%s'" % [joint_counter, entity_id])
	return joint_counter

func set_mouse_target(joint_id: int, target_x: float, target_y: float) -> void:
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is Dictionary and joint.get("type") == "mouse":
			joint["target"] = Vector2(target_x, target_y) * pixels_per_meter

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
	var target_x = float(args[1]) * pixels_per_meter
	var target_y = float(args[2]) * pixels_per_meter
	var max_force = float(args[3])
	
	if not entities.has(entity_id):
		print("[GameBridge] createMouseJoint: entity '%s' not found" % entity_id)
		JavaScriptBridge.eval("window.GodotBridge._lastResult = -1;")
		return
	
	# Store mouse joint data (we'll apply forces in _physics_process)
	joint_counter += 1
	joints[joint_counter] = {
		"type": "mouse",
		"entity_id": entity_id,
		"target": Vector2(target_x, target_y),
		"max_force": max_force,
		"stiffness": float(args[4]) if args.size() > 4 else 5.0,
		"damping": float(args[5]) if args.size() > 5 else 0.7
	}
	print("[GameBridge] createMouseJoint: created joint %d for entity '%s'" % [joint_counter, entity_id])
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

func _js_set_mouse_target(args: Array) -> void:
	if args.size() < 3:
		return
	var joint_id = int(args[0])
	var target_x = float(args[1]) * pixels_per_meter
	var target_y = float(args[2]) * pixels_per_meter
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is Dictionary and joint.get("type") == "mouse":
			joint["target"] = Vector2(target_x, target_y)

# =============================================================================
# PHYSICS QUERIES
# =============================================================================

func _js_query_point(args: Array) -> Variant:
	if args.size() < 2:
		return null
	var point = Vector2(float(args[0]), float(args[1])) * pixels_per_meter
	
	var space = get_viewport().find_world_2d().direct_space_state
	var query = PhysicsPointQueryParameters2D.new()
	query.position = point
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
		print("[GameBridge] queryPointEntity: not enough args")
		JavaScriptBridge.eval("window.GodotBridge._lastResult = null;")
		return
	var point = Vector2(float(args[0]), float(args[1])) * pixels_per_meter
	print("[GameBridge] queryPointEntity: world=(%s, %s) -> pixels=(%s, %s)" % [args[0], args[1], point.x, point.y])
	
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
			print("[GameBridge]   entity '%s' at pixels (%s, %s), layer=%s, %s" % [eid, e.position.x, e.position.y, e.collision_layer, shape_info])
	
	var space = get_viewport().find_world_2d().direct_space_state
	if not space:
		print("[GameBridge] queryPointEntity: no physics space!")
		JavaScriptBridge.eval("window.GodotBridge._lastResult = null;")
		return
	
	var query = PhysicsPointQueryParameters2D.new()
	query.position = point
	query.collision_mask = 0xFFFFFFFF
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_point(query, 32)
	print("[GameBridge] queryPointEntity: found %s results" % results.size())
	for i in range(results.size()):
		var collider = results[i].collider
		print("[GameBridge]   result[%s]: %s (name=%s)" % [i, collider, collider.name if collider else "null"])
	
	if results.size() > 0:
		var collider = results[0].collider
		if collider and collider.name in entities:
			var entity_name = collider.name
			print("[GameBridge] queryPointEntity: returning '%s'" % entity_name)
			var js_code = "console.log('[GDScript eval] Setting _lastResult to: %s'); window.GodotBridge._lastResult = '%s';" % [entity_name, entity_name]
			print("[GameBridge] Executing JS: %s" % js_code)
			JavaScriptBridge.eval(js_code)
			return
	JavaScriptBridge.eval("console.log('[GDScript eval] Setting _lastResult to null'); window.GodotBridge._lastResult = null;")

# Synchronous version for native (react-native-godot) - returns entity_id directly
func query_point_entity(x: float, y: float) -> Variant:
	var point = Vector2(x, y) * pixels_per_meter
	print("[GameBridge] query_point_entity: world=(%s, %s) -> pixels=(%s, %s)" % [x, y, point.x, point.y])
	
	var space = get_viewport().find_world_2d().direct_space_state
	if not space:
		print("[GameBridge] query_point_entity: no physics space!")
		return null
	
	var query = PhysicsPointQueryParameters2D.new()
	query.position = point
	query.collision_mask = 0xFFFFFFFF
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_point(query, 32)
	print("[GameBridge] query_point_entity: found %s results" % results.size())
	
	if results.size() > 0:
		var collider = results[0].collider
		if collider and collider.name in entities:
			print("[GameBridge] query_point_entity: returning '%s'" % collider.name)
			return collider.name
	return null

func query_point_entity_async(request_id: int, x: float, y: float) -> void:
	var point = Vector2(x, y) * pixels_per_meter
	
	var space = get_viewport().find_world_2d().direct_space_state
	if not space:
		emit_signal("query_result", request_id, null)
		return
	
	var query = PhysicsPointQueryParameters2D.new()
	query.position = point
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
		"target": Vector2(target_x, target_y) * pixels_per_meter,
		"max_force": max_force,
		"stiffness": stiffness,
		"damping": damping
	}
	emit_signal("joint_created", request_id, joint_counter)

func _js_query_aabb(args: Array) -> Array:
	if args.size() < 4:
		return []
	var min_x = float(args[0]) * pixels_per_meter
	var min_y = float(args[1]) * pixels_per_meter
	var max_x = float(args[2]) * pixels_per_meter
	var max_y = float(args[3]) * pixels_per_meter
	
	var space = get_viewport().find_world_2d().direct_space_state
	
	# Create a rectangle shape for AABB query
	var shape = RectangleShape2D.new()
	shape.size = Vector2(max_x - min_x, max_y - min_y)
	
	var query = PhysicsShapeQueryParameters2D.new()
	query.shape = shape
	query.transform = Transform2D(0, Vector2((min_x + max_x) / 2, (min_y + max_y) / 2))
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
	var origin = Vector2(float(args[0]), float(args[1])) * pixels_per_meter
	var dir_x = float(args[2])
	var dir_y = float(args[3])
	var max_distance = float(args[4]) * pixels_per_meter
	
	var direction = Vector2(dir_x, dir_y).normalized()
	var end = origin + direction * max_distance
	
	var space = get_viewport().find_world_2d().direct_space_state
	var query = PhysicsRayQueryParameters2D.create(origin, end)
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var result = space.intersect_ray(query)
	if result:
		var collider = result.collider
		if collider and collider.name in entities:
			var entity_id = collider.name
			var body_id = body_id_map.get(entity_id, -1)
			var collider_id = -1  # TODO: proper collider tracking
			var hit_point = result.position / pixels_per_meter
			var normal = result.normal
			var fraction = origin.distance_to(result.position) / max_distance
			return {
				"bodyId": body_id,
				"colliderId": collider_id,
				"point": {"x": hit_point.x, "y": hit_point.y},
				"normal": {"x": normal.x, "y": normal.y},
				"fraction": fraction
			}
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

func _notify_sensor_begin(sensor_id: String, other_entity: String) -> void:
	if _js_sensor_begin_callback != null:
		var sensor_collider_id = collider_id_map.get(sensor_id, {}).get("collider_id", -1)
		var other_body_id = body_id_map.get(other_entity, -1)
		_js_sensor_begin_callback.call("call", null, [sensor_collider_id, other_body_id, -1])

func _notify_sensor_end(sensor_id: String, other_entity: String) -> void:
	if _js_sensor_end_callback != null:
		var sensor_collider_id = collider_id_map.get(sensor_id, {}).get("collider_id", -1)
		var other_body_id = body_id_map.get(other_entity, -1)
		_js_sensor_end_callback.call("call", null, [sensor_collider_id, other_body_id, -1])

# =============================================================================
# BODY/COLLIDER MANAGEMENT (Physics2D API style)
# =============================================================================

func _js_create_body(args: Array) -> int:
	# args: [type, posX, posY, angle, linearDamping, angularDamping, fixedRotation, bullet, userData, group]
	if args.size() < 3:
		return -1
	
	var body_type = str(args[0])
	var pos_x = float(args[1]) * pixels_per_meter
	var pos_y = float(args[2]) * pixels_per_meter
	var angle = float(args[3]) if args.size() > 3 else 0.0
	
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
	node.position = Vector2(pos_x, pos_y)
	node.rotation = angle
	
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
				var vy = float(args[4 + i * 2]) * pixels_per_meter
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
		area.body_entered.connect(_on_sensor_body_entered.bind(entity_id))
		area.body_exited.connect(_on_sensor_body_exited.bind(entity_id))
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

func _js_get_all_bodies(args: Array) -> Array:
	var result: Array = []
	for body_id in body_id_reverse:
		result.append(body_id)
	return result

func _on_sensor_body_entered(body: Node, sensor_entity_id: String) -> void:
	if body.name in entities:
		_notify_sensor_begin(sensor_entity_id, body.name)

func _on_sensor_body_exited(body: Node, sensor_entity_id: String) -> void:
	if body.name in entities:
		_notify_sensor_end(sensor_entity_id, body.name)

# =============================================================================
# PHYSICS PROCESS (for mouse joints and other continuous effects)
# =============================================================================

func _physics_process(delta: float) -> void:
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
