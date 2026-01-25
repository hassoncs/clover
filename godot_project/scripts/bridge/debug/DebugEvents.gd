class_name DebugEvents
extends RefCounted

# =============================================================================
# DEBUG EVENTS
# Event subscription and polling system for monitoring game events
# =============================================================================

const MAX_EVENTS_PER_SUB = 500
const MAX_SUBSCRIPTIONS = 50

var _game_bridge: Node
var _subscriptions: Dictionary = {}
var _event_buffer: Array = []
var _next_event_id: int = 0
var _next_sub_id: int = 0
var _frame_counter: int = 0

func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge
	_connect_game_signals()

func _connect_game_signals() -> void:
	if _game_bridge.has_signal("entity_spawned"):
		_game_bridge.entity_spawned.connect(_on_entity_spawned)
	if _game_bridge.has_signal("entity_destroyed"):
		_game_bridge.entity_destroyed.connect(_on_entity_destroyed)
	if _game_bridge.has_signal("collision_occurred"):
		_game_bridge.collision_occurred.connect(_on_collision)

# =============================================================================
# SUBSCRIPTION MANAGEMENT
# =============================================================================

func subscribe(request: Dictionary) -> Dictionary:
	if _subscriptions.size() >= MAX_SUBSCRIPTIONS:
		return {"error": "Maximum subscriptions reached", "subId": null}
	
	var types = request.get("types", [])
	var where_filter = request.get("where", {})
	var limit_per_poll = request.get("limitPerPoll", 100)
	
	_next_sub_id += 1
	var sub_id = "sub_" + str(_next_sub_id)
	
	_subscriptions[sub_id] = {
		"types": types,
		"where": where_filter,
		"limitPerPoll": limit_per_poll,
		"cursor": _next_event_id,
		"createdAt": Time.get_ticks_msec()
	}
	
	return {"ok": true, "subId": sub_id}

func unsubscribe(sub_id: String) -> Dictionary:
	if not _subscriptions.has(sub_id):
		return {"ok": false, "error": "Subscription not found: " + sub_id}
	
	_subscriptions.erase(sub_id)
	return {"ok": true, "subId": sub_id}

func list_subscriptions() -> Dictionary:
	var subs = []
	for sub_id in _subscriptions:
		var sub = _subscriptions[sub_id]
		subs.append({
			"subId": sub_id,
			"types": sub.types,
			"limitPerPoll": sub.limitPerPoll,
			"createdAt": sub.createdAt
		})
	return {"subscriptions": subs}

# =============================================================================
# EVENT POLLING
# =============================================================================

func poll_events(options: Dictionary) -> Dictionary:
	var sub_id = options.get("subId", "")
	var max_events = options.get("max", 100)
	
	if sub_id == "":
		return _poll_all_events(max_events)
	
	if not _subscriptions.has(sub_id):
		return {"error": "Subscription not found: " + sub_id, "events": [], "dropped": 0}
	
	var sub = _subscriptions[sub_id]
	var cursor = sub.cursor
	var types = sub.types
	var where_filter = sub.where
	var limit = min(max_events, sub.limitPerPoll)
	
	var matching_events = []
	var dropped = 0
	
	for event in _event_buffer:
		if event.eventId < cursor:
			continue
		
		if types.size() > 0 and event.type not in types:
			continue
		
		if not _matches_where_filter(event, where_filter):
			continue
		
		if matching_events.size() >= limit:
			dropped += 1
			continue
		
		matching_events.append(event)
	
	if matching_events.size() > 0:
		sub.cursor = matching_events[matching_events.size() - 1].eventId + 1
	
	return {
		"events": matching_events,
		"count": matching_events.size(),
		"dropped": dropped,
		"cursor": sub.cursor
	}

func _poll_all_events(max_events: int) -> Dictionary:
	var events = _event_buffer.slice(0, max_events)
	return {
		"events": events,
		"count": events.size(),
		"dropped": max(0, _event_buffer.size() - max_events)
	}

func _matches_where_filter(event: Dictionary, where_filter: Dictionary) -> bool:
	if where_filter.is_empty():
		return true
	
	if where_filter.has("anyOf"):
		for condition in where_filter.anyOf:
			if _matches_single_condition(event, condition):
				return true
		return false
	
	return _matches_single_condition(event, where_filter)

func _matches_single_condition(event: Dictionary, condition: Dictionary) -> bool:
	var data = event.get("data", {})
	
	if condition.has("entityId"):
		var target_id = condition.entityId
		if data.get("entityId", "") != target_id and data.get("aId", "") != target_id and data.get("bId", "") != target_id:
			return false
	
	if condition.has("template"):
		var target_tmpl = condition.template
		if data.get("template", "") != target_tmpl and data.get("aTemplate", "") != target_tmpl and data.get("bTemplate", "") != target_tmpl:
			return false
	
	if condition.has("tag"):
		var target_tag = condition.tag
		var tags = data.get("tags", [])
		var a_tags = data.get("aTags", [])
		var b_tags = data.get("bTags", [])
		if target_tag not in tags and target_tag not in a_tags and target_tag not in b_tags:
			return false
	
	if condition.has("a") and condition.has("b"):
		var a_match = _matches_entity_filter(data, "a", condition.a)
		var b_match = _matches_entity_filter(data, "b", condition.b)
		if not (a_match and b_match):
			var a_match_rev = _matches_entity_filter(data, "b", condition.a)
			var b_match_rev = _matches_entity_filter(data, "a", condition.b)
			if not (a_match_rev and b_match_rev):
				return false
	
	return true

func _matches_entity_filter(data: Dictionary, prefix: String, filter: Dictionary) -> bool:
	var entity_id = data.get(prefix + "Id", "")
	var template = data.get(prefix + "Template", "")
	var tags = data.get(prefix + "Tags", [])
	
	if filter.has("entityId") and entity_id != filter.entityId:
		return false
	
	if filter.has("template") and template != filter.template:
		return false
	
	if filter.has("tag") and filter.tag not in tags:
		return false
	
	return true

# =============================================================================
# EVENT EMISSION
# =============================================================================

func _emit_event(event_type: String, data: Dictionary) -> void:
	_next_event_id += 1
	
	var event = {
		"eventId": _next_event_id,
		"type": event_type,
		"timestampMs": Time.get_ticks_msec(),
		"frame": _frame_counter,
		"data": data
	}
	
	_event_buffer.append(event)
	
	while _event_buffer.size() > MAX_EVENTS_PER_SUB * 2:
		_event_buffer.pop_front()

func _on_entity_spawned(entity_id: String, node: Node2D) -> void:
	var template = node.get_meta("template") if node.has_meta("template") else ""
	var tags = node.get_meta("tags") if node.has_meta("tags") else []
	var parent_id = _find_entity_id(node.get_parent())
	
	_emit_event("entity_spawned", {
		"entityId": entity_id,
		"template": template,
		"tags": tags,
		"parentId": parent_id
	})

func _on_entity_destroyed(entity_id: String) -> void:
	_emit_event("entity_destroyed", {
		"entityId": entity_id
	})

func _on_collision(entity_a: String, entity_b: String, impulse: float) -> void:
	var entities = _game_bridge.entities
	
	var a_template = ""
	var a_tags = []
	if entities.has(entity_a):
		var node_a = entities[entity_a]
		a_template = node_a.get_meta("template") if node_a.has_meta("template") else ""
		a_tags = node_a.get_meta("tags") if node_a.has_meta("tags") else []
	
	var b_template = ""
	var b_tags = []
	if entities.has(entity_b):
		var node_b = entities[entity_b]
		b_template = node_b.get_meta("template") if node_b.has_meta("template") else ""
		b_tags = node_b.get_meta("tags") if node_b.has_meta("tags") else []
	
	_emit_event("collision_begin", {
		"aId": entity_a,
		"bId": entity_b,
		"aTemplate": a_template,
		"bTemplate": b_template,
		"aTags": a_tags,
		"bTags": b_tags,
		"impulse": impulse
	})

func emit_sensor_overlap_begin(sensor_id: String, other_id: String) -> void:
	_emit_event("sensor_overlap_begin", {
		"sensorId": sensor_id,
		"otherId": other_id
	})

func emit_sensor_overlap_end(sensor_id: String, other_id: String) -> void:
	_emit_event("sensor_overlap_end", {
		"sensorId": sensor_id,
		"otherId": other_id
	})

func emit_signal_event(source_id: String, signal_name: String, args: Array) -> void:
	_emit_event("signal_emitted", {
		"sourceId": source_id,
		"signal": signal_name,
		"args": args
	})

func emit_custom_event(event_type: String, data: Dictionary) -> void:
	_emit_event(event_type, data)

# =============================================================================
# UTILITIES
# =============================================================================

func _find_entity_id(node: Node) -> String:
	if node == null:
		return ""
	var entities = _game_bridge.entities
	for entity_id in entities:
		if entities[entity_id] == node:
			return entity_id
	return ""

func set_frame_counter(frame: int) -> void:
	_frame_counter = frame

func clear_events() -> void:
	_event_buffer.clear()

func clear_subscriptions() -> void:
	_subscriptions.clear()
