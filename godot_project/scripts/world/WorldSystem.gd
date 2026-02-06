class_name WorldSystem extends RefCounted

var _game_bridge: Node

func _init(bridge: Node) -> void:
	_game_bridge = bridge

func setup_world(world_data: Dictionary) -> void:
	print("[WorldSystem] setup_world called with: ", world_data)
	var pixels_per_meter = world_data.get("pixelsPerMeter", 50.0)
	_game_bridge.pixels_per_meter = pixels_per_meter
	print("[WorldSystem] pixels_per_meter set to: ", pixels_per_meter)

	var gravity = world_data.get("gravity", {"x": 0, "y": -9.8})
	var gravity_vec = _game_bridge.game_to_godot_vec(Vector2(gravity.x, gravity.y))
	print("[WorldSystem] Game gravity: ", gravity, " -> Godot gravity vec: ", gravity_vec)
	var space = _game_bridge.get_viewport().find_world_2d().space
	print("[WorldSystem] Physics space RID: ", space)
	PhysicsServer2D.area_set_param(space, PhysicsServer2D.AREA_PARAM_GRAVITY, gravity_vec.length())
	PhysicsServer2D.area_set_param(space, PhysicsServer2D.AREA_PARAM_GRAVITY_VECTOR, gravity_vec.normalized())
	# Verify it was set
	var set_gravity = PhysicsServer2D.area_get_param(space, PhysicsServer2D.AREA_PARAM_GRAVITY)
	var set_vec = PhysicsServer2D.area_get_param(space, PhysicsServer2D.AREA_PARAM_GRAVITY_VECTOR)
	print("[WorldSystem] Verified gravity after set: magnitude=", set_gravity, " vector=", set_vec)

	var cam = _game_bridge.get_viewport().get_camera_2d()
	if cam: cam.global_position = Vector2.ZERO
