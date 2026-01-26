class_name PhysicsQueries
extends RefCounted

var bridge: Node

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

func query_point(x: float, y: float) -> Variant:
	var godot_pos = CoordinateUtils.game_to_godot_pos(Vector2(x, y), bridge.pixels_per_meter)
	var space = bridge.get_viewport().find_world_2d().direct_space_state
	if space == null:
		return null
	
	var query = PhysicsPointQueryParameters2D.new()
	query.position = godot_pos
	query.collision_mask = 0xFFFFFFFF
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_point(query, 1)
	if results.is_empty():
		return null
	
	var collider = results[0].collider
	if collider and collider.name in bridge.entities:
		var body_id = bridge.body_id_map.get(collider.name, -1)
		return body_id
	return null

func query_point_entity(x: float, y: float) -> Variant:
	var godot_pos = CoordinateUtils.game_to_godot_pos(Vector2(x, y), bridge.pixels_per_meter)
	var vp_size = bridge.get_viewport().get_visible_rect().size
	var cam_pos = bridge.camera.global_position if bridge.camera else Vector2.ZERO
	var cam_zoom = bridge.camera.zoom if bridge.camera else Vector2.ONE
	print("[PhysicsQueries] query_point_entity: game=(%.2f, %.2f) -> godot=%s" % [x, y, godot_pos])
	print("[PhysicsQueries] viewport=%s, camera_pos=%s, camera_zoom=%s" % [vp_size, cam_pos, cam_zoom])
	
	var space = bridge.get_viewport().find_world_2d().direct_space_state
	if space == null:
		print("[PhysicsQueries] ERROR: No physics space!")
		return null
	
	print("[PhysicsQueries] Entities in scene: %s" % [bridge.entities.keys()])
	for eid in bridge.entities:
		var node = bridge.entities[eid]
		if node is RigidBody2D or node is StaticBody2D:
			print("[PhysicsQueries]   %s at godot_pos=%s" % [eid, node.global_position])
	
	var query = PhysicsPointQueryParameters2D.new()
	query.position = godot_pos
	query.collision_mask = 0xFFFFFFFF
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_point(query, 1)
	print("[PhysicsQueries] Query at %s found %d results" % [godot_pos, results.size()])
	
	if results.is_empty():
		return null
	
	var collider = results[0].collider
	print("[PhysicsQueries] Hit collider: %s (name=%s)" % [collider, collider.name if collider else "null"])
	if collider and collider.name in bridge.entities:
		print("[PhysicsQueries] Returning entity: %s" % collider.name)
		return collider.name
	print("[PhysicsQueries] Collider not in entities dict")
	return null

func query_aabb(min_x: float, min_y: float, max_x: float, max_y: float) -> Array:
	var godot_min = CoordinateUtils.game_to_godot_pos(Vector2(min_x, max_y), bridge.pixels_per_meter)
	var godot_max = CoordinateUtils.game_to_godot_pos(Vector2(max_x, min_y), bridge.pixels_per_meter)
	
	var space = bridge.get_viewport().find_world_2d().direct_space_state
	if space == null:
		return []
	
	var query = PhysicsShapeQueryParameters2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(abs(godot_max.x - godot_min.x), abs(godot_max.y - godot_min.y))
	query.shape = rect
	query.transform = Transform2D(0, (godot_min + godot_max) / 2)
	query.collision_mask = 0xFFFFFFFF
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_shape(query)
	var body_ids: Array = []
	for result in results:
		var collider = result.collider
		if collider and collider.name in bridge.entities:
			var body_id = bridge.body_id_map.get(collider.name, -1)
			if body_id >= 0 and body_id not in body_ids:
				body_ids.append(body_id)
	return body_ids

func raycast(origin_x: float, origin_y: float, dir_x: float, dir_y: float, max_distance: float) -> Variant:
	var godot_origin = CoordinateUtils.game_to_godot_pos(Vector2(origin_x, origin_y), bridge.pixels_per_meter)
	var godot_dir = Vector2(dir_x, -dir_y).normalized()
	var godot_end = godot_origin + godot_dir * max_distance * bridge.pixels_per_meter
	
	var space = bridge.get_viewport().find_world_2d().direct_space_state
	if space == null:
		return null
	
	var query = PhysicsRayQueryParameters2D.create(godot_origin, godot_end)
	query.collision_mask = 0xFFFFFFFF
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var result = space.intersect_ray(query)
	if result.is_empty():
		return null
	
	var hit_point = CoordinateUtils.godot_to_game_pos(result.position, bridge.pixels_per_meter)
	var hit_normal = Vector2(result.normal.x, -result.normal.y)
	var fraction = godot_origin.distance_to(result.position) / (max_distance * bridge.pixels_per_meter)
	
	var entity_id = ""
	var body_id = -1
	if result.collider and result.collider.name in bridge.entities:
		entity_id = result.collider.name
		body_id = bridge.body_id_map.get(entity_id, -1)
	
	return {
		"hit": true,
		"point": {"x": hit_point.x, "y": hit_point.y},
		"normal": {"x": hit_normal.x, "y": hit_normal.y},
		"fraction": fraction,
		"entityId": entity_id,
		"bodyId": body_id
	}
