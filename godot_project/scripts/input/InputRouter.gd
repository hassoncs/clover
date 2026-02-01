class_name InputRouter extends RefCounted

## InputRouter
## Handles input event processing, hit testing, and drag/tap detection.
## GameBridge delegates input processing to this module.

var _game_bridge: Node = null

# Drag state
var _is_dragging: bool = false
var _drag_entity_id: Variant = null
var _drag_start_pos: Vector2 = Vector2.ZERO
var _drag_start_time: float = 0.0

# Tap detection thresholds
const TAP_MAX_DISTANCE: float = 10.0  # pixels
const TAP_MAX_DURATION: float = 0.3  # seconds


func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge


func process_input_event(event: InputEvent) -> Dictionary:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		return process_mouse_button(event)
	elif event is InputEventMouseMotion:
		return process_mouse_motion(event)
	return {}


## Process input event and return structured input data
## Returns Dictionary with {type, x, y, entityId, ...}
func process_mouse_button(event: InputEventMouseButton) -> Dictionary:
	var viewport = _game_bridge.get_viewport()
	var screen_pos = event.position
	var world_pos = viewport.get_canvas_transform().affine_inverse() * screen_pos
	var game_pos = _game_bridge.godot_to_game_pos(world_pos)
	
	if event.pressed:
		# Mouse down - start drag
		var hit_entity_id: Variant = hit_test(game_pos.x, game_pos.y)
		if hit_entity_id == "":
			hit_entity_id = null
		
		_is_dragging = true
		_drag_entity_id = hit_entity_id
		_drag_start_pos = screen_pos
		_drag_start_time = Time.get_ticks_msec() / 1000.0
		
		return {
			"type": "drag_start",
			"x": game_pos.x,
			"y": game_pos.y,
			"entityId": hit_entity_id,
			"world_pos": world_pos
		}
	else:
		# Mouse up - end drag or tap
		_is_dragging = false
		
		# Detect tap: short duration + minimal movement
		var duration = (Time.get_ticks_msec() / 1000.0) - _drag_start_time
		var distance = screen_pos.distance_to(_drag_start_pos)
		var is_tap = duration < TAP_MAX_DURATION and distance < TAP_MAX_DISTANCE
		
		var result = {
			"type": "tap" if is_tap else "drag_end",
			"x": game_pos.x,
			"y": game_pos.y,
			"entityId": _drag_entity_id,
			"world_pos": world_pos,
			"is_tap": is_tap
		}
		
		_drag_entity_id = null
		return result


## Process mouse motion event
func process_mouse_motion(event: InputEventMouseMotion) -> Dictionary:
	if not _is_dragging:
		return {}
	
	var viewport = _game_bridge.get_viewport()
	var screen_pos = event.position
	var world_pos = viewport.get_canvas_transform().affine_inverse() * screen_pos
	var game_pos = _game_bridge.godot_to_game_pos(world_pos)
	
	return {
		"type": "drag_move",
		"x": game_pos.x,
		"y": game_pos.y,
		"entityId": _drag_entity_id,
		"world_pos": world_pos
	}


## Canonical hit test function with layer-based priority.
## 
## Args:
##     x, y: Game coordinates (meters, center-origin, Y+ up)
## 
## Returns:
##     entity_id string or empty string if no hit
## 
## Priority: Hitboxes (L4) > Bodies (L1)
## Ignores: Sensors (L2)
func hit_test(x: float, y: float) -> String:
	var godot_pos = _game_bridge.game_to_godot_pos(Vector2(x, y))
	var space = _game_bridge.get_viewport().find_world_2d().direct_space_state
	if space == null:
		return ""
	
	var query = PhysicsPointQueryParameters2D.new()
	query.position = godot_pos
	query.collision_mask = CollisionLayers.MASK_HIT_TEST  # 5 = LAYER_BODIES | LAYER_HITBOXES
	query.collide_with_bodies = true
	query.collide_with_areas = true
	
	var results = space.intersect_point(query, 10)  # Get multiple for priority sorting
	if results.is_empty():
		return ""
	
	# Sort by layer priority: hitboxes first (L4), then bodies (L1)
	var best_hit: String = ""
	var best_layer: int = 0
	for result in results:
		var collider = result.collider
		if collider and _game_bridge.entity_registry.has(collider.name):
			var layer = collider.collision_layer
			if layer & CollisionLayers.LAYER_HITBOXES:  # Hitbox has priority
				return collider.name
			elif layer & CollisionLayers.LAYER_BODIES and best_layer == 0:
				best_hit = collider.name
				best_layer = layer
	
	return best_hit


## Check if currently dragging
func is_dragging() -> bool:
	return _is_dragging


## Get the entity being dragged (if any)
func get_drag_entity_id() -> Variant:
	return _drag_entity_id

# =============================================================================
# JS HANDLERS (called from JavaScript bridge)
# =============================================================================

func _js_send_input(args: Array) -> void:
	if args.size() < 4:
		return
	var input_type = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	# provided_entity_id = str(args[3]) if args[3] != null else ""

	if input_type == "tap":
		var hit_entity_id: Variant = hit_test(x, y)
		if hit_entity_id == "":
			hit_entity_id = null

		if _game_bridge._event_emitter:
			_game_bridge._event_emitter.emit_input_event(input_type, x, y, hit_entity_id)
