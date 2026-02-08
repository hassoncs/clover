class_name CameraController
extends RefCounted

var _bridge: Node
var _target_entity_id: String = ""
var _smoothing: float = 0.1


func _init(bridge: Node) -> void:
	_bridge = bridge


# =============================================================================
# JS HANDLERS (called from JavaScript bridge)
# =============================================================================

func _js_set_camera_target(args: Array) -> void:
	if args.size() < 1 or args[0] == null or str(args[0]) == "":
		set_target("")
	else:
		set_target(str(args[0]))


func _js_set_camera_position(args: Array) -> void:
	if args.size() < 2:
		return
	set_position(float(args[0]), float(args[1]))


func _js_set_camera_zoom(args: Array) -> void:
	if args.size() < 1:
		return
	set_zoom(float(args[0]))


# =============================================================================
# PUBLIC API
# =============================================================================

func set_target(entity_id: String) -> void:
	_target_entity_id = entity_id
	# Also update the bridge's camera_target_id for backward compatibility
	if _bridge:
		_bridge.camera_target_id = entity_id


func set_position(x: float, y: float) -> void:
	_target_entity_id = ""
	if _bridge:
		_bridge.camera_target_id = ""
	var camera = _get_camera()
	if camera:
		camera.global_position = _game_to_godot_pos(Vector2(x, y))


func set_zoom(zoom_level: float) -> void:
	var camera = _get_camera()
	if camera:
		camera.zoom = Vector2(zoom_level, zoom_level)


func get_target_id() -> String:
	return _target_entity_id


func get_info() -> Dictionary:
	var camera = _get_camera()
	if not camera:
		return {"x": 0, "y": 0, "zoom": 1.0, "target": ""}

	var game_pos = _godot_to_game_pos(camera.global_position)
	return {
		"x": game_pos.x,
		"y": game_pos.y,
		"zoom": camera.zoom.x,
		"target": _target_entity_id
	}


# =============================================================================
# HELPER METHODS
# =============================================================================

func _get_camera() -> Camera2D:
	if _bridge and "camera" in _bridge:
		return _bridge.camera
	return null


func _game_to_godot_pos(game_pos: Vector2) -> Vector2:
	if _bridge and _bridge.has_method("game_to_godot_pos"):
		return _bridge.game_to_godot_pos(game_pos)
	# Fallback
	var viewport_size = _get_viewport_size()
	return Vector2(
		(viewport_size.x / 2.0) + game_pos.x,
		(viewport_size.y / 2.0) - game_pos.y
	)


func _godot_to_game_pos(godot_pos: Vector2) -> Vector2:
	if _bridge and _bridge.has_method("godot_to_game_pos"):
		return _bridge.godot_to_game_pos(godot_pos)
	# Fallback
	var viewport_size = _get_viewport_size()
	return Vector2(
		godot_pos.x - (viewport_size.x / 2.0),
		(viewport_size.y / 2.0) - godot_pos.y
	)


func _get_viewport_size() -> Vector2:
	if _bridge:
		var viewport = _bridge.get_viewport()
		if viewport:
			return viewport.get_visible_rect().size
	return Vector2(1152, 648)

func setup_camera() -> void:
	var camera_script = load("res://scripts/camera/CameraEffects.gd")
	var camera = Camera2D.new()
	camera.set_script(camera_script)
	camera.name = "GameCamera"
	camera.enabled = true
	camera.global_position = Vector2.ZERO
	_bridge.add_child(camera)
	camera.make_current()
	if camera.has_method("move_to"):
		camera._target_position = Vector2.ZERO
	_bridge.camera = camera
