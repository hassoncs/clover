class_name DebugTime
extends RefCounted

# =============================================================================
# DEBUG TIME
# Game time control: pause/resume/step/timeScale/seed
# =============================================================================

var _game_bridge: Node
var _is_paused: bool = false
var _stored_time_scale: float = 1.0
var _step_frames_remaining: int = 0
var _frame_counter: int = 0
var _seed: int = 0
var _deterministic_mode: bool = false
var _manual_stepping_enabled: bool = false

signal step_completed(frame: int)

func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge

func enable_manual_stepping() -> void:
	if _manual_stepping_enabled:
		return
	_manual_stepping_enabled = true
	var viewport = _game_bridge.get_viewport()
	if viewport and viewport.world_2d:
		var space = viewport.world_2d.space
		if space.is_valid():
			PhysicsServer2D.space_set_active(space, false)
			print("[DebugTime] Manual stepping enabled - auto physics disabled")

func disable_manual_stepping() -> void:
	if not _manual_stepping_enabled:
		return
	_manual_stepping_enabled = false
	var viewport = _game_bridge.get_viewport()
	if viewport and viewport.world_2d:
		var space = viewport.world_2d.space
		if space.is_valid():
			PhysicsServer2D.space_set_active(space, true)
			print("[DebugTime] Manual stepping disabled - auto physics enabled")

# =============================================================================
# STATE QUERY
# =============================================================================

func get_time_state() -> Dictionary:
	return {
		"paused": _is_paused,
		"timeScale": Engine.time_scale,
		"frame": _frame_counter,
		"fixedDelta": 1.0 / Engine.physics_ticks_per_second,
		"physicsTicksPerSecond": Engine.physics_ticks_per_second,
		"seed": _seed,
		"deterministic": _deterministic_mode,
		"stepFramesRemaining": _step_frames_remaining
	}

# =============================================================================
# PAUSE / RESUME
# =============================================================================

func pause() -> Dictionary:
	if _is_paused:
		return {"ok": true, "already": true, "state": get_time_state()}
	
	_stored_time_scale = Engine.time_scale
	Engine.time_scale = 0.0
	_is_paused = true
	
	# Enable manual stepping so we can step physics frame-by-frame
	enable_manual_stepping()
	
	_game_bridge.get_tree().paused = true
	
	return {"ok": true, "state": get_time_state()}

func resume() -> Dictionary:
	if not _is_paused:
		return {"ok": true, "already": true, "state": get_time_state()}
	
	Engine.time_scale = _stored_time_scale
	_is_paused = false
	_step_frames_remaining = 0
	
	# Disable manual stepping so auto physics runs again
	disable_manual_stepping()
	
	_game_bridge.get_tree().paused = false
	
	return {"ok": true, "state": get_time_state()}

# =============================================================================
# STEP
# =============================================================================

func step(frames: int, options: Dictionary = {}) -> Dictionary:
	var restore_pause_state = options.get("restorePauseState", true)
	var was_paused = _is_paused
	
	if frames <= 0:
		return {"ok": false, "error": "Frames must be positive", "state": get_time_state()}
	
	_step_frames_remaining = frames
	var start_frame = _frame_counter
	
	# Temporarily unpause to allow physics frames to run
	var prev_time_scale = Engine.time_scale
	if _is_paused:
		# Use stored time scale or default to 1.0 if it was 0
		Engine.time_scale = _stored_time_scale if _stored_time_scale > 0 else 1.0
		_game_bridge.get_tree().paused = false
	
	print("[DebugTime] step: starting %d frames from frame %d (was_paused=%s, time_scale=%s)" % [frames, start_frame, was_paused, Engine.time_scale])
	
	for i in range(frames):
		# Wait for actual physics frame to complete
		await _game_bridge.get_tree().physics_frame
		_frame_counter += 1
		_step_frames_remaining -= 1
	
	print("[DebugTime] step: completed at frame %d" % _frame_counter)
	
	# Restore pause state if requested
	if restore_pause_state and was_paused:
		Engine.time_scale = 0.0
		_game_bridge.get_tree().paused = true
		_is_paused = true
	elif not restore_pause_state:
		# Keep running
		_is_paused = false
	
	var end_frame = _frame_counter
	step_completed.emit(end_frame)
	
	return {
		"ok": true,
		"framesAdvanced": frames,
		"startFrame": start_frame,
		"endFrame": end_frame,
		"state": get_time_state()
	}

# Manual physics stepping via Rapier
func step_physics_sync(frames: int) -> Dictionary:
	if frames <= 0:
		return {"ok": false, "error": "Frames must be positive"}
	
	var start_frame = _frame_counter
	var delta = 1.0 / Engine.physics_ticks_per_second
	var viewport = _game_bridge.get_viewport()
	if not viewport:
		return {"ok": false, "error": "No viewport available"}
	
	var space = viewport.world_2d.space
	if not space.is_valid():
		return {"ok": false, "error": "Invalid physics space"}
	
	# Step physics using Rapier's direct API (access via Engine singleton)
	var rapier = Engine.get_singleton("RapierPhysicsServer2D")
	for i in range(frames):
		rapier.space_step(space, delta)
		_frame_counter += 1
	
	# Flush collision queries to sync state
	rapier.space_flush_queries(space)
	
	# Manually sync transforms from physics server to Godot nodes
	# This is needed because the space may be inactive (manual stepping mode)
	_sync_body_transforms(rapier, space)
	
	return {
		"ok": true,
		"framesAdvanced": frames,
		"startFrame": start_frame,
		"endFrame": _frame_counter,
		"state": get_time_state()
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

func process_step_frame() -> void:
	if _step_frames_remaining > 0:
		_frame_counter += 1
		_step_frames_remaining -= 1
		
		if _step_frames_remaining == 0:
			if _is_paused:
				Engine.time_scale = 0.0
				_game_bridge.get_tree().paused = true
			step_completed.emit(_frame_counter)

# =============================================================================
# TIME SCALE
# =============================================================================

func set_time_scale(scale: float) -> Dictionary:
	if scale < 0.0:
		return {"ok": false, "error": "Time scale cannot be negative", "state": get_time_state()}
	
	if scale > 10.0:
		scale = 10.0
	
	if _is_paused:
		_stored_time_scale = scale
	else:
		Engine.time_scale = scale
	
	return {"ok": true, "timeScale": scale, "state": get_time_state()}

# =============================================================================
# DETERMINISM / SEED
# =============================================================================

func set_seed(new_seed: int, options: Dictionary = {}) -> Dictionary:
	var enable_deterministic = options.get("enableDeterministic", false)
	
	_seed = new_seed
	seed(new_seed)
	
	if enable_deterministic:
		_deterministic_mode = true
	
	return {
		"ok": true,
		"seed": _seed,
		"deterministic": _deterministic_mode,
		"state": get_time_state()
	}

func set_deterministic_mode(enabled: bool) -> Dictionary:
	_deterministic_mode = enabled
	
	if enabled:
		Engine.physics_jitter_fix = 0.0
	else:
		Engine.physics_jitter_fix = 0.5
	
	return {
		"ok": true,
		"deterministic": _deterministic_mode,
		"state": get_time_state()
	}

# =============================================================================
# FRAME TRACKING
# =============================================================================

func get_frame() -> int:
	return _frame_counter

func increment_frame() -> void:
	_frame_counter += 1

func reset_frame_counter() -> void:
	_frame_counter = 0
