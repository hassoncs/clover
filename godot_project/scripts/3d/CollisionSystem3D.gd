class_name CollisionSystem3D
extends RefCounted

var _bridge: Node = null

func _init(bridge: Node):
	_bridge = bridge

func connect_body_signals(entity_id: String, body: RigidBody3D) -> void:
	body.body_entered.connect(_on_body_entered.bind(entity_id))

func _on_body_entered(other_body: Node, entity_id: String) -> void:
	if not _bridge:
		return
	var other_id = other_body.name
	_bridge.collision_occurred.emit(entity_id, other_id, 0.0)

func connect_sensor_signals(entity_id: String, area: Area3D) -> void:
	area.body_entered.connect(_on_sensor_body_entered.bind(entity_id))
	area.body_exited.connect(_on_sensor_body_exited.bind(entity_id))

func _on_sensor_body_entered(body: Node3D, sensor_id: String) -> void:
	if not _bridge:
		return
	var body_id = body.name
	if _bridge.has_method("emit_sensor_entered"):
		_bridge.emit_sensor_entered(sensor_id, body_id)

func _on_sensor_body_exited(body: Node3D, sensor_id: String) -> void:
	if not _bridge:
		return
	var body_id = body.name
	if _bridge.has_method("emit_sensor_exited"):
		_bridge.emit_sensor_exited(sensor_id, body_id)

func _js_raycast_3d(args: Array) -> Variant:
	if args.size() < 6 or not _bridge:
		return null
	var from = Vector3(float(args[0]), float(args[1]), float(args[2]))
	var to = Vector3(float(args[3]), float(args[4]), float(args[5]))

	var world_3d = _bridge.get_viewport().find_world_3d()
	if world_3d == null:
		return null
	var space_state = world_3d.direct_space_state
	var query = PhysicsRayQueryParameters3D.create(from, to)
	var result = space_state.intersect_ray(query)

	if result.is_empty():
		return null

	var hit_node = result.collider
	return {
		"entityId": hit_node.name if hit_node else "",
		"point": {"x": result.position.x, "y": result.position.y, "z": result.position.z},
		"normal": {"x": result.normal.x, "y": result.normal.y, "z": result.normal.z},
		"distance": from.distance_to(result.position)
	}
