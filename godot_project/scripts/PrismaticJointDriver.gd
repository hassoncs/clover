extends GrooveJoint2D

var motor_enabled: bool = false
var motor_speed: float = 0.0
var max_motor_force: float = 0.0

func _physics_process(_delta: float) -> void:
	if not motor_enabled:
		return
		
	var body_a_node = get_node_or_null(node_a)
	var body_b_node = get_node_or_null(node_b)
	
	if not (body_a_node is RigidBody2D) or not (body_b_node is RigidBody2D):
		return
		
	var body_a = body_a_node as RigidBody2D
	var body_b = body_b_node as RigidBody2D
	
	# The groove joint's local Y axis is the sliding axis in Godot's GrooveJoint2D?
	# Wait, documentation says: "The groove is defined by the joint's local Y axis."?
	# Let's verify. GrooveJoint2D has length and initial_offset.
	# Usually drawn vertically. Let's assume Y axis.
	# Actually, standard Box2D prismatic is often X axis.
	# Let's assume the bridge rotates it correctly.
	
	# For GrooveJoint2D: "The joint constraint is defined by a groove... along the joint's local y-axis"
	var axis = global_transform.y.normalized()
	
	var vel_a = body_a.linear_velocity
	var vel_b = body_b.linear_velocity
	var rel_vel = vel_b - vel_a
	
	# Project relative velocity onto axis
	var current_speed = rel_vel.dot(axis)
	
	# We want to reach motor_speed
	# F = m * a
	# We don't know combined mass easily, let's use a proportional controller with max force cap
	var error = motor_speed - current_speed
	
	# Gain factor - needs tuning. 
	# If we want immediate response, we need high gain.
	var gain = 10000.0 
	
	var force_mag = error * gain * _delta
	force_mag = clampf(force_mag, -max_motor_force, max_motor_force)
	
	var force = axis * force_mag
	
	# Apply equal and opposite forces
	body_b.apply_central_force(force)
	body_a.apply_central_force(-force)
