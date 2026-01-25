class_name DebugProps
extends RefCounted

# =============================================================================
# DEBUG PROPS
# Property read/write/patch system for entity manipulation
# Supports safe and unsafe modes, validation, and transactional application
# =============================================================================

const SAFE_PROPS = [
	"transform.position",
	"transform.position.x",
	"transform.position.y",
	"transform.rotation",
	"transform.scale",
	"transform.scale.x",
	"transform.scale.y",
	"physics.velocity",
	"physics.velocity.x",
	"physics.velocity.y",
	"physics.angularVelocity",
	"physics.enabled",
	"physics.sleeping",
	"render.visible",
	"render.zIndex",
	"render.opacity",
	"render.modulate",
	"tags"
]

const UNSAFE_PROPS = [
	"physics.mass",
	"physics.gravityScale",
	"physics.linearDamping",
	"physics.angularDamping",
	"physics.fixedRotation",
	"physics.ccd",
	"physics.collisionLayer",
	"physics.collisionMask",
	"physics.material.restitution",
	"physics.material.friction"
]

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

func game_to_godot_vec(game_vec: Vector2) -> Vector2:
	return CoordinateUtils.game_to_godot_vec(game_vec, _pixels_per_meter)

# =============================================================================
# GET PROPERTIES
# =============================================================================

func get_props(entity_id: String, paths: Array, options: Dictionary = {}) -> Dictionary:
	var entities = _game_bridge.entities
	
	if not entities.has(entity_id):
		return {"error": "Entity not found", "entityId": entity_id}
	
	var node = entities[entity_id]
	var result = {"entityId": entity_id, "values": {}}
	
	for path in paths:
		var value = _get_property(node, entity_id, str(path))
		if value != null:
			result.values[path] = value
	
	return result

func get_all_props(entity_id: String, options: Dictionary = {}) -> Dictionary:
	var entities = _game_bridge.entities
	
	if not entities.has(entity_id):
		return {"error": "Entity not found", "entityId": entity_id}
	
	var node = entities[entity_id]
	var game_pos = godot_to_game_pos(node.global_position)
	var local_pos = godot_to_game_pos(node.position)
	
	var result = {
		"entityId": entity_id,
		"name": node.name,
		"path": str(node.get_path()),
		"type": node.get_class(),
		"transform": {
			"position": {"x": game_pos.x, "y": game_pos.y},
			"rotation": -node.global_rotation,
			"scale": {"x": node.scale.x, "y": node.scale.y},
			"localPosition": {"x": local_pos.x, "y": local_pos.y},
			"localRotation": -node.rotation
		},
		"render": {
			"visible": node.visible,
			"zIndex": node.z_index,
			"modulate": {
				"r": node.modulate.r,
				"g": node.modulate.g,
				"b": node.modulate.b,
				"a": node.modulate.a
			}
		}
	}
	
	if node.has_meta("template"):
		result["template"] = node.get_meta("template")
	
	if node.has_meta("tags"):
		result["tags"] = node.get_meta("tags")
	else:
		result["tags"] = []
	
	result["physics"] = _get_physics_props(node)
	
	var meta = {}
	for key in node.get_meta_list():
		if key != "template" and key != "tags":
			var val = node.get_meta(key)
			if val is String or val is int or val is float or val is bool or val is Array:
				meta[key] = val
	if meta.size() > 0:
		result["meta"] = meta
	
	return result

func _get_property(node: Node2D, entity_id: String, path: String) -> Variant:
	var parts = path.split(".")
	
	match parts[0]:
		"transform":
			return _get_transform_prop(node, parts)
		"physics":
			return _get_physics_prop(node, parts)
		"render":
			return _get_render_prop(node, parts)
		"tags":
			return node.get_meta("tags") if node.has_meta("tags") else []
		"template":
			return node.get_meta("template") if node.has_meta("template") else null
		"name":
			return node.name
		"meta":
			if parts.size() > 1 and node.has_meta(parts[1]):
				return node.get_meta(parts[1])
			return null
		_:
			if node.has_meta(path):
				return node.get_meta(path)
			return null

func _get_transform_prop(node: Node2D, parts: Array) -> Variant:
	if parts.size() < 2:
		var game_pos = godot_to_game_pos(node.global_position)
		return {
			"position": {"x": game_pos.x, "y": game_pos.y},
			"rotation": -node.global_rotation,
			"scale": {"x": node.scale.x, "y": node.scale.y}
		}
	
	match parts[1]:
		"position":
			var game_pos = godot_to_game_pos(node.global_position)
			if parts.size() > 2:
				return game_pos.x if parts[2] == "x" else game_pos.y
			return {"x": game_pos.x, "y": game_pos.y}
		"rotation":
			return -node.global_rotation
		"scale":
			if parts.size() > 2:
				return node.scale.x if parts[2] == "x" else node.scale.y
			return {"x": node.scale.x, "y": node.scale.y}
		"localPosition":
			var local_pos = godot_to_game_pos(node.position)
			if parts.size() > 2:
				return local_pos.x if parts[2] == "x" else local_pos.y
			return {"x": local_pos.x, "y": local_pos.y}
		"localRotation":
			return -node.rotation
	return null

func _get_physics_prop(node: Node2D, parts: Array) -> Variant:
	if parts.size() < 2:
		return _get_physics_props(node)
	
	if node is RigidBody2D:
		var rb = node as RigidBody2D
		match parts[1]:
			"bodyType":
				return "dynamic"
			"velocity":
				var game_vel = godot_to_game_vec(rb.linear_velocity)
				if parts.size() > 2:
					return game_vel.x if parts[2] == "x" else game_vel.y
				return {"x": game_vel.x, "y": game_vel.y}
			"angularVelocity":
				return -rb.angular_velocity
			"mass":
				return rb.mass
			"gravityScale":
				return rb.gravity_scale
			"linearDamping":
				return rb.linear_damp
			"angularDamping":
				return rb.angular_damp
			"sleeping":
				return rb.sleeping
			"fixedRotation":
				return rb.lock_rotation
			"ccd":
				return rb.continuous_cd != RigidBody2D.CCD_MODE_DISABLED
			"collisionLayer":
				return rb.collision_layer
			"collisionMask":
				return rb.collision_mask
			"material":
				if rb.physics_material_override:
					return {
						"friction": rb.physics_material_override.friction,
						"restitution": rb.physics_material_override.bounce
					}
				return {"friction": 0.0, "restitution": 0.0}
			"enabled":
				return not rb.freeze
	
	elif node is StaticBody2D:
		var sb = node as StaticBody2D
		match parts[1]:
			"bodyType":
				return "static"
			"collisionLayer":
				return sb.collision_layer
			"collisionMask":
				return sb.collision_mask
	
	elif node is CharacterBody2D:
		var cb = node as CharacterBody2D
		match parts[1]:
			"bodyType":
				return "kinematic"
			"velocity":
				var game_vel = godot_to_game_vec(cb.velocity)
				if parts.size() > 2:
					return game_vel.x if parts[2] == "x" else game_vel.y
				return {"x": game_vel.x, "y": game_vel.y}
			"collisionLayer":
				return cb.collision_layer
			"collisionMask":
				return cb.collision_mask
	
	elif node is Area2D:
		var area = node as Area2D
		match parts[1]:
			"bodyType":
				return "sensor"
			"collisionLayer":
				return area.collision_layer
			"collisionMask":
				return area.collision_mask
	
	return null

func _get_physics_props(node: Node2D) -> Dictionary:
	if node is RigidBody2D:
		var rb = node as RigidBody2D
		var game_vel = godot_to_game_vec(rb.linear_velocity)
		var result = {
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
			"collisionMask": rb.collision_mask,
			"enabled": not rb.freeze
		}
		if rb.physics_material_override:
			result["material"] = {
				"friction": rb.physics_material_override.friction,
				"restitution": rb.physics_material_override.bounce
			}
		return result
	
	elif node is StaticBody2D:
		return {
			"bodyType": "static",
			"collisionLayer": node.collision_layer,
			"collisionMask": node.collision_mask
		}
	
	elif node is CharacterBody2D:
		var cb = node as CharacterBody2D
		var game_vel = godot_to_game_vec(cb.velocity)
		return {
			"bodyType": "kinematic",
			"velocity": {"x": game_vel.x, "y": game_vel.y},
			"collisionLayer": cb.collision_layer,
			"collisionMask": cb.collision_mask
		}
	
	elif node is Area2D:
		return {
			"bodyType": "sensor",
			"collisionLayer": node.collision_layer,
			"collisionMask": node.collision_mask
		}
	
	return {}

func _get_render_prop(node: Node2D, parts: Array) -> Variant:
	if parts.size() < 2:
		return {
			"visible": node.visible,
			"zIndex": node.z_index,
			"modulate": {
				"r": node.modulate.r,
				"g": node.modulate.g,
				"b": node.modulate.b,
				"a": node.modulate.a
			}
		}
	
	match parts[1]:
		"visible":
			return node.visible
		"zIndex":
			return node.z_index
		"opacity":
			return node.modulate.a
		"modulate":
			return {
				"r": node.modulate.r,
				"g": node.modulate.g,
				"b": node.modulate.b,
				"a": node.modulate.a
			}
	return null

# =============================================================================
# SET PROPERTIES
# =============================================================================

func set_props(entity_id: String, values: Dictionary, options: Dictionary = {}) -> Dictionary:
	var entities = _game_bridge.entities
	var unsafe = options.get("unsafe", false)
	var auto_wake = options.get("autoWake", true)
	var validate_only = options.get("validateOnly", false)
	var return_delta = options.get("returnDelta", true)
	
	if not entities.has(entity_id):
		return {"error": "Entity not found", "entityId": entity_id, "applied": []}
	
	var node = entities[entity_id]
	var applied = []
	var delta = {}
	
	for path in values:
		var value = values[path]
		var is_safe = _is_safe_prop(path)
		
		if not is_safe and not unsafe:
			applied.append({"path": path, "ok": false, "error": "UNSAFE_PROPERTY"})
			continue
		
		if validate_only:
			applied.append({"path": path, "ok": true, "validated": true})
			continue
		
		var result = _set_property(node, entity_id, path, value, auto_wake)
		applied.append(result)
		
		if result.ok and return_delta:
			delta[path] = value
	
	var response = {"entityId": entity_id, "applied": applied}
	
	if return_delta and not validate_only:
		response["snapshotDelta"] = {
			"entities": [{"entityId": entity_id, "changes": delta}]
		}
	
	return response

func patch_props(ops: Array, options: Dictionary = {}) -> Dictionary:
	var unsafe = options.get("unsafe", false)
	var validate_only = options.get("validateOnly", false)
	var results = []
	
	for op_data in ops:
		var op = op_data.get("op", "replace")
		var entity_id = op_data.get("entityId", "")
		var path = op_data.get("path", "")
		var value = op_data.get("value", null)
		
		match op:
			"replace":
				var result = set_props(entity_id, {path: value}, options)
				results.append({
					"op": op,
					"entityId": entity_id,
					"path": path,
					"ok": result.applied[0].ok if result.applied.size() > 0 else false,
					"error": result.applied[0].get("error", null) if result.applied.size() > 0 else null
				})
			
			"addTag":
				var result = _add_tag(entity_id, value)
				results.append({"op": op, "entityId": entity_id, "value": value, "ok": result})
			
			"removeTag":
				var result = _remove_tag(entity_id, value)
				results.append({"op": op, "entityId": entity_id, "value": value, "ok": result})
			
			"increment":
				var normalized_path = _normalize_prop_path(path)
				var current = get_props(entity_id, [normalized_path], {})
				if current.has("values") and current.values.has(normalized_path):
					var new_val = current.values[normalized_path] + value
					var result = set_props(entity_id, {normalized_path: new_val}, options)
					results.append({
						"op": op,
						"entityId": entity_id,
						"path": path,
						"ok": result.applied[0].ok if result.applied.size() > 0 else false
					})
				else:
					results.append({"op": op, "entityId": entity_id, "path": path, "ok": false, "error": "Property not found"})
	
	return {"results": results}

func _is_safe_prop(path: String) -> bool:
	for safe_path in SAFE_PROPS:
		if path == safe_path or path.begins_with(safe_path + "."):
			return true
	return false

func _normalize_prop_path(path: String) -> String:
	var parts = path.split(".")
	if parts.size() == 0:
		return path
	
	var first = parts[0]
	if first in ["transform", "physics", "render", "tags", "template", "name", "meta"]:
		return path
	
	if first in ["position", "rotation", "scale", "localPosition", "localRotation", "localScale"]:
		return "transform." + path
	elif first in ["velocity", "angularVelocity", "mass", "gravityScale", "linearDamping", "angularDamping", "sleeping", "enabled", "bodyType", "material"]:
		return "physics." + path
	elif first in ["visible", "zIndex", "opacity", "modulate"]:
		return "render." + path
	
	return path

func _set_property(node: Node2D, entity_id: String, path: String, value: Variant, auto_wake: bool) -> Dictionary:
	var parts = path.split(".")
	
	match parts[0]:
		"transform":
			return _set_transform_prop(node, parts, value)
		"physics":
			return _set_physics_prop(node, parts, value, auto_wake)
		"render":
			return _set_render_prop(node, parts, value)
		"tags":
			node.set_meta("tags", value if value is Array else [value])
			return {"path": path, "ok": true}
		"meta":
			if parts.size() > 1:
				node.set_meta(parts[1], value)
				return {"path": path, "ok": true}
			return {"path": path, "ok": false, "error": "Invalid meta path"}
		_:
			return {"path": path, "ok": false, "error": "Unknown property path"}

func _set_transform_prop(node: Node2D, parts: Array, value: Variant) -> Dictionary:
	var path = ".".join(parts)
	
	if parts.size() < 2:
		return {"path": path, "ok": false, "error": "Incomplete transform path"}
	
	match parts[1]:
		"position":
			if parts.size() > 2:
				var current = node.global_position
				var game_current = godot_to_game_pos(current)
				if parts[2] == "x":
					node.global_position = game_to_godot_pos(Vector2(float(value), game_current.y))
				else:
					node.global_position = game_to_godot_pos(Vector2(game_current.x, float(value)))
			else:
				var pos = Vector2(value.get("x", 0), value.get("y", 0))
				node.global_position = game_to_godot_pos(pos)
			return {"path": path, "ok": true}
		
		"rotation":
			node.global_rotation = -float(value)
			return {"path": path, "ok": true}
		
		"scale":
			if parts.size() > 2:
				if parts[2] == "x":
					node.scale.x = float(value)
				else:
					node.scale.y = float(value)
			else:
				node.scale = Vector2(value.get("x", 1), value.get("y", 1))
			return {"path": path, "ok": true}
	
	return {"path": path, "ok": false, "error": "Unknown transform property"}

func _set_physics_prop(node: Node2D, parts: Array, value: Variant, auto_wake: bool) -> Dictionary:
	var path = ".".join(parts)
	
	if parts.size() < 2:
		return {"path": path, "ok": false, "error": "Incomplete physics path"}
	
	if node is RigidBody2D:
		var rb = node as RigidBody2D
		
		if auto_wake and rb.sleeping:
			rb.sleeping = false
		
		match parts[1]:
			"velocity":
				if parts.size() > 2:
					var current = godot_to_game_vec(rb.linear_velocity)
					if parts[2] == "x":
						rb.linear_velocity = game_to_godot_vec(Vector2(float(value), current.y))
					else:
						rb.linear_velocity = game_to_godot_vec(Vector2(current.x, float(value)))
				else:
					var vel = Vector2(value.get("x", 0), value.get("y", 0))
					rb.linear_velocity = game_to_godot_vec(vel)
				return {"path": path, "ok": true}
			
			"angularVelocity":
				rb.angular_velocity = -float(value)
				return {"path": path, "ok": true}
			
			"mass":
				rb.mass = float(value)
				return {"path": path, "ok": true}
			
			"gravityScale":
				rb.gravity_scale = float(value)
				return {"path": path, "ok": true}
			
			"linearDamping":
				rb.linear_damp = float(value)
				return {"path": path, "ok": true}
			
			"angularDamping":
				rb.angular_damp = float(value)
				return {"path": path, "ok": true}
			
			"sleeping":
				rb.sleeping = bool(value)
				return {"path": path, "ok": true}
			
			"fixedRotation":
				rb.lock_rotation = bool(value)
				return {"path": path, "ok": true}
			
			"ccd":
				rb.continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY if value else RigidBody2D.CCD_MODE_DISABLED
				return {"path": path, "ok": true}
			
			"collisionLayer":
				rb.collision_layer = int(value)
				return {"path": path, "ok": true}
			
			"collisionMask":
				rb.collision_mask = int(value)
				return {"path": path, "ok": true}
			
			"enabled":
				rb.freeze = not bool(value)
				return {"path": path, "ok": true}
			
			"material":
				if parts.size() > 2:
					if not rb.physics_material_override:
						rb.physics_material_override = PhysicsMaterial.new()
					match parts[2]:
						"friction":
							rb.physics_material_override.friction = float(value)
						"restitution":
							rb.physics_material_override.bounce = float(value)
					return {"path": path, "ok": true}
	
	elif node is CharacterBody2D:
		var cb = node as CharacterBody2D
		match parts[1]:
			"velocity":
				if parts.size() > 2:
					var current = godot_to_game_vec(cb.velocity)
					if parts[2] == "x":
						cb.velocity = game_to_godot_vec(Vector2(float(value), current.y))
					else:
						cb.velocity = game_to_godot_vec(Vector2(current.x, float(value)))
				else:
					var vel = Vector2(value.get("x", 0), value.get("y", 0))
					cb.velocity = game_to_godot_vec(vel)
				return {"path": path, "ok": true}
			
			"collisionLayer":
				cb.collision_layer = int(value)
				return {"path": path, "ok": true}
			
			"collisionMask":
				cb.collision_mask = int(value)
				return {"path": path, "ok": true}
	
	elif node is Area2D:
		var area = node as Area2D
		match parts[1]:
			"collisionLayer":
				area.collision_layer = int(value)
				return {"path": path, "ok": true}
			"collisionMask":
				area.collision_mask = int(value)
				return {"path": path, "ok": true}
	
	elif node is StaticBody2D:
		var sb = node as StaticBody2D
		match parts[1]:
			"collisionLayer":
				sb.collision_layer = int(value)
				return {"path": path, "ok": true}
			"collisionMask":
				sb.collision_mask = int(value)
				return {"path": path, "ok": true}
	
	return {"path": path, "ok": false, "error": "Property not applicable to this body type"}

func _set_render_prop(node: Node2D, parts: Array, value: Variant) -> Dictionary:
	var path = ".".join(parts)
	
	if parts.size() < 2:
		return {"path": path, "ok": false, "error": "Incomplete render path"}
	
	match parts[1]:
		"visible":
			node.visible = bool(value)
			return {"path": path, "ok": true}
		
		"zIndex":
			node.z_index = int(value)
			return {"path": path, "ok": true}
		
		"opacity":
			node.modulate.a = clamp(float(value), 0.0, 1.0)
			return {"path": path, "ok": true}
		
		"modulate":
			if value is Dictionary:
				node.modulate = Color(
					value.get("r", 1.0),
					value.get("g", 1.0),
					value.get("b", 1.0),
					value.get("a", 1.0)
				)
			return {"path": path, "ok": true}
	
	return {"path": path, "ok": false, "error": "Unknown render property"}

func _add_tag(entity_id: String, tag: String) -> bool:
	var entities = _game_bridge.entities
	if not entities.has(entity_id):
		return false
	
	var node = entities[entity_id]
	var tags = node.get_meta("tags") if node.has_meta("tags") else []
	if tag not in tags:
		tags.append(tag)
		node.set_meta("tags", tags)
	return true

func _remove_tag(entity_id: String, tag: String) -> bool:
	var entities = _game_bridge.entities
	if not entities.has(entity_id):
		return false
	
	var node = entities[entity_id]
	var tags = node.get_meta("tags") if node.has_meta("tags") else []
	if tag in tags:
		tags.erase(tag)
		node.set_meta("tags", tags)
	return true
