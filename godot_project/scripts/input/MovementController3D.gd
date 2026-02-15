class_name MovementController3D
extends Node

const DEFAULT_SPEED: float = 5.0
const DEFAULT_SPRINT_MULTIPLIER: float = 1.5
const DEFAULT_JUMP_FORCE: float = 5.0
const DEFAULT_MOUSE_SENSITIVITY: float = 0.3
const DEFAULT_GRAVITY: float = 9.8
const DEFAULT_TOUCH_LOOK_SENSITIVITY: float = 0.3
const MAX_PITCH_DEGREES: float = 85.0

var _bridge: Node = null
var _camera: Camera3D = null
var _camera_controller: CameraController3D = null
var _entities: Dictionary = {}

var _target_entity_id: String = ""
var _target_entity: CharacterBody3D = null

var _movement_enabled: bool = false
var _mouse_look_enabled: bool = false
var _touch_look_enabled: bool = false
var _invert_y: bool = false

var _speed: float = DEFAULT_SPEED
var _sprint_multiplier: float = DEFAULT_SPRINT_MULTIPLIER
var _jump_force: float = DEFAULT_JUMP_FORCE
var _gravity: float = DEFAULT_GRAVITY
var _mouse_sensitivity: float = DEFAULT_MOUSE_SENSITIVITY
var _touch_look_sensitivity: float = DEFAULT_TOUCH_LOOK_SENSITIVITY

var _yaw: float = 0.0
var _pitch: float = 0.0
var _virtual_joystick: Vector2 = Vector2.ZERO

func _is_controller_active() -> bool:
	return _movement_enabled or _mouse_look_enabled or _touch_look_enabled

func _ready() -> void:
	process_priority = 1
	process_physics_priority = 1

func set_bridge(bridge: Node) -> void:
	_bridge = bridge

func setup(input_config: Dictionary, camera: Camera3D, camera_controller: CameraController3D, entities: Dictionary, target_entity_id: String = "") -> void:
	_camera = camera
	_camera_controller = camera_controller
	_entities = entities

	var movement_cfg = input_config.get("movement", {})
	if movement_cfg is Dictionary:
		_movement_enabled = bool(movement_cfg.get("enabled", false))
		_speed = float(movement_cfg.get("speed", DEFAULT_SPEED))
		_sprint_multiplier = float(movement_cfg.get("sprintMultiplier", DEFAULT_SPRINT_MULTIPLIER))
		_jump_force = float(movement_cfg.get("jumpForce", DEFAULT_JUMP_FORCE))
	else:
		_movement_enabled = false
		_speed = DEFAULT_SPEED
		_sprint_multiplier = DEFAULT_SPRINT_MULTIPLIER
		_jump_force = DEFAULT_JUMP_FORCE

	var mouse_look_cfg = input_config.get("mouseLook", {})
	if mouse_look_cfg is Dictionary:
		_mouse_look_enabled = bool(mouse_look_cfg.get("enabled", false))
		_mouse_sensitivity = float(mouse_look_cfg.get("sensitivity", DEFAULT_MOUSE_SENSITIVITY))
		_invert_y = bool(mouse_look_cfg.get("invertY", false))
	else:
		_mouse_look_enabled = false
		_mouse_sensitivity = DEFAULT_MOUSE_SENSITIVITY
		_invert_y = false

	var touch_look_cfg = input_config.get("touchLook", {})
	if touch_look_cfg is Dictionary:
		_touch_look_enabled = bool(touch_look_cfg.get("enabled", false))
		_touch_look_sensitivity = float(touch_look_cfg.get("sensitivity", DEFAULT_TOUCH_LOOK_SENSITIVITY))
	else:
		_touch_look_enabled = false
		_touch_look_sensitivity = DEFAULT_TOUCH_LOOK_SENSITIVITY

	_virtual_joystick = Vector2.ZERO
	if target_entity_id != "":
		set_movement_target(target_entity_id)
	elif _target_entity_id != "":
		set_movement_target(_target_entity_id)

	_sync_rotation_from_target()
	if _is_controller_active():
		_apply_camera_controller_mode()

	if _mouse_look_enabled and OS.has_feature("web"):
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey:
		var key_event: InputEventKey = event
		if key_event.pressed and key_event.keycode == KEY_ESCAPE:
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
			return

	if not _mouse_look_enabled:
		return

	if event is InputEventMouseButton:
		var mouse_button: InputEventMouseButton = event
		if mouse_button.pressed and mouse_button.button_index == MOUSE_BUTTON_LEFT and OS.has_feature("web"):
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		var motion: InputEventMouseMotion = event
		_apply_look_delta(float(motion.relative.x), float(motion.relative.y), _mouse_sensitivity)

func _process(_delta: float) -> void:
	if not _is_controller_active():
		return
	if _target_entity == null or not is_instance_valid(_target_entity):
		_resolve_target_from_entities()
	if _target_entity == null or _camera == null:
		return

	_apply_look_rotation()

func _physics_process(delta: float) -> void:
	if not _movement_enabled:
		return
	if _target_entity == null or not is_instance_valid(_target_entity):
		_resolve_target_from_entities()
	if _target_entity == null:
		return

	var move_input = _get_move_input_vector()
	var move_direction = _get_camera_relative_move_direction(move_input)

	var sprinting = Input.is_action_pressed("sprint")
	var move_speed = _speed * (_sprint_multiplier if sprinting else 1.0)

	_target_entity.velocity.x = move_direction.x * move_speed
	_target_entity.velocity.z = move_direction.z * move_speed

	if _target_entity.is_on_floor():
		if Input.is_action_just_pressed("jump"):
			_target_entity.velocity.y = _jump_force
	else:
		_target_entity.velocity.y -= _gravity * delta

	_target_entity.move_and_slide()

func _get_move_input_vector() -> Vector2:
	var keyboard_x = Input.get_action_strength("move_right") - Input.get_action_strength("move_left")
	var keyboard_y = Input.get_action_strength("move_forward") - Input.get_action_strength("move_back")
	var combined = Vector2(keyboard_x, keyboard_y) + _virtual_joystick
	if combined.length() > 1.0:
		combined = combined.normalized()
	return combined

func _get_camera_relative_move_direction(input_vec: Vector2) -> Vector3:
	if input_vec == Vector2.ZERO:
		return Vector3.ZERO

	var basis = _camera.global_transform.basis if _camera else Basis.IDENTITY
	var forward = -basis.z
	forward.y = 0.0
	if forward.length_squared() <= 0.000001:
		forward = Vector3.FORWARD
	else:
		forward = forward.normalized()

	var right = basis.x
	right.y = 0.0
	if right.length_squared() <= 0.000001:
		right = Vector3.RIGHT
	else:
		right = right.normalized()

	var world_dir = right * input_vec.x + forward * input_vec.y
	if world_dir.length_squared() > 1.0:
		world_dir = world_dir.normalized()
	return world_dir

func _apply_look_delta(delta_x: float, delta_y: float, sensitivity: float) -> void:
	if _target_entity == null or _camera == null:
		return

	_yaw -= deg_to_rad(delta_x * sensitivity)
	var pitch_sign = -1.0 if _invert_y else 1.0
	_pitch -= deg_to_rad(delta_y * sensitivity * pitch_sign)
	var max_pitch = deg_to_rad(MAX_PITCH_DEGREES)
	_pitch = clamp(_pitch, -max_pitch, max_pitch)

func _apply_look_rotation() -> void:
	if _target_entity == null or _camera == null:
		return

	_target_entity.rotation.y = _yaw
	var target_basis = Basis(Vector3.UP, _yaw)
	var pitch_basis = Basis(Vector3.RIGHT, _pitch)
	_camera.global_transform.basis = target_basis * pitch_basis

func _apply_camera_controller_mode() -> void:
	if _camera_controller == null:
		return
	if _target_entity and is_instance_valid(_target_entity):
		_camera_controller.set_target_entity(_target_entity)
	_camera_controller._mode = "first-person"
	_camera_controller._follow_offset = Vector3(0.0, 1.6, 0.0)
	_camera_controller._follow_smoothing = 24.0

func _sync_rotation_from_target() -> void:
	if _target_entity and is_instance_valid(_target_entity):
		_yaw = _target_entity.rotation.y

func _resolve_target_from_entities() -> void:
	if _target_entity_id == "" or _entities.is_empty():
		return
	var candidate = _entities.get(_target_entity_id, null)
	if candidate and candidate is CharacterBody3D:
		_target_entity = candidate
		_sync_rotation_from_target()
		if _is_controller_active():
			_apply_camera_controller_mode()

func set_movement_target(entity_id: String) -> void:
	_target_entity_id = entity_id
	_target_entity = null
	_resolve_target_from_entities()

func _js_set_movement_enabled_3d(args: Array) -> void:
	if args.size() < 1:
		return
	_movement_enabled = bool(args[0])
	if _movement_enabled:
		_apply_camera_controller_mode()

func _js_set_movement_speed_3d(args: Array) -> void:
	if args.size() < 1:
		return
	_speed = float(args[0])

func _js_set_mouse_sensitivity_3d(args: Array) -> void:
	if args.size() < 1:
		return
	_mouse_sensitivity = float(args[0])

func _js_set_virtual_joystick_3d(args: Array) -> void:
	if args.size() < 2:
		_virtual_joystick = Vector2.ZERO
		return
	_virtual_joystick = Vector2(float(args[0]), float(args[1]))
	if _virtual_joystick.length() > 1.0:
		_virtual_joystick = _virtual_joystick.normalized()

func _js_set_touch_look_3d(args: Array) -> void:
	if not _touch_look_enabled:
		return
	if args.size() < 2:
		return
	_apply_look_delta(float(args[0]), float(args[1]), _touch_look_sensitivity)

func _js_set_movement_target_3d(args: Array) -> void:
	if args.size() < 1:
		return
	set_movement_target(str(args[0]))
