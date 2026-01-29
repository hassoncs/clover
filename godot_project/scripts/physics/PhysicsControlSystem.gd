class_name PhysicsControlSystem extends RefCounted

var _game_bridge: Node = null


func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge


func _js_pause_physics(_args: Array) -> void:
	pause_physics()


func _js_resume_physics(_args: Array) -> void:
	resume_physics()


func pause_physics() -> void:
	_game_bridge.get_tree().paused = true


func resume_physics() -> void:
	_game_bridge.get_tree().paused = false


func _js_set_linear_velocity(args: Array) -> void:
	if args.size() >= 3:
		set_linear_velocity(str(args[0]), float(args[1]), float(args[2]))


func set_linear_velocity(entity_id: String, vx: float, vy: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	if entity is RigidBody2D:
		entity.linear_velocity = _game_bridge.game_to_godot_vec(Vector2(vx, vy))
	elif entity is CharacterBody2D:
		entity.velocity = _game_bridge.game_to_godot_vec(Vector2(vx, vy))


func _js_set_angular_velocity(args: Array) -> void:
	if args.size() >= 2:
		set_angular_velocity(str(args[0]), float(args[1]))


func set_angular_velocity(entity_id: String, velocity: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	if entity is RigidBody2D:
		entity.angular_velocity = velocity


func _js_apply_impulse(args: Array) -> void:
	if args.size() >= 3:
		apply_impulse(str(args[0]), float(args[1]), float(args[2]))


func apply_impulse(entity_id: String, ix: float, iy: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	if entity is RigidBody2D:
		entity.apply_central_impulse(_game_bridge.game_to_godot_vec(Vector2(ix, iy)))


func _js_apply_force(args: Array) -> void:
	if args.size() >= 3:
		apply_force(str(args[0]), float(args[1]), float(args[2]))


func apply_force(entity_id: String, fx: float, fy: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	if entity is RigidBody2D:
		entity.apply_central_force(_game_bridge.game_to_godot_vec(Vector2(fx, fy)))


func _js_apply_torque(args: Array) -> void:
	if args.size() >= 2:
		var entity_id = str(args[0])
		var torque = float(args[1])
		if not _game_bridge.entities.has(entity_id):
			return
		var entity = _game_bridge.entities[entity_id]
		if entity is RigidBody2D:
			entity.apply_torque(torque)


func _js_get_linear_velocity(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	if not _game_bridge.entities.has(entity_id):
		return null
	var entity = _game_bridge.entities[entity_id]
	var velocity = Vector2.ZERO
	if entity is RigidBody2D:
		velocity = entity.linear_velocity
	elif entity is CharacterBody2D:
		velocity = entity.velocity
	var game_velocity = _game_bridge.godot_to_game_vec(velocity)
	return {"x": game_velocity.x, "y": game_velocity.y}


func _js_get_angular_velocity(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	if not _game_bridge.entities.has(entity_id):
		return null
	var entity = _game_bridge.entities[entity_id]
	if entity is RigidBody2D:
		return entity.angular_velocity
	return 0.0
