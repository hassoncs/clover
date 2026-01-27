class_name DebugOverlay
extends CanvasLayer

# =============================================================================
# DEBUG OVERLAY
# Renders debug visuals on top of the game (physics shapes, tap markers, FPS)
# This runs INSIDE Godot, solving the coordinate sync issues with React Native
# =============================================================================

# Settings from React Native DevTools
var _show_input_debug: bool = false
var _show_physics_shapes: bool = false
var _show_fps: bool = false

# Reference to GameBridge for entity/physics access
var _game_bridge: Node = null

# Tap marker data
var _tap_markers: Array = []  # [{position: Vector2, time: float, entity_id: String}]
const TAP_MARKER_DURATION: float = 1.0  # seconds
const TAP_MARKER_RADIUS: float = 20.0

# Drag state
var _current_drag_start: Vector2 = Vector2.ZERO
var _current_drag_end: Vector2 = Vector2.ZERO
var _is_dragging: bool = false
var _drag_entity_id: String = ""

# FPS label
var _fps_label: Label = null

# Draw node (for custom drawing)
var _draw_node: Control = null

# Logging throttle
var _last_log_time: int = 0

func _init() -> void:
	layer = 100  # High z-index to be on top
	name = "DebugOverlay"

func setup(game_bridge: Node) -> void:
	print("[DebugOverlay] setup() called")
	_game_bridge = game_bridge
	
	# Create a Control node for custom drawing
	_draw_node = Control.new()
	_draw_node.name = "DebugDraw"
	_draw_node.set_anchors_preset(Control.PRESET_FULL_RECT)
	_draw_node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_draw_node.connect("draw", _on_draw)
	add_child(_draw_node)
	print("[DebugOverlay] Draw node created and connected")
	
	# Create FPS label
	_fps_label = Label.new()
	_fps_label.name = "FPSLabel"
	_fps_label.position = Vector2(10, 10)
	_fps_label.add_theme_color_override("font_color", Color.YELLOW)
	_fps_label.add_theme_font_size_override("font_size", 16)
	_fps_label.visible = false
	add_child(_fps_label)
	print("[DebugOverlay] FPS label created")

func set_settings(settings: Dictionary) -> void:
	print("[DebugOverlay] set_settings called with: ", settings)
	_show_input_debug = settings.get("showInputDebug", false)
	_show_physics_shapes = settings.get("showPhysicsShapes", false)
	_show_fps = settings.get("showFPS", false)
	print("[DebugOverlay] After parse: input=", _show_input_debug, " physics=", _show_physics_shapes, " fps=", _show_fps)
	
	# Update FPS label visibility
	if _fps_label:
		_fps_label.visible = _show_fps
	
	# NOTE: We intentionally do NOT use the legacy _debug_show_shapes mode
	# which hides sprites when showing shapes. Instead, we just draw our
	# overlay shapes on top of everything (this CanvasLayer has layer=100).
	
	# Trigger redraw
	if _draw_node:
		_draw_node.queue_redraw()

func _process(delta: float) -> void:
	# Update FPS
	if _show_fps and _fps_label:
		_fps_label.text = "FPS: %d" % Engine.get_frames_per_second()
	
	# Clean up old tap markers
	var current_time = Time.get_ticks_msec() / 1000.0
	_tap_markers = _tap_markers.filter(func(m): return current_time - m.time < TAP_MARKER_DURATION)
	
	# Request redraw if we have active debug modes
	if _show_physics_shapes or _show_input_debug or (_tap_markers.size() > 0) or _is_dragging:
		if _draw_node:
			_draw_node.queue_redraw()

func add_tap_marker(world_pos: Vector2, entity_id: String = "") -> void:
	print("[DebugOverlay] add_tap_marker called: pos=", world_pos, " entity=", entity_id, " _show_input_debug=", _show_input_debug)
	if not _show_input_debug:
		print("[DebugOverlay] add_tap_marker: skipping (input debug disabled)")
		return
	
	_tap_markers.append({
		"position": world_pos,
		"time": Time.get_ticks_msec() / 1000.0,
		"entity_id": entity_id
	})
	print("[DebugOverlay] add_tap_marker: added marker, total markers=", _tap_markers.size())
	
	if _draw_node:
		_draw_node.queue_redraw()

func start_drag(world_pos: Vector2, entity_id: String = "") -> void:
	print("[DebugOverlay] start_drag called: pos=", world_pos, " entity=", entity_id, " _show_input_debug=", _show_input_debug)
	if not _show_input_debug:
		return
	
	_is_dragging = true
	_current_drag_start = world_pos
	_current_drag_end = world_pos
	_drag_entity_id = entity_id
	
	if _draw_node:
		_draw_node.queue_redraw()

func update_drag(world_pos: Vector2) -> void:
	if not _show_input_debug or not _is_dragging:
		return
	
	_current_drag_end = world_pos
	
	if _draw_node:
		_draw_node.queue_redraw()

func end_drag(world_pos: Vector2) -> void:
	if not _show_input_debug:
		return
	
	_is_dragging = false
	_current_drag_end = world_pos
	_drag_entity_id = ""
	
	if _draw_node:
		_draw_node.queue_redraw()

func _on_draw() -> void:
	# Log current state (only once per second to avoid spam)
	var now = Time.get_ticks_msec()
	if now - _last_log_time > 1000:
		print("[DebugOverlay] _on_draw: physics=", _show_physics_shapes, " input=", _show_input_debug, " fps=", _show_fps)
		_last_log_time = now
	
	if not _game_bridge:
		return
	
	var viewport = get_viewport()
	if not viewport:
		return
	
	var canvas_transform = viewport.get_canvas_transform()
	
	# Draw physics shapes with entity labels if enabled
	if _show_physics_shapes:
		_draw_physics_shapes(canvas_transform)
	
	# Draw input debug (tap markers, drag lines) if enabled
	if _show_input_debug:
		_draw_input_debug(canvas_transform)

func _draw_physics_shapes(canvas_transform: Transform2D) -> void:
	if not _game_bridge or not _game_bridge.entities:
		return
	
	var outline_color = Color(0, 1, 1, 1.0)  # Solid cyan for outlines
	var label_bg_color = Color(0, 0.5, 0.5, 0.8)  # Dark cyan background for labels
	var label_color = Color.WHITE
	
	for entity_id in _game_bridge.entities:
		var node = _game_bridge.entities[entity_id]
		if not node or not is_instance_valid(node):
			continue
		
		var entity_screen_pos = canvas_transform * node.global_position
		var drew_shape = false
		
		# Find collision shapes
		for child in node.get_children():
			if child is CollisionShape2D:
				var shape = child.shape
				if not shape:
					continue
				
				drew_shape = true
				
				# Transform world position to screen position
				var world_pos = node.global_position + child.position.rotated(node.global_rotation)
				var screen_pos = canvas_transform * world_pos
				var scale_factor = canvas_transform.get_scale().x
				
				if shape is RectangleShape2D:
					var rect_shape = shape as RectangleShape2D
					var size = rect_shape.size * scale_factor
					var rect = Rect2(screen_pos - size / 2, size)
					_draw_node.draw_rect(rect, outline_color, false, 2.0)
				
				elif shape is CircleShape2D:
					var circle_shape = shape as CircleShape2D
					var radius = circle_shape.radius * scale_factor
					_draw_node.draw_arc(screen_pos, radius, 0, TAU, 32, outline_color, 2.0)
				
				elif shape is ConvexPolygonShape2D:
					var poly_shape = shape as ConvexPolygonShape2D
					var points = poly_shape.points
					if points.size() > 0:
						var transformed_points: PackedVector2Array = []
						var rotation = node.global_rotation + child.rotation
						for p in points:
							var rotated_p = p.rotated(rotation)
							var screen_p = canvas_transform * (node.global_position + rotated_p)
							transformed_points.append(screen_p)
						transformed_points.append(transformed_points[0])
						_draw_node.draw_polyline(transformed_points, outline_color, 2.0)
				
				elif shape is CapsuleShape2D:
					var capsule_shape = shape as CapsuleShape2D
					var radius = capsule_shape.radius * scale_factor
					var height = capsule_shape.height * scale_factor
					_draw_node.draw_arc(screen_pos + Vector2(0, -height/2 + radius), radius, 0, PI, 16, outline_color, 2.0)
					_draw_node.draw_arc(screen_pos + Vector2(0, height/2 - radius), radius, PI, TAU, 16, outline_color, 2.0)
					_draw_node.draw_line(screen_pos + Vector2(-radius, -height/2 + radius), screen_pos + Vector2(-radius, height/2 - radius), outline_color, 2.0)
					_draw_node.draw_line(screen_pos + Vector2(radius, -height/2 + radius), screen_pos + Vector2(radius, height/2 - radius), outline_color, 2.0)
		
		# Draw entity ID label (only if we drew at least one shape)
		if drew_shape:
			var label_text = entity_id
			var font = ThemeDB.fallback_font
			var font_size = 10
			var text_size = font.get_string_size(label_text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size)
			var label_pos = entity_screen_pos + Vector2(-text_size.x / 2, -20)
			var bg_rect = Rect2(label_pos.x - 2, label_pos.y - text_size.y, text_size.x + 4, text_size.y + 4)
			_draw_node.draw_rect(bg_rect, label_bg_color, true)
			_draw_node.draw_string(font, label_pos, label_text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, label_color)

func _draw_input_debug(canvas_transform: Transform2D) -> void:
	var current_time = Time.get_ticks_msec() / 1000.0
	
	# Draw tap markers
	for marker in _tap_markers:
		var age = current_time - marker.time
		var alpha = 1.0 - (age / TAP_MARKER_DURATION)
		var screen_pos = canvas_transform * marker.position
		var color = Color(1, 0.5, 0, alpha)  # Orange fading out
		
		# Draw expanding circle
		var radius = TAP_MARKER_RADIUS * (1.0 + age * 2.0)
		_draw_node.draw_arc(screen_pos, radius, 0, TAU, 32, color, 2.0)
		
		# Draw crosshair
		var cross_size = 10.0
		_draw_node.draw_line(screen_pos + Vector2(-cross_size, 0), screen_pos + Vector2(cross_size, 0), color, 2.0)
		_draw_node.draw_line(screen_pos + Vector2(0, -cross_size), screen_pos + Vector2(0, cross_size), color, 2.0)
		
		# Draw entity ID label if available
		if marker.entity_id != "":
			var label_pos = screen_pos + Vector2(15, -15)
			_draw_node.draw_string(ThemeDB.fallback_font, label_pos, marker.entity_id, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(1, 1, 1, alpha))
	
	# Draw drag line
	if _is_dragging:
		var start_screen = canvas_transform * _current_drag_start
		var end_screen = canvas_transform * _current_drag_end
		var drag_color = Color(0, 1, 0, 0.8)  # Green
		
		# Draw line
		_draw_node.draw_line(start_screen, end_screen, drag_color, 2.0)
		
		# Draw start point
		_draw_node.draw_circle(start_screen, 8.0, drag_color)
		
		# Draw end point (arrow head)
		_draw_node.draw_circle(end_screen, 6.0, drag_color)
		
		# Draw entity label at start
		if _drag_entity_id != "":
			var label_pos = start_screen + Vector2(15, -15)
			_draw_node.draw_string(ThemeDB.fallback_font, label_pos, _drag_entity_id, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color.WHITE)
