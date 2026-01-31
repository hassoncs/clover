class_name PhysicsController
extends RefCounted

var bridge: Node

func _init(bridge: Node) -> void:
	self.bridge = bridge

func set_linear_velocity(entity_id: String, vx: float, vy: float) -> void:
	if not bridge.entities.has(entity_id):
		return
	
	var node = bridge.entities[entity_id]
	var godot_vel = CoordinateUtils.game_to_godot_vec(Vector2(vx, vy), bridge.pixels_per_meter)
	
	if node is RigidBody2D:
		node.linear_velocity = godot_vel
	elif node is Area2D:
		node.set_meta("velocity", godot_vel)

func get_linear_velocity(entity_id: String) -> Variant:
	if not bridge.entities.has(entity_id):
		return null
	
	var node = bridge.entities[entity_id]
	var godot_vel = Vector2.ZERO
	
	if node is RigidBody2D:
		godot_vel = node.linear_velocity
	elif node is Area2D and node.has_meta("velocity"):
		godot_vel = node.get_meta("velocity")
	
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
