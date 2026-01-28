class_name DebugPhysics
extends RefCounted

# =============================================================================
# DEBUG PHYSICS
# Physics queries: raycast, shape inspection, joint inspection, overlaps
# =============================================================================

var _game_bridge: Node
var _pixels_per_meter: float = 50.0

func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge
	_pixels_per_meter = game_bridge.pixels_per_meter

# =============================================================================
# COORDINATE HELPERS
# =============================================================================

func godot_to_game_pos(godot_pos: Vector2) -> Vector2:
	return CoordinateUtils.godot_to_game_pos(godot_pos, _pixels_per_meter)

func godot_to_game_vec(godot_vec: Vector2) -> Vector2:
	return CoordinateUtils.godot_to_game_vec(godot_vec, _pixels_per_meter)

func game_to_godot_pos(game_pos: Vector2) -> Vector2:
	return CoordinateUtils.game_to_godot_pos(game_pos, _pixels_per_meter)

# =============================================================================
# RAYCAST
# =============================================================================

func raycast(request: Dictionary) -> Dictionary:
	var from_pos = request.get("from", {"x": 0, "y": 0})
	var to_pos = request.get("to", {"x": 0, "y": 0})
	var mask = request.get("mask", 0xFFFFFFFF)
	var include_sensors = request.get("includeSensors", false)
	var max_hits = request.get("maxHits", 10)
	
	var godot_from = game_to_godot_pos(Vector2(from_pos.x, from_pos.y))
	var godot_to = game_to_godot_pos(Vector2(to_pos.x, to_pos.y))
	
	var space = _game_bridge.get_viewport().find_world_2d().direct_space_state
	if space == null:
		return {"error": "Physics space not available", "hits": []}
	
	var query = PhysicsRayQueryParameters2D.new()
	query.from = godot_from
	query.to = godot_to
	query.collision_mask = mask
	query.collide_with_bodies = true
	query.collide_with_areas = include_sensors
	
	var result = space.intersect_ray(query)
	
	if result.is_empty():
		return {"hits": []}
	
	var collider = result.collider
	var entity_id = _find_entity_id(collider)
	var hit_point = godot_to_game_pos(result.position)
	var hit_normal = godot_to_game_vec(result.normal).normalized()
	var distance = godot_from.distance_to(result.position) / _pixels_per_meter
	
	var hits = [{
		"entityId": entity_id,
		"point": {"x": hit_point.x, "y": hit_point.y},
		"normal": {"x": hit_normal.x, "y": hit_normal.y},
		"distance": distance
	}]
	
	return {"hits": hits}

func raycast_all(request: Dictionary) -> Dictionary:
	var from_pos = request.get("from", {"x": 0, "y": 0})
	var to_pos = request.get("to", {"x": 0, "y": 0})
	var mask = request.get("mask", 0xFFFFFFFF)
	var include_sensors = request.get("includeSensors", false)
	var max_hits = request.get("maxHits", 10)
	
	var godot_from = game_to_godot_pos(Vector2(from_pos.x, from_pos.y))
	var godot_to = game_to_godot_pos(Vector2(to_pos.x, to_pos.y))
	var direction = (godot_to - godot_from).normalized()
	var total_distance = godot_from.distance_to(godot_to)
	
	var space = _game_bridge.get_viewport().find_world_2d().direct_space_state
	if space == null:
		return {"error": "Physics space not available", "hits": []}
	
	var hits = []
	var excluded_rids = []
	var current_from = godot_from
	
	while hits.size() < max_hits:
		var query = PhysicsRayQueryParameters2D.new()
		query.from = current_from
		query.to = godot_to
		query.collision_mask = mask
		query.collide_with_bodies = true
		query.collide_with_areas = include_sensors
		query.exclude = excluded_rids
		
		var result = space.intersect_ray(query)
		
		if result.is_empty():
			break
		
		var collider = result.collider
		var entity_id = _find_entity_id(collider)
		var hit_point = godot_to_game_pos(result.position)
		var hit_normal = godot_to_game_vec(result.normal).normalized()
		var distance = godot_from.distance_to(result.position) / _pixels_per_meter
		
		hits.append({
			"entityId": entity_id,
			"point": {"x": hit_point.x, "y": hit_point.y},
			"normal": {"x": hit_normal.x, "y": hit_normal.y},
			"distance": distance
		})
		
		excluded_rids.append(result.rid)
		current_from = result.position + direction * 0.01
		
		if current_from.distance_to(godot_from) >= total_distance:
			break
	
	hits.sort_custom(func(a, b): return a.distance < b.distance)
	return {"hits": hits}

# =============================================================================
# SHAPE INSPECTION
# =============================================================================

func get_shapes(entity_id: String, options: Dictionary = {}) -> Dictionary:
	var entities = _game_bridge.entities
	
	if not entities.has(entity_id):
		return {"error": "Entity not found", "entityId": entity_id, "shapes": []}
	
	var node = entities[entity_id]
	var shapes = []
	var shape_index = 0
	
	for child in node.get_children():
		if child is CollisionShape2D:
			var shape_data = _extract_shape_data(child, shape_index)
			shapes.append(shape_data)
			shape_index += 1
		elif child is CollisionPolygon2D:
			var shape_data = _extract_polygon_data(child, shape_index)
			shapes.append(shape_data)
			shape_index += 1
	
	return {"entityId": entity_id, "shapes": shapes}

func _extract_shape_data(collision_shape: CollisionShape2D, index: int) -> Dictionary:
	var shape = collision_shape.shape
	var data = {
		"shapeIndex": index,
		"localPosition": {"x": collision_shape.position.x / _pixels_per_meter, "y": -collision_shape.position.y / _pixels_per_meter},
		"localRotation": -collision_shape.rotation,
		"disabled": collision_shape.disabled
	}
	
	if shape is CircleShape2D:
		data["kind"] = "circle"
		data["radius"] = shape.radius / _pixels_per_meter
	
	elif shape is RectangleShape2D:
		data["kind"] = "rect"
		data["extents"] = {
			"x": shape.size.x / 2.0 / _pixels_per_meter,
			"y": shape.size.y / 2.0 / _pixels_per_meter
		}
		data["width"] = shape.size.x / _pixels_per_meter
		data["height"] = shape.size.y / _pixels_per_meter
	
	elif shape is CapsuleShape2D:
		data["kind"] = "capsule"
		data["radius"] = shape.radius / _pixels_per_meter
		data["height"] = shape.height / _pixels_per_meter
	
	elif shape is ConvexPolygonShape2D:
		data["kind"] = "polygon"
		var points = []
		for pt in shape.points:
			points.append({"x": pt.x / _pixels_per_meter, "y": -pt.y / _pixels_per_meter})
		data["points"] = points
	
	elif shape is SegmentShape2D:
		data["kind"] = "segment"
		data["a"] = {"x": shape.a.x / _pixels_per_meter, "y": -shape.a.y / _pixels_per_meter}
		data["b"] = {"x": shape.b.x / _pixels_per_meter, "y": -shape.b.y / _pixels_per_meter}
	
	elif shape is WorldBoundaryShape2D:
		data["kind"] = "worldBoundary"
		data["normal"] = {"x": shape.normal.x, "y": -shape.normal.y}
		data["distance"] = shape.distance / _pixels_per_meter
	
	else:
		data["kind"] = "unknown"
		data["className"] = shape.get_class() if shape else "null"
	
	return data

func _extract_polygon_data(collision_polygon: CollisionPolygon2D, index: int) -> Dictionary:
	var points = []
	for pt in collision_polygon.polygon:
		points.append({"x": pt.x / _pixels_per_meter, "y": -pt.y / _pixels_per_meter})
	
	return {
		"shapeIndex": index,
		"kind": "polygon",
		"localPosition": {"x": collision_polygon.position.x / _pixels_per_meter, "y": -collision_polygon.position.y / _pixels_per_meter},
		"localRotation": -collision_polygon.rotation,
		"disabled": collision_polygon.disabled,
		"points": points
	}

# =============================================================================
# JOINT INSPECTION
# =============================================================================

func get_joints(options: Dictionary = {}) -> Dictionary:
	var entity_id_filter = options.get("entityId", "")
	var joints_data = []
	
	var joints = _game_bridge.joints
	
	for joint_id in joints:
		var joint = joints[joint_id]
		if not is_instance_valid(joint):
			continue
		
		var joint_data = _extract_joint_data(joint_id, joint)
		
		if entity_id_filter != "":
			if joint_data.get("aId", "") != entity_id_filter and joint_data.get("bId", "") != entity_id_filter:
				continue
		
		joints_data.append(joint_data)
	
	return {"joints": joints_data}

func get_entity_joints(entity_id: String) -> Dictionary:
	return get_joints({"entityId": entity_id})

func _extract_joint_data(joint_id: int, joint: Joint2D) -> Dictionary:
	var data = {
		"jointId": joint_id,
		"nodeA": str(joint.node_a),
		"nodeB": str(joint.node_b)
	}
	
	var node_a = joint.get_node_or_null(joint.node_a) if joint.node_a else null
	var node_b = joint.get_node_or_null(joint.node_b) if joint.node_b else null
	
	data["aId"] = _find_entity_id(node_a)
	data["bId"] = _find_entity_id(node_b)
	
	if joint is PinJoint2D:
		data["type"] = "pin"
		data["params"] = {
			"softness": joint.softness
		}
	
	elif joint is DampedSpringJoint2D:
		data["type"] = "spring"
		data["params"] = {
			"length": joint.length / _pixels_per_meter,
			"restLength": joint.rest_length / _pixels_per_meter,
			"stiffness": joint.stiffness,
			"damping": joint.damping
		}
	
	elif joint is GrooveJoint2D:
		data["type"] = "groove"
		data["params"] = {
			"length": joint.length / _pixels_per_meter,
			"initialOffset": joint.initial_offset / _pixels_per_meter
		}
	
	else:
		data["type"] = joint.get_class()
		data["params"] = {}
	
	return data

# =============================================================================
# SENSOR OVERLAPS
# =============================================================================

func get_overlaps(entity_id: String, options: Dictionary = {}) -> Dictionary:
	var entities = _game_bridge.entities
	
	if not entities.has(entity_id):
		return {"error": "Entity not found", "entityId": entity_id, "overlappingIds": []}
	
	var node = entities[entity_id]
	
	if not node is Area2D:
		return {"error": "Entity is not a sensor (Area2D)", "entityId": entity_id, "overlappingIds": []}
	
	var area = node as Area2D
	var overlapping_bodies = area.get_overlapping_bodies()
	var overlapping_areas = area.get_overlapping_areas()
	
	var overlapping_ids = []
	
	for body in overlapping_bodies:
		var other_id = _find_entity_id(body)
		if other_id != "":
			overlapping_ids.append({
				"entityId": other_id,
				"type": "body"
			})
	
	for other_area in overlapping_areas:
		var other_id = _find_entity_id(other_area)
		if other_id != "" and other_id != entity_id:
			overlapping_ids.append({
				"entityId": other_id,
				"type": "area"
			})
	
	return {"entityId": entity_id, "overlaps": overlapping_ids}

func get_all_overlaps(options: Dictionary = {}) -> Dictionary:
	var all_overlaps = {}
	
	for entity_id in _game_bridge.entities:
		var node = _game_bridge.entities[entity_id]
		if node is Area2D:
			var result = get_overlaps(entity_id, options)
			if not result.has("error") and result.overlaps.size() > 0:
				all_overlaps[entity_id] = result.overlaps
	
	return {"overlaps": all_overlaps}

# =============================================================================
# POINT QUERY
# =============================================================================

func query_point(x: float, y: float, options: Dictionary = {}) -> Dictionary:
	var mask = options.get("mask", 0xFFFFFFFF)
	var include_sensors = options.get("includeSensors", true)
	var max_results = options.get("maxResults", 10)
	
	var godot_pos = game_to_godot_pos(Vector2(x, y))
	
	var space = _game_bridge.get_viewport().find_world_2d().direct_space_state
	if space == null:
		return {"error": "Physics space not available", "entities": []}
	
	var query = PhysicsPointQueryParameters2D.new()
	query.position = godot_pos
	query.collision_mask = mask
	query.collide_with_bodies = true
	query.collide_with_areas = include_sensors
	
	var results = space.intersect_point(query, max_results)
	var entities_at_point = []
	
	for result in results:
		var collider = result.collider
		var entity_id = _find_entity_id(collider)
		if entity_id != "":
			entities_at_point.append({
				"entityId": entity_id,
				"shapeIndex": result.shape
			})
	
	return {"point": {"x": x, "y": y}, "entities": entities_at_point}

# =============================================================================
# AABB QUERY
# =============================================================================

func query_aabb(rect: Dictionary, options: Dictionary = {}) -> Dictionary:
	var mask = options.get("mask", 0xFFFFFFFF)
	var include_sensors = options.get("includeSensors", true)
	var max_results = options.get("maxResults", 50)
	
	var min_pos = game_to_godot_pos(Vector2(rect.minX, rect.maxY))
	var max_pos = game_to_godot_pos(Vector2(rect.maxX, rect.minY))
	
	var godot_rect = Rect2(
		min_pos,
		max_pos - min_pos
	)
	
	var space = _game_bridge.get_viewport().find_world_2d().direct_space_state
	if space == null:
		return {"error": "Physics space not available", "entities": []}
	
	var query = PhysicsShapeQueryParameters2D.new()
	var shape = RectangleShape2D.new()
	shape.size = godot_rect.size.abs()
	query.shape = shape
	query.transform = Transform2D(0, godot_rect.get_center())
	query.collision_mask = mask
	query.collide_with_bodies = true
	query.collide_with_areas = include_sensors
	
	var results = space.intersect_shape(query, max_results)
	var entities_in_rect = []
	
	for result in results:
		var collider = result.collider
		var entity_id = _find_entity_id(collider)
		if entity_id != "":
			entities_in_rect.append({
				"entityId": entity_id
			})
	
	return {"rect": rect, "entities": entities_in_rect}

# =============================================================================
# UTILITIES
# =============================================================================

func _find_entity_id(node: Node) -> String:
	if node == null:
		return ""
	var entities = _game_bridge.entities
	var current = node
	while current != null:
		for entity_id in entities:
			if entities[entity_id] == current:
				return entity_id
		current = current.get_parent()
	return ""
