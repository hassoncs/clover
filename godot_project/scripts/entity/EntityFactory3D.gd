class_name EntityFactory3D
extends RefCounted

var _bridge: Node = null
var _entities: Dictionary = {}
var _prefabs: Dictionary = {}
var _game_root: Node3D = null

func _init(bridge: Node):
	_bridge = bridge

func setup(entities: Dictionary, prefabs: Dictionary, game_root: Node3D):
	_entities = entities
	_prefabs = prefabs
	_game_root = game_root

func create_entity(entity_data: Dictionary) -> EntityRecord:
	var entity_id = entity_data.get("id", "entity_" + str(randi()))
	var prefab_id = entity_data.get("prefab", "")
	var transform_data = entity_data.get("transform", {})

	var merged = entity_data.duplicate(true)
	if prefab_id != "" and _prefabs.has(prefab_id):
		var prefab = _prefabs[prefab_id]
		for key in prefab:
			if not merged.has(key):
				merged[key] = prefab[key]
		_merge_component(merged, prefab, "physics")
		_merge_component(merged, prefab, "collider")
		_merge_component(merged, prefab, "visual")

	var physics_data = merged.get("physics", null)
	var collider_data = merged.get("collider", null)
	var visual_data = merged.get("visual", null)

	var node: Node3D = null
	if physics_data:
		node = _create_physics_body(entity_id, physics_data, collider_data)
	elif collider_data:
		node = _create_area3d(entity_id, collider_data)
	else:
		node = Node3D.new()
		node.name = entity_id

	var px = float(transform_data.get("x", 0.0))
	var py = float(transform_data.get("y", 0.0))
	var pz = float(transform_data.get("z", 0.0))
	node.position = Vector3(px, py, pz)

	var rx = float(transform_data.get("rotationX", 0.0))
	var ry = float(transform_data.get("rotationY", 0.0))
	var rz = float(transform_data.get("rotationZ", 0.0))
	node.rotation_degrees = Vector3(rx, ry, rz)

	var sx = float(transform_data.get("scaleX", 1.0))
	var sy = float(transform_data.get("scaleY", 1.0))
	var sz = float(transform_data.get("scaleZ", 1.0))
	node.scale = Vector3(sx, sy, sz)

	if visual_data:
		_add_visual(node, visual_data)

	if _game_root:
		_game_root.add_child(node)

	if prefab_id != "":
		node.set_meta("prefab", prefab_id)
	if merged.has("tags"):
		node.set_meta("tags", merged.tags if merged.tags is Array else [])

	_entities[entity_id] = node

	var archetype = _determine_archetype(physics_data, collider_data)
	var record = EntityRecord.new(entity_id, node, archetype)
	record.prefab = prefab_id
	if merged.has("tags") and merged.tags is Array:
		var typed_tags: Array[String] = []
		for t in merged.tags:
			typed_tags.append(str(t))
		record.tags = typed_tags
	return record

func _create_physics_body(entity_id: String, physics_data: Dictionary, collider_data: Dictionary) -> Node3D:
	var body_type = str(physics_data.get("bodyType", "dynamic"))
	var node: Node3D

	match body_type:
		"static":
			node = StaticBody3D.new()
		"kinematic":
			node = CharacterBody3D.new()
		_:
			var rigid = RigidBody3D.new()
			rigid.gravity_scale = float(physics_data.get("gravityScale", 1.0))
			rigid.linear_damp = float(physics_data.get("linearDamping", 0.0))
			rigid.angular_damp = float(physics_data.get("angularDamping", 0.0))
			if bool(physics_data.get("fixedRotation", false)):
				rigid.lock_rotation = true
			if bool(physics_data.get("ccd", false)) or bool(physics_data.get("bullet", false)):
				rigid.continuous_cd = true
			if physics_data.has("initialVelocity"):
				var iv = physics_data.get("initialVelocity", {})
				rigid.linear_velocity = Vector3(float(iv.get("x", 0.0)), float(iv.get("y", 0.0)), float(iv.get("z", 0.0)))
			node = rigid

	node.name = entity_id

	if collider_data:
		var collision = CollisionShape3D.new()
		collision.shape = _create_collider_shape_3d(collider_data)
		node.add_child(collision)

	if node is CollisionObject3D:
		var collision_object: CollisionObject3D = node
		collision_object.collision_layer = int(physics_data.get("categoryBits", 1))
		collision_object.collision_mask = int(physics_data.get("maskBits", 0x7FFFFFFF))

	if node is RigidBody3D and _bridge and _bridge._collision_system_3d:
		var rigid_body: RigidBody3D = node
		_bridge._collision_system_3d.connect_body_signals(entity_id, rigid_body)

	return node

func _create_area3d(entity_id: String, collider_data: Dictionary) -> Area3D:
	var area = Area3D.new()
	area.name = entity_id

	var collision = CollisionShape3D.new()
	collision.shape = _create_collider_shape_3d(collider_data)
	area.add_child(collision)

	area.collision_layer = int(collider_data.get("categoryBits", 2))
	area.collision_mask = int(collider_data.get("maskBits", 0x7FFFFFFF))

	if _bridge and _bridge._collision_system_3d:
		_bridge._collision_system_3d.connect_sensor_signals(entity_id, area)

	return area

func _create_collider_shape_3d(collider_data: Dictionary) -> Shape3D:
	var shape_type = str(collider_data.get("shape", "box"))
	match shape_type:
		"sphere":
			var sphere = SphereShape3D.new()
			sphere.radius = float(collider_data.get("radius", 0.5))
			return sphere
		"capsule":
			var capsule = CapsuleShape3D.new()
			capsule.radius = float(collider_data.get("radius", 0.5))
			capsule.height = float(collider_data.get("height", 1.0))
			return capsule
		"cylinder":
			var cylinder = CylinderShape3D.new()
			cylinder.radius = float(collider_data.get("radius", 0.5))
			cylinder.height = float(collider_data.get("height", 1.0))
			return cylinder
		_:
			var box = BoxShape3D.new()
			box.size = Vector3(float(collider_data.get("width", 1.0)), float(collider_data.get("height", 1.0)), float(collider_data.get("depth", 1.0)))
			return box

func _add_visual(node: Node3D, visual_data: Dictionary) -> void:
	if _bridge and _bridge._visual_renderer_3d:
		_bridge._visual_renderer_3d.add_visual(node, visual_data)

func _merge_component(merged: Dictionary, prefab: Dictionary, key: String) -> void:
	if not prefab.has(key):
		return
	var prefab_val = prefab[key]
	var merged_val = merged.get(key, {})
	if typeof(prefab_val) == TYPE_DICTIONARY and typeof(merged_val) == TYPE_DICTIONARY:
		for k in prefab_val:
			if not merged_val.has(k):
				merged_val[k] = prefab_val[k]
		merged[key] = merged_val

func _determine_archetype(physics_data, collider_data) -> String:
	if physics_data:
		return "body"
	elif collider_data:
		var is_sensor = bool(collider_data.get("isSensor", false))
		return "sensor" if is_sensor else "hitbox"
	else:
		return "visual"

# ============================================================================
# BRIDGE METHODS (_js_ prefix for auto-registration)
# ============================================================================

func _js_spawn_entity_3d(args: Array) -> Variant:
	if args.size() < 4 or _game_root == null:
		return null
	var prefab_id = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	var z = float(args[3])

	var entity_data = {
		"id": "entity_" + str(Time.get_ticks_msec()) + "_" + str(randi()),
		"prefab": prefab_id,
		"transform": {"x": x, "y": y, "z": z}
	}
	var record = create_entity(entity_data)
	if record:
		if _bridge:
			_bridge.entity_registry[record.entity_id] = record
		return record.entity_id
	return null

func _js_set_position_3d(args: Array) -> void:
	if args.size() < 4:
		return
	var entity_id = str(args[0])
	var node = _entities.get(entity_id, null)
	if node == null and _bridge:
		var record = _bridge.entity_registry.get(entity_id, null)
		if record:
			node = record.node
	if node and node is Node3D:
		node.position = Vector3(float(args[1]), float(args[2]), float(args[3]))

func _js_get_position_3d(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	var node = _get_node_3d(entity_id)
	if node:
		return {"x": node.position.x, "y": node.position.y, "z": node.position.z}
	return null

func _js_set_rotation_3d(args: Array) -> void:
	if args.size() < 4:
		return
	var entity_id = str(args[0])
	var node = _get_node_3d(entity_id)
	if node:
		node.rotation_degrees = Vector3(float(args[1]), float(args[2]), float(args[3]))

func _js_get_rotation_3d(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	var node = _get_node_3d(entity_id)
	if node:
		var r = node.rotation_degrees
		return {"x": r.x, "y": r.y, "z": r.z}
	return null

func _js_set_scale_3d(args: Array) -> void:
	if args.size() < 4:
		return
	var entity_id = str(args[0])
	var node = _get_node_3d(entity_id)
	if node:
		node.scale = Vector3(float(args[1]), float(args[2]), float(args[3]))

func _js_get_scale_3d(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	var node = _get_node_3d(entity_id)
	if node:
		return {"x": node.scale.x, "y": node.scale.y, "z": node.scale.z}
	return null

func _js_set_visible_3d(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	var node = _get_node_3d(entity_id)
	if node:
		node.visible = bool(args[1])

func _js_set_velocity_3d(args: Array) -> void:
	if args.size() < 4:
		return
	var entity_id = str(args[0])
	var node = _get_node_3d(entity_id)
	if node and node is RigidBody3D:
		node.linear_velocity = Vector3(float(args[1]), float(args[2]), float(args[3]))

func _js_get_velocity_3d(args: Array) -> Variant:
	if args.size() < 1:
		return null
	var entity_id = str(args[0])
	var node = _get_node_3d(entity_id)
	if node and node is RigidBody3D:
		var v = node.linear_velocity
		return {"x": v.x, "y": v.y, "z": v.z}
	return null

func _js_apply_impulse_3d(args: Array) -> void:
	if args.size() < 4:
		return
	var entity_id = str(args[0])
	var node = _get_node_3d(entity_id)
	if node and node is RigidBody3D:
		node.apply_impulse(Vector3(float(args[1]), float(args[2]), float(args[3])))

func _js_apply_force_3d(args: Array) -> void:
	if args.size() < 4:
		return
	var entity_id = str(args[0])
	var node = _get_node_3d(entity_id)
	if node and node is RigidBody3D:
		node.apply_force(Vector3(float(args[1]), float(args[2]), float(args[3])))

func _js_destroy_entity_3d(args: Array) -> void:
	if args.size() < 1:
		return
	var entity_id = str(args[0])
	var node = _entities.get(entity_id, null)
	if node and is_instance_valid(node):
		node.queue_free()
		_entities.erase(entity_id)
		if _bridge:
			_bridge.entity_registry.erase(entity_id)

# Helper to find Node3D by entity_id
func _get_node_3d(entity_id: String) -> Node3D:
	var node = _entities.get(entity_id, null)
	if node == null and _bridge:
		var record = _bridge.entity_registry.get(entity_id, null)
		if record:
			node = record.node
	if node and node is Node3D:
		return node
	return null
