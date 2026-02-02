class_name BridgeCore
extends RefCounted

# =============================================================================
# BRIDGE CORE
# Unified bridge infrastructure for JS <-> GDScript communication
# Supports BridgeEnvelopeV1 format with 4 bridge kinds: event, request, response, progress
# Integrates with EventQueue for polling and QuerySystem for request routing
# =============================================================================

# -----------------------------------------------------------------------------
# BRIDGE KINDS
# -----------------------------------------------------------------------------

const KIND_EVENT: String = "event"
const KIND_REQUEST: String = "request"
const KIND_RESPONSE: String = "response"
const KIND_PROGRESS: String = "progress"

# -----------------------------------------------------------------------------
# DEFAULT CHANNELS
# -----------------------------------------------------------------------------

const CHANNEL_DEFAULT: String = "default"
const CHANNEL_PHYSICS: String = "physics"
const CHANNEL_INPUT: String = "input"
const CHANNEL_SYNC: String = "sync"
const CHANNEL_QUERY: String = "query"

# -----------------------------------------------------------------------------
# DEFAULT PRIORITIES
# -----------------------------------------------------------------------------

const PRIORITY_LOW: int = 0
const PRIORITY_NORMAL: int = 1
const PRIORITY_HIGH: int = 2
const PRIORITY_CRITICAL: int = 3

# -----------------------------------------------------------------------------
# INSTANCE STORAGE
# -----------------------------------------------------------------------------

var _event_queue: EventQueue = null
var _handlers: Dictionary = {}
var _js_callback: JavaScriptObject = null
var _default_channel: String = CHANNEL_DEFAULT
var _default_priority: int = PRIORITY_NORMAL

# =============================================================================
# INITIALIZATION
# =============================================================================

func _init(event_queue: EventQueue = null) -> void:
	_event_queue = event_queue
	if _event_queue == null:
		_event_queue = EventQueue.new()

# -----------------------------------------------------------------------------
# JAVASCRIPT BRIDGE SETUP
# -----------------------------------------------------------------------------

func setup_js_bridge(bridge_object: JavaScriptObject, callback_name: String = "onBridgeEvent") -> void:
	if OS.get_name() != "Web":
		return
	
	_js_callback = JavaScriptBridge.create_callback(_on_js_bridge_event)
	bridge_object[callback_name] = _js_callback

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------

func set_default_channel(channel: String) -> void:
	_default_channel = channel

func set_default_priority(priority: int) -> void:
	_default_priority = clampi(priority, PRIORITY_LOW, PRIORITY_CRITICAL)

# =============================================================================
# HANDLER REGISTRATION
# =============================================================================

func register_handler(topic: String, callback: Callable) -> void:
	if not callback.is_valid():
		push_error("[BridgeCore] Cannot register invalid handler for topic: %s" % topic)
		return
	
	_handlers[topic] = callback
	print("[BridgeCore] Registered handler for topic: %s" % topic)

func unregister_handler(topic: String) -> void:
	if _handlers.has(topic):
		_handlers.erase(topic)
		print("[BridgeCore] Unregistered handler for topic: %s" % topic)

func has_handler(topic: String) -> bool:
	return _handlers.has(topic)

func get_handler(topic: String) -> Callable:
	if _handlers.has(topic):
		return _handlers[topic]
	return Callable()

# =============================================================================
# EVENT EMISSION (BridgeEnvelopeV1 Format)
# =============================================================================

func emit_event(topic: String, payload: Variant, channel: String = "", priority: int = -1) -> void:
	var envelope = _create_envelope(KIND_EVENT, topic, payload, channel, priority)
	_queue_envelope(envelope)

func emit_collision(entity_a: String, entity_b: String, impulse: float) -> void:
	var payload = {
		"entityA": entity_a,
		"entityB": entity_b,
		"impulse": impulse
	}
	emit_event("collision", payload, CHANNEL_PHYSICS, PRIORITY_HIGH)

func emit_collision_detailed(collision_data: Dictionary) -> void:
	emit_event("collision_detailed", collision_data, CHANNEL_PHYSICS, PRIORITY_HIGH)

func emit_entity_spawned(entity_id: String, snapshot: Dictionary) -> void:
	var payload = {
		"entityId": entity_id,
		"snapshot": snapshot
	}
	emit_event("entity_spawned", payload, CHANNEL_SYNC, PRIORITY_NORMAL)

func emit_entity_destroyed(entity_id: String) -> void:
	emit_event("entity_destroyed", {"entityId": entity_id}, CHANNEL_SYNC, PRIORITY_NORMAL)

func emit_input_event(input_type: String, x: float, y: float, entity_id: Variant = null) -> void:
	var payload = {
		"type": input_type,
		"x": x,
		"y": y,
		"entityId": entity_id
	}
	emit_event("input", payload, CHANNEL_INPUT, PRIORITY_HIGH)

func emit_sensor_begin(sensor_shape_index: int, other_entity_id: String, other_shape_index: int) -> void:
	var payload = {
		"sensorShapeIndex": sensor_shape_index,
		"otherEntityId": other_entity_id,
		"otherShapeIndex": other_shape_index
	}
	emit_event("sensor_begin", payload, CHANNEL_PHYSICS, PRIORITY_NORMAL)

func emit_sensor_end(sensor_shape_index: int, other_entity_id: String, other_shape_index: int) -> void:
	var payload = {
		"sensorShapeIndex": sensor_shape_index,
		"otherEntityId": other_entity_id,
		"otherShapeIndex": other_shape_index
	}
	emit_event("sensor_end", payload, CHANNEL_PHYSICS, PRIORITY_NORMAL)

func emit_transform_sync(entity_id: String, transform_data: Dictionary) -> void:
	var payload = {
		"entityId": entity_id,
		"transform": transform_data
	}
	emit_event("transform_sync", payload, CHANNEL_SYNC, PRIORITY_LOW)

func emit_property_sync(entity_id: String, property_name: String, value: Variant) -> void:
	var payload = {
		"entityId": entity_id,
		"propertyName": property_name,
		"value": value
	}
	emit_event("property_sync", payload, CHANNEL_SYNC, PRIORITY_LOW)

func emit_ui_button_event(event_type: String, button_id: String) -> void:
	var payload = {
		"eventType": event_type,
		"buttonId": button_id
	}
	emit_event("ui_button", payload, CHANNEL_INPUT, PRIORITY_NORMAL)

# =============================================================================
# REQUEST HANDLING
# =============================================================================

func handle_request(request_id: String, topic: String, args: Array) -> void:
	print("[BridgeCore] Handling request: topic=%s, requestId=%s, args=%s" % [topic, request_id, str(args)])
	
	if _handlers.has(topic):
		var callback: Callable = _handlers[topic]
		if callback.is_valid():
			var result = callback.call(args)
			send_response(request_id, topic, result)
		else:
			send_error(request_id, topic, "Handler is invalid")
	else:
		send_error(request_id, topic, "Unknown topic: %s" % topic)

func handle_request_async(request_id: String, topic: String, args: Array) -> void:
	print("[BridgeCore] Handling async request: topic=%s, requestId=%s" % [topic, request_id])
	
	if _handlers.has(topic):
		var callback: Callable = _handlers[topic]
		if callback.is_valid():
			var result = callback.call(args)
			# If result is a coroutine/signal, await it
			if result is Object and result.has_signal("completed"):
				result = await result
			send_response(request_id, topic, result)
		else:
			send_error(request_id, topic, "Handler is invalid")
	else:
		send_error(request_id, topic, "Unknown topic: %s" % topic)

# =============================================================================
# RESPONSE SENDING
# =============================================================================

func send_response(request_id: String, topic: String, result: Variant) -> void:
	var payload = {
		"requestId": request_id,
		"topic": topic,
		"result": result,
		"error": null
	}
	var envelope = _create_envelope(KIND_RESPONSE, topic, payload, CHANNEL_QUERY, PRIORITY_HIGH)
	_send_envelope_to_js(envelope)

func send_error(request_id: String, topic: String, error_message: String) -> void:
	var payload = {
		"requestId": request_id,
		"topic": topic,
		"result": null,
		"error": error_message
	}
	var envelope = _create_envelope(KIND_RESPONSE, topic, payload, CHANNEL_QUERY, PRIORITY_HIGH)
	_send_envelope_to_js(envelope)
	print("[BridgeCore] Sent error response: %s for request %s" % [error_message, request_id])

# =============================================================================
# PROGRESS UPDATES
# =============================================================================

func send_progress(request_id: String, topic: String, progress: float, message: String = "") -> void:
	var payload = {
		"requestId": request_id,
		"topic": topic,
		"progress": clampf(progress, 0.0, 1.0),
		"message": message
	}
	var envelope = _create_envelope(KIND_PROGRESS, topic, payload, CHANNEL_QUERY, PRIORITY_NORMAL)
	_send_envelope_to_js(envelope)

# =============================================================================
# EVENT QUEUE INTEGRATION
# =============================================================================

func queue_event(event_type: String, data: Dictionary) -> void:
	if _event_queue != null:
		_event_queue.queue_event(event_type, data)

func poll_events() -> String:
	if _event_queue != null:
		return _event_queue.poll_events()
	return "[]"

func clear_events() -> void:
	if _event_queue != null:
		_event_queue.clear()

# =============================================================================
# ENVELOPE CREATION
# =============================================================================

func _create_envelope(kind: String, topic: String, payload: Variant, channel: String, priority: int) -> Dictionary:
	var effective_channel = channel if channel != "" else _default_channel
	var effective_priority = priority if priority >= 0 else _default_priority
	
	var envelope = {
		"kind": kind,
		"topic": topic,
		"payload": payload,
		"meta": {
			"channel": effective_channel,
			"priority": effective_priority,
			"timestamp": Time.get_unix_time_from_system()
		}
	}
	
	return envelope

func _queue_envelope(envelope: Dictionary) -> void:
	var json_str = JSON.stringify(envelope)
	if _js_callback != null:
		_js_callback.call("call", null, json_str)
	else:
		# Fallback to event queue
		var event_type = envelope["topic"]
		queue_event(event_type, envelope)

func _send_envelope_to_js(envelope: Dictionary) -> void:
	if OS.get_name() != "Web":
		return
	
	var json_str = JSON.stringify(envelope)
	var escaped_json = json_str.replace("\\", "\\\\").replace("'", "\\'")
	var js_code = "(window.parent || window)._godotBridgeResolve('%s');" % escaped_json
	JavaScriptBridge.eval(js_code)

# =============================================================================
# JAVASCRIPT CALLBACK HANDLER
# =============================================================================

func _on_js_bridge_event(args: Array) -> void:
	if args.size() < 1:
		push_error("[BridgeCore] JS bridge event received with no arguments")
		return
	
	var json_str = String(args[0])
	var parse_result = JSON.parse_string(json_str)
	
	if parse_result == null or not parse_result is Dictionary:
		push_error("[BridgeCore] Failed to parse bridge event JSON: %s" % json_str)
		return
	
	var envelope = parse_result as Dictionary
	_handle_envelope(envelope)

func _handle_envelope(envelope: Dictionary) -> void:
	var kind = envelope.get("kind", "")
	var topic = envelope.get("topic", "")
	var payload = envelope.get("payload", null)
	
	match kind:
		KIND_REQUEST:
			_handle_request_envelope(envelope)
		KIND_EVENT:
			_handle_event_envelope(envelope)
		KIND_RESPONSE:
			_handle_response_envelope(envelope)
		KIND_PROGRESS:
			_handle_progress_envelope(envelope)
		_:
			push_error("[BridgeCore] Unknown envelope kind: %s" % kind)

func _handle_request_envelope(envelope: Dictionary) -> void:
	var request_id = envelope.get("meta", {}).get("requestId", "")
	var args = []
	
	var payload = envelope.get("payload", null)
	if payload is Array:
		args = payload
	elif payload is Dictionary and payload.has("args"):
		args = payload["args"]
	
	handle_request_async(request_id, envelope["topic"], args)

func _handle_event_envelope(envelope: Dictionary) -> void:
	# Events from JS can be handled by registered handlers or forwarded
	var topic = envelope["topic"]
	if _handlers.has(topic):
		var callback = _handlers[topic]
		if callback.is_valid():
			callback.call(envelope["payload"])

func _handle_response_envelope(envelope: Dictionary) -> void:
	# Responses from JS are typically handled by the query system
	# This allows bidirectional communication
	var request_id = envelope.get("meta", {}).get("requestId", "")
	var result = envelope.get("payload", {}).get("result", null)
	var error = envelope.get("payload", {}).get("error", null)
	
	print("[BridgeCore] Received response for request %s: result=%s, error=%s" % [request_id, str(result), str(error)])

func _handle_progress_envelope(envelope: Dictionary) -> void:
	# Progress updates from JS
	var request_id = envelope.get("meta", {}).get("requestId", "")
	var progress = envelope.get("payload", {}).get("progress", 0.0)
	var message = envelope.get("payload", {}).get("message", "")
	
	print("[BridgeCore] Progress update for request %s: %.1f%% - %s" % [request_id, progress * 100.0, message])

# =============================================================================
# UTILITY METHODS
# =============================================================================

func get_queued_event_count() -> int:
	if _event_queue != null:
		return _event_queue._event_queue.size()
	return 0

func is_queue_full() -> bool:
	if _event_queue != null:
		return _event_queue._event_queue.size() >= EventQueue.MAX_EVENT_QUEUE_SIZE
	return false

# =============================================================================
# DEBUG METHODS
# =============================================================================

func get_registered_topics() -> Array[String]:
	return _handlers.keys()

func print_status() -> void:
	print("[BridgeCore] Status:")
	print("  - Registered handlers: %d" % _handlers.size())
	print("  - Queued events: %d" % get_queued_event_count())
	print("  - JS callback active: %s" % ("Yes" if _js_callback != null else "No"))
	print("  - Default channel: %s" % _default_channel)
	print("  - Default priority: %d" % _default_priority)
