class_name CameraController3D
extends Node

var camera: Camera3D = null
var _mode: String = "fixed"
var _target_entity: Node3D = null
var _target_entity_id: String = ""
var _follow_offset: Vector3 = Vector3(0, 5, -10)
var _follow_smoothing: float = 5.0
var _orbit_distance: float = 10.0
var _orbit_yaw: float = 0.0
var _orbit_pitch: float = -0.3
var _orbit_enabled: bool = false
var _shake_intensity: float = 0.0
var _shake_duration: float = 0.0
var _shake_timer: float = 0.0
var _shake_offset: Vector3 = Vector3.ZERO
var _bridge: Node = null

func set_bridge(bridge: Node) -> void:
	_bridge = bridge

func setup(camera_data: Dictionary, cam: Camera3D):
	camera = cam
	if camera == null:
		return

	var cam_type = str(camera_data.get("type", "perspective"))
	if cam_type == "orthographic":
		camera.projection = Camera3D.PROJECTION_ORTHOGONAL
		camera.size = float(camera_data.get("size", 10.0))
	else:
		camera.projection = Camera3D.PROJECTION_PERSPECTIVE
		camera.fov = float(camera_data.get("fov", 60.0))

	camera.near = float(camera_data.get("near", 0.1))
	camera.far = float(camera_data.get("far", 100.0))

	var pos = camera_data.get("position", {"x": 0, "y": 5, "z": 10})
	camera.position = Vector3(float(pos.get("x", 0.0)), float(pos.get("y", 5.0)), float(pos.get("z", 10.0)))

	var look = camera_data.get("lookAt", {"x": 0, "y": 0, "z": 0})
	camera.look_at(Vector3(float(look.get("x", 0.0)), float(look.get("y", 0.0)), float(look.get("z", 0.0))))

	var follow = camera_data.get("follow", null)
	if follow:
		_mode = str(follow.get("mode", "fixed-offset"))
		_target_entity_id = str(follow.get("target", ""))
		var offset = follow.get("offset", {"x": 0, "y": 5, "z": -10})
		_follow_offset = Vector3(float(offset.get("x", 0.0)), float(offset.get("y", 5.0)), float(offset.get("z", -10.0)))
		_follow_smoothing = float(follow.get("smoothing", 0.1))

	var orbit = camera_data.get("orbit", null)
	if orbit and bool(orbit.get("enabled", false)):
		_orbit_enabled = true
		_mode = "orbit"
		_orbit_distance = float(orbit.get("distance", _orbit_distance))
		_orbit_yaw = float(orbit.get("yaw", _orbit_yaw))
		_orbit_pitch = float(orbit.get("pitch", _orbit_pitch))

func set_target_entity(target: Node3D) -> void:
	_target_entity = target

func set_target_entity_id(entity_id: String) -> void:
	_target_entity_id = entity_id

func bind_target_from_entities(entities: Dictionary) -> void:
	if _target_entity_id == "":
		return
	var target = entities.get(_target_entity_id, null)
	if target is Node3D:
		_target_entity = target

func _process(delta: float) -> void:
	if camera == null:
		return

	if _shake_offset != Vector3.ZERO:
		camera.position -= _shake_offset
		_shake_offset = Vector3.ZERO

	match _mode:
		"fixed":
			pass
		"fixed-offset", "follow", "third-person":
			_update_follow(delta)
		"orbit":
			_update_orbit(delta)
		"first-person":
			_update_first_person(delta)
		_:
			_update_follow(delta)

	# Camera shake
	if _shake_timer > 0.0:
		_shake_timer -= delta
		var decay = max(_shake_timer / _shake_duration, 0.0) if _shake_duration > 0.0 else 0.0
		_shake_offset = Vector3(
			randf_range(-1.0, 1.0) * _shake_intensity * decay,
			randf_range(-1.0, 1.0) * _shake_intensity * decay,
			randf_range(-1.0, 1.0) * _shake_intensity * decay * 0.5
		)
		camera.position = camera.position + _shake_offset
	else:
		_shake_timer = 0.0
		_shake_duration = 0.0

func _update_follow(delta: float) -> void:
	if _target_entity == null or not is_instance_valid(_target_entity):
		return
	var desired = _target_entity.global_position + _follow_offset
	if _follow_smoothing <= 0.0:
		camera.global_position = desired
	else:
		var lerp_weight = clamp(_follow_smoothing * delta, 0.0, 1.0)
		camera.global_position = camera.global_position.lerp(desired, lerp_weight)
	camera.look_at(_target_entity.global_position)

func _update_orbit(_delta: float) -> void:
	if not _orbit_enabled:
		return
	var center = Vector3.ZERO
	if _target_entity and is_instance_valid(_target_entity):
		center = _target_entity.global_position
	var x = _orbit_distance * cos(_orbit_pitch) * sin(_orbit_yaw)
	var y = _orbit_distance * sin(_orbit_pitch)
	var z = _orbit_distance * cos(_orbit_pitch) * cos(_orbit_yaw)
	camera.global_position = center + Vector3(x, y, z)
	camera.look_at(center)

func _update_first_person(delta: float) -> void:
	if _target_entity == null or not is_instance_valid(_target_entity):
		return
	var desired = _target_entity.global_position + _follow_offset
	var lerp_weight = clamp(_follow_smoothing * delta, 0.0, 1.0)
	camera.global_position = camera.global_position.lerp(desired, lerp_weight)
	camera.global_rotation = _target_entity.global_rotation

# ============================================================================
# BRIDGE METHODS (_js_ prefix for auto-registration)
# ============================================================================

func _js_set_camera_3d_position(args: Array) -> void:
	if args.size() < 3 or not camera:
		return
	camera.position = Vector3(float(args[0]), float(args[1]), float(args[2]))

func _js_set_camera_3d_look_at(args: Array) -> void:
	if args.size() < 3 or not camera:
		return
	camera.look_at(Vector3(float(args[0]), float(args[1]), float(args[2])))

func _js_set_camera_3d_fov(args: Array) -> void:
	if args.size() < 1 or not camera:
		return
	camera.fov = float(args[0])

func _js_set_camera_3d_follow_target(args: Array) -> void:
	if args.size() < 1:
		return
	var target_id = str(args[0])
	if _bridge:
		var record = _bridge.entity_registry.get(target_id, null)
		if record and record.node is Node3D:
			_target_entity = record.node
			_mode = "third-person"

func _js_camera_3d_shake(args: Array) -> void:
	if args.size() < 2 or not camera:
		return
	var intensity = float(args[0])
	var duration = float(args[1])
	_shake_intensity = intensity
	_shake_duration = duration
	_shake_timer = duration
