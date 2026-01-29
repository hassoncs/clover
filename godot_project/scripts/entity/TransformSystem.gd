class_name TransformSystem extends RefCounted

var _game_bridge: Node = null

func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge

func _js_set_transform(args: Array) -> void:
	if args.size() >= 4:
		set_transform(str(args[0]), float(args[1]), float(args[2]), float(args[3]))

func set_transform(entity_id: String, x: float, y: float, angle: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	var godot_pos = _game_bridge.game_to_godot_pos(Vector2(x, y))
	entity.global_position = godot_pos
	entity.global_rotation = deg_to_rad(-angle)  # Convert to radians and flip for Godot

func _js_set_position(args: Array) -> void:
	if args.size() >= 3:
		set_position(str(args[0]), float(args[1]), float(args[2]))

func set_position(entity_id: String, x: float, y: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	entity.global_position = _game_bridge.game_to_godot_pos(Vector2(x, y))

func _js_set_rotation(args: Array) -> void:
	if args.size() >= 2:
		set_rotation(str(args[0]), float(args[1]))

func set_rotation(entity_id: String, angle: float) -> void:
	if not _game_bridge.entities.has(entity_id):
		return
	var entity = _game_bridge.entities[entity_id]
	entity.global_rotation = deg_to_rad(-angle)  # Convert to radians and flip for Godot

func _js_set_scale(args: Array) -> void:
	if args.size() >= 3:
		var entity_id = str(args[0])
		var scale_x = float(args[1])
		var scale_y = float(args[2])
		if not _game_bridge.entities.has(entity_id):
			return
		var entity = _game_bridge.entities[entity_id]
		entity.global_scale = Vector2(scale_x, scale_y)
