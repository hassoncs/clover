class_name JointManager
extends RefCounted

var bridge: Node
var joints: Dictionary = {}
var joint_counter: int = 0

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

func create_revolute_joint(entity_a: String, entity_b: String, anchor_x: float, anchor_y: float, 
		enable_limit: bool = false, lower_angle: float = 0.0, upper_angle: float = 0.0,
		enable_motor: bool = false, motor_speed: float = 0.0, max_motor_torque: float = 0.0) -> int:
	
	var godot_anchor = CoordinateUtils.game_to_godot_pos(Vector2(anchor_x, anchor_y), bridge.pixels_per_meter)
	
	if not bridge.entities.has(entity_a) or not bridge.entities.has(entity_b):
		return -1
	
	var node_a = bridge.entities[entity_a]
	var node_b = bridge.entities[entity_b]
	
	var joint = PinJoint2D.new()
	joint.position = godot_anchor
	joint.node_a = node_a.get_path()
	joint.node_b = node_b.get_path()
	
	if enable_motor:
		joint.motor_enabled = true
		joint.motor_target_velocity = motor_speed
	
	var main = bridge.get_tree().current_scene
	if main:
		main.add_child(joint)
	
	joint_counter += 1
	joints[joint_counter] = joint
	return joint_counter

func create_distance_joint(entity_a: String, entity_b: String, 
		anchor_ax: float, anchor_ay: float, anchor_bx: float, anchor_by: float,
		length: float = 0.0, stiffness: float = 0.0, damping: float = 0.0) -> int:
	
	var anchor_a = CoordinateUtils.game_to_godot_pos(Vector2(anchor_ax, anchor_ay), bridge.pixels_per_meter)
	var anchor_b = CoordinateUtils.game_to_godot_pos(Vector2(anchor_bx, anchor_by), bridge.pixels_per_meter)
	
	if not bridge.entities.has(entity_a) or not bridge.entities.has(entity_b):
		return -1
	
	var node_a = bridge.entities[entity_a]
	var node_b = bridge.entities[entity_b]
	
	var joint = DampedSpringJoint2D.new()
	joint.position = anchor_a
	joint.node_a = node_a.get_path()
	joint.node_b = node_b.get_path()
	
	var joint_length = anchor_a.distance_to(anchor_b)
	if length > 0:
		joint_length = length * bridge.pixels_per_meter
	joint.length = joint_length
	joint.rest_length = joint_length
	
	if stiffness > 0:
		joint.stiffness = stiffness
	if damping > 0:
		joint.damping = damping
	
	var main = bridge.get_tree().current_scene
	if main:
		main.add_child(joint)
	
	joint_counter += 1
	joints[joint_counter] = joint
	return joint_counter

func create_prismatic_joint(entity_a: String, entity_b: String,
		anchor_x: float, anchor_y: float, axis_x: float, axis_y: float,
		enable_limit: bool = false, lower_trans: float = 0.0, upper_trans: float = 0.0,
		enable_motor: bool = false, motor_speed: float = 0.0, max_motor_force: float = 0.0) -> int:
	
	var anchor = CoordinateUtils.game_to_godot_pos(Vector2(anchor_x, anchor_y), bridge.pixels_per_meter)
	var axis_vec = Vector2(axis_x, -axis_y).normalized()
	
	if not bridge.entities.has(entity_a) or not bridge.entities.has(entity_b):
		return -1
	
	var node_a = bridge.entities[entity_a]
	var node_b = bridge.entities[entity_b]
	
	var joint = GrooveJoint2D.new()
	joint.position = anchor
	joint.node_a = node_a.get_path()
	joint.node_b = node_b.get_path()
	joint.rotation = Vector2(0, 1).angle_to(axis_vec)
	
	var lower = 0.0
	var upper = 100.0
	if enable_limit:
		lower = lower_trans * bridge.pixels_per_meter
		upper = upper_trans * bridge.pixels_per_meter
	joint.length = upper - lower
	joint.initial_offset = -lower
	
	joint.set_script(load("res://scripts/PrismaticJointDriver.gd"))
	joint.motor_enabled = enable_motor
	joint.motor_speed = motor_speed * bridge.pixels_per_meter
	joint.max_motor_force = max_motor_force * bridge.pixels_per_meter
	
	var main = bridge.get_tree().current_scene
	if main:
		main.add_child(joint)
	
	joint_counter += 1
	joints[joint_counter] = joint
	return joint_counter

func create_weld_joint(entity_a: String, entity_b: String,
		anchor_x: float, anchor_y: float, stiffness: float = 0.0, damping: float = 0.0) -> int:
	
	var anchor = CoordinateUtils.game_to_godot_pos(Vector2(anchor_x, anchor_y), bridge.pixels_per_meter)
	
	if not bridge.entities.has(entity_a) or not bridge.entities.has(entity_b):
		return -1
	
	var node_a = bridge.entities[entity_a]
	var node_b = bridge.entities[entity_b]
	
	var container = Node2D.new()
	container.name = "WeldJoint_%d" % (joint_counter + 1)
	
	var joint1 = PinJoint2D.new()
	joint1.position = anchor
	joint1.node_a = node_a.get_path()
	joint1.node_b = node_b.get_path()
	container.add_child(joint1)
	
	var joint2 = PinJoint2D.new()
	joint2.position = anchor + Vector2(10, 0)
	joint2.node_a = node_a.get_path()
	joint2.node_b = node_b.get_path()
	container.add_child(joint2)
	
	var main = bridge.get_tree().current_scene
	if main:
		main.add_child(container)
	
	joint_counter += 1
	joints[joint_counter] = container
	return joint_counter

func create_mouse_joint(entity_id: String, target_x: float, target_y: float,
		max_force: float, stiffness: float, damping: float) -> int:
	
	if not bridge.entities.has(entity_id):
		return -1
	
	joint_counter += 1
	joints[joint_counter] = {
		"type": "mouse",
		"entity_id": entity_id,
		"target": CoordinateUtils.game_to_godot_pos(Vector2(target_x, target_y), bridge.pixels_per_meter),
		"max_force": max_force,
		"stiffness": stiffness,
		"damping": damping
	}
	return joint_counter

func set_mouse_target(joint_id: int, target_x: float, target_y: float) -> void:
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is Dictionary and joint.get("type") == "mouse":
			joint["target"] = CoordinateUtils.game_to_godot_pos(Vector2(target_x, target_y), bridge.pixels_per_meter)

func set_motor_speed(joint_id: int, speed: float) -> void:
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is PinJoint2D:
			joint.motor_target_velocity = speed
		elif joint is GrooveJoint2D:
			joint.motor_speed = speed * bridge.pixels_per_meter

func destroy_joint(joint_id: int) -> void:
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is Node:
			joint.queue_free()
		joints.erase(joint_id)

func process_mouse_joints(delta: float) -> void:
	for joint_id in joints:
		var joint = joints[joint_id]
		if joint is Dictionary and joint.get("type") == "mouse":
			var entity_id = joint["entity_id"]
			if bridge.entities.has(entity_id):
				var node = bridge.entities[entity_id]
				if node is RigidBody2D:
					var target = joint["target"]
					var diff = target - node.global_position
					var stiffness = joint["stiffness"]
					var damping = joint["damping"]
					var max_force = joint["max_force"]
					
					var force = diff * stiffness - node.linear_velocity * damping
					if force.length() > max_force:
						force = force.normalized() * max_force
					node.apply_central_force(force * node.mass * bridge.pixels_per_meter)

func clear_all() -> void:
	for joint_id in joints:
		var joint = joints[joint_id]
		if joint is Node:
			joint.queue_free()
	joints.clear()
	joint_counter = 0
