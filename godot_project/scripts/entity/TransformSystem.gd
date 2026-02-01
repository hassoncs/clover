class_name TransformSystem
extends RefCounted

var _game_bridge: Node = null


func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge


func _js_set_transform(args: Array) -> void:
	if args.size() >= 4:
		set_transform(str(args[0]), float(args[1]), float(args[2]), float(args[3]))


func set_transform(entity_id: String, x: float, y: float, angle: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	var godot_pos = _game_bridge.game_to_godot_pos(Vector2(x, y))
	var godot_angle = deg_to_rad(-angle)

	if entity is CharacterBody2D:
		entity.global_position = godot_pos
		entity.global_rotation = godot_angle
	elif entity is RigidBody2D:
		PhysicsServer2D.body_set_state(
			entity.get_rid(),
			PhysicsServer2D.BODY_STATE_TRANSFORM,
			Transform2D(godot_angle, godot_pos)
		)
	else:
		entity.global_position = godot_pos
		entity.global_rotation = godot_angle


func _js_set_position(args: Array) -> void:
	if args.size() >= 3:
		set_position(str(args[0]), float(args[1]), float(args[2]))


func set_position(entity_id: String, x: float, y: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	var godot_pos = _game_bridge.game_to_godot_pos(Vector2(x, y))

	if entity is CharacterBody2D:
		entity.global_position = godot_pos
	elif entity is RigidBody2D:
		var current_angle = entity.global_rotation
		PhysicsServer2D.body_set_state(
			entity.get_rid(),
			PhysicsServer2D.BODY_STATE_TRANSFORM,
			Transform2D(current_angle, godot_pos)
		)
	else:
		entity.global_position = godot_pos


func _js_set_rotation(args: Array) -> void:
	if args.size() >= 2:
		set_rotation(str(args[0]), float(args[1]))


func set_rotation(entity_id: String, angle: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	var godot_angle = deg_to_rad(-angle)

	if entity is CharacterBody2D:
		entity.global_rotation = godot_angle
	elif entity is RigidBody2D:
		var godot_pos = entity.global_position
		PhysicsServer2D.body_set_state(
			entity.get_rid(),
			PhysicsServer2D.BODY_STATE_TRANSFORM,
			Transform2D(godot_angle, godot_pos)
		)
	else:
		entity.global_rotation = godot_angle


func _js_set_scale(args: Array) -> void:
	if args.size() >= 3:
		var entity_id = str(args[0])
		var scale_x = float(args[1])
		var scale_y = float(args[2])
		set_scale(entity_id, scale_x, scale_y)


func set_scale(entity_id: String, scale_x: float, scale_y: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	var sprite = _find_sprite_in_entity(entity)
	if sprite:
		sprite.global_scale = Vector2(scale_x, scale_y)


func _find_sprite_in_entity(node: Node) -> Node:
	var children = node.get_children()
	for child in children:
		if child is Sprite2D or child is AnimatedSprite2D:
			return child
		var nested = _find_sprite_in_entity(child)
		if nested:
			return nested
	return null


func get_transform(entity_id: String) -> Dictionary:
	if not _game_bridge.entities.has(entity_id):
		return {}
	var entity = _game_bridge.entities[entity_id]
	var godot_pos = entity.global_position
	var game_pos = _game_bridge.godot_to_game_pos(godot_pos)
	var godot_angle = entity.global_rotation
	var game_angle = -rad_to_deg(godot_angle)
	return {"x": game_pos.x, "y": game_pos.y, "angle": game_angle}


func get_transforms(entity_ids: Array) -> Dictionary:
	var result = {}
	for entity_id in entity_ids:
		if _game_bridge.entities.has(entity_id):
			result[entity_id] = get_transform(entity_id)
	return result

func get_all_transforms() -> Dictionary:
	var result = {}
	for entity_id in _game_bridge.entity_registry:
		var node = _game_bridge.get_entity_node(entity_id)
		if node:
			var game_pos = CoordinateUtils.godot_to_game_pos(node.position, _game_bridge.pixels_per_meter)
			result[entity_id] = {"x": game_pos.x, "y": game_pos.y, "angle": -node.rotation}
	return result

func _js_get_all_transforms(_args: Array) -> void:
	var transforms = get_all_transforms()
	_game_bridge._js_bridge_obj["_lastResult"] = transforms
