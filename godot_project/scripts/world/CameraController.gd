class_name CameraController
extends RefCounted

var bridge: Node
var camera: Camera2D = null
var camera_target_id: String = ""
var camera_smoothing: float = 5.0

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

func setup_camera() -> Camera2D:
	var camera_script = load("res://scripts/effects/CameraEffects.gd")
	camera = Camera2D.new()
	camera.set_script(camera_script)
	camera.name = "GameCamera"
	camera.enabled = true
	camera.global_position = Vector2.ZERO
	bridge.add_child(camera)
	camera.make_current()
	if camera.has_method("move_to"):
		camera._target_position = Vector2.ZERO
	return camera

func set_camera_target(entity_id: String) -> void:
	camera_target_id = entity_id

func set_camera_position(x: float, y: float) -> void:
	if camera:
		var godot_pos = CoordinateUtils.game_to_godot_pos(Vector2(x, y), bridge.pixels_per_meter)
		camera.global_position = godot_pos

func set_camera_zoom(zoom_level: float) -> void:
	if camera:
		camera.zoom = Vector2(zoom_level, zoom_level)

func center_camera_on_world() -> void:
	if camera == null:
		return
	
	var world_bounds = bridge.game_data.get("world", {}).get("bounds", {})
	var width = world_bounds.get("width", 14.0)
	var height = world_bounds.get("height", 18.0)
	
	var center_x = width / 2.0
	var center_y = height / 2.0
	var godot_center = CoordinateUtils.game_to_godot_pos(Vector2(center_x, center_y), bridge.pixels_per_meter)
	
	camera.global_position = godot_center
	if camera.has_method("move_to"):
		camera._target_position = godot_center
		camera.global_position = godot_center

func update(delta: float) -> void:
	if camera_target_id != "" and bridge.entities.has(camera_target_id):
		var target_node = bridge.entities[camera_target_id]
		if target_node and is_instance_valid(target_node):
			camera.global_position = camera.global_position.lerp(
				target_node.global_position, 
				camera_smoothing * delta
			)
