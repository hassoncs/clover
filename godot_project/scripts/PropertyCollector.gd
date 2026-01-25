extends Node
class_name PropertyCollector

var game_bridge: Node = null
var watched_properties: Dictionary = {}

func _init(bridge: Node) -> void:
	game_bridge = bridge

func set_watch_config(config: Dictionary) -> void:
	watched_properties = config

func collect_properties(frame_id: int) -> Dictionary:
	var payload = {
		"frameId": frame_id,
		"timestamp": Time.get_ticks_msec(),
		"entities": {}
	}
	
	for entity_id in game_bridge.entities:
		var entity_node = game_bridge.entities[entity_id]
		if not is_instance_valid(entity_node):
			continue
		
		var snapshot = {}
		
		if entity_node is RigidBody2D:
			snapshot = _collect_rigidbody_properties(entity_node)
		elif entity_node is CharacterBody2D:
			snapshot = _collect_characterbody_properties(entity_node)
		elif entity_node is StaticBody2D:
			snapshot = _collect_staticbody_properties(entity_node)
		
		if snapshot.size() > 0:
			payload.entities[entity_id] = snapshot
	
	return payload

func _collect_rigidbody_properties(node: RigidBody2D) -> Dictionary:
	var snapshot = {}
	
	_collect_transform_properties(node, snapshot)
	_collect_velocity_properties(node, snapshot)
	_collect_metadata_properties(node, snapshot)
	
	return snapshot

func _collect_characterbody_properties(node: CharacterBody2D) -> Dictionary:
	var snapshot = {}
	
	_collect_transform_properties(node, snapshot)
	_collect_sensor_velocity_properties(node, snapshot)
	_collect_metadata_properties(node, snapshot)
	
	return snapshot

func _collect_staticbody_properties(node: StaticBody2D) -> Dictionary:
	var snapshot = {}
	
	_collect_transform_properties(node, snapshot)
	_collect_metadata_properties(node, snapshot)
	
	return snapshot

func _collect_transform_properties(node: Node2D, snapshot: Dictionary) -> void:
	if _should_collect_property("transform.x") or _should_collect_property("transform.y") or _should_collect_property("transform.angle"):
		var game_pos = game_bridge.godot_to_game_pos(node.global_position)
		if _should_collect_property("transform.x"):
			snapshot["transform.x"] = game_pos.x
		if _should_collect_property("transform.y"):
			snapshot["transform.y"] = game_pos.y
		if _should_collect_property("transform.angle"):
			snapshot["transform.angle"] = -rad_to_deg(node.rotation)

func _collect_velocity_properties(node: RigidBody2D, snapshot: Dictionary) -> void:
	if _should_collect_property("velocity.x") or _should_collect_property("velocity.y"):
		var game_vel = game_bridge.godot_to_game_vec(node.linear_velocity)
		if _should_collect_property("velocity.x"):
			snapshot["velocity.x"] = game_vel.x
		if _should_collect_property("velocity.y"):
			snapshot["velocity.y"] = game_vel.y
	if _should_collect_property("angularVelocity"):
		snapshot["angularVelocity"] = -node.angular_velocity

func _collect_sensor_velocity_properties(node: CharacterBody2D, snapshot: Dictionary) -> void:
	if _should_collect_property("velocity.x") or _should_collect_property("velocity.y"):
		var entity_id = node.name
		if game_bridge.sensor_velocities.has(entity_id):
			var godot_vel = game_bridge.sensor_velocities[entity_id]
			var game_vel = game_bridge.godot_to_game_vec(godot_vel)
			if _should_collect_property("velocity.x"):
				snapshot["velocity.x"] = game_vel.x
			if _should_collect_property("velocity.y"):
				snapshot["velocity.y"] = game_vel.y
		else:
			if _should_collect_property("velocity.x"):
				snapshot["velocity.x"] = 0.0
			if _should_collect_property("velocity.y"):
				snapshot["velocity.y"] = 0.0
	if _should_collect_property("angularVelocity"):
		snapshot["angularVelocity"] = 0.0

func _collect_metadata_properties(node: Node, snapshot: Dictionary) -> void:
	var metadata_list = node.get_meta_list()
	
	for key in metadata_list:
		var property_path = _sanitize_property_name(key)
		
		if not _should_collect_property(property_path):
			continue
		
		var value = node.get_meta(key)
		
		if typeof(value) == TYPE_DICTIONARY:
			_collect_nested_dict(property_path, value, snapshot)
		elif typeof(value) == TYPE_ARRAY:
			_collect_array(property_path, value, snapshot)
		else:
			snapshot[property_path] = _convert_value_to_json(value)

func _sanitize_property_name(name: String) -> String:
	return name.replace(" ", "_").replace("-", "_")

func _collect_nested_dict(base_path: String, dict: Dictionary, snapshot: Dictionary) -> void:
	for key in dict:
		var nested_path = base_path + "." + str(key)
		var value = dict[key]
		
		if typeof(value) == TYPE_DICTIONARY:
			_collect_nested_dict(nested_path, value, snapshot)
		elif typeof(value) == TYPE_ARRAY:
			_collect_array(nested_path, value, snapshot)
		else:
			snapshot[nested_path] = _convert_value_to_json(value)

func _collect_array(base_path: String, array: Array, snapshot: Dictionary) -> void:
	for i in range(array.size()):
		var indexed_path = base_path + "[" + str(i) + "]"
		var value = array[i]
		
		if typeof(value) == TYPE_DICTIONARY:
			_collect_nested_dict(indexed_path, value, snapshot)
		elif typeof(value) == TYPE_ARRAY:
			_collect_array(indexed_path, value, snapshot)
		else:
			snapshot[indexed_path] = _convert_value_to_json(value)

func _convert_value_to_json(value):
	var value_type = typeof(value)
	
	if value_type == TYPE_VECTOR2:
		return {"x": value.x, "y": value.y}
	elif value_type == TYPE_BOOL:
		return value
	elif value_type == TYPE_INT or value_type == TYPE_FLOAT:
		return float(value)
	elif value_type == TYPE_STRING:
		return value
	else:
		return str(value)

func _should_collect_property(property: String) -> bool:
	if watched_properties.is_empty():
		return true
	
	if watched_properties.has("frameProperties") and watched_properties.frameProperties is Array:
		if property in watched_properties.frameProperties:
			return true
	
	if watched_properties.has("changeProperties") and watched_properties.changeProperties is Dictionary:
		if watched_properties.changeProperties.has(property):
			return true
	
	return false
