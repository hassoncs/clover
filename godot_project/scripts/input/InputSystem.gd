class_name InputSystem extends RefCounted

var _game_bridge: Node = null
var _js_input_event_callback: JavaScriptObject = null

# Drag state
var _is_dragging: bool = false
var _drag_entity_id: Variant = null
var _drag_start_pos: Vector2 = Vector2.ZERO
var _drag_start_time: float = 0.0

const TAP_MAX_DURATION: float = 0.3
const TAP_MAX_DISTANCE: float = 20.0


func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge


func process_input(event: InputEvent, entities: Dictionary) -> void:
	if not OS.has_feature("web"):
		return

	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		var viewport = _game_bridge.get_viewport()
		var screen_pos = event.position
		var world_pos = viewport.get_canvas_transform().affine_inverse() * screen_pos
		var game_pos = _game_bridge.godot_to_game_pos(world_pos)

		if event.pressed:
			var hit_entity_id: Variant = _get_entity_at_position(world_pos, entities)

			_is_dragging = true
			_drag_entity_id = hit_entity_id
			_drag_start_pos = screen_pos
			_drag_start_time = Time.get_ticks_msec() / 1000.0

			_game_bridge._queue_event(
				"input",
				{"type": "drag_start", "x": game_pos.x, "y": game_pos.y, "entityId": hit_entity_id}
			)
			_notify_js_input_event("drag_start", game_pos.x, game_pos.y, hit_entity_id)

			if _game_bridge._devtools_overlay:
				_game_bridge._devtools_overlay.start_drag(
					world_pos, str(hit_entity_id) if hit_entity_id else ""
				)
		else:
			_is_dragging = false

			# Detect tap: short duration + minimal movement
			var duration = (Time.get_ticks_msec() / 1000.0) - _drag_start_time
			var distance = screen_pos.distance_to(_drag_start_pos)
			var is_tap = duration < TAP_MAX_DURATION and distance < TAP_MAX_DISTANCE

			if is_tap:
				_game_bridge._queue_event(
					"input",
					{"type": "tap", "x": game_pos.x, "y": game_pos.y, "entityId": _drag_entity_id}
				)
				_notify_js_input_event("tap", game_pos.x, game_pos.y, _drag_entity_id)

				if _game_bridge._devtools_overlay:
					_game_bridge._devtools_overlay.log_event(
						"Tap", str(_drag_entity_id) if _drag_entity_id else "none"
					)

			if _game_bridge._devtools_overlay:
				_game_bridge._devtools_overlay.end_drag()

	elif event is InputEventMouseMotion and _is_dragging:
		var viewport = _game_bridge.get_viewport()
		var screen_pos = event.position
		var world_pos = viewport.get_canvas_transform().affine_inverse() * screen_pos
		var game_pos = _game_bridge.godot_to_game_pos(world_pos)

		_game_bridge._queue_event(
			"input",
			{"type": "drag_move", "x": game_pos.x, "y": game_pos.y, "entityId": _drag_entity_id}
		)
		_notify_js_input_event("drag_move", game_pos.x, game_pos.y, _drag_entity_id)

		if _game_bridge._devtools_overlay:
			_game_bridge._devtools_overlay.update_drag(world_pos)


func send_input(
	input_type: String, x: float, y: float, entity_id: String, entities: Dictionary
) -> void:
	if input_type == "tap":
		var godot_point = _game_bridge.game_to_godot_pos(Vector2(x, y))
		var hit_entity_id: Variant = _get_entity_at_position(godot_point, entities)
		_game_bridge._queue_event(
			"input", {"type": input_type, "x": x, "y": y, "entityId": hit_entity_id}
		)
		_notify_js_input_event(input_type, x, y, hit_entity_id)


func _js_send_input(args: Array, entities: Dictionary) -> void:
	if args.size() < 4:
		return
	var input_type = str(args[0])
	var x = float(args[1])
	var y = float(args[2])

	if input_type == "tap":
		var godot_point = _game_bridge.game_to_godot_pos(Vector2(x, y))
		var hit_entity_id: Variant = _get_entity_at_position(godot_point, entities)
		_notify_js_input_event(input_type, x, y, hit_entity_id)


func _js_on_input_event(args: Array) -> void:
	if args.size() >= 1:
		_js_input_event_callback = args[0]


func _notify_js_input_event(input_type: String, x: float, y: float, entity_id: Variant) -> void:
	if _js_input_event_callback != null:
		var data = {"type": input_type, "x": x, "y": y, "entityId": entity_id}
		var json_str = JSON.stringify(data)
		_js_input_event_callback.call("call", null, json_str)


func _get_entity_at_position(world_pos: Vector2, entities: Dictionary) -> Variant:
	var viewport = _game_bridge.get_viewport()
	var space = viewport.find_world_2d().direct_space_state
	if space:
		var query = PhysicsPointQueryParameters2D.new()
		query.position = world_pos
		query.collision_mask = 0xFFFFFFFF
		query.collide_with_bodies = true
		query.collide_with_areas = true
		var results = space.intersect_point(query, 1)
		if results.size() > 0:
			var collider = results[0].collider
			if collider and collider.name in entities:
				return collider.name
	return null


func is_dragging() -> bool:
	return _is_dragging


func get_drag_entity_id() -> Variant:
	return _drag_entity_id
