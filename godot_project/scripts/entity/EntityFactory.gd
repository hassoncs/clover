class_name EntityFactory extends RefCounted

# Reference to GameBridge for state access and callbacks
var _bridge: Node = null

# State references (passed from bridge for clean dependency injection)
var _entities: Dictionary = {}
var _templates: Dictionary = {}
var _pixels_per_meter: float = 50.0
var _game_root: Node2D = null
var _body_id_map: Dictionary = {}
var _body_id_reverse: Dictionary = {}
var _next_body_id: int = 1
var _entity_shape_map: Dictionary = {}


# Coordinate conversion helpers
func _init(bridge: Node):
	_bridge = bridge


func setup(
	entities: Dictionary,
	templates: Dictionary,
	pixels_per_meter: float,
	game_root: Node2D,
	body_id_map: Dictionary,
	body_id_reverse: Dictionary,
	next_body_id: int,
	entity_shape_map: Dictionary
):
	_entities = entities
	_templates = templates
	_pixels_per_meter = pixels_per_meter
	_game_root = game_root
	_body_id_map = body_id_map
	_body_id_reverse = body_id_reverse
	_next_body_id = next_body_id
	_entity_shape_map = entity_shape_map


func update_state():
	# Update state from bridge (called when game data changes)
	if _bridge:
		_entities = _bridge.entities
		_templates = _bridge.templates
		_pixels_per_meter = _bridge.pixels_per_meter
		_game_root = _bridge.game_root
		_body_id_map = _bridge.body_id_map
		_body_id_reverse = _bridge.body_id_reverse
		_next_body_id = _bridge.next_body_id
		_entity_shape_map = _bridge.entity_shape_map


func game_to_godot_pos(game_pos: Vector2) -> Vector2:
	return Vector2(game_pos.x * _pixels_per_meter, -game_pos.y * _pixels_per_meter)


func godot_to_game_pos(godot_pos: Vector2) -> Vector2:
	return Vector2(godot_pos.x / _pixels_per_meter, -godot_pos.y / _pixels_per_meter)


func game_to_godot_vec(game_vec: Vector2) -> Vector2:
	return Vector2(game_vec.x * _pixels_per_meter, -game_vec.y * _pixels_per_meter)


# ============================================================================
# MAIN ENTITY CREATION
# ============================================================================


func create_entity(entity_data: Dictionary) -> Node2D:
	var entity_id = entity_data.get("id", "entity_" + str(randi()))
	var template_id = entity_data.get("template", "")
	var transform_data = entity_data.get("transform", {})

	# Merge template with entity data
	var merged = entity_data.duplicate(true)

	if template_id != "" and _templates.has(template_id):
		var tmpl = _templates[template_id]
		# Template provides defaults, entity_data overrides
		for key in tmpl:
			if not merged.has(key):
				merged[key] = tmpl[key]
		# Merge components specifically
		_merged_component(merged, tmpl, "physics")
		_merged_component(merged, tmpl, "collider")
		_merged_component(merged, tmpl, "visual")
		_merged_component(merged, tmpl, "character")
		_merged_component(merged, tmpl, "zone")

	var physics_data = merged.get("physics", null)
	var collider_data = merged.get("collider", null)
	var visual_data = merged.get("visual", null)
	var zone_data = merged.get("zone", null)
	var entity_type = merged.get("type", "")

	var node: Node2D = null

	# Create physics body if physics component exists
	if physics_data:
		node = create_physics_body(entity_id, physics_data, collider_data, transform_data)
	# Create zone (legacy) if zone component exists
	# DEPRECATED: Zones should use collider with isSensor: true instead
	elif entity_type == "zone" and zone_data:
		node = create_zone_entity(entity_id, zone_data, transform_data)
	# Create Area2D for entities with collider but no physics (UI hitboxes)
	elif collider_data:
		node = create_area2d_entity(entity_id, collider_data, transform_data)
	# Otherwise create plain Node2D (visual only, no collision)
	else:
		node = Node2D.new()
		node.name = entity_id

	# Set transform (convert from game coords to Godot coords with Y-flip)
	var game_pos = Vector2(transform_data.get("x", 0), transform_data.get("y", 0))
	var godot_pos = game_to_godot_pos(game_pos)
	var angle = transform_data.get("angle", 0)
	node.position = godot_pos
	node.rotation = -angle

	# Add visual component
	if visual_data:
		# Apply smart defaults: visual inherits from collider
		var resolved_visual = _resolve_visual_with_defaults(visual_data, collider_data)
		_add_visual(node, resolved_visual)
	elif collider_data:
		# Auto-generate visual from collider if no visual specified
		var auto_visual = _generate_visual_from_collider(collider_data)
		_add_visual(node, auto_visual)
	else:
		pass  # No visual or collider for entity

	# NOTE: Collider shape is now added by create_area2d_entity() for collider-only entities
	# This block is no longer needed since we handle it in the Area2D creation path

	# Add to scene
	if _game_root:
		_game_root.add_child(node)
	else:
		var main = _bridge.get_tree().current_scene if _bridge else null
		if main:
			main.add_child(node)

	# Apply initial velocity if specified
	if node is RigidBody2D and physics_data and physics_data.has("initialVelocity"):
		var initial_vel = physics_data.initialVelocity
		var game_vel = Vector2(initial_vel.get("x", 0), initial_vel.get("y", 0))
		node.linear_velocity = game_to_godot_vec(game_vel)

	# Set metadata for selectors
	if template_id != "":
		node.set_meta("template", template_id)
	if merged.has("tags"):
		node.set_meta("tags", merged.tags if merged.tags is Array else [])
	if merged.has("behaviors"):
		node.set_meta("behaviors", merged.behaviors if merged.behaviors is Array else [])

	_entities[entity_id] = node

	return node


# ============================================================================
# PHYSICS BODY CREATION
# ============================================================================


func create_physics_body(
	entity_id: String,
	physics_data: Dictionary,
	collider_data: Dictionary,
	transform_data: Dictionary
) -> Node2D:
	var body_type = physics_data.get("bodyType", "dynamic")
	var node: Node2D

	# Extract physics properties (needed outside match block)
	var density = physics_data.get("density", 1.0)
	var mass = physics_data.get("mass", 0.0)

	match body_type:
		"static":
			node = StaticBody2D.new()
		"kinematic":
			var char_body = CharacterBody2D.new()
			node = char_body
		_:  # dynamic
			var rigid = RigidBody2D.new()
			rigid.gravity_scale = physics_data.get("gravityScale", 1.0)

			# Enable contact monitoring for detailed collision data
			rigid.contact_monitor = true
			rigid.max_contacts_reported = 4

			# Attach PhysicsBody script for _integrate_forces callback
			if _bridge:
				rigid.set_script(load("res://scripts/PhysicsBody.gd"))

			# Linear/angular damping
			rigid.linear_damp = physics_data.get("linearDamping", 0.0)
			rigid.angular_damp = physics_data.get("angularDamping", 0.0)

			# Fixed rotation
			if physics_data.get("fixedRotation", false):
				rigid.lock_rotation = true

			# CCD for fast-moving objects
			if physics_data.get("ccd", false) or physics_data.get("bullet", false):
				rigid.continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY

			# Apply initial velocity if specified
			var initial_vel = physics_data.get("initialVelocity", null)
			if initial_vel != null:
				var game_vel = Vector2(initial_vel.get("x", 0), initial_vel.get("y", 0))
				rigid.linear_velocity = game_to_godot_vec(game_vel)

			node = rigid

	node.name = entity_id

	# Add collision shape from collider data
	if collider_data:
		var collision = CollisionShape2D.new()
		collision.shape = create_collider_shape(collider_data)

		# Apply collider material properties (if dynamic body)
		if node is RigidBody2D:
			var friction = collider_data.get("friction", 0.5)
			var restitution = collider_data.get("restitution", 0.0)
			var material = PhysicsMaterial.new()
			material.friction = friction
			material.bounce = restitution
			node.physics_material_override = material

			# Calculate mass if density provided and no direct mass
			var final_mass = 1.0  # Default mass
			if mass > 0:
				final_mass = mass
			elif density > 0:
				var shape_type = collider_data.get("shape", "box")
				var shape_area = 1.0
				if shape_type == "box":
					var w = collider_data.get("width", 1.0)
					var h = collider_data.get("height", 1.0)
					shape_area = w * h
				elif shape_type == "circle":
					var r = collider_data.get("radius", 0.5)
					shape_area = PI * r * r
				elif shape_type == "polygon":
					var vertices = collider_data.get("vertices", [])
					shape_area = calculate_polygon_area(vertices)
				final_mass = density * shape_area
			# Ensure mass is always > 0 (Godot requires mass > 0)
			if final_mass <= 0:
				final_mass = 1.0
			node.mass = final_mass

		node.add_child(collision)

	# Apply collision filtering
	node.collision_layer = physics_data.get("categoryBits", 1)
	node.collision_mask = physics_data.get("maskBits", 0xFFFFFFFF)

	# Track body ID for Physics2D compatibility
	if _bridge and _bridge.has_method("_allocate_body_id"):
		var body_id = _bridge._allocate_body_id(entity_id)
		_body_id_map[entity_id] = body_id
	else:
		_body_id_map[entity_id] = _next_body_id
		_next_body_id += 1

	return node


# ============================================================================
# ZONE ENTITY CREATION (DEPRECATED)
# ============================================================================
# DEPRECATED: Zone entities are being replaced with collider + isSensor pattern.
# Use collider with isSensor: true instead of separate zone data.
# This function is kept for backward compatibility but will be removed in future versions.
# When zone entities are created, a runtime warning is printed.
# ============================================================================


func create_zone_entity(
	entity_id: String, zone_data: Dictionary, transform_data: Dictionary
) -> Node2D:
	# DEPRECATED: Zone entities should use collider with isSensor: true
	print("[DEPRECATED] Zone entities should use collider with isSensor: true")

	var movement_type = zone_data.get("movement", "static")
	var zone_shape = zone_data.get("shape", {"type": "box", "width": 1.0, "height": 1.0})

	var area = Area2D.new()
	area.name = entity_id

	# Add collision shape
	var collision = CollisionShape2D.new()
	var shape_type = zone_shape.get("type", "box")

	match shape_type:
		"circle":
			var circle = CircleShape2D.new()
			circle.radius = zone_shape.get("radius", 0.5) * _pixels_per_meter
			collision.shape = circle
		"polygon":
			var polygon = ConvexPolygonShape2D.new()
			var vertices = zone_shape.get("vertices", [])
			var points: PackedVector2Array = []
			for v in vertices:
				points.append(Vector2(v.x * _pixels_per_meter, -v.y * _pixels_per_meter))
			polygon.points = points
			collision.shape = polygon
		_:  # box
			var rect = RectangleShape2D.new()
			var w = zone_shape.get("width", 1.0) * _pixels_per_meter
			var h = zone_shape.get("height", 1.0) * _pixels_per_meter
			rect.size = Vector2(w, h)
			collision.shape = rect

	area.add_child(collision)

	# Apply collision filtering
	area.collision_layer = zone_data.get("categoryBits", 1)
	area.collision_mask = zone_data.get("maskBits", 0xFFFFFFFF)

	# Store zone metadata
	area.set_meta("entity_type", "zone")
	area.set_meta("zone_movement", movement_type)

	# Track body ID for compatibility
	if _bridge and _bridge.has_method("_allocate_body_id"):
		var body_id = _bridge._allocate_body_id(entity_id)
		_body_id_map[entity_id] = body_id
	else:
		_body_id_map[entity_id] = _next_body_id
		_next_body_id += 1

	return area


# ============================================================================
# AREA2D ENTITY CREATION (UI Hitboxes / Collider-only entities)
# ============================================================================
# Used for entities that need hit detection but no physics simulation.
# Examples: UI buttons, puzzle game tiles, Ball Sort tube sensors
# ============================================================================


func create_area2d_entity(
	entity_id: String, collider_data: Dictionary, transform_data: Dictionary
) -> Node2D:
	var area = Area2D.new()
	area.name = entity_id

	# Create collision shape
	var collision = CollisionShape2D.new()
	collision.shape = create_collider_shape(collider_data)
	area.add_child(collision)

	# Use Layer 2 for UI hitboxes (Layer 1 reserved for physics objects)
	# This keeps them separate from physics simulation
	area.collision_layer = collider_data.get("categoryBits", 2)
	area.collision_mask = collider_data.get("maskBits", 0)

	# Track body ID for compatibility with queryPoint
	if _bridge and _bridge.has_method("_allocate_body_id"):
		var body_id = _bridge._allocate_body_id(entity_id)
		_body_id_map[entity_id] = body_id
	else:
		_body_id_map[entity_id] = _next_body_id
		_next_body_id += 1

	return area


# ============================================================================
# SHAPE CREATION HELPERS
# ============================================================================


func create_shape(physics_data: Dictionary) -> Shape2D:
	var shape_type = physics_data.get("shape", "box")
	var shape: Shape2D

	match shape_type:
		"circle":
			var circle = CircleShape2D.new()
			circle.radius = physics_data.get("radius", 0.5) * _pixels_per_meter
			shape = circle
		"polygon":
			var polygon = ConvexPolygonShape2D.new()
			var vertices = physics_data.get("vertices", [])
			var points: PackedVector2Array = []
			for v in vertices:
				points.append(Vector2(v.x * _pixels_per_meter, -v.y * _pixels_per_meter))
			polygon.points = points
			shape = polygon
		_:  # box
			var rect = RectangleShape2D.new()
			var w = physics_data.get("width", 1.0) * _pixels_per_meter
			var h = physics_data.get("height", 1.0) * _pixels_per_meter
			rect.size = Vector2(w, h)
			shape = rect

	return shape


func create_collider_shape(collider_data: Dictionary) -> Shape2D:
	var shape_type = collider_data.get("shape", "box")
	var shape: Shape2D

	match shape_type:
		"circle":
			var circle = CircleShape2D.new()
			circle.radius = collider_data.get("radius", 0.5) * _pixels_per_meter
			shape = circle
		"polygon":
			var polygon = ConvexPolygonShape2D.new()
			var vertices = collider_data.get("vertices", [])
			var points: PackedVector2Array = []
			for v in vertices:
				points.append(Vector2(v.x * _pixels_per_meter, -v.y * _pixels_per_meter))
			polygon.points = points
			shape = polygon
		_:  # box
			var rect = RectangleShape2D.new()
			var w = collider_data.get("width", 1.0) * _pixels_per_meter
			var h = collider_data.get("height", 1.0) * _pixels_per_meter
			rect.size = Vector2(w, h)
			shape = rect

	return shape


func calculate_polygon_area(vertices: Array) -> float:
	if vertices.size() < 3:
		return 1.0
	var area = 0.0
	var n = vertices.size()
	for i in range(n):
		var j = (i + 1) % n
		area += vertices[i].x * vertices[j].y
		area -= vertices[j].x * vertices[i].y
	return abs(area) / 2.0


# ============================================================================
# VISUAL CREATION (simplified - delegates to bridge for full implementation)
# ============================================================================


func _add_visual(node: Node2D, visual_data: Dictionary) -> void:
	if not _bridge:
		return
	if _bridge.has_method("_add_visual"):
		_bridge._add_visual(node, visual_data)


func _create_polygon_texture(
	width: int, height: int, color: Color, padding: int = 0
) -> ImageTexture:
	if not _bridge:
		return null
	if _bridge.has_method("_create_polygon_texture"):
		return _bridge._create_polygon_texture(width, height, color, padding)
	return null


func _merged_component(merged: Dictionary, tmpl: Dictionary, key: String) -> void:
	if not tmpl.has(key):
		return
	var tmpl_val = tmpl[key]
	var merged_val = merged.get(key, {})
	if typeof(tmpl_val) == TYPE_DICTIONARY and typeof(merged_val) == TYPE_DICTIONARY:
		for k in tmpl_val:
			if not merged_val.has(k):
				merged_val[k] = tmpl_val[k]
		merged[key] = merged_val


func _resolve_visual_with_defaults(
	visual_data: Dictionary, collider_data: Dictionary
) -> Dictionary:
	if not _bridge:
		return visual_data
	if _bridge.has_method("_resolve_visual_with_defaults"):
		return _bridge._resolve_visual_with_defaults(visual_data, collider_data)
	return visual_data


func _generate_visual_from_collider(collider_data: Dictionary) -> Dictionary:
	if not _bridge:
		return {"type": "rect", "color": "#FF0000"}
	if _bridge.has_method("_generate_visual_from_collider"):
		return _bridge._generate_visual_from_collider(collider_data)
	return {"type": "rect", "color": "#FF0000"}


func destroy_entity(entity_id: String) -> void:
	# Clean up entity-related tracking data
	if _body_id_map.has(entity_id):
		var body_id = _body_id_map[entity_id]
		_body_id_reverse.erase(body_id)
		_body_id_map.erase(entity_id)

	if _entity_shape_map.has(entity_id):
		_entity_shape_map.erase(entity_id)

	if _entities.has(entity_id):
		_entities.erase(entity_id)
