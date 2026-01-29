class_name DebugTime
extends RefCounted

var _game_bridge: Node
var _frame_counter: int = 0
var _seed: int = 0
var _deterministic_mode: bool = false
var _inspect_mode: bool = false

signal step_completed(frame: int)

func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge

func set_inspect_mode(enabled: bool) -> void:
	_inspect_mode = enabled
	Engine.time_scale = 0.0 if enabled else 1.0

func get_time_state() -> Dictionary:
	return {
		"frame": _frame_counter,
		"elapsed": _frame_counter * (1.0 / Engine.physics_ticks_per_second),
		"fixedDelta": 1.0 / Engine.physics_ticks_per_second,
		"physicsTicksPerSecond": Engine.physics_ticks_per_second,
		"seed": _seed,
		"deterministic": _deterministic_mode
	}

func step(frames: int) -> Dictionary:
	if frames <= 0:
		return {"ok": false, "error": "Frames must be positive"}
	
	if not _inspect_mode:
		return {"ok": false, "error": "Can only step in inspect mode"}
	
	var start_frame = _frame_counter
	
	Engine.time_scale = 1.0
	
	for i in range(frames):
		await _game_bridge.get_tree().physics_frame
		_frame_counter += 1
	
	Engine.time_scale = 0.0
	
	step_completed.emit(_frame_counter)
	
	return {
		"ok": true,
		"framesAdvanced": frames,
		"startFrame": start_frame,
		"endFrame": _frame_counter,
		"timeState": get_time_state()
	}

func _sync_body_transforms(space: RID) -> void:
	var entities = _game_bridge.entities
	if entities.is_empty():
		return
	
	var body_rids: Array[RID] = []
	var entity_ids: Array[String] = []
	
	for entity_id in entities:
		var node = entities[entity_id]
		if node is RigidBody2D:
			body_rids.append(node.get_rid())
			entity_ids.append(entity_id)
	
	if body_rids.is_empty():
		return
	
	# Get transforms from Rapier batch API
	var transforms: Array = []
	if PhysicsServer2D.has_method("space_get_bodies_transform"):
		transforms = PhysicsServer2D.call("space_get_bodies_transform", space, body_rids)
	
	# Apply transforms and velocities to nodes
	for i in range(body_rids.size()):
		var node = entities[entity_ids[i]]
		if not node or not is_instance_valid(node):
			continue
		
		var rb = node as RigidBody2D
		var body_rid = body_rids[i]
		
		# Sync transform
		if i < transforms.size():
			rb.global_transform = transforms[i]
		else:
			var transform = PhysicsServer2D.body_get_state(body_rid, PhysicsServer2D.BODY_STATE_TRANSFORM)
			if transform is Transform2D:
				rb.global_transform = transform
		
		# Sync velocities
		var lin_vel = PhysicsServer2D.body_get_state(body_rid, PhysicsServer2D.BODY_STATE_LINEAR_VELOCITY)
		if lin_vel is Vector2:
			rb.linear_velocity = lin_vel
		
		var ang_vel = PhysicsServer2D.body_get_state(body_rid, PhysicsServer2D.BODY_STATE_ANGULAR_VELOCITY)
		if ang_vel is float:
			rb.angular_velocity = ang_vel

func set_time_scale(scale: float) -> Dictionary:
	if scale < 0.0:
		return {"ok": false, "error": "Time scale cannot be negative"}
	
	Engine.time_scale = clampf(scale, 0.0, 10.0)
	return {"ok": true, "timeScale": Engine.time_scale}

func set_seed(new_seed: int, options: Dictionary = {}) -> Dictionary:
	var enable_deterministic = options.get("enableDeterministic", false)
	
	_seed = new_seed
	seed(new_seed)
	
	if enable_deterministic:
		_deterministic_mode = true
		Engine.physics_jitter_fix = 0.0
	
	return {
		"ok": true,
		"seed": _seed,
		"deterministic": _deterministic_mode
	}
