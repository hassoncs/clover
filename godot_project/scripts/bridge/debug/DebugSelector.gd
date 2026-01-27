class_name DebugSelector
extends RefCounted

# =============================================================================
# DEBUG SELECTOR
# CSS-like selector system for querying game entities
# Supports: #id, template, .tag, [name=X], [physicsBody=X], :inRect(), :near()
# Combinators: space (descendant), > (child), , (OR group)
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

func game_to_godot_pos(game_pos: Vector2) -> Vector2:
	return CoordinateUtils.game_to_godot_pos(game_pos, _pixels_per_meter)

# =============================================================================
# MAIN QUERY API
# =============================================================================

func query(selector: String, options: Dictionary = {}) -> Dictionary:
	var limit = options.get("limit", 50)
	var offset = options.get("offset", 0)
	var order_by = options.get("orderBy", "id")
	var origin = options.get("origin", null)
	var include = options.get("include", [])
	var scope_root_id = options.get("scopeRootId", "")
	var include_hierarchy = options.get("includeHierarchy", false)
	
	var ast = parse_selector(selector)
	if ast.has("error"):
		return {"error": ast.error, "matches": [], "count": 0, "hasMore": false}
	
	var all_matches = execute_selector(ast, scope_root_id)
	
	if order_by == "distance" and origin != null:
		var origin_vec = Vector2(origin.get("x", 0), origin.get("y", 0))
		all_matches.sort_custom(func(a, b):
			var pos_a = Vector2(a.position.x, a.position.y)
			var pos_b = Vector2(b.position.x, b.position.y)
			return pos_a.distance_to(origin_vec) < pos_b.distance_to(origin_vec)
		)
	elif order_by == "zIndex":
		all_matches.sort_custom(func(a, b): return a.get("zIndex", 0) < b.get("zIndex", 0))
	elif order_by == "name":
		all_matches.sort_custom(func(a, b): return a.name < b.name)
	elif order_by == "template":
		all_matches.sort_custom(func(a, b): return a.get("template", "") < b.get("template", ""))
	
	var total_count = all_matches.size()
	var paginated = all_matches.slice(offset, offset + limit)
	
	if include_hierarchy:
		for match_data in paginated:
			_add_hierarchy_info(match_data)
	
	for inc in include:
		for match_data in paginated:
			_add_include_data(match_data, inc)
	
	return {
		"matches": paginated,
		"count": total_count,
		"hasMore": offset + limit < total_count
	}

func query_ast(selector_ast: Dictionary, options: Dictionary = {}) -> Dictionary:
	var limit = options.get("limit", 50)
	var offset = options.get("offset", 0)
	var scope_root_id = options.get("scopeRootId", "")
	var include_hierarchy = options.get("includeHierarchy", false)
	
	var all_matches = execute_selector(selector_ast, scope_root_id)
	var total_count = all_matches.size()
	var paginated = all_matches.slice(offset, offset + limit)
	
	if include_hierarchy:
		for match_data in paginated:
			_add_hierarchy_info(match_data)
	
	return {
		"matches": paginated,
		"count": total_count,
		"hasMore": offset + limit < total_count
	}

# =============================================================================
# SELECTOR PARSER
# =============================================================================

func parse_selector(selector: String) -> Dictionary:
	selector = selector.strip_edges()
	if selector.is_empty():
		return {"error": "Empty selector"}
	
	if "," in selector:
		var parts = selector.split(",")
		var or_args = []
		for part in parts:
			var parsed = parse_selector(part.strip_edges())
			if parsed.has("error"):
				return parsed
			or_args.append(parsed)
		return {"op": "or", "args": or_args}
	
	if " > " in selector:
		var parts = selector.split(" > ")
		return _build_ancestry_chain(parts, "child")
	
	if " " in selector:
		var parts = selector.split(" ")
		var filtered_parts = []
		for p in parts:
			if not p.strip_edges().is_empty():
				filtered_parts.append(p.strip_edges())
		if filtered_parts.size() > 1:
			return _build_ancestry_chain(filtered_parts, "descendant")
		selector = filtered_parts[0] if filtered_parts.size() > 0 else selector
	
	return _parse_compound_selector(selector)

func _build_ancestry_chain(parts: Array, relation: String) -> Dictionary:
	if parts.size() == 1:
		return _parse_compound_selector(parts[0].strip_edges())
	
	var child_selector = _parse_compound_selector(parts[parts.size() - 1].strip_edges())
	if child_selector.has("error"):
		return child_selector
	
	var parent_parts = parts.slice(0, parts.size() - 1)
	var parent_selector = _build_ancestry_chain(parent_parts, relation)
	if parent_selector.has("error"):
		return parent_selector
	
	return {
		"op": relation + "Of",
		"selector": child_selector,
		"ancestor": parent_selector
	}

func _parse_compound_selector(selector: String) -> Dictionary:
	var conditions = []
	var i = 0
	var len = selector.length()
	
	while i < len:
		var c = selector[i]
		
		if c == "#":
			var end = _find_token_end(selector, i + 1)
			var id_val = selector.substr(i + 1, end - i - 1)
			conditions.append({"op": "id", "value": id_val})
			i = end
		
		elif c == ".":
			var end = _find_token_end(selector, i + 1)
			var tag_val = selector.substr(i + 1, end - i - 1)
			conditions.append({"op": "tag", "value": tag_val})
			i = end
		
		elif c == "[":
			var close = selector.find("]", i)
			if close == -1:
				return {"error": "Unclosed attribute selector at " + str(i)}
			var attr_content = selector.substr(i + 1, close - i - 1)
			var attr_cond = _parse_attribute(attr_content)
			if attr_cond.has("error"):
				return attr_cond
			conditions.append(attr_cond)
			i = close + 1
		
		elif c == ":":
			var end = i + 1
			while end < len and (selector[end].is_valid_identifier() or selector[end] == "("):
				if selector[end] == "(":
					var paren_close = selector.find(")", end)
					if paren_close == -1:
						return {"error": "Unclosed pseudo-selector at " + str(i)}
					end = paren_close + 1
					break
				end += 1
			var pseudo = selector.substr(i + 1, end - i - 1)
			var pseudo_cond = _parse_pseudo(pseudo)
			if pseudo_cond.has("error"):
				return pseudo_cond
			conditions.append(pseudo_cond)
			i = end
		
		elif c.is_valid_identifier() or c == "_":
			var end = _find_token_end(selector, i)
			var template_val = selector.substr(i, end - i)
			conditions.append({"op": "template", "value": template_val})
			i = end
		
		else:
			i += 1
	
	if conditions.size() == 0:
		return {"error": "No valid selector conditions found"}
	elif conditions.size() == 1:
		return conditions[0]
	else:
		return {"op": "and", "args": conditions}

func _find_token_end(s: String, start: int) -> int:
	var i = start
	while i < s.length():
		var c = s[i]
		if not (c.is_valid_identifier() or c == "_" or c == "-" or c.is_valid_int()):
			break
		i += 1
	return i

func _parse_attribute(content: String) -> Dictionary:
	if "^=" in content:
		var parts = content.split("^=")
		return {"op": "name", "match": "prefix", "value": _unquote(parts[1])}
	elif "*=" in content:
		var parts = content.split("*=")
		return {"op": "name", "match": "contains", "value": _unquote(parts[1])}
	elif "$=" in content:
		var parts = content.split("$=")
		return {"op": "name", "match": "suffix", "value": _unquote(parts[1])}
	elif "=" in content:
		var parts = content.split("=")
		var key = parts[0].strip_edges()
		var val = _unquote(parts[1].strip_edges()) if parts.size() > 1 else ""
		
		match key:
			"name":
				return {"op": "name", "match": "exact", "value": val}
			"visible":
				return {"op": "visible", "value": val.to_lower() == "true"}
			"physicsBody", "bodyType":
				return {"op": "physicsBody", "value": val}
			"sensor":
				return {"op": "sensor", "value": val.to_lower() == "true"}
			"template":
				return {"op": "template", "value": val}
			_:
				return {"op": "meta", "key": key, "value": val}
	else:
		return {"op": "hasAttr", "key": content.strip_edges()}

func _parse_pseudo(pseudo: String) -> Dictionary:
	if pseudo.begins_with("inRect("):
		var params = pseudo.substr(7, pseudo.length() - 8)
		var nums = params.split(",")
		if nums.size() != 4:
			return {"error": "inRect requires 4 parameters"}
		return {
			"op": "inRect",
			"rect": {
				"minX": float(nums[0].strip_edges()),
				"minY": float(nums[1].strip_edges()),
				"maxX": float(nums[2].strip_edges()),
				"maxY": float(nums[3].strip_edges())
			}
		}
	elif pseudo.begins_with("near("):
		var params = pseudo.substr(5, pseudo.length() - 6)
		var nums = params.split(",")
		if nums.size() != 3:
			return {"error": "near requires 3 parameters (x, y, radius)"}
		return {
			"op": "near",
			"x": float(nums[0].strip_edges()),
			"y": float(nums[1].strip_edges()),
			"radius": float(nums[2].strip_edges())
		}
	elif pseudo.begins_with("z("):
		var params = pseudo.substr(2, pseudo.length() - 3)
		var nums = params.split(",")
		if nums.size() != 2:
			return {"error": "z requires 2 parameters (min, max)"}
		return {
			"op": "zRange",
			"min": int(nums[0].strip_edges()),
			"max": int(nums[1].strip_edges())
		}
	elif pseudo == "root":
		return {"op": "root"}
	elif pseudo == "dynamic":
		return {"op": "physicsBody", "value": "dynamic"}
	elif pseudo == "static":
		return {"op": "physicsBody", "value": "static"}
	elif pseudo == "kinematic":
		return {"op": "physicsBody", "value": "kinematic"}
	elif pseudo == "sensor":
		return {"op": "sensor", "value": true}
	elif pseudo == "visible":
		return {"op": "visible", "value": true}
	elif pseudo == "hidden":
		return {"op": "visible", "value": false}
	else:
		return {"error": "Unknown pseudo-selector: " + pseudo}

func _unquote(s: String) -> String:
	s = s.strip_edges()
	if (s.begins_with("\"") and s.ends_with("\"")) or (s.begins_with("'") and s.ends_with("'")):
		return s.substr(1, s.length() - 2)
	return s

# =============================================================================
# SELECTOR EXECUTOR
# =============================================================================

func execute_selector(ast: Dictionary, scope_root_id: String = "") -> Array:
	var entities = _game_bridge.entities
	var candidates = []
	
	for entity_id in entities:
		var node = entities[entity_id]
		if scope_root_id != "" and not _is_descendant_of(node, scope_root_id):
			continue
		candidates.append({"entity_id": entity_id, "node": node})
	
	var matches = []
	for candidate in candidates:
		if _matches_ast(candidate.node, candidate.entity_id, ast):
			matches.append(_build_match_result(candidate.entity_id, candidate.node))
	
	return matches

func _matches_ast(node: Node2D, entity_id: String, ast: Dictionary) -> bool:
	var op = ast.get("op", "")
	
	match op:
		"and":
			for arg in ast.args:
				if not _matches_ast(node, entity_id, arg):
					return false
			return true
		
		"or":
			for arg in ast.args:
				if _matches_ast(node, entity_id, arg):
					return true
			return false
		
		"id":
			return entity_id == ast.value
		
		"template":
			var tmpl = node.get_meta("template") if node.has_meta("template") else ""
			return tmpl == ast.value
		
		"tag":
			var tags = node.get_meta("tags") if node.has_meta("tags") else []
			return ast.value in tags
		
		"name":
			var name_val = node.name
			var match_type = ast.get("match", "exact")
			var target = ast.value
			match match_type:
				"exact":
					return name_val == target
				"prefix":
					return name_val.begins_with(target)
				"suffix":
					return name_val.ends_with(target)
				"contains":
					return target in name_val
			return false
		
		"visible":
			return node.visible == ast.value
		
		"physicsBody":
			var body_type = _get_body_type(node)
			return body_type == ast.value
		
		"sensor":
			return (node is Area2D) == ast.value
		
		"meta":
			if not node.has_meta(ast.key):
				return false
			return str(node.get_meta(ast.key)) == str(ast.value)
		
		"hasAttr":
			return node.has_meta(ast.key)
		
		"inRect":
			var game_pos = godot_to_game_pos(node.global_position)
			var rect = ast.rect
			return game_pos.x >= rect.minX and game_pos.x <= rect.maxX and game_pos.y >= rect.minY and game_pos.y <= rect.maxY
		
		"near":
			var game_pos = godot_to_game_pos(node.global_position)
			var origin = Vector2(ast.x, ast.y)
			return game_pos.distance_to(origin) <= ast.radius
		
		"zRange":
			return node.z_index >= ast.min and node.z_index <= ast.max
		
		"root":
			return node.get_parent() == _game_bridge.get_tree().current_scene
		
		"childOf":
			return _matches_parent(node, entity_id, ast.ancestor, false)
		
		"descendantOf":
			return _matches_parent(node, entity_id, ast.ancestor, true)
		
		_:
			return false

func _matches_parent(node: Node2D, entity_id: String, ancestor_ast: Dictionary, recursive: bool) -> bool:
	var parent = node.get_parent()
	if parent == null:
		return false
	
	if parent is Node2D:
		var parent_entity_id = _find_entity_id(parent)
		if _matches_ast(parent, parent_entity_id, ancestor_ast):
			return true
		if recursive:
			return _matches_parent(parent, parent_entity_id, ancestor_ast, true)
	
	return false

func _is_descendant_of(node: Node, scope_id: String) -> bool:
	var entities = _game_bridge.entities
	if not entities.has(scope_id):
		return false
	var scope_node = entities[scope_id]
	var current = node
	while current != null:
		if current == scope_node:
			return true
		current = current.get_parent()
	return false

func _find_entity_id(node: Node2D) -> String:
	var entities = _game_bridge.entities
	for entity_id in entities:
		if entities[entity_id] == node:
			return entity_id
	return ""

func _get_body_type(node: Node2D) -> String:
	if node is RigidBody2D:
		return "dynamic"
	elif node is StaticBody2D:
		return "static"
	elif node is CharacterBody2D:
		return "kinematic"
	elif node is Area2D:
		return "sensor"
	return ""

# =============================================================================
# RESULT BUILDING
# =============================================================================

func _build_match_result(entity_id: String, node: Node2D) -> Dictionary:
	var game_pos = godot_to_game_pos(node.global_position)
	var result = {
		"entityId": entity_id,
		"name": node.name,
		"position": {"x": game_pos.x, "y": game_pos.y},
		"angle": -node.global_rotation
	}
	
	if node.has_meta("template"):
		result["template"] = node.get_meta("template")
	if node.has_meta("tags"):
		result["tags"] = node.get_meta("tags")
	
	result["path"] = str(node.get_path())
	result["visible"] = node.visible
	result["zIndex"] = node.z_index
	
	return result

func _add_hierarchy_info(match_data: Dictionary) -> void:
	var entity_id = match_data.entityId
	var entities = _game_bridge.entities
	if not entities.has(entity_id):
		return
	
	var node = entities[entity_id]
	
	var parent = node.get_parent()
	if parent != null and parent is Node2D:
		match_data["parentId"] = _find_entity_id(parent)
	
	var children_ids = []
	for child in node.get_children():
		if child is Node2D:
			var child_id = _find_entity_id(child)
			if child_id != "":
				children_ids.append(child_id)
	match_data["childrenIds"] = children_ids

func _add_include_data(match_data: Dictionary, include_type: String) -> void:
	var entity_id = match_data.entityId
	var entities = _game_bridge.entities
	if not entities.has(entity_id):
		return
	
	var node = entities[entity_id]
	
	match include_type:
		"transform":
			var game_pos = godot_to_game_pos(node.global_position)
			var local_pos = godot_to_game_pos(node.position)
			match_data["transform"] = {
				"position": {"x": game_pos.x, "y": game_pos.y},
				"rotation": -node.global_rotation,
				"scale": {"x": node.scale.x, "y": node.scale.y},
				"localPosition": {"x": local_pos.x, "y": local_pos.y},
				"localRotation": -node.rotation,
				"localScale": {"x": node.scale.x, "y": node.scale.y}
			}
		
		"physics":
			if node is RigidBody2D:
				var rb = node as RigidBody2D
				var game_vel = CoordinateUtils.godot_to_game_vec(rb.linear_velocity, _pixels_per_meter)
				match_data["physics"] = {
					"bodyType": "dynamic",
					"mass": rb.mass,
					"velocity": {"x": game_vel.x, "y": game_vel.y},
					"angularVelocity": -rb.angular_velocity,
					"linearDamping": rb.linear_damp,
					"angularDamping": rb.angular_damp,
					"gravityScale": rb.gravity_scale,
					"sleeping": rb.sleeping,
					"ccd": rb.continuous_cd != RigidBody2D.CCD_MODE_DISABLED,
					"fixedRotation": rb.lock_rotation,
					"collisionLayer": rb.collision_layer,
					"collisionMask": rb.collision_mask
				}
			elif node is StaticBody2D:
				match_data["physics"] = {
					"bodyType": "static",
					"collisionLayer": node.collision_layer,
					"collisionMask": node.collision_mask
				}
			elif node is CharacterBody2D:
				var cb = node as CharacterBody2D
				var game_vel = CoordinateUtils.godot_to_game_vec(cb.velocity, _pixels_per_meter)
				match_data["physics"] = {
					"bodyType": "kinematic",
					"velocity": {"x": game_vel.x, "y": game_vel.y},
					"collisionLayer": cb.collision_layer,
					"collisionMask": cb.collision_mask
				}
			elif node is Area2D:
				var area = node as Area2D
				match_data["physics"] = {
					"bodyType": "sensor",
					"collisionLayer": area.collision_layer,
					"collisionMask": area.collision_mask
				}
		
		"render":
			match_data["render"] = {
				"visible": node.visible,
				"zIndex": node.z_index,
				"modulate": {"r": node.modulate.r, "g": node.modulate.g, "b": node.modulate.b, "a": node.modulate.a}
			}
