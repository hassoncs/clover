class_name EntityManager
extends RefCounted

# Bridge reference for coordinate conversion and callbacks
var _bridge: Node

# State ownership
var entities: Dictionary = {}
var body_id_map: Dictionary = {}
var body_id_reverse: Dictionary = {}
var entity_shape_map: Dictionary = {}
var next_body_id: int = 1

# Coordinate conversion helpers
var _pixels_per_meter: float = 50.0


func _init(bridge: Node) -> void:
	_bridge = bridge
	if _bridge:
		_pixels_per_meter = _bridge.pixels_per_meter if _bridge.has_method("pixels_per_meter") else 50.0


func _update_state_from_bridge() -> void:
	if not _bridge:
		return
	if "pixels_per_meter" in _bridge:
		_pixels_per_meter = _bridge.pixels_per_meter
	else:
		_pixels_per_meter = 50.0


func _game_to_godot_pos(game_pos: Vector2) -> Vector2:
	return Vector2(game_pos.x * _pixels_per_meter, -game_pos.y * _pixels_per_meter)


func _godot_to_game_pos(godot_pos: Vector2) -> Vector2:
	return Vector2(godot_pos.x / _pixels_per_meter, -godot_pos.y / _pixels_per_meter)


func _game_to_godot_vec(game_vec: Vector2) -> Vector2:
	return Vector2(game_vec.x * _pixels_per_meter, -game_vec.y * _pixels_per_meter)


# ============================================================================
# ENTITY REGISTRATION
# ============================================================================


func register_entity(entity_id: String, node: Node2D) -> int:
	entities[entity_id] = node
	
	var body_id = next_body_id
	body_id_map[entity_id] = body_id
	body_id_reverse[body_id] = entity_id
	next_body_id += 1
	
	entity_shape_map[entity_id] = []
	
	return body_id


func unregister_entity(entity_id: String) -> void:
	if body_id_map.has(entity_id):
		var body_id = body_id_map[entity_id]
		body_id_reverse.erase(body_id)
		body_id_map.erase(entity_id)
	
	if entity_shape_map.has(entity_id):
		entity_shape_map.erase(entity_id)
	
	entities.erase(entity_id)


# ============================================================================
# ENTITY QUERY
# ============================================================================


func get_entity(entity_id: String) -> Node2D:
	return entities.get(entity_id)


func has_entity(entity_id: String) -> bool:
	return entities.has(entity_id)


func get_entity_by_body_id(body_id: int) -> Node2D:
	var entity_id = body_id_reverse.get(body_id)
	if entity_id:
		return entities.get(entity_id)
	return null


# ============================================================================
# ENTITY SPAWNING
# ============================================================================


func spawn_entity(
	template_id: String,
	x: float,
	y: float,
	entity_id: String,
	initial_velocity_json: String = ""
) -> Node2D:
	if not _bridge:
		push_error("[EntityManager] Bridge not available")
		return null
	
	var templates = _bridge.templates if "templates" in _bridge else {}
	if not templates.has(template_id):
		push_error("[EntityManager] Template not found: " + template_id)
		return null
	
	var game_pos = Vector2(x, y)
	var godot_pos = _game_to_godot_pos(game_pos)
	
	var entity_data = {
		"id": entity_id,
		"template": template_id,
		"transform": {"x": x, "y": y, "angle": 0}
	}
	
	var initial_velocity = _parse_velocity_json(initial_velocity_json)
	if initial_velocity != null:
		entity_data["physics"] = {"initialVelocity": initial_velocity}
	
	var node = _create_entity(entity_data)
	
	if node:
		register_entity(entity_id, node)
	
	return node


func _parse_velocity_json(velocity_json: String) -> Dictionary:
	if velocity_json == "":
		return {}
	
	var json = JSON.new()
	var error = json.parse(velocity_json)
	if error != OK:
		return {}
	
	var velocity = json.get_data()
	if typeof(velocity) == TYPE_DICTIONARY:
		return velocity
	
	return {}


func _create_entity(entity_data: Dictionary) -> Node2D:
	if _bridge and _bridge.has_method("_create_entity"):
		return _bridge._create_entity(entity_data)
	
	push_error("[EntityManager] Bridge does not have _create_entity method")
	return null


# ============================================================================
# ENTITY DESTRUCTION
# ============================================================================


func destroy_entity(entity_id: String) -> void:
	var node = entities.get(entity_id)
	if not node:
		return
	
	unregister_entity(entity_id)
	
	if _bridge:
		if _bridge.has_method("_notify_js_destroy"):
			_bridge._notify_js_destroy(entity_id)
	
	node.queue_free()
	
	if _bridge and _bridge.has_signal("entity_destroyed"):
		_bridge.entity_destroyed.emit(entity_id)


# ============================================================================
# TRANSFORM OPERATIONS
# ============================================================================


func get_entity_transform(entity_id: String) -> Dictionary:
	var node = entities.get(entity_id)
	if not node or not is_instance_valid(node):
		return {}
	
	var game_pos = _godot_to_game_pos(node.position)
	return {
		"x": game_pos.x,
		"y": game_pos.y,
		"angle": -node.rotation
	}


func get_all_transforms() -> Dictionary:
	var result = {}
	
	for entity_id in entities:
		var node = entities[entity_id]
		if node and is_instance_valid(node):
			var game_pos = _godot_to_game_pos(node.position)
			result[entity_id] = {
				"x": game_pos.x,
				"y": game_pos.y,
				"angle": -node.rotation
			}
	
	return result


func set_entity_transform(entity_id: String, transform: Dictionary) -> void:
	var node = entities.get(entity_id)
	if not node or not is_instance_valid(node):
		return
	
	var x = transform.get("x", 0)
	var y = transform.get("y", 0)
	var angle = transform.get("angle", 0)
	
	node.position = _game_to_godot_pos(Vector2(x, y))
	node.rotation = -angle


# ============================================================================
# PROPERTY OPERATIONS
# ============================================================================


func get_all_properties() -> Dictionary:
	var result = {}
	
	for entity_id in entities:
		var node = entities[entity_id]
		if node and is_instance_valid(node):
			result[entity_id] = _collect_entity_properties(entity_id, node)
	
	return result


func _collect_entity_properties(entity_id: String, node: Node2D) -> Dictionary:
	var props = {
		"id": entity_id,
		"template": node.get_meta("template", ""),
		"position": _godot_to_game_pos(node.position),
		"rotation": -node.rotation,
		"scale": node.scale
	}
	
	var tags = node.get_meta("tags", [])
	if tags:
		props["tags"] = tags
	
	var behaviors = node.get_meta("behaviors", [])
	if behaviors:
		props["behaviors"] = behaviors
	
	if body_id_map.has(entity_id):
		props["body_id"] = body_id_map[entity_id]
	
	if node is RigidBody2D:
		props["type"] = "rigid_body"
		props["linear_velocity"] = node.linear_velocity
		props["angular_velocity"] = node.angular_velocity
		props["gravity_scale"] = node.gravity_scale
		props["mass"] = node.mass
	elif node is StaticBody2D:
		props["type"] = "static_body"
	elif node is CharacterBody2D:
		props["type"] = "character_body"
	elif node is Area2D:
		props["type"] = "area"
	
	return props


func get_entity_property(entity_id: String, property_name: String) -> Variant:
	var node = entities.get(entity_id)
	if not node or not is_instance_valid(node):
		return null
	
	match property_name:
		"position", "pos":
			return _godot_to_game_pos(node.position)
		"rotation", "angle":
			return -node.rotation
		"scale":
			return node.scale
		"x":
			return _godot_to_game_pos(node.position).x
		"y":
			return _godot_to_game_pos(node.position).y
		"template":
			return node.get_meta("template", "")
		"body_id":
			return body_id_map.get(entity_id)
		"linear_velocity":
			if node is RigidBody2D:
				return node.linear_velocity
		"angular_velocity":
			if node is RigidBody2D:
				return node.angular_velocity
	
	return null


# ============================================================================
# SHAPE MANAGEMENT
# ============================================================================


func get_entity_shapes(entity_id: String) -> Array:
	return entity_shape_map.get(entity_id, [])


func add_entity_shape(entity_id: String, collider_id: int) -> void:
	if not entity_shape_map.has(entity_id):
		entity_shape_map[entity_id] = []
	entity_shape_map[entity_id].append(collider_id)


func remove_entity_shape(entity_id: String, collider_id: int) -> void:
	if entity_shape_map.has(entity_id):
		var shapes = entity_shape_map[entity_id]
		shapes.erase(collider_id)
		if shapes.is_empty():
			entity_shape_map.erase(entity_id)


# ============================================================================
# UTILITY
# ============================================================================


func get_entity_count() -> int:
	return entities.size()


func get_body_id(entity_id: String) -> int:
	return body_id_map.get(entity_id, -1)


func get_all_entity_ids() -> Array:
	return entities.keys()


func clear_all() -> void:
	var ids = entities.keys()
	for entity_id in ids:
		destroy_entity(entity_id)
	
	entities.clear()
	body_id_map.clear()
	body_id_reverse.clear()
	entity_shape_map.clear()
	next_body_id = 1
