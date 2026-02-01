class_name JointManager
extends RefCounted

var bridge: Node
var joints: Dictionary = {}
var joint_counter: int = 0
var last_created_joint_id: int = -1

func _init(game_bridge: Node) -> void:
	bridge = game_bridge


# =============================================================================
# JS HANDLERS (called from JavaScript bridge)
# =============================================================================

func _js_create_revolute_joint(args: Array) -> int:
	# args: [bodyA_id, bodyB_id, anchorX, anchorY, enableLimit, lowerAngle, upperAngle, enableMotor, motorSpeed, maxMotorTorque]
	if args.size() < 4:
		return -1
	var enable_limit = args.size() > 4 and bool(args[4])
	var lower_angle = float(args[5]) if args.size() > 5 else 0.0
	var upper_angle = float(args[6]) if args.size() > 6 else 0.0
	var enable_motor = args.size() > 7 and bool(args[7])
	var motor_speed_val = float(args[8]) if args.size() > 8 else 0.0
	var max_motor_torque = float(args[9]) if args.size() > 9 else 0.0
	return create_revolute_joint(
		str(args[0]), str(args[1]), float(args[2]), float(args[3]),
		enable_limit, lower_angle, upper_angle, enable_motor, motor_speed_val, max_motor_torque
	)


func _js_create_distance_joint(args: Array) -> int:
	if args.size() < 6:
		return -1
	var length = float(args[6]) if args.size() > 6 else 0.0
	var stiffness = float(args[7]) if args.size() > 7 else 0.0
	var damping = float(args[8]) if args.size() > 8 else 0.0
	return create_distance_joint(
		str(args[0]), str(args[1]),
		float(args[2]), float(args[3]), float(args[4]), float(args[5]),
		length, stiffness, damping
	)


func _js_create_prismatic_joint(args: Array) -> int:
	# args: [bodyA_id, bodyB_id, anchorX, anchorY, axisX, axisY, enableLimit, lowerTrans, upperTrans, enableMotor, motorSpeed, maxMotorForce]
	if args.size() < 6:
		return -1
	var enable_limit = args.size() > 6 and bool(args[6])
	var lower_trans = float(args[7]) if args.size() > 7 else 0.0
	var upper_trans = float(args[8]) if args.size() > 8 else 0.0
	var enable_motor = args.size() > 9 and bool(args[9])
	var motor_speed_val = float(args[10]) if args.size() > 10 else 0.0
	var max_motor_force = float(args[11]) if args.size() > 11 else 0.0
	return create_prismatic_joint(
		str(args[0]), str(args[1]),
		float(args[2]), float(args[3]), float(args[4]), float(args[5]),
		enable_limit, lower_trans, upper_trans, enable_motor, motor_speed_val, max_motor_force
	)


func _js_create_weld_joint(args: Array) -> int:
	# args: [bodyA_id, bodyB_id, anchorX, anchorY, stiffness, damping]
	if args.size() < 4:
		return -1
	var stiffness = float(args[4]) if args.size() > 4 else 0.0
	var damping = float(args[5]) if args.size() > 5 else 0.0
	return create_weld_joint(str(args[0]), str(args[1]), float(args[2]), float(args[3]), stiffness, damping)


func _js_create_mouse_joint(args: Array) -> int:
	if args.size() < 4:
		last_created_joint_id = -1
		_set_js_last_joint_id(-1)
		return -1
	var stiffness = float(args[4]) if args.size() > 4 else 5.0
	var damping = float(args[5]) if args.size() > 5 else 0.7
	var result = create_mouse_joint(str(args[0]), float(args[1]), float(args[2]), float(args[3]), stiffness, damping)
	last_created_joint_id = result
	_set_js_last_joint_id(result)
	return result

func _set_js_last_joint_id(joint_id: int) -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.GodotBridge._lastResult = %d; window._slopcadeLastJointId = %d;" % [joint_id, joint_id], true)


func _js_destroy_joint(args: Array) -> void:
	if args.size() < 1:
		return
	destroy_joint(int(args[0]))

func _js_destroy_mouse_joint_for_entity(args: Array) -> void:
	if args.size() < 1:
		return
	var entity_id = str(args[0])
	destroy_mouse_joint_for_entity(entity_id)

func destroy_mouse_joint_for_entity(entity_id: String) -> void:
	print("[JointManager] destroy_mouse_joint_for_entity: ", entity_id)
	var to_remove: Array = []
	for joint_id in joints:
		var joint = joints[joint_id]
		if joint is Dictionary and joint.get("type") == "mouse" and joint.get("entity_id") == entity_id:
			to_remove.append(joint_id)
	for joint_id in to_remove:
		joints.erase(joint_id)
		print("[JointManager] Removed mouse joint ", joint_id, " for entity ", entity_id)


func _js_set_motor_speed(args: Array) -> void:
	if args.size() < 2:
		return
	set_motor_speed(int(args[0]), float(args[1]))


func _js_set_mouse_target(args: Array) -> void:
	if args.size() < 3:
		return
	set_mouse_target(int(args[0]), float(args[1]), float(args[2]))

func _js_get_last_joint_id(_args: Array) -> int:
	return last_created_joint_id


# =============================================================================
# PUBLIC API
# =============================================================================

func create_revolute_joint(entity_a: String, entity_b: String, anchor_x: float, anchor_y: float, 
		enable_limit: bool = false, lower_angle: float = 0.0, upper_angle: float = 0.0,
		enable_motor: bool = false, motor_speed: float = 0.0, max_motor_torque: float = 0.0) -> int:
	
	var godot_anchor = bridge.game_to_godot_pos(Vector2(anchor_x, anchor_y))
	
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
	
	var anchor_a = bridge.game_to_godot_pos(Vector2(anchor_ax, anchor_ay))
	var anchor_b = bridge.game_to_godot_pos(Vector2(anchor_bx, anchor_by))
	
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
	
	var anchor = bridge.game_to_godot_pos(Vector2(anchor_x, anchor_y))
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
	
	var anchor = bridge.game_to_godot_pos(Vector2(anchor_x, anchor_y))
	
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
	
	# Use entity_registry directly instead of computed property
	var node: Node2D = null
	if bridge.entity_registry.has(entity_id):
		var record = bridge.entity_registry[entity_id]
		if record and record.is_valid():
			node = record.node
	

	
	if node == null:
		print("[JointManager] Entity not found in registry! keys=", bridge.entity_registry.keys())
		return -1
	
	joint_counter += 1
	joints[joint_counter] = {
		"type": "mouse",
		"entity_id": entity_id,
		"target": bridge.game_to_godot_pos(Vector2(target_x, target_y)),
		"max_force": max_force,
		"stiffness": stiffness,
		"damping": damping
	}
	return joint_counter

func set_mouse_target(joint_id: int, target_x: float, target_y: float) -> void:
	if joints.has(joint_id):
		var joint = joints[joint_id]
		if joint is Dictionary and joint.get("type") == "mouse":
			joint["target"] = bridge.game_to_godot_pos(Vector2(target_x, target_y))

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

func process_mouse_joints(_delta: float) -> void:
	for joint_id in joints:
		var joint = joints[joint_id]
		if joint is Dictionary and joint.get("type") == "mouse":
			var entity_id = joint["entity_id"]
			var node: Node2D = null
			if bridge.entity_registry.has(entity_id):
				var record = bridge.entity_registry[entity_id]
				if record and record.is_valid():
					node = record.node
			if node is RigidBody2D:
				var target = joint["target"]
				var diff = target - node.global_position
				var stiffness = joint["stiffness"]
				var damping = joint["damping"]
				var max_force = joint["max_force"]
				
				var force = diff * stiffness - node.linear_velocity * damping
				
				var force_mag = force.length()
				if force_mag > max_force:
					force = force.normalized() * max_force
				
				node.apply_central_force(force)

func clear_all() -> void:
	for joint_id in joints:
		var joint = joints[joint_id]
		if joint is Node:
			joint.queue_free()
	joints.clear()
	joint_counter = 0
