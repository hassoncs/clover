class_name SyncSystem
extends RefCounted

var _bridge: Node = null
var _js_transform_sync_callback: JavaScriptObject = null
var _js_property_sync_callback: JavaScriptObject = null

var _tracked_entities: Array = []
var _sync_interval_ms: int = 16
var _last_sync_time: int = 0


func _init(game_bridge: Node) -> void:
	_bridge = game_bridge


func set_transform_sync_callback(cb: JavaScriptObject) -> void:
	_js_transform_sync_callback = cb


func set_property_sync_callback(cb: JavaScriptObject) -> void:
	_js_property_sync_callback = cb


func set_tracked_entities(entity_ids: Array, config: Dictionary = {}) -> void:
	_tracked_entities = entity_ids.duplicate()
	_sync_interval_ms = config.get("interval", 16)


func get_tracked_entities() -> Array:
	return _tracked_entities.duplicate()


func clear_tracked_entities() -> void:
	_tracked_entities.clear()


func set_watch_config(config: Dictionary) -> void:
	var enabled = config.get("enabled", false)
	var entity_ids = config.get("entityIds", [])
	var interval = config.get("interval", 16)
	if enabled and entity_ids.size() > 0:
		set_tracked_entities(entity_ids, {"interval": interval})
	else:
		clear_tracked_entities()


func should_sync_tracked() -> bool:
	if _tracked_entities.is_empty():
		return false
	var now = Time.get_ticks_msec()
	if now - _last_sync_time >= _sync_interval_ms:
		_last_sync_time = now
		return true
	return false


func get_transform(entity_id: String) -> Variant:
	var node = _bridge.get_entity_node(entity_id)
	if not node or not is_instance_valid(node):
		return null
	var game_pos = CoordinateUtils.godot_to_game_pos(node.position, _bridge.pixels_per_meter)
	return {
		"x": game_pos.x,
		"y": game_pos.y,
		"angle": -node.rotation,
		"scaleX": node.scale.x,
		"scaleY": node.scale.y
	}


func get_transforms(entity_ids: Array) -> Dictionary:
	var result = {}
	for entity_id in entity_ids:
		result[str(entity_id)] = get_transform(str(entity_id))
	return result


func get_tracked_transforms() -> Dictionary:
	var result = {}
	for entity_id in _tracked_entities:
		var transform = get_transform(entity_id)
		if transform != null:
			result[entity_id] = transform
	return result


func notify_tracked_sync() -> void:
	if _js_transform_sync_callback == null:
		return
	var transforms = get_tracked_transforms()
	var json_str = JSON.stringify(transforms)
	_js_transform_sync_callback.call("call", null, json_str)


func notify_full_transform_sync() -> void:
	if _js_transform_sync_callback == null:
		return
	var transforms = _bridge.get_all_transforms()
	var json_str = JSON.stringify(transforms)
	_js_transform_sync_callback.call("call", null, json_str)


func notify_property_sync(properties: Dictionary) -> void:
	if _js_property_sync_callback == null:
		return
	var json_str = JSON.stringify(properties)
	_js_property_sync_callback.call("call", null, json_str)


func process_sync() -> void:
	if should_sync_tracked():
		notify_tracked_sync()

# =============================================================================
# JS HANDLERS (called from JavaScript bridge)
# =============================================================================

func _js_get_transform(args: Array) -> Variant:
	if args.size() < 1:
		return null
	return get_transform(str(args[0]))


func _js_get_transforms(args: Array) -> Dictionary:
	if args.size() < 1:
		return {}
	var entity_ids = args[0]
	if entity_ids is String:
		entity_ids = JSON.parse_string(entity_ids)
	if not entity_ids is Array:
		return {}
	return get_transforms(entity_ids)


func _js_set_tracked_entities(args: Array) -> void:
	if args.size() < 1:
		return
	var entity_ids = args[0]
	if entity_ids is String:
		entity_ids = JSON.parse_string(entity_ids)
	if not entity_ids is Array:
		return
	var config = {}
	if args.size() >= 2:
		var config_val = args[1]
		if config_val is String:
			config = JSON.parse_string(config_val)
		elif config_val is Dictionary:
			config = config_val
	set_tracked_entities(entity_ids, config)


func _js_on_transform_sync(args: Array) -> void:
	if args.size() >= 1:
		set_transform_sync_callback(args[0])


func _js_on_property_sync(args: Array) -> void:
	if args.size() >= 1:
		set_property_sync_callback(args[0])
