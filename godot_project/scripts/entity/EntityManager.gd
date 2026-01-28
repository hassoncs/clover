class_name EntityManager
extends RefCounted

var bridge: Node

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

func spawn_entity(template_id: String, x: float, y: float) -> Node2D:
	return spawn_entity_with_id(template_id, x, y, template_id + "_" + str(randi()))

func spawn_entity_with_id(template_id: String, x: float, y: float, entity_id: String) -> Node2D:
	if not bridge.templates.has(template_id):
		push_error("[EntityManager] Template not found: " + template_id)
		return null
	
	var entity_data = {
		"id": entity_id,
		"template": template_id,
		"transform": {"x": x, "y": y, "angle": 0}
	}
	
	return bridge._create_entity(entity_data)

func destroy_entity(entity_id: String) -> void:
	if bridge.entities.has(entity_id):
		var node = bridge.entities[entity_id]
		bridge.entities.erase(entity_id)
		node.queue_free()
		bridge.entity_destroyed.emit(entity_id)
		bridge._notify_js_destroy(entity_id)

func get_entity(entity_id: String) -> Node2D:
	return bridge.entities.get(entity_id)

func get_all_transforms() -> Dictionary:
	var result = {}
	for entity_id in bridge.entities:
		var node = bridge.entities[entity_id]
		if node and is_instance_valid(node):
			var game_pos = CoordinateUtils.godot_to_game_pos(node.position, bridge.pixels_per_meter)
			result[entity_id] = {
				"x": game_pos.x,
				"y": game_pos.y,
				"angle": -node.rotation
			}
	return result
