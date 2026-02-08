extends Camera2D

## Advanced camera effects with trauma-based shake system.
## Based on GDC "Math for Game Programmers: Juicing Your Cameras With Math"

signal shake_started
signal shake_ended
signal zoom_changed(new_zoom: Vector2)

# Trauma-based shake configuration
@export_group("Shake Settings")
@export var max_offset: Vector2 = Vector2(20, 15)
@export var max_roll: float = 0.1
@export var trauma_decay_rate: float = 2.0
@export var trauma_power: float = 2.0  # Quadratic feels better than linear

# Smoothing configuration
@export_group("Smoothing")
@export var smooth_position_enabled: bool = true
@export var smooth_position_speed: float = 5.0
@export var smooth_rotation_enabled: bool = false
@export var smooth_rotation_speed: float = 5.0

# Current state
var trauma: float = 0.0
var _noise: FastNoiseLite
var _noise_y: float = 0.0
var _target_position: Vector2
var _target_zoom: Vector2
var _base_offset: Vector2 = Vector2.ZERO
var _is_shaking: bool = false

# Zoom limits
@export_group("Zoom Limits")
@export var min_zoom: Vector2 = Vector2(0.5, 0.5)
@export var max_zoom: Vector2 = Vector2(3.0, 3.0)

func _ready() -> void:
	_noise = FastNoiseLite.new()
	_noise.seed = randi()
	_noise.frequency = 2.0
	_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX
	
	_target_position = global_position
	_target_zoom = zoom

func _process(delta: float) -> void:
	_process_trauma(delta)
	_process_smoothing(delta)

func _process_trauma(delta: float) -> void:
	if trauma > 0.0:
		if not _is_shaking:
			_is_shaking = true
			shake_started.emit()
		
		trauma = max(trauma - trauma_decay_rate * delta, 0.0)
		_apply_shake()
	else:
		if _is_shaking:
			_is_shaking = false
			offset = _base_offset
			rotation = 0.0
			shake_ended.emit()

func _apply_shake() -> void:
	var shake_amount = pow(trauma, trauma_power)
	
	_noise_y += 1.0
	
	var shake_offset = Vector2(
		max_offset.x * shake_amount * _noise.get_noise_2d(_noise.seed, _noise_y),
		max_offset.y * shake_amount * _noise.get_noise_2d(_noise.seed * 2, _noise_y)
	)
	
	offset = _base_offset + shake_offset
	rotation = max_roll * shake_amount * _noise.get_noise_2d(_noise.seed * 3, _noise_y)

func _process_smoothing(delta: float) -> void:
	if smooth_position_enabled:
		global_position = global_position.lerp(_target_position, smooth_position_speed * delta)

# ============================================================
# PUBLIC API - SHAKE
# ============================================================

func add_trauma(amount: float) -> void:
	trauma = clamp(trauma + amount, 0.0, 1.0)

func set_trauma(amount: float) -> void:
	trauma = clamp(amount, 0.0, 1.0)

func shake(intensity: float, duration: float = -1.0) -> void:
	## Simplified shake API. If duration is -1, uses trauma decay.
	add_trauma(intensity)
	
	if duration > 0.0:
		# Override decay to match duration
		var temp_decay = trauma_decay_rate
		trauma_decay_rate = intensity / duration
		
		await get_tree().create_timer(duration).timeout
		trauma_decay_rate = temp_decay

func stop_shake() -> void:
	trauma = 0.0
	offset = _base_offset
	rotation = 0.0

# ============================================================
# PUBLIC API - ZOOM
# ============================================================

func zoom_to(target: Vector2, duration: float = 0.3, ease_type: Tween.EaseType = Tween.EASE_OUT) -> void:
	target = target.clamp(min_zoom, max_zoom)
	_target_zoom = target
	
	var tween = create_tween()
	tween.tween_property(self, "zoom", target, duration).set_ease(ease_type)
	tween.tween_callback(func(): zoom_changed.emit(target))

func zoom_punch(intensity: float = 0.1, duration: float = 0.15) -> void:
	## Quick zoom in/out for impact.
	var original = zoom
	var tween = create_tween()
	tween.tween_property(self, "zoom", zoom + Vector2(intensity, intensity), duration * 0.3)
	tween.tween_property(self, "zoom", original, duration * 0.7).set_ease(Tween.EASE_OUT)

func zoom_in(amount: float = 0.2, duration: float = 0.3) -> void:
	zoom_to(zoom + Vector2(amount, amount), duration)

func zoom_out(amount: float = 0.2, duration: float = 0.3) -> void:
	zoom_to(zoom - Vector2(amount, amount), duration)

func reset_zoom(duration: float = 0.3) -> void:
	zoom_to(Vector2.ONE, duration)

# ============================================================
# PUBLIC API - MOVEMENT
# ============================================================

func move_to(target: Vector2, duration: float = 0.5) -> void:
	_target_position = target
	
	if not position_smoothing_enabled:
		var tween = create_tween()
		tween.tween_property(self, "global_position", target, duration).set_ease(Tween.EASE_IN_OUT)

func focus_on(target: Vector2, target_zoom: Vector2, duration: float = 0.5) -> void:
	## Combined position + zoom for cinematic focus.
	target_zoom = target_zoom.clamp(min_zoom, max_zoom)
	_target_position = target
	_target_zoom = target_zoom
	
	var tween = create_tween().set_parallel(true)
	tween.tween_property(self, "global_position", target, duration).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(self, "zoom", target_zoom, duration).set_ease(Tween.EASE_IN_OUT)

func follow(target_node: Node2D, immediate: bool = false) -> void:
	_target_position = target_node.global_position
	
	if immediate:
		global_position = _target_position

# ============================================================
# PUBLIC API - EFFECTS
# ============================================================

func set_base_offset(new_offset: Vector2) -> void:
	_base_offset = new_offset
	if not _is_shaking:
		offset = _base_offset

func apply_recoil(direction: Vector2, strength: float = 10.0, recovery_time: float = 0.2) -> void:
	## Brief offset in a direction (like weapon recoil).
	var recoil_offset = direction.normalized() * strength
	offset = _base_offset + recoil_offset
	
	var tween = create_tween()
	tween.tween_property(self, "offset", _base_offset, recovery_time).set_ease(Tween.EASE_OUT)

func dolly_zoom(target_size: float, duration: float = 1.0) -> void:
	## Hitchcock zoom effect - zoom while moving to keep subject same size.
	## target_size is the apparent size multiplier (1.0 = no change, 0.5 = smaller, 2.0 = larger)
	var start_zoom = zoom
	var start_pos = global_position
	
	var tween = create_tween()
	tween.tween_method(
		func(t: float):
			var new_zoom = start_zoom * (1.0 + (target_size - 1.0) * t)
			zoom = new_zoom.clamp(min_zoom, max_zoom),
		0.0, 1.0, duration
	).set_ease(Tween.EASE_IN_OUT)

# ============================================================
# UTILITY
# ============================================================

func get_shake_intensity() -> float:
	return trauma

func is_shaking() -> bool:
	return _is_shaking

func screen_to_world(screen_pos: Vector2) -> Vector2:
	var viewport = get_viewport()
	var canvas_transform = viewport.get_canvas_transform()
	return canvas_transform.affine_inverse() * screen_pos

func world_to_screen(world_pos: Vector2) -> Vector2:
	var viewport = get_viewport()
	var canvas_transform = viewport.get_canvas_transform()
	return canvas_transform * world_pos
