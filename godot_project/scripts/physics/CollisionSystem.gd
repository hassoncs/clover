class_name CollisionSystem extends RefCounted

const IMPULSE_THRESHOLD: float = 0.1

var _game_bridge: Node = null
var _event_emitter: EventEmitter = null
var _js_collision_callback: JavaScriptObject = null

func _init(game_bridge: Node, event_emitter: EventEmitter) -> void:
	_game_bridge = game_bridge
	_event_emitter = event_emitter


func _js_on_collision(args: Array) -> void:
	if args.size() >= 1:
		_js_collision_callback = args[0]


func _js_on_entity_destroyed(args: Array) -> void:
	if args.size() >= 1:
		_js_destroy_callback = args[0]


func _js_on_entity_spawned(args: Array) -> void:
	if args.size() >= 1:
		_js_entity_spawned_callback = args[0]


func _notify_js_collision(entity_a: String, entity_b: String, impulse: float) -> void:
	if _js_collision_callback != null:
		_js_collision_callback.call("call", null, entity_a, entity_b, impulse)


func _notify_js_collision_detailed(collision_data: Dictionary) -> void:
	if _js_collision_callback != null:
		var json_str = JSON.stringify(collision_data)
		_js_collision_callback.call("call", null, json_str)


func _notify_js_destroy(entity_id: String) -> void:
	_event_emitter.emit_destroy(entity_id)


func _notify_js_entity_spawned(entity_id: String, snapshot: Dictionary) -> void:
	_event_emitter.emit_entity_spawned(entity_id, snapshot)


func _on_sensor_body_shape_entered(
	_body_rid: RID,
	body: Node2D,
	body_shape_index: int,
	local_shape_index: int,
	_sensor_entity_id: String
) -> void:
	# Use entity_registry to check if entity exists
	if _game_bridge.entity_registry.has(body.name):
		# Use shape indices directly
		var sensor_shape_index = local_shape_index
		var other_shape_index = body_shape_index

		_event_emitter.emit_sensor_begin(sensor_shape_index, body.name, other_shape_index)


func _on_sensor_body_shape_exited(
	_body_rid: RID,
	body: Node2D,
	body_shape_index: int,
	local_shape_index: int,
	_sensor_entity_id: String
) -> void:
	# Use entity_registry to check if entity exists
	if _game_bridge.entity_registry.has(body.name):
		# Use shape indices directly
		var sensor_shape_index = local_shape_index
		var other_shape_index = body_shape_index

		_event_emitter.emit_sensor_end(sensor_shape_index, body.name, other_shape_index)


func _handle_collision_manifold(
	body_node: RigidBody2D, state: PhysicsDirectBodyState2D, entities: Dictionary
) -> void:
	var contact_count = state.get_contact_count()
	if contact_count == 0:
		return

	var entity_a = body_node.name
	if not entities.has(entity_a):
		return

	# Group contacts by colliding body
	var contacts_by_body: Dictionary = {}

	for i in range(contact_count):
		var collider = state.get_contact_collider_object(i)
		if collider == null or not (collider is Node2D):
			continue

		var entity_b = collider.name
		if not entities.has(entity_b):
			continue

		# Get contact data and convert to game coordinates
		var godot_contact_pos = state.get_contact_local_position(i)
		var game_contact_pos = _game_bridge.godot_to_game_pos(godot_contact_pos)
		var godot_normal = state.get_contact_local_normal(i)
		var game_normal = Vector2(godot_normal.x, -godot_normal.y)
		var impulse_vec = state.get_contact_impulse(i)
		var normal_impulse = impulse_vec.dot(godot_normal)
		var tangent = Vector2(-godot_normal.y, godot_normal.x)
		var tangent_impulse = impulse_vec.dot(tangent)

		# Only report if impulse is significant
		if abs(normal_impulse) < IMPULSE_THRESHOLD and abs(tangent_impulse) < IMPULSE_THRESHOLD:
			continue

		if not contacts_by_body.has(entity_b):
			contacts_by_body[entity_b] = []

		contacts_by_body[entity_b].append(
			{
				"point": {"x": game_contact_pos.x, "y": game_contact_pos.y},
				"normal": {"x": game_normal.x, "y": game_normal.y},
				"normalImpulse": normal_impulse / _game_bridge.pixels_per_meter,
				"tangentImpulse": tangent_impulse / _game_bridge.pixels_per_meter
			}
		)

	# Emit collision events for each colliding body
	for entity_b in contacts_by_body:
		var contacts = contacts_by_body[entity_b]

		# Calculate total impulse for this collision pair
		var total_impulse = 0.0
		for contact in contacts:
			total_impulse += abs(contact["normalImpulse"])

		var collision_data = {"entityA": entity_a, "entityB": entity_b, "contacts": contacts}

		_notify_js_collision_detailed(collision_data)
		_game_bridge.collision_occurred.emit(entity_a, entity_b, total_impulse)

		# Process destroy_on_collision behaviors
		_process_collision_behaviors(entity_a, entity_b)
		_process_collision_behaviors(entity_b, entity_a)


func _on_body_entered(body: Node, entity_id: String) -> void:
	if body.name in _game_bridge.entity_registry:
		_game_bridge.collision_occurred.emit(entity_id, body.name, 0.0)
		_notify_js_collision(entity_id, body.name, 0.0)

		# Process destroy_on_collision behaviors directly in Godot
		_process_collision_behaviors(entity_id, body.name)
		_process_collision_behaviors(body.name, entity_id)


func _process_collision_behaviors(entity_id: String, other_entity_id: String) -> void:
	var node = _game_bridge.get_entity_node(entity_id)
	var other_node = _game_bridge.get_entity_node(other_entity_id)
	if not node or not other_node:
		return

	if not node.has_meta("behaviors"):
		return

	var behaviors = node.get_meta("behaviors") as Array
	var other_tags = other_node.get_meta("tags") if other_node.has_meta("tags") else []

	for behavior in behaviors:
		if behavior is Dictionary and behavior.get("type") == "destroy_on_collision":
			var with_tags = behavior.get("withTags", []) as Array
			var should_destroy = false

			for tag in with_tags:
				if tag in other_tags:
					should_destroy = true
					break

			if should_destroy:
				_game_bridge.call_deferred("destroy_entity", entity_id)

				if behavior.get("destroyOther", false):
					_game_bridge.call_deferred("destroy_entity", other_entity_id)
				return
