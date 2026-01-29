class_name GB_Coords
extends RefCounted

var _pixels_per_meter: float


func _init(pixels_per_meter: float) -> void:
	_pixels_per_meter = pixels_per_meter


func set_pixels_per_meter(pixels_per_meter: float) -> void:
	_pixels_per_meter = pixels_per_meter


func game_to_godot_pos(game_pos: Vector2) -> Vector2:
	return Vector2(game_pos.x * _pixels_per_meter, -game_pos.y * _pixels_per_meter)


func godot_to_game_pos(godot_pos: Vector2) -> Vector2:
	return Vector2(godot_pos.x / _pixels_per_meter, -godot_pos.y / _pixels_per_meter)


func game_to_godot_vec(game_vec: Vector2) -> Vector2:
	return Vector2(game_vec.x * _pixels_per_meter, -game_vec.y * _pixels_per_meter)


func godot_to_game_vec(godot_vec: Vector2) -> Vector2:
	return Vector2(godot_vec.x / _pixels_per_meter, -godot_vec.y / _pixels_per_meter)
