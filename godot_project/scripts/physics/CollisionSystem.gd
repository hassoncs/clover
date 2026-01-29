class_name CollisionSystem extends RefCounted

const IMPULSE_THRESHOLD: float = 0.1

var _game_bridge: Node = null
var _js_collision_callback: JavaScriptObject = null
var _js_destroy_callback: JavaScriptObject = null
var _js_entity_spawned_callback: JavaScriptObject = null


func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge


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
	if _js_destroy_callback != null:
		_js_destroy_callback.call("call", null, entity_id)
	else:
		_game_bridge._queue_event("destroy", {"entityId": entity_id})


func _notify_js_entity_spawned(entity_id: String, snapshot: Dictionary) -> void:
	if _js_entity_spawned_callback != null:
		var json_str = JSON.stringify(snapshot)
		_js_entity_spawned_callback.call("call", null, json_str)
	else:
		_game_bridge._queue_event("entity_spawned", snapshot)


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


func _process_collision_behaviors(entity_a: String, entity_b: String) -> void:
	# This is a placeholder - the actual implementation is in GameBridge
	# We call back to GameBridge to process collision behaviors
	_game_bridge._process_collision_behaviors(entity_a, entity_b)
