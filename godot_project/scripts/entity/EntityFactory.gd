class_name EntityFactory extends RefCounted

# Reference to GameBridge for state access and callbacks
var _bridge: Node = null

# State references (passed from bridge for clean dependency injection)
var _entities: Dictionary = {}
var _templates: Dictionary = {}
var _pixels_per_meter: float = 50.0
var _game_root: Node2D = null


# Coordinate conversion helpers
func _init(bridge: Node):
	_bridge = bridge


func setup(
	entities: Dictionary,
	templates: Dictionary,
	pixels_per_meter: float,
	game_root: Node2D
):
	_entities = entities
	_templates = templates
	_pixels_per_meter = pixels_per_meter
	_game_root = game_root


func update_state():
	# Update state from bridge (called when game data changes)
	if _bridge:
		_entities = _bridge.entities
		_templates = _bridge.templates
		_pixels_per_meter = _bridge.pixels_per_meter
		_game_root = _bridge.game_root


func game_to_godot_pos(game_pos: Vector2) -> Vector2:
	return Vector2(game_pos.x * _pixels_per_meter, -game_pos.y * _pixels_per_meter)


func godot_to_game_pos(godot_pos: Vector2) -> Vector2:
	return Vector2(godot_pos.x / _pixels_per_meter, -godot_pos.y / _pixels_per_meter)


func game_to_godot_vec(game_vec: Vector2) -> Vector2:
	return Vector2(game_vec.x * _pixels_per_meter, -game_vec.y * _pixels_per_meter)


# ============================================================================
# MAIN ENTITY CREATION
# ============================================================================


func create_entity(entity_data: Dictionary) -> EntityRecord:
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

	var physics_data = merged.get("physics", null)
	var collider_data = merged.get("collider", null)
	var visual_data = merged.get("visual", null)
	var entity_type = merged.get("type", "")

	var node: Node2D = null

	# Create physics body if physics component exists
	if physics_data:
		node = create_physics_body(entity_id, physics_data, collider_data, transform_data)
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
		else:
			push_error("[EntityFactory] No parent to add node to!")

	# Apply initial velocity if specified
	if node is RigidBody2D and physics_data and physics_data.has("initialVelocity"):
		var initial_vel = physics_data.initialVelocity
		var game_vel = Vector2(initial_vel.get("x", 0), initial_vel.get("y", 0))
		node.linear_velocity = game_to_godot_vec(game_vel)

	# Set visibility (defaults to true if not specified)
	if merged.has("visible") and merged.visible == false:
		node.visible = false

	# Set metadata for selectors
	if template_id != "":
		node.set_meta("template", template_id)
	if merged.has("tags"):
		node.set_meta("tags", merged.tags if merged.tags is Array else [])
	if merged.has("behaviors"):
		node.set_meta("behaviors", merged.behaviors if merged.behaviors is Array else [])

	_entities[entity_id] = node

	# Create children recursively
	var children_data = merged.get("children", [])
	if children_data is Array and children_data.size() > 0:
		for child_def in children_data:
			create_child_entity(node, entity_id, child_def)

	# Create EntityRecord with archetype
	var archetype = _determine_archetype(physics_data, collider_data)
	var record = EntityRecord.new(entity_id, node, archetype)
	record.template = template_id
	if merged.has("tags"):
		record.tags = merged.tags if merged.tags is Array else []
	return record


func create_child_entity(parent_node: Node2D, parent_id: String, child_def: Dictionary) -> Node2D:
	"""Create a child entity and attach it to the parent node."""
	var child_name = child_def.get("name", "child_" + str(randi()))
	var child_id = child_def.get("id", parent_id + "_" + child_name)
	var child_template_id = child_def.get("template", "")
	var local_transform = child_def.get("localTransform", {})
	
	# Build child entity data
	var child_entity_data = child_def.duplicate(true)
	child_entity_data["id"] = child_id
	
	# Use localTransform as transform for child creation
	if local_transform.size() > 0:
		child_entity_data["transform"] = local_transform
	elif not child_entity_data.has("transform"):
		child_entity_data["transform"] = {"x": 0, "y": 0, "angle": 0, "scaleX": 1, "scaleY": 1}
	
	# Merge with child's template if specified
	var merged = child_entity_data.duplicate(true)
	if child_template_id != "" and _templates.has(child_template_id):
		var tmpl = _templates[child_template_id]
		for key in tmpl:
			if not merged.has(key):
				merged[key] = tmpl[key]
		_merged_component(merged, tmpl, "physics")
		_merged_component(merged, tmpl, "collider")
		_merged_component(merged, tmpl, "visual")
	
	var physics_data = merged.get("physics", null)
	var collider_data = merged.get("collider", null)
	var visual_data = merged.get("visual", null)
	var transform_data = merged.get("transform", {})
	
	# For now, create a simple Node2D as a placeholder for children.
	# TODO: Refactor to use create_physics_body or create_area2d_entity if needed for children.
	var node = Node2D.new()
	node.name = child_id
	
	# Set local transform relative to parent
	var local_pos = Vector2(transform_data.get("x", 0), transform_data.get("y", 0))
	var godot_local_pos = game_to_godot_pos(local_pos)
	var angle = transform_data.get("angle", 0)
	node.position = godot_local_pos
	node.rotation = -angle
	
	# Add visual component
	if visual_data != null and typeof(visual_data) == TYPE_DICTIONARY:
		_add_visual(node, visual_data)
	
	# Add as child of parent node
	parent_node.add_child(node)
	
	# Set metadata
	if child_template_id != "":
		node.set_meta("template", child_template_id)
	if merged.has("tags"):
		node.set_meta("tags", merged.tags if merged.tags is Array else [])
	if merged.has("behaviors"):
		node.set_meta("behaviors", merged.behaviors if merged.behaviors is Array else [])
	node.set_meta("parent_entity_id", parent_id)
	
	# Create EntityRecord and add to registry
	var archetype = _determine_archetype(physics_data, collider_data)
	var record = EntityRecord.new(child_id, node, archetype)
	record.template = child_template_id
	if merged.has("tags"):
		record.tags = merged.tags if merged.tags is Array else []
	
	if _bridge:
		_bridge.entity_registry[child_id] = record
		_bridge.entity_spawned.emit(child_id, node)
	
	# Recursively create grandchildren
	var grandchildren_data = merged.get("children", [])
	if grandchildren_data is Array and grandchildren_data.size() > 0:
		for grandchild_def in grandchildren_data:
			create_child_entity(node, child_id, grandchild_def)
	
	return node


func create_body(
	body_type: String,
	pos_x: float,
	pos_y: float,
	angle: float = 0.0,
	linear_damping: float = 0.0,
	angular_damping: float = 0.0,
	fixed_rotation: bool = false,
	bullet: bool = false,
	user_data_json: String = "",
	group: String = ""
) -> String:
	var godot_pos = game_to_godot_pos(Vector2(pos_x, pos_y))
	var godot_angle = -angle  # Flip angle for Y-up convention

	# Generate unique entity_id
	var entity_id = "body_" + str(Time.get_ticks_msec()) + "_" + str(randi())
	var node: Node2D

	match body_type:
		"static":
			node = StaticBody2D.new()
		"kinematic":
			node = CharacterBody2D.new()
		_:
			var rigid = RigidBody2D.new()
			rigid.gravity_scale = 1.0
			rigid.linear_damp = linear_damping
			rigid.angular_damp = angular_damping
			if fixed_rotation:
				rigid.lock_rotation = true
			if bullet:
				rigid.continuous_cd = RigidBody2D.CCD_MODE_CAST_RAY
			if _bridge and _bridge._collision_system:
				rigid.body_entered.connect(_bridge._collision_system._on_body_entered.bind(entity_id))
			node = rigid

	node.name = entity_id
	node.position = godot_pos
	node.rotation = godot_angle

	var main = _bridge.get_tree().current_scene if _bridge else null
	if main:
		main.add_child(node)
	
	# Create EntityRecord and add to registry
	var archetype = "body" if node is RigidBody2D or node is StaticBody2D else "visual"
	var record = EntityRecord.new(entity_id, node, archetype)
	
	if _bridge:
		_bridge.entity_registry[entity_id] = record

	# Store user data and group (keyed by entity_id)
	if user_data_json != "":
		var json = JSON.new()
		if json.parse(user_data_json) == OK:
			record.user_data = json.data
	if group != "":
		record.group = group

	return entity_id


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
	# Physics bodies use Layer 1 by default
	node.collision_layer = physics_data.get("categoryBits", CollisionLayers.LAYER_BODIES)
	node.collision_mask = physics_data.get("maskBits", 0xFFFFFFFF)

	return node


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

	# Determine layer based on whether this is a sensor or hitbox
	# Sensors (isSensor: true) use Layer 2, UI hitboxes use Layer 4
	var is_sensor = collider_data.get("isSensor", false)
	var default_layer = CollisionLayers.LAYER_SENSORS if is_sensor else CollisionLayers.LAYER_HITBOXES
	area.collision_layer = collider_data.get("categoryBits", default_layer)
	area.collision_mask = collider_data.get("maskBits", 0)

	if is_sensor and _bridge and _bridge._collision_system:
		area.body_shape_entered.connect(_bridge._collision_system._on_sensor_body_shape_entered.bind(entity_id))
		area.body_shape_exited.connect(_bridge._collision_system._on_sensor_body_shape_exited.bind(entity_id))

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
	if _bridge._visual_renderer:
		_bridge._visual_renderer.add_visual(node, visual_data)


func _create_polygon_texture(
	width: int, height: int, color: Color, padding: int = 0
) -> ImageTexture:
	if not _bridge:
		return null
	if _bridge._visual_renderer:
		return _bridge._visual_renderer._create_polygon_texture(width, height, color, padding)
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
	visual_data: Dictionary, collider_data
) -> Dictionary:
	# collider_data can be null for visual-only entities
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


func _determine_archetype(physics_data, collider_data) -> String:
	if physics_data:
		return "body"
	elif collider_data:
		var is_sensor = collider_data.get("isSensor", false)
		return "sensor" if is_sensor else "hitbox"
	else:
		return "visual"


func destroy_entity(entity_id: String) -> void:
	# Clean up entity-related tracking data
	if _entities.has(entity_id):
		_entities.erase(entity_id)
