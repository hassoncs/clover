class_name DebugBridge
extends RefCounted

# =============================================================================
# DEBUG BRIDGE
# Coordinator for modular debug capabilities
# Provides unified API for scene inspection, property manipulation,
# entity lifecycle, time control, event monitoring, and physics queries
# =============================================================================

var _game_bridge: Node
var _query_system: QuerySystem
var _pixels_per_meter: float = 50.0

var _selector: DebugSelector
var _props: DebugProps
var _lifecycle: DebugLifecycle
var _time: DebugTime
var _events: DebugEvents
var _physics: DebugPhysics

func _init(game_bridge: Node, query_system: QuerySystem) -> void:
	_game_bridge = game_bridge
	_query_system = query_system
	_pixels_per_meter = game_bridge.pixels_per_meter
	
	_selector = DebugSelector.new(game_bridge)
	_props = DebugProps.new(game_bridge)
	_lifecycle = DebugLifecycle.new(game_bridge)
	_time = DebugTime.new(game_bridge)
	_events = DebugEvents.new(game_bridge)
	_physics = DebugPhysics.new(game_bridge)
	
	_register_handlers()

func _register_handlers() -> void:
	# Legacy handlers (backward compatibility)
	_query_system.register_handler("getSceneSnapshot", _on_get_scene_snapshot)
	_query_system.register_handler("findEntities", _on_find_entities)
	_query_system.register_handler("getEntityDetails", _on_get_entity_details)
	_query_system.register_handler("getEntitiesAtPoint", _on_get_entities_at_point)
	_query_system.register_handler("getEntitiesInRect", _on_get_entities_in_rect)
	_query_system.register_handler("getEntityCount", _on_get_entity_count)
	
	# Selector/Query
	_query_system.register_handler("query", _on_query)
	_query_system.register_handler("queryAst", _on_query_ast)
	
	# Properties
	_query_system.register_handler("getProps", _on_get_props)
	_query_system.register_handler("getAllProps", _on_get_all_props)
	_query_system.register_handler("setProps", _on_set_props)
	_query_system.register_handler("patchProps", _on_patch_props)
	
	# Lifecycle
	_query_system.register_handler("spawn", _on_spawn)
	_query_system.register_handler("destroy", _on_destroy)
	_query_system.register_handler("clone", _on_clone)
	_query_system.register_handler("reparent", _on_reparent)
	_query_system.register_handler("lifecycleBatch", _on_lifecycle_batch)
	
	# Time Control
	_query_system.register_handler("getTimeState", _on_get_time_state)
	_query_system.register_handler("pause", _on_pause)
	_query_system.register_handler("resume", _on_resume)
	_query_system.register_handler("step", _on_step)
	_query_system.register_handler("setTimeScale", _on_set_time_scale)
	_query_system.register_handler("setSeed", _on_set_seed)
	
	# Events
	_query_system.register_handler("subscribe", _on_subscribe)
	_query_system.register_handler("unsubscribe", _on_unsubscribe)
	_query_system.register_handler("pollEvents", _on_poll_events)
	_query_system.register_handler("listSubscriptions", _on_list_subscriptions)
	
	# Physics Queries
	_query_system.register_handler("raycast", _on_raycast)
	_query_system.register_handler("raycastAll", _on_raycast_all)
	_query_system.register_handler("getShapes", _on_get_shapes)
	_query_system.register_handler("getJoints", _on_get_joints)
	_query_system.register_handler("getEntityJoints", _on_get_entity_joints)
	_query_system.register_handler("getOverlaps", _on_get_overlaps)
	_query_system.register_handler("getAllOverlaps", _on_get_all_overlaps)
	_query_system.register_handler("queryPoint", _on_query_point)
	_query_system.register_handler("queryAABB", _on_query_aabb)

func unregister_handlers() -> void:
	var handlers = [
		"getSceneSnapshot", "findEntities", "getEntityDetails", "getEntitiesAtPoint",
		"getEntitiesInRect", "getEntityCount", "query", "queryAst",
		"getProps", "getAllProps", "setProps", "patchProps",
		"spawn", "destroy", "clone", "reparent", "lifecycleBatch",
		"getTimeState", "pause", "resume", "step", "setTimeScale", "setSeed",
		"subscribe", "unsubscribe", "pollEvents", "listSubscriptions",
		"raycast", "raycastAll", "getShapes", "getJoints", "getEntityJoints",
		"getOverlaps", "getAllOverlaps", "queryPoint", "queryAABB"
	]
	for handler in handlers:
		_query_system.unregister_handler(handler)

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
# LEGACY HANDLERS (backward compatibility)
# =============================================================================

func _on_get_scene_snapshot(args: Array) -> Dictionary:
	return get_scene_snapshot()

func _on_find_entities(args: Array) -> Array:
	return find_entities(args)

func _on_get_entity_details(args: Array) -> Variant:
	if args.size() > 0:
		return _props.get_all_props(str(args[0]))
	return null

func _on_get_entities_at_point(args: Array) -> Array:
	if args.size() >= 2:
		return get_entities_at_point(float(args[0]), float(args[1]))
	return []

func _on_get_entities_in_rect(args: Array) -> Array:
	if args.size() >= 4:
		return get_entities_in_rect(float(args[0]), float(args[1]), float(args[2]), float(args[3]))
	return []

func _on_get_entity_count(args: Array) -> Dictionary:
	return get_entity_count(args)

# =============================================================================
# SELECTOR/QUERY HANDLERS
# =============================================================================

func _on_query(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Selector required", "matches": [], "count": 0, "hasMore": false}
	var selector = str(args[0])
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _selector.query(selector, options)

func _on_query_ast(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Selector AST required", "matches": [], "count": 0, "hasMore": false}
	var ast = args[0] if args[0] is Dictionary else {}
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _selector.query_ast(ast, options)

# =============================================================================
# PROPERTY HANDLERS
# =============================================================================

func _on_get_props(args: Array) -> Dictionary:
	if args.size() < 2:
		return {"error": "Entity ID and paths required"}
	var entity_id = str(args[0])
	var paths = args[1] if args[1] is Array else []
	var options = args[2] if args.size() > 2 and args[2] is Dictionary else {}
	return _props.get_props(entity_id, paths, options)

func _on_get_all_props(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Entity ID required"}
	var entity_id = str(args[0])
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _props.get_all_props(entity_id, options)

func _on_set_props(args: Array) -> Dictionary:
	if args.size() < 2:
		return {"error": "Entity ID and values required", "applied": []}
	var entity_id = str(args[0])
	var values = args[1] if args[1] is Dictionary else {}
	var options = args[2] if args.size() > 2 and args[2] is Dictionary else {}
	return _props.set_props(entity_id, values, options)

func _on_patch_props(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Operations required", "results": []}
	var ops = args[0] if args[0] is Array else []
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _props.patch_props(ops, options)

# =============================================================================
# LIFECYCLE HANDLERS
# =============================================================================

func _on_spawn(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"ok": false, "error": "Spawn request required"}
	var request = args[0] if args[0] is Dictionary else {}
	return _lifecycle.spawn(request)

func _on_destroy(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"ok": false, "error": "Entity ID required"}
	var entity_id = str(args[0])
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _lifecycle.destroy(entity_id, options)

func _on_clone(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"ok": false, "error": "Entity ID required"}
	var entity_id = str(args[0])
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _lifecycle.clone(entity_id, options)

func _on_reparent(args: Array) -> Dictionary:
	if args.size() < 2:
		return {"ok": false, "error": "Entity ID and new parent ID required"}
	var entity_id = str(args[0])
	var new_parent_id = str(args[1])
	var options = args[2] if args.size() > 2 and args[2] is Dictionary else {}
	return _lifecycle.reparent(entity_id, new_parent_id, options)

func _on_lifecycle_batch(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"results": [], "successCount": 0, "failCount": 0}
	var ops = args[0] if args[0] is Array else []
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _lifecycle.batch(ops, options)

# =============================================================================
# TIME CONTROL HANDLERS
# =============================================================================

func _on_get_time_state(args: Array) -> Dictionary:
	return _time.get_time_state()

func _on_pause(args: Array) -> Dictionary:
	return _time.pause()

func _on_resume(args: Array) -> Dictionary:
	return _time.resume()

func _on_step(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"ok": false, "error": "Frames count required"}
	var frames = int(args[0])
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _time.step_sync(frames)

func _on_set_time_scale(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"ok": false, "error": "Time scale required"}
	var scale = float(args[0])
	return _time.set_time_scale(scale)

func _on_set_seed(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"ok": false, "error": "Seed required"}
	var seed_val = int(args[0])
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _time.set_seed(seed_val, options)

# =============================================================================
# EVENT HANDLERS
# =============================================================================

func _on_subscribe(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Subscription request required"}
	var request = args[0] if args[0] is Dictionary else {}
	return _events.subscribe(request)

func _on_unsubscribe(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"ok": false, "error": "Subscription ID required"}
	var sub_id = str(args[0])
	return _events.unsubscribe(sub_id)

func _on_poll_events(args: Array) -> Dictionary:
	var options = args[0] if args.size() > 0 and args[0] is Dictionary else {}
	return _events.poll_events(options)

func _on_list_subscriptions(args: Array) -> Dictionary:
	return _events.list_subscriptions()

# =============================================================================
# PHYSICS QUERY HANDLERS
# =============================================================================

func _on_raycast(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Raycast request required", "hits": []}
	var request = args[0] if args[0] is Dictionary else {}
	return _physics.raycast(request)

func _on_raycast_all(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Raycast request required", "hits": []}
	var request = args[0] if args[0] is Dictionary else {}
	return _physics.raycast_all(request)

func _on_get_shapes(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Entity ID required", "shapes": []}
	var entity_id = str(args[0])
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _physics.get_shapes(entity_id, options)

func _on_get_joints(args: Array) -> Dictionary:
	var options = args[0] if args.size() > 0 and args[0] is Dictionary else {}
	return _physics.get_joints(options)

func _on_get_entity_joints(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Entity ID required", "joints": []}
	var entity_id = str(args[0])
	return _physics.get_entity_joints(entity_id)

func _on_get_overlaps(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Entity ID required", "overlaps": []}
	var entity_id = str(args[0])
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _physics.get_overlaps(entity_id, options)

func _on_get_all_overlaps(args: Array) -> Dictionary:
	var options = args[0] if args.size() > 0 and args[0] is Dictionary else {}
	return _physics.get_all_overlaps(options)

func _on_query_point(args: Array) -> Dictionary:
	if args.size() < 2:
		return {"error": "X and Y coordinates required", "entities": []}
	var x = float(args[0])
	var y = float(args[1])
	var options = args[2] if args.size() > 2 and args[2] is Dictionary else {}
	return _physics.query_point(x, y, options)

func _on_query_aabb(args: Array) -> Dictionary:
	if args.size() < 1:
		return {"error": "Rect required", "entities": []}
	var rect = args[0] if args[0] is Dictionary else {}
	var options = args[1] if args.size() > 1 and args[1] is Dictionary else {}
	return _physics.query_aabb(rect, options)

# =============================================================================
# LEGACY IMPLEMENTATIONS (for backward compatibility)
# =============================================================================

func get_scene_snapshot() -> Dictionary:
	var snapshot = {
		"timestamp": Time.get_ticks_msec(),
		"entities": []
	}
	
	var root = _game_bridge.get_tree().current_scene
	if root:
		_collect_scene_nodes(root, snapshot.entities)
	
	return snapshot

func _collect_scene_nodes(node: Node, list: Array) -> void:
	if node is Node2D:
		var node2d = node as Node2D
		var game_pos = godot_to_game_pos(node2d.global_position)
		
		var data = {
			"name": node2d.name,
			"id": str(node2d.get_instance_id()),
			"type": node2d.get_class(),
			"position": {"x": game_pos.x, "y": game_pos.y},
			"angle": -node2d.global_rotation,
			"visible": node2d.visible,
			"zIndex": node2d.z_index
		}
		
		if node2d.has_meta("template"):
			data["template"] = node2d.get_meta("template")
		
		if node2d.has_meta("tags"):
			data["tags"] = node2d.get_meta("tags")
		
		var entities = _game_bridge.entities
		for entity_id in entities:
			if entities[entity_id] == node2d:
				data["entityId"] = entity_id
				break
		
		if node2d is RigidBody2D:
			var rb = node2d as RigidBody2D
			var game_vel = godot_to_game_vec(rb.linear_velocity)
			data["physics"] = {
				"bodyType": "dynamic",
				"mass": rb.mass,
				"sleeping": rb.sleeping,
				"velocity": {"x": game_vel.x, "y": game_vel.y},
				"angularVelocity": -rb.angular_velocity
			}
		elif node2d is StaticBody2D:
			data["physics"] = {"bodyType": "static"}
		elif node2d is CharacterBody2D:
			var cb = node2d as CharacterBody2D
			var game_vel = godot_to_game_vec(cb.velocity)
			data["physics"] = {
				"bodyType": "kinematic",
				"velocity": {"x": game_vel.x, "y": game_vel.y}
			}
		elif node2d is Area2D:
			data["physics"] = {"bodyType": "sensor"}
		
		if node2d is Sprite2D:
			var sprite = node2d as Sprite2D
			data["sprite"] = {
				"texture": sprite.texture.resource_path if sprite.texture else null,
				"modulate": "#%s" % sprite.modulate.to_html()
			}
		
		var meta = {}
		for key in node2d.get_meta_list():
			var val = node2d.get_meta(key)
			if val is String or val is int or val is float or val is bool:
				meta[key] = val
		if meta.size() > 0:
			data["meta"] = meta
		
		list.append(data)
	
	for child in node.get_children():
		_collect_scene_nodes(child, list)

func find_entities(args: Array) -> Array:
	var template_filter = ""
	var tag_filter = ""
	var name_filter = ""
	var limit = 100
	
	if args.size() > 0 and args[0] is Dictionary:
		var opts = args[0] as Dictionary
		template_filter = opts.get("template", "")
		tag_filter = opts.get("tag", "")
		name_filter = opts.get("name", "")
		limit = opts.get("limit", 100)
	
	var results = []
	var entities = _game_bridge.entities
	
	for entity_id in entities:
		if results.size() >= limit:
			break
		
		var node = entities[entity_id]
		
		if template_filter != "" and node.has_meta("template"):
			if node.get_meta("template") != template_filter:
				continue
		
		if tag_filter != "" and node.has_meta("tags"):
			var tags = node.get_meta("tags")
			if tags is Array and tag_filter not in tags:
				continue
		
		if name_filter != "" and name_filter.to_lower() not in entity_id.to_lower():
			continue
		
		var game_pos = godot_to_game_pos(node.position)
		var entry = {
			"id": entity_id,
			"position": {"x": game_pos.x, "y": game_pos.y},
			"angle": -node.rotation
		}
		
		if node.has_meta("template"):
			entry["template"] = node.get_meta("template")
		if node.has_meta("tags"):
			entry["tags"] = node.get_meta("tags")
		
		results.append(entry)
	
	return results

func get_entities_at_point(world_x: float, world_y: float) -> Array:
	var result = _physics.query_point(world_x, world_y, {})
	var entities_list = []
	for entity in result.get("entities", []):
		var entity_id = entity.get("entityId", "")
		if entity_id != "" and _game_bridge.entities.has(entity_id):
			var node = _game_bridge.entities[entity_id]
			var game_pos = godot_to_game_pos(node.position)
			var godot_pos = game_to_godot_pos(Vector2(world_x, world_y))
			var dist = node.global_position.distance_to(godot_pos)
			entities_list.append({
				"id": entity_id,
				"position": {"x": game_pos.x, "y": game_pos.y},
				"distance": dist / _pixels_per_meter,
				"template": node.get_meta("template") if node.has_meta("template") else null
			})
	entities_list.sort_custom(func(a, b): return a.distance < b.distance)
	return entities_list

func get_entities_in_rect(min_x: float, min_y: float, max_x: float, max_y: float) -> Array:
	var result = _selector.query(":inRect(" + str(min_x) + "," + str(min_y) + "," + str(max_x) + "," + str(max_y) + ")", {"limit": 1000})
	var entities_list = []
	for match_data in result.get("matches", []):
		entities_list.append({
			"id": match_data.entityId,
			"position": match_data.position,
			"template": match_data.get("template", null)
		})
	return entities_list

func get_entity_count(args: Array) -> Dictionary:
	var template_filter = ""
	var tag_filter = ""
	
	if args.size() > 0 and args[0] is Dictionary:
		var opts = args[0] as Dictionary
		template_filter = opts.get("template", "")
		tag_filter = opts.get("tag", "")
	
	var total = 0
	var by_template = {}
	var entities = _game_bridge.entities
	
	for entity_id in entities:
		var node = entities[entity_id]
		var template = node.get_meta("template") if node.has_meta("template") else "unknown"
		
		if template_filter != "" and template != template_filter:
			continue
		
		if tag_filter != "":
			if not node.has_meta("tags"):
				continue
			var tags = node.get_meta("tags")
			if tags is Array and tag_filter not in tags:
				continue
		
		total += 1
		if not by_template.has(template):
			by_template[template] = 0
		by_template[template] += 1
	
	return {
		"total": total,
		"byTemplate": by_template
	}

# =============================================================================
# PUBLIC MODULE ACCESS
# =============================================================================

func get_selector() -> DebugSelector:
	return _selector

func get_props_module() -> DebugProps:
	return _props

func get_lifecycle() -> DebugLifecycle:
	return _lifecycle

func get_time_module() -> DebugTime:
	return _time

func get_events() -> DebugEvents:
	return _events

func get_physics_module() -> DebugPhysics:
	return _physics
