class_name EntityManager
extends RefCounted

# Bridge reference for coordinate conversion and callbacks
var _bridge: Node

# State ownership
var entities: Dictionary = {}

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
	return CoordinateUtils.game_to_godot_pos(game_pos, _pixels_per_meter)


func _godot_to_game_pos(godot_pos: Vector2) -> Vector2:
	return CoordinateUtils.godot_to_game_pos(godot_pos, _pixels_per_meter)


func _game_to_godot_vec(game_vec: Vector2) -> Vector2:
	return CoordinateUtils.game_to_godot_vec(game_vec, _pixels_per_meter)


# ============================================================================
# ENTITY REGISTRATION
# ============================================================================


func register_entity(entity_id: String, node: Node2D) -> void:
	entities[entity_id] = node


func unregister_entity(entity_id: String) -> void:
	entities.erase(entity_id)


# ============================================================================
# ENTITY QUERY
# ============================================================================


func get_entity(entity_id: String) -> Node2D:
	return entities.get(entity_id)


func has_entity(entity_id: String) -> bool:
	return entities.has(entity_id)





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
	
	var entity_data = {
		"id": entity_id,
		"template": template_id,
		"transform": {"x": x, "y": y, "angle": 0}
	}
	
	var initial_velocity = _parse_velocity_json(initial_velocity_json)
	if initial_velocity.size() > 0:
		entity_data["physics"] = {"initialVelocity": initial_velocity}
	
	var record = _bridge._entity_factory.create_entity(entity_data)
	var node = record.node
	
	if node:
		register_entity(entity_id, node)
		if _bridge and "entity_registry" in _bridge:
			_bridge.entity_registry[entity_id] = record
	
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
		"linear_velocity":
			if node is RigidBody2D:
				return node.linear_velocity
		"angular_velocity":
			if node is RigidBody2D:
				return node.angular_velocity
	
	return null





# ============================================================================
# UTILITY
# ============================================================================


func get_entity_count() -> int:
	return entities.size()


func get_all_entity_ids() -> Array:
	return entities.keys()


func clear_all() -> void:
	var ids = entities.keys()
	for entity_id in ids:
		destroy_entity(entity_id)
	
	entities.clear()

# =============================================================================
# JS HANDLERS (called from JavaScript bridge)
# =============================================================================

func _js_get_all_bodies(_args: Array) -> Array:
	return get_all_entity_ids()

func _js_spawn_entity(args: Array) -> void:
	if args.size() < 4:
		return
	spawn_entity(str(args[0]), float(args[1]), float(args[2]), str(args[3]))

func _js_destroy_entity(args: Array) -> void:
	if args.size() < 1:
		return
	destroy_entity(str(args[0]))

func _js_get_entity_transform(args: Array) -> Variant:
	if args.size() < 1:
		return null
	return get_entity_transform(str(args[0]))

var user_data: Dictionary = {}

func _js_set_user_data(args: Array) -> void:
	if args.size() < 2:
		return
	var body_id = int(args[0])
	user_data[body_id] = args[1]


func _js_get_user_data(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var body_id = int(args[0])
	return user_data.get(body_id)
