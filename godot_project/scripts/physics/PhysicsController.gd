class_name PhysicsController
extends RefCounted

var bridge: Node

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

func set_linear_velocity(entity_id: String, vx: float, vy: float) -> void:
	if not bridge.entities.has(entity_id):
		return
	
	var node = bridge.entities[entity_id]
	var godot_vel = CoordinateUtils.game_to_godot_vec(Vector2(vx, vy), bridge.pixels_per_meter)
	
	if node is RigidBody2D:
		node.linear_velocity = godot_vel
	elif node is Area2D:
		bridge.sensor_velocities[entity_id] = godot_vel

func get_linear_velocity(entity_id: String) -> Variant:
	if not bridge.entities.has(entity_id):
		return null
	
	var node = bridge.entities[entity_id]
	var godot_vel = Vector2.ZERO
	
	if node is RigidBody2D:
		godot_vel = node.linear_velocity
	elif node is Area2D and bridge.sensor_velocities.has(entity_id):
		godot_vel = bridge.sensor_velocities[entity_id]
	
	var game_vel = CoordinateUtils.godot_to_game_vec(godot_vel, bridge.pixels_per_meter)
	return {"x": game_vel.x, "y": game_vel.y}

func set_angular_velocity(entity_id: String, velocity: float) -> void:
	if not bridge.entities.has(entity_id):
		return
	var node = bridge.entities[entity_id]
	if node is RigidBody2D:
		node.angular_velocity = -velocity

func get_angular_velocity(entity_id: String) -> Variant:
	if not bridge.entities.has(entity_id):
		return null
	var node = bridge.entities[entity_id]
	if node is RigidBody2D:
		return -node.angular_velocity
	return 0.0

func apply_impulse(entity_id: String, ix: float, iy: float) -> void:
	if not bridge.entities.has(entity_id):
		return
	var node = bridge.entities[entity_id]
	if node is RigidBody2D:
		var godot_impulse = CoordinateUtils.game_to_godot_vec(Vector2(ix, iy), bridge.pixels_per_meter)
		node.apply_central_impulse(godot_impulse)

func apply_force(entity_id: String, fx: float, fy: float) -> void:
	if not bridge.entities.has(entity_id):
		return
	var node = bridge.entities[entity_id]
	if node is RigidBody2D:
		var godot_force = CoordinateUtils.game_to_godot_vec(Vector2(fx, fy), bridge.pixels_per_meter)
		node.apply_central_force(godot_force)

func apply_torque(entity_id: String, torque: float) -> void:
	if not bridge.entities.has(entity_id):
		return
	var node = bridge.entities[entity_id]
	if node is RigidBody2D:
		var godot_torque = -torque * bridge.pixels_per_meter * bridge.pixels_per_meter
		node.apply_torque(godot_torque)

func set_transform(entity_id: String, x: float, y: float, angle: float) -> void:
	if not bridge.entities.has(entity_id):
		return
	var node = bridge.entities[entity_id]
	var godot_pos = CoordinateUtils.game_to_godot_pos(Vector2(x, y), bridge.pixels_per_meter)
	node.position = godot_pos
	node.rotation = -angle

func set_position(entity_id: String, x: float, y: float) -> void:
	if not bridge.entities.has(entity_id):
		return
	var node = bridge.entities[entity_id]
	var godot_pos = CoordinateUtils.game_to_godot_pos(Vector2(x, y), bridge.pixels_per_meter)
	node.position = godot_pos

func set_rotation(entity_id: String, angle: float) -> void:
	if not bridge.entities.has(entity_id):
		return
	var node = bridge.entities[entity_id]
	node.rotation = -angle

func get_entity_transform(entity_id: String) -> Variant:
	if not bridge.entities.has(entity_id):
		return null
	var node = bridge.entities[entity_id]
	if not is_instance_valid(node):
		return null
	var game_pos = CoordinateUtils.godot_to_game_pos(node.position, bridge.pixels_per_meter)
	return {"x": game_pos.x, "y": game_pos.y, "angle": -node.rotation}
