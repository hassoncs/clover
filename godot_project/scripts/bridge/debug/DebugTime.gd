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

signal step_completed(frame: int)

func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge

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
	
	_game_bridge.get_tree().paused = true
	
	return {"ok": true, "state": get_time_state()}

func resume() -> Dictionary:
	if not _is_paused:
		return {"ok": true, "already": true, "state": get_time_state()}
	
	Engine.time_scale = _stored_time_scale
	_is_paused = false
	_step_frames_remaining = 0
	
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
	
	if _is_paused:
		Engine.time_scale = _stored_time_scale
		_game_bridge.get_tree().paused = false
	
	for i in range(frames):
		await _game_bridge.get_tree().physics_frame
		_frame_counter += 1
		_step_frames_remaining -= 1
	
	if restore_pause_state and was_paused:
		Engine.time_scale = 0.0
		_game_bridge.get_tree().paused = true
	elif not was_paused:
		pass
	else:
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

func step_sync(frames: int) -> Dictionary:
	if frames <= 0:
		return {"ok": false, "error": "Frames must be positive"}
	
	_step_frames_remaining = frames
	var start_frame = _frame_counter
	
	return {
		"ok": true,
		"framesRequested": frames,
		"startFrame": start_frame,
		"message": "Step started. Poll get_time_state() to check progress."
	}

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
