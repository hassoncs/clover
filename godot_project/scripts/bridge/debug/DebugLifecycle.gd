class_name DebugLifecycle
extends RefCounted

# =============================================================================
# DEBUG LIFECYCLE
# Entity spawn/destroy/clone/reparent operations for live manipulation
# =============================================================================

var _game_bridge: Node
var _pixels_per_meter: float = 50.0
var _debug_entity_counter: int = 0

func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge
	_pixels_per_meter = game_bridge.pixels_per_meter

# =============================================================================
# COORDINATE HELPERS
# =============================================================================

func game_to_godot_pos(game_pos: Vector2) -> Vector2:
	return CoordinateUtils.game_to_godot_pos(game_pos, _pixels_per_meter)

func game_to_godot_vec(game_vec: Vector2) -> Vector2:
	return CoordinateUtils.game_to_godot_vec(game_vec, _pixels_per_meter)

func godot_to_game_pos(godot_pos: Vector2) -> Vector2:
	return CoordinateUtils.godot_to_game_pos(godot_pos, _pixels_per_meter)

# =============================================================================
# SPAWN
# =============================================================================

func spawn(request: Dictionary) -> Dictionary:
	var template = request.get("template", "")
	var name_hint = request.get("name", "")
	var tags = request.get("tags", [])
	var position = request.get("position", {"x": 0, "y": 0})
	var rotation = request.get("rotation", 0.0)
	var initial_props = request.get("initialProps", {})
	var parent_id = request.get("parentId", "")
	var id_hint = request.get("idHint", "")
	
	if template == "" and not _game_bridge.templates.has(template):
		return {"ok": false, "error": "Template not found: " + template}
	
	_debug_entity_counter += 1
	var entity_id = id_hint if id_hint != "" else "debug_" + template + "_" + str(_debug_entity_counter)
	
	if name_hint == "":
		name_hint = entity_id
	
	var entity_data = {
		"id": entity_id,
		"template": template,
		"transform": {
			"x": position.get("x", 0),
			"y": position.get("y", 0),
			"angle": rotation
		}
	}
	
	var node = _game_bridge._create_entity(entity_data)
	
	if node == null:
		return {"ok": false, "error": "Failed to create entity"}
	
	node.name = name_hint
	
	if tags.size() > 0:
		node.set_meta("tags", tags)
	
	if parent_id != "" and _game_bridge.entities.has(parent_id):
		var parent_node = _game_bridge.entities[parent_id]
		var current_global_pos = node.global_position
		node.get_parent().remove_child(node)
		parent_node.add_child(node)
		node.global_position = current_global_pos
	
	if initial_props.size() > 0:
		_apply_initial_props(node, entity_id, initial_props)
	
	return {"ok": true, "entityId": entity_id}

func _apply_initial_props(node: Node2D, entity_id: String, props: Dictionary) -> void:
	for path in props:
		var value = props[path]
		var parts = path.split(".")
		
		match parts[0]:
			"physics":
				_apply_physics_prop(node, parts, value)
			"render":
				_apply_render_prop(node, parts, value)
			"transform":
				_apply_transform_prop(node, parts, value)

func _apply_physics_prop(node: Node2D, parts: Array, value: Variant) -> void:
	if parts.size() < 2:
		return
	
	if node is RigidBody2D:
		var rb = node as RigidBody2D
		match parts[1]:
			"velocity":
				var vel = Vector2(value.get("x", 0), value.get("y", 0))
				rb.linear_velocity = game_to_godot_vec(vel)
			"angularVelocity":
				rb.angular_velocity = -float(value)
			"mass":
				rb.mass = float(value)
			"gravityScale":
				rb.gravity_scale = float(value)
	
	elif node is CharacterBody2D:
		var cb = node as CharacterBody2D
		match parts[1]:
			"velocity":
				var vel = Vector2(value.get("x", 0), value.get("y", 0))
				cb.velocity = game_to_godot_vec(vel)

func _apply_render_prop(node: Node2D, parts: Array, value: Variant) -> void:
	if parts.size() < 2:
		return
	
	match parts[1]:
		"visible":
			node.visible = bool(value)
		"zIndex":
			node.z_index = int(value)
		"modulate":
			if value is Dictionary:
				node.modulate = Color(
					value.get("r", 1.0),
					value.get("g", 1.0),
					value.get("b", 1.0),
					value.get("a", 1.0)
				)
		"opacity":
			node.modulate.a = float(value)

func _apply_transform_prop(node: Node2D, parts: Array, value: Variant) -> void:
	if parts.size() < 2:
		return
	
	match parts[1]:
		"position":
			var pos = Vector2(value.get("x", 0), value.get("y", 0))
			node.global_position = game_to_godot_pos(pos)
		"rotation":
			node.global_rotation = -float(value)
		"scale":
			node.scale = Vector2(value.get("x", 1), value.get("y", 1))

# =============================================================================
# DESTROY
# =============================================================================

func destroy(entity_id: String, options: Dictionary = {}) -> Dictionary:
	var entities = _game_bridge.entities
	var mode = options.get("mode", "queueFree")
	
	if not entities.has(entity_id):
		return {"ok": false, "error": "Entity not found: " + entity_id}
	
	var node = entities[entity_id]
	
	if mode == "disable":
		node.visible = false
		node.set_process(false)
		node.set_physics_process(false)
		if node is CollisionObject2D:
			node.set_collision_layer(0)
			node.set_collision_mask(0)
	else:
		entities.erase(entity_id)
		
		if _game_bridge.body_id_map.has(entity_id):
			var body_id = _game_bridge.body_id_map[entity_id]
			_game_bridge.body_id_reverse.erase(body_id)
			_game_bridge.body_id_map.erase(entity_id)
		
		if _game_bridge.sensors.has(entity_id):
			_game_bridge.sensors.erase(entity_id)
		
		if _game_bridge.sensor_velocities.has(entity_id):
			_game_bridge.sensor_velocities.erase(entity_id)
		
		node.queue_free()
		
		_game_bridge._notify_js_destroy(entity_id)
	
	return {"ok": true, "entityId": entity_id, "mode": mode}

# =============================================================================
# CLONE
# =============================================================================

func clone(entity_id: String, options: Dictionary = {}) -> Dictionary:
	var entities = _game_bridge.entities
	var with_children = options.get("withChildren", false)
	var offset = options.get("offset", {"x": 0, "y": 0})
	var new_name = options.get("newName", "")
	
	if not entities.has(entity_id):
		return {"ok": false, "error": "Entity not found: " + entity_id}
	
	var original = entities[entity_id]
	
	_debug_entity_counter += 1
	var new_id = new_name if new_name != "" else entity_id + "_clone_" + str(_debug_entity_counter)
	
	var clone_node: Node2D
	
	if with_children:
		clone_node = original.duplicate()
	else:
		clone_node = _shallow_clone(original)
	
	clone_node.name = new_id
	
	var offset_vec = Vector2(offset.get("x", 0), offset.get("y", 0))
	var godot_offset = game_to_godot_pos(offset_vec) - game_to_godot_pos(Vector2.ZERO)
	clone_node.position = original.position + godot_offset
	
	original.get_parent().add_child(clone_node)
	
	entities[new_id] = clone_node
	
	if clone_node is CollisionObject2D:
		_game_bridge.body_id_map[new_id] = _game_bridge.next_body_id
		_game_bridge.body_id_reverse[_game_bridge.next_body_id] = new_id
		_game_bridge.next_body_id += 1
	
	if clone_node is Area2D:
		_game_bridge.sensors[new_id] = clone_node
	
	if original.has_meta("template"):
		clone_node.set_meta("template", original.get_meta("template"))
	
	if original.has_meta("tags"):
		clone_node.set_meta("tags", original.get_meta("tags").duplicate())
	
	_game_bridge.entity_spawned.emit(new_id, clone_node)
	
	return {"ok": true, "entityId": new_id, "sourceId": entity_id}

func _shallow_clone(original: Node2D) -> Node2D:
	var clone: Node2D
	
	if original is RigidBody2D:
		var rb_clone = RigidBody2D.new()
		var rb_orig = original as RigidBody2D
		rb_clone.mass = rb_orig.mass
		rb_clone.gravity_scale = rb_orig.gravity_scale
		rb_clone.linear_damp = rb_orig.linear_damp
		rb_clone.angular_damp = rb_orig.angular_damp
		rb_clone.collision_layer = rb_orig.collision_layer
		rb_clone.collision_mask = rb_orig.collision_mask
		rb_clone.continuous_cd = rb_orig.continuous_cd
		rb_clone.lock_rotation = rb_orig.lock_rotation
		rb_clone.contact_monitor = rb_orig.contact_monitor
		rb_clone.max_contacts_reported = rb_orig.max_contacts_reported
		if rb_orig.physics_material_override:
			rb_clone.physics_material_override = rb_orig.physics_material_override.duplicate()
		clone = rb_clone
	elif original is StaticBody2D:
		var sb_clone = StaticBody2D.new()
		sb_clone.collision_layer = original.collision_layer
		sb_clone.collision_mask = original.collision_mask
		clone = sb_clone
	elif original is CharacterBody2D:
		var cb_clone = CharacterBody2D.new()
		cb_clone.collision_layer = original.collision_layer
		cb_clone.collision_mask = original.collision_mask
		clone = cb_clone
	elif original is Area2D:
		var area_clone = Area2D.new()
		area_clone.collision_layer = original.collision_layer
		area_clone.collision_mask = original.collision_mask
		clone = area_clone
	else:
		clone = Node2D.new()
	
	clone.rotation = original.rotation
	clone.scale = original.scale
	clone.visible = original.visible
	clone.z_index = original.z_index
	clone.modulate = original.modulate
	
	for child in original.get_children():
		if child is CollisionShape2D:
			var shape_clone = CollisionShape2D.new()
			shape_clone.shape = child.shape.duplicate() if child.shape else null
			shape_clone.position = child.position
			shape_clone.rotation = child.rotation
			shape_clone.disabled = child.disabled
			clone.add_child(shape_clone)
		elif child is Polygon2D or child is Sprite2D:
			var visual_clone = child.duplicate()
			clone.add_child(visual_clone)
	
	return clone

# =============================================================================
# REPARENT
# =============================================================================

func reparent(entity_id: String, new_parent_id: String, options: Dictionary = {}) -> Dictionary:
	var entities = _game_bridge.entities
	var keep_global_transform = options.get("keepGlobalTransform", true)
	var sibling_index = options.get("index", -1)
	
	if not entities.has(entity_id):
		return {"ok": false, "error": "Entity not found: " + entity_id}
	
	var node = entities[entity_id]
	var old_parent = node.get_parent()
	var old_parent_id = _find_entity_id(old_parent)
	
	var new_parent: Node
	if new_parent_id == "" or new_parent_id == "root":
		new_parent = _game_bridge.get_tree().current_scene
	elif new_parent_id == "GameRoot" and _game_bridge.game_root != null:
		new_parent = _game_bridge.game_root
	elif entities.has(new_parent_id):
		new_parent = entities[new_parent_id]
	else:
		return {"ok": false, "error": "New parent not found: " + new_parent_id}
	
	var global_pos = node.global_position
	var global_rot = node.global_rotation
	var global_scale = node.global_scale
	
	old_parent.remove_child(node)
	
	if sibling_index >= 0 and sibling_index < new_parent.get_child_count():
		new_parent.add_child(node)
		new_parent.move_child(node, sibling_index)
	else:
		new_parent.add_child(node)
	
	if keep_global_transform:
		node.global_position = global_pos
		node.global_rotation = global_rot
		node.global_scale = global_scale
	
	return {
		"ok": true,
		"entityId": entity_id,
		"oldParentId": old_parent_id,
		"newParentId": new_parent_id
	}

func _find_entity_id(node: Node) -> String:
	var entities = _game_bridge.entities
	for entity_id in entities:
		if entities[entity_id] == node:
			return entity_id
	return ""

# =============================================================================
# BATCH OPERATIONS
# =============================================================================

func batch(ops: Array, options: Dictionary = {}) -> Dictionary:
	var atomic = options.get("atomic", false)
	var results = []
	var success_count = 0
	var fail_count = 0
	
	for op_data in ops:
		var op = op_data.get("op", "")
		var result: Dictionary
		
		match op:
			"spawn":
				result = spawn(op_data)
			"destroy":
				result = destroy(op_data.get("entityId", ""), op_data.get("options", {}))
			"clone":
				result = clone(op_data.get("entityId", ""), op_data.get("options", {}))
			"reparent":
				result = reparent(op_data.get("entityId", ""), op_data.get("newParentId", ""), op_data.get("options", {}))
			_:
				result = {"ok": false, "error": "Unknown operation: " + op}
		
		results.append(result)
		
		if result.get("ok", false):
			success_count += 1
		else:
			fail_count += 1
			if atomic:
				break
	
	return {
		"results": results,
		"successCount": success_count,
		"failCount": fail_count
	}
