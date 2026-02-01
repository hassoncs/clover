class_name WorldSystem extends RefCounted

var _game_bridge: Node

func _init(bridge: Node) -> void:
	_game_bridge = bridge

func setup_world(world_data: Dictionary) -> void:
	var pixels_per_meter = world_data.get("pixelsPerMeter", 50.0)
	_game_bridge.pixels_per_meter = pixels_per_meter
	
	var gravity = world_data.get("gravity", {"x": 0, "y": -9.8})
	var gravity_vec = _game_bridge.game_to_godot_vec(Vector2(gravity.x, gravity.y))
	var space = _game_bridge.get_viewport().find_world_2d().space
	PhysicsServer2D.area_set_param(space, PhysicsServer2D.AREA_PARAM_GRAVITY, gravity_vec.length())
	PhysicsServer2D.area_set_param(space, PhysicsServer2D.AREA_PARAM_GRAVITY_VECTOR, gravity_vec.normalized())
	
	var cam = _game_bridge.get_viewport().get_camera_2d()
	if cam: cam.global_position = Vector2.ZERO
