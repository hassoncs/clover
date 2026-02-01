class_name EventEmitter
extends RefCounted

var _bridge: Node

var _js_collision_callback: JavaScriptObject = null
var _js_destroy_callback: JavaScriptObject = null
var _js_sensor_begin_callback: JavaScriptObject = null
var _js_sensor_end_callback: JavaScriptObject = null
var _js_entity_spawned_callback: JavaScriptObject = null
var _js_input_event_callback: JavaScriptObject = null
var _js_ui_button_callback: JavaScriptObject = null
var _js_transform_sync_callback: JavaScriptObject = null
var _js_property_sync_callback: JavaScriptObject = null


func _init(game_bridge: Node) -> void:
	_bridge = game_bridge


func set_collision_callback(cb: JavaScriptObject) -> void:
	_js_collision_callback = cb


func set_destroy_callback(cb: JavaScriptObject) -> void:
	_js_destroy_callback = cb


func set_sensor_begin_callback(cb: JavaScriptObject) -> void:
	_js_sensor_begin_callback = cb


func set_sensor_end_callback(cb: JavaScriptObject) -> void:
	_js_sensor_end_callback = cb


func set_input_event_callback(cb: JavaScriptObject) -> void:
	_js_input_event_callback = cb


func set_ui_button_callback(cb: JavaScriptObject) -> void:
	_js_ui_button_callback = cb


func set_transform_sync_callback(cb: JavaScriptObject) -> void:
	_js_transform_sync_callback = cb


func set_property_sync_callback(cb: JavaScriptObject) -> void:
	_js_property_sync_callback = cb


func emit_collision(entity_a: String, entity_b: String, impulse: float) -> void:
	if _js_collision_callback != null:
		_js_collision_callback.call("call", null, entity_a, entity_b, impulse)
	else:
		_queue_event("collision", {"entityA": entity_a, "entityB": entity_b, "impulse": impulse})


func emit_collision_detailed(collision_data: Dictionary) -> void:
	if _js_collision_callback != null:
		var entity_a = collision_data.get("entityA", "")
		var entity_b = collision_data.get("entityB", "")
		var total_impulse = 0.0
		for contact in collision_data.get("contacts", []):
			total_impulse += abs(contact.get("normalImpulse", 0.0))
		_js_collision_callback.call("call", null, entity_a, entity_b, total_impulse)
	else:
		_queue_event("collision_detailed", collision_data)


func set_entity_spawned_callback(cb: JavaScriptObject) -> void:
	_js_entity_spawned_callback = cb


func emit_entity_spawned(entity_id: String, snapshot: Dictionary) -> void:
	if _js_entity_spawned_callback != null:
		var json_str = JSON.stringify(snapshot)
		_js_entity_spawned_callback.call("call", null, json_str)
	else:
		_queue_event("entity_spawned", snapshot)


func emit_destroy(entity_id: String) -> void:
	if _js_destroy_callback != null:
		_js_destroy_callback.call("call", null, entity_id)
	else:
		_queue_event("destroy", {"entityId": entity_id})


func emit_input_event(input_type: String, x: float, y: float, entity_id: Variant) -> void:
	var data = {"type": input_type, "x": x, "y": y, "entityId": entity_id}
	var json_str = JSON.stringify(data)
	if _js_input_event_callback != null:
		_js_input_event_callback.call("call", null, json_str)
	else:
		_queue_event("input", data)


func emit_sensor_begin(sensor_shape_index: int, other_entity_id: String, other_shape_index: int) -> void:
	if _js_sensor_begin_callback != null:
		_js_sensor_begin_callback.call("call", null, sensor_shape_index, other_entity_id, other_shape_index)
	else:
		_queue_event("sensor_begin", {
			"sensorShapeIndex": sensor_shape_index,
			"otherEntityId": other_entity_id,
			"otherShapeIndex": other_shape_index
		})


func emit_sensor_end(sensor_shape_index: int, other_entity_id: String, other_shape_index: int) -> void:
	if _js_sensor_end_callback != null:
		_js_sensor_end_callback.call("call", null, sensor_shape_index, other_entity_id, other_shape_index)
	else:
		_queue_event("sensor_end", {
			"sensorShapeIndex": sensor_shape_index,
			"otherEntityId": other_entity_id,
			"otherShapeIndex": other_shape_index
		})


func emit_ui_button_event(event_type: String, button_id: String) -> void:
	if _js_ui_button_callback != null:
		_js_ui_button_callback.call("call", null, event_type, button_id)
	else:
		_queue_event("ui_button", {"eventType": event_type, "buttonId": button_id})


func emit_transform_sync(entity_id: String, transform_data: Dictionary) -> void:
	if _js_transform_sync_callback != null:
		var json_str = JSON.stringify({"entityId": entity_id, "transform": transform_data})
		_js_transform_sync_callback.call("call", null, json_str)
	else:
		_queue_event("transform_sync", {"entityId": entity_id, "transform": transform_data})


func emit_property_sync(entity_id: String, property_name: String, value: Variant) -> void:
	if _js_property_sync_callback != null:
		var data = {"entityId": entity_id, "propertyName": property_name, "value": value}
		var json_str = JSON.stringify(data)
		_js_property_sync_callback.call("call", null, json_str)
	else:
		_queue_event("property_sync", {"entityId": entity_id, "propertyName": property_name, "value": value})


func _queue_event(event_type: String, data: Variant) -> void:
	if _bridge.has_method("_queue_event"):
		_bridge._queue_event(event_type, data)

# =============================================================================
# JS HANDLERS (called from JavaScript bridge)
# =============================================================================

func _js_on_input_event(args: Array) -> void:
	if args.size() >= 1:
		set_input_event_callback(args[0])


func _js_on_collision(args: Array) -> void:
	if args.size() >= 1:
		set_collision_callback(args[0])


func _js_on_entity_destroyed(args: Array) -> void:
	if args.size() >= 1:
		set_destroy_callback(args[0])


func _js_on_sensor_begin(args: Array) -> void:
	if args.size() >= 1:
		set_sensor_begin_callback(args[0])


func _js_on_sensor_end(args: Array) -> void:
	if args.size() >= 1:
		set_sensor_end_callback(args[0])
