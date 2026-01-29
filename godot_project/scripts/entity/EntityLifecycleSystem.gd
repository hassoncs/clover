class_name EntityLifecycleSystem extends RefCounted

var _game_bridge: Node = null


func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge


func _js_spawn_entity(args: Array) -> void:
	if args.size() < 1:
		return
	var entity_data = args[0] as Dictionary
	if entity_data.has("id") and entity_data.has("template"):
		_game_bridge._create_entity(entity_data)


func _js_destroy_entity(args: Array) -> void:
	if args.size() < 1:
		return
	var entity_id = str(args[0])
	_game_bridge._destroy_entity(entity_id)


func _js_get_entity_transform(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	return _get_entity_transform_impl(entity_id)


func _get_entity_transform_impl(entity_id: String) -> Dictionary:
	if not _game_bridge.entities.has(entity_id):
		return {}
	var entity = _game_bridge.entities[entity_id]
	var game_pos = _game_bridge.godot_to_game_pos(entity.global_position)
	var game_angle = rad_to_deg(-entity.global_rotation)  # Convert from radians and flip
	return {
		"x": game_pos.x,
		"y": game_pos.y,
		"angle": game_angle,
		"scaleX": entity.global_scale.x,
		"scaleY": entity.global_scale.y
	}
