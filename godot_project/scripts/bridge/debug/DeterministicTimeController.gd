class_name DeterministicTimeController
extends RefCounted

## Centralized controller for deterministic time stepping using Rapier physics
## This is the single source of truth for frame-by-frame physics advancement

var _game_bridge: Node
var _is_paused: bool = true  # Start paused in debug mode
var _stored_time_scale: float = 1.0
var _frame_counter: int = 0
var _seed: int = 0
var _deterministic_mode: bool = false
var _manual_stepping_enabled: bool = false

signal step_completed(frame: int)

func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge

## Enable manual stepping mode - disables automatic physics simulation
func enable_manual_stepping() -> void:
	if _manual_stepping_enabled:
		return
	
	_manual_stepping_enabled = true
	var viewport = _game_bridge.get_viewport()
	if viewport and viewport.world_2d:
		var space = viewport.world_2d.space
		if space.is_valid():
			PhysicsServer2D.space_set_active(space, false)
			print("[DeterministicTimeController] Manual stepping enabled")

## Disable manual stepping - re-enables automatic physics simulation
func disable_manual_stepping() -> void:
	if not _manual_stepping_enabled:
		return
	
	_manual_stepping_enabled = false
	var viewport = _game_bridge.get_viewport()
	if viewport and viewport.world_2d:
		var space = viewport.world_2d.space
		if space.is_valid():
			PhysicsServer2D.space_set_active(space, true)
			print("[DeterministicTimeController] Manual stepping disabled")

## Get current time state
func get_time_state() -> Dictionary:
	return {
		"paused": _is_paused,
		"timeScale": 0.0 if _is_paused else _stored_time_scale,
		"frame": _frame_counter,
		"elapsed": _frame_counter * get_fixed_delta(),
		"fixedDelta": get_fixed_delta(),
		"physicsTicksPerSecond": Engine.physics_ticks_per_second,
		"seed": _seed,
		"deterministic": _deterministic_mode
	}

## Get fixed time step delta
func get_fixed_delta() -> float:
	return 1.0 / Engine.physics_ticks_per_second

## Pause the simulation
func pause() -> Dictionary:
	if _is_paused:
		return {"ok": true, "already": true, "timeState": get_time_state()}
	
	_stored_time_scale = Engine.time_scale
	Engine.time_scale = 0.0
	_is_paused = true
	
	enable_manual_stepping()
	_game_bridge.get_tree().paused = true
	
	return {"ok": true, "timeState": get_time_state()}

## Resume the simulation
func resume() -> Dictionary:
	if not _is_paused:
		return {"ok": true, "already": true, "timeState": get_time_state()}
	
	Engine.time_scale = _stored_time_scale
	_is_paused = false
	
	disable_manual_stepping()
	_game_bridge.get_tree().paused = false
	
	return {"ok": true, "timeState": get_time_state()}

## Step forward N frames deterministically using Rapier
func step_frames(frames: int) -> Dictionary:
	if frames <= 0:
		return {"ok": false, "error": "Frames must be positive", "timeState": get_time_state()}
	
	var start_frame = _frame_counter
	var delta = get_fixed_delta()
	
	var viewport = _game_bridge.get_viewport()
	if not viewport:
		return {"ok": false, "error": "No viewport available", "timeState": get_time_state()}
	
	var space = viewport.world_2d.space
	if not space.is_valid():
		return {"ok": false, "error": "Invalid physics space", "timeState": get_time_state()}
	
	# Get Rapier physics server
	var rapier = Engine.get_singleton("RapierPhysicsServer2D")
	if not rapier:
		return {"ok": false, "error": "RapierPhysicsServer2D not available", "timeState": get_time_state()}
	
	# Ensure manual stepping is enabled
	if not _manual_stepping_enabled:
		enable_manual_stepping()
	
	# Step physics deterministically
	for i in range(frames):
		rapier.space_step(space, delta)
		_frame_counter += 1
	
	# Flush collision queries to sync state
	rapier.space_flush_queries(space)
	
	# Manually sync transforms from physics server to Godot nodes
	# This is needed because the space is inactive, so state_sync_callback doesn't fire
	_sync_body_transforms(rapier, space)
	
	var end_frame = _frame_counter
	step_completed.emit(end_frame)
	
	return {
		"ok": true,
		"framesAdvanced": frames,
		"startFrame": start_frame,
		"endFrame": end_frame,
		"timeState": get_time_state()
	}

## Manually sync transforms and velocities from physics server to Godot RigidBody2D nodes
## This is required when the space is inactive (manual stepping mode)
func _sync_body_transforms(rapier, space: RID) -> void:
	# Get all entities from the game bridge
	var entities = _game_bridge.entities
	if entities.is_empty():
		return
	
	# Build array of body RIDs to query
	var body_rids: Array[RID] = []
	var entity_ids: Array[String] = []
	
	for entity_id in entities:
		var node = entities[entity_id]
		if node is RigidBody2D:
			body_rids.append(node.get_rid())
			entity_ids.append(entity_id)
	
	if body_rids.is_empty():
		return
	
	# Get transforms from Rapier
	var transforms = rapier.space_get_bodies_transform(space, body_rids)
	
	# Apply transforms and sync velocities back to Godot nodes
	for i in range(body_rids.size()):
		var node = entities[entity_ids[i]]
		if not node or not is_instance_valid(node):
			continue
		
		var rb = node as RigidBody2D
		var body_rid = body_rids[i]
		
		# Sync transform
		if i < transforms.size():
			var transform: Transform2D = transforms[i]
			rb.global_transform = transform
		
		# Sync linear velocity from physics server
		var lin_vel = PhysicsServer2D.body_get_state(body_rid, PhysicsServer2D.BODY_STATE_LINEAR_VELOCITY)
		if lin_vel is Vector2:
			rb.linear_velocity = lin_vel
		
		# Sync angular velocity from physics server
		var ang_vel = PhysicsServer2D.body_get_state(body_rid, PhysicsServer2D.BODY_STATE_ANGULAR_VELOCITY)
		if ang_vel is float:
			rb.angular_velocity = ang_vel

## Set time scale (affects normal playback, not stepping)
func set_time_scale(scale: float) -> Dictionary:
	if scale < 0.0:
		return {"ok": false, "error": "Time scale cannot be negative", "timeState": get_time_state()}
	
	scale = clampf(scale, 0.0, 10.0)
	
	if _is_paused:
		_stored_time_scale = scale
	else:
		Engine.time_scale = scale
		_stored_time_scale = scale
	
	return {"ok": true, "timeScale": scale, "timeState": get_time_state()}

## Set random seed for deterministic behavior
func set_seed(new_seed: int, enable_deterministic: bool = true) -> Dictionary:
	_seed = new_seed
	seed(new_seed)
	
	if enable_deterministic:
		_deterministic_mode = true
		Engine.physics_jitter_fix = 0.0
	
	return {
		"ok": true,
		"seed": _seed,
		"deterministic": _deterministic_mode,
		"timeState": get_time_state()
	}

## Get current frame number
func get_frame() -> int:
	return _frame_counter

## Reset frame counter
func reset_frame_counter() -> void:
	_frame_counter = 0

## Check if paused
func is_paused() -> bool:
	return _is_paused

## Check if manual stepping is enabled
func is_manual_stepping_enabled() -> bool:
	return _manual_stepping_enabled
