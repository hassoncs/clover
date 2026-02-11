class_name JSBridge
extends RefCounted

var _game_bridge: Node = null

func _init(bridge: Node) -> void:
	_game_bridge = bridge

# ============================================================================
# GAME LIFECYCLE
# ============================================================================

func _js_load_game(args: Array) -> bool:
	if args.size() < 1:
		return false
	var json_str = str(args[0])
	return _game_bridge.load_game_json(json_str)

func _js_clear_game(_args: Array) -> void:
	_game_bridge.clear_game()

func _js_pause_physics(_args: Array) -> void:
	_game_bridge.pause_physics()

func _js_resume_physics(_args: Array) -> void:
	_game_bridge.resume_physics()

func _js_load_custom_scene(args: Array) -> bool:
	if args.size() < 1:
		return false
	return _game_bridge.load_custom_scene(str(args[0]))

# ============================================================================
# ENTITY MANAGEMENT
# ============================================================================

func _js_spawn_entity(args: Array) -> void:
	if args.size() < 4:
		return
	var prefab_id = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	var entity_id = str(args[3])
	var initial_velocity_json = ""
	if args.size() >= 5 and args[4] != null:
		initial_velocity_json = str(args[4])
	_game_bridge.spawn_entity_with_id(prefab_id, x, y, entity_id, initial_velocity_json)

func _js_destroy_entity(args: Array) -> void:
	if args.size() < 1:
		return
	_game_bridge.destroy_entity(str(args[0]))

# ============================================================================
# TRANSFORM QUERIES
# ============================================================================

func _js_get_entity_transform(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	if not _game_bridge.entities.has(entity_id):
		return null
	var node = _game_bridge.entities[entity_id]
	var game_pos = _game_bridge.godot_to_game_pos(node.position)
	return {
		"x": game_pos.x,
		"y": game_pos.y,
		"angle": -node.rotation
	}

func _js_get_all_transforms(_args: Array) -> void:
	var transforms = _game_bridge.get_all_transforms()
	_game_bridge._js_bridge_obj["_lastResult"] = transforms

func _js_get_all_properties(_args: Array) -> void:
	var properties = _game_bridge.collect_all_properties()
	_game_bridge._js_bridge_obj["_lastResult"] = properties

# ============================================================================
# SYNC CALLBACKS
# ============================================================================

func _js_on_transform_sync(args: Array) -> void:
	if args.size() >= 1:
		_game_bridge._js_transform_sync_callback = args[0]

func _js_on_property_sync(args: Array) -> void:
	if args.size() >= 1:
		_game_bridge._js_property_sync_callback = args[0]

func _js_set_watch_config(args: Array) -> void:
	if args.size() >= 1:
		var config_json = str(args[0])
		var config = JSON.parse_string(config_json)
		if config:
			_game_bridge.set_watch_config(config)

# ============================================================================
# VELOCITY CONTROL
# ============================================================================

func _js_set_linear_velocity(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	if _game_bridge.entities.has(entity_id):
		var node = _game_bridge.entities[entity_id]
		var game_vel = Vector2(float(args[1]), float(args[2]))
		var godot_vel = _game_bridge.game_to_godot_vec(game_vel)
		if node is RigidBody2D:
			node.linear_velocity = godot_vel
		elif node is CharacterBody2D:
			node.velocity = godot_vel

func _js_set_angular_velocity(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	if _game_bridge.entities.has(entity_id):
		var node = _game_bridge.entities[entity_id]
		if node is RigidBody2D:
			node.angular_velocity = float(args[1])

# ============================================================================
# PHYSICS FORCES
# ============================================================================

func _js_apply_impulse(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	if _game_bridge.entities.has(entity_id):
		var node = _game_bridge.entities[entity_id]
		if node is RigidBody2D:
			var game_impulse = Vector2(float(args[1]), float(args[2]))
			node.apply_central_impulse(_game_bridge.game_to_godot_vec(game_impulse))

func _js_apply_force(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	if _game_bridge.entities.has(entity_id):
		var node = _game_bridge.entities[entity_id]
		if node is RigidBody2D:
			var game_force = Vector2(float(args[1]), float(args[2]))
			node.apply_central_force(_game_bridge.game_to_godot_vec(game_force))

# ============================================================================
# INPUT HANDLING
# ============================================================================

func _js_send_input(args: Array) -> void:
	if args.size() < 4:
		return
	var input_type = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	var provided_entity_id = str(args[3]) if args[3] != null else ""
	
	if input_type == "tap":
		var hit_entity_id: Variant = _game_bridge._hit_test(x, y)
		if hit_entity_id == "":
			hit_entity_id = null
		_game_bridge._notify_js_input_event(input_type, x, y, hit_entity_id)

func _js_on_input_event(args: Array) -> void:
	if args.size() >= 1:
		_game_bridge._js_input_event_callback = args[0]

# ============================================================================
# EVENT CALLBACKS
# ============================================================================

func _js_on_collision(args: Array) -> void:
	if args.size() >= 1:
		_game_bridge._js_collision_callback = args[0]

func _js_on_entity_destroyed(args: Array) -> void:
	if args.size() >= 1:
		_game_bridge._js_destroy_callback = args[0]

func _js_on_entity_spawned(args: Array) -> void:
	if args.size() >= 1:
		_game_bridge._js_entity_spawned_callback = args[0]

# ============================================================================
# TRANSFORM CONTROL
# ============================================================================

func _js_set_transform(args: Array) -> void:
	if args.size() < 4:
		return
	var entity_id = str(args[0])
	var game_pos = Vector2(float(args[1]), float(args[2]))
	var godot_pos = _game_bridge.game_to_godot_pos(game_pos)
	var godot_angle = -float(args[3])
	
	if _game_bridge.entities.has(entity_id):
		var node = _game_bridge.entities[entity_id]
		if node is CharacterBody2D:
			node.position = godot_pos
			node.rotation = godot_angle
		elif node is RigidBody2D:
			PhysicsServer2D.body_set_state(node.get_rid(), PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(godot_angle, godot_pos))

func _js_set_position(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	var godot_pos = _game_bridge.game_to_godot_pos(Vector2(float(args[1]), float(args[2])))
	
	if _game_bridge.entities.has(entity_id):
		var node = _game_bridge.entities[entity_id]
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
	
	if _game_bridge.entities.has(entity_id):
		var node = _game_bridge.entities[entity_id]
		if node is CharacterBody2D:
			node.rotation = angle
		elif node is RigidBody2D:
			var current_pos = node.position
			PhysicsServer2D.body_set_state(node.get_rid(), PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(angle, current_pos))
		else:
			node.rotation = angle

func _js_set_scale(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	var scale_x = float(args[1])
	var scale_y = float(args[2])
	_game_bridge.set_scale_entity(entity_id, scale_x, scale_y)

# ============================================================================
# VELOCITY GETTERS
# ============================================================================

func _js_get_linear_velocity(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	if _game_bridge.entities.has(entity_id):
		var node = _game_bridge.entities[entity_id]
		if node is RigidBody2D:
			var game_vel = _game_bridge.godot_to_game_vec(node.linear_velocity)
			return {"x": game_vel.x, "y": game_vel.y}
		elif node is Area2D and node.has_meta("velocity"):
			var godot_vel = node.get_meta("velocity") as Vector2
			var game_vel = _game_bridge.godot_to_game_vec(godot_vel)
			return {"x": game_vel.x, "y": game_vel.y}
	return null

func _js_get_angular_velocity(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	if _game_bridge.entities.has(entity_id):
		var node = _game_bridge.entities[entity_id]
		if node is RigidBody2D:
			return node.angular_velocity
	return null

func _js_apply_torque(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	if _game_bridge.entities.has(entity_id):
		var node = _game_bridge.entities[entity_id]
		if node is RigidBody2D:
			node.apply_torque(float(args[1]))
