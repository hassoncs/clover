class_name CoordinateUtils
extends RefCounted

static func game_to_godot_pos(game_pos: Vector2, pixels_per_meter: float) -> Vector2:
	return Vector2(game_pos.x * pixels_per_meter, -game_pos.y * pixels_per_meter)

static func godot_to_game_pos(godot_pos: Vector2, pixels_per_meter: float) -> Vector2:
	return Vector2(godot_pos.x / pixels_per_meter, -godot_pos.y / pixels_per_meter)

static func game_to_godot_vec(game_vec: Vector2, pixels_per_meter: float) -> Vector2:
	return Vector2(game_vec.x * pixels_per_meter, -game_vec.y * pixels_per_meter)

static func godot_to_game_vec(godot_vec: Vector2, pixels_per_meter: float) -> Vector2:
	return Vector2(godot_vec.x / pixels_per_meter, -godot_vec.y / pixels_per_meter)
