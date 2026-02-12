class_name PixelBufferManager
extends RefCounted

var _bridge: Node = null
var _buffers: Dictionary = {}


func _init(bridge: Node) -> void:
	_bridge = bridge


func _js_create_pixel_buffer(args: Array) -> void:
	if args.size() < 4:
		return
	var world_w: float = float(args[4]) if args.size() >= 5 else 0.0
	var world_h: float = float(args[5]) if args.size() >= 6 else 0.0
	create_pixel_buffer(str(args[0]), int(args[1]), int(args[2]), str(args[3]), world_w, world_h)


func _js_draw_commands(args: Array) -> void:
	if args.size() < 2:
		return
	var commands = JSON.parse_string(str(args[1]))
	if commands == null or not (commands is Array):
		return
	draw_commands(str(args[0]), commands)


func _js_draw_commands_normalized(args: Array) -> void:
	if args.size() < 2:
		return
	var commands = JSON.parse_string(str(args[1]))
	if commands == null or not (commands is Array):
		return
	draw_commands_normalized(str(args[0]), commands)


func _js_clear(args: Array) -> void:
	if args.size() < 2:
		return
	clear_pixel_buffer(str(args[0]), str(args[1]))


func _js_destroy(args: Array) -> void:
	if args.size() < 1:
		return
	destroy_pixel_buffer(str(args[0]))


# Aliases matching the BridgeMethodMap contract names
func _js_pixel_buffer_draw(args: Array) -> void: _js_draw_commands(args)
func _js_pixel_buffer_clear(args: Array) -> void: _js_clear(args)
func _js_destroy_pixel_buffer(args: Array) -> void: _js_destroy(args)


func create_pixel_buffer(entity_id: String, width: int, height: int, clear_color: String, world_w: float = 0.0, world_h: float = 0.0) -> void:
	if not _has_entity(entity_id):
		return

	var safe_width = max(1, width)
	var safe_height = max(1, height)
	var node = _get_entity(entity_id)
	if node == null or not (node is Node2D):
		return

	if _buffers.has(entity_id):
		destroy_pixel_buffer(entity_id)

	var image = Image.create(safe_width, safe_height, false, Image.FORMAT_RGBA8)
	image.fill(Color.from_string(clear_color, Color.WHITE))
	var texture = ImageTexture.create_from_image(image)

	var found_sprite = EntityUtils.find_sprite_in_entity(node)
	var sprite: Sprite2D = null
	if found_sprite is Sprite2D:
		sprite = found_sprite
	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	sprite.texture = texture
	_hide_shape_children(node)

	var world_width: float = world_w if world_w > 0.0 else 1.0
	var world_height: float = world_h if world_h > 0.0 else 1.0

	var ppm = _get_pixels_per_meter()
	var scale_x = (world_width * ppm) / float(safe_width)
	var scale_y = (world_height * ppm) / float(safe_height)
	sprite.scale = Vector2(scale_x, scale_y)

	_buffers[entity_id] = {
		"image": image,
		"texture": texture,
		"sprite": sprite,
		"node": node,
		"width": safe_width,
		"height": safe_height,
		"world_width": world_width,
		"world_height": world_height,
		"undo_stack": [],
		"redo_stack": [],
		"max_undo": 50,
	}


func draw_commands(entity_id: String, commands: Array) -> void:
	if not _buffers.has(entity_id):
		return

	var buf: Dictionary = _buffers[entity_id]
	var image: Image = buf["image"]
	if image == null:
		return

	for cmd in commands:
		if not (cmd is Dictionary):
			continue
		var cmd_type = str(cmd.get("type", ""))
		if cmd_type == "pixel":
			_draw_pixel(image, cmd)
		elif cmd_type == "line":
			_draw_line(image, cmd)
		elif cmd_type == "fill":
			_draw_fill(image, cmd)

	var texture: ImageTexture = buf["texture"]
	if texture:
		texture.update(image)


func draw_commands_normalized(entity_id: String, commands: Array) -> void:
	if not _buffers.has(entity_id):
		return

	var buf: Dictionary = _buffers[entity_id]
	var image: Image = buf["image"]
	if image == null:
		return

	var img_width := image.get_width()
	var img_height := image.get_height()

	for cmd in commands:
		if not (cmd is Dictionary):
			continue
		var cmd_type = str(cmd.get("type", ""))
		
		# Convert normalized coordinates to pixel coordinates
		var pixel_cmd: Dictionary = cmd.duplicate()
		
		if cmd_type == "pixel":
			if "x" in cmd:
				pixel_cmd["x"] = int(float(cmd["x"]) * float(img_width))
			if "y" in cmd:
				pixel_cmd["y"] = int(float(cmd["y"]) * float(img_height))
			_draw_pixel(image, pixel_cmd)
			
		elif cmd_type == "line":
			if "x1" in cmd:
				pixel_cmd["x1"] = int(float(cmd["x1"]) * float(img_width))
			if "y1" in cmd:
				pixel_cmd["y1"] = int(float(cmd["y1"]) * float(img_height))
			if "x2" in cmd:
				pixel_cmd["x2"] = int(float(cmd["x2"]) * float(img_width))
			if "y2" in cmd:
				pixel_cmd["y2"] = int(float(cmd["y2"]) * float(img_height))
			# Width uses image height for normalization
			if "width" in cmd:
				pixel_cmd["width"] = int(float(cmd["width"]) * float(img_height))
			_draw_line(image, pixel_cmd)
			
		elif cmd_type == "fill":
			_draw_fill(image, pixel_cmd)

	var texture: ImageTexture = buf["texture"]
	if texture:
		texture.update(image)


func clear_pixel_buffer(entity_id: String, color: String) -> void:
	if not _buffers.has(entity_id):
		return

	var buf: Dictionary = _buffers[entity_id]
	var image: Image = buf["image"]
	var texture: ImageTexture = buf["texture"]
	if image == null or texture == null:
		return

	image.fill(Color.from_string(color, Color.WHITE))
	texture.update(image)


func destroy_pixel_buffer(entity_id: String) -> void:
	if not _buffers.has(entity_id):
		return

	var buf: Dictionary = _buffers[entity_id]
	var sprite: Sprite2D = buf["sprite"]
	if sprite and is_instance_valid(sprite):
		if sprite.get_parent() != null:
			sprite.get_parent().remove_child(sprite)
		sprite.queue_free()

	_buffers.erase(entity_id)


func _draw_pixel(image: Image, cmd: Dictionary) -> void:
	var x = int(cmd.get("x", 0))
	var y = int(cmd.get("y", 0))
	var color = Color.from_string(str(cmd.get("color", "#000000")), Color.BLACK)
	_set_pixel_safe(image, x, y, color)


func _draw_line(image: Image, cmd: Dictionary) -> void:
	var x1 = int(cmd.get("x1", 0))
	var y1 = int(cmd.get("y1", 0))
	var x2 = int(cmd.get("x2", 0))
	var y2 = int(cmd.get("y2", 0))
	var color = Color.from_string(str(cmd.get("color", "#000000")), Color.BLACK)
	var line_width = max(1, int(cmd.get("width", 1)))

	var dx = abs(x2 - x1)
	var dy = abs(y2 - y1)
	var sx = 1 if x1 < x2 else -1
	var sy = 1 if y1 < y2 else -1
	var err = dx - dy

	while true:
		if line_width == 1:
			_set_pixel_safe(image, x1, y1, color)
		else:
			_stamp_filled_circle(image, x1, y1, int(floor(float(line_width) / 2.0)), color)

		if x1 == x2 and y1 == y2:
			break

		var e2 = err * 2
		if e2 > -dy:
			err -= dy
			x1 += sx
		if e2 < dx:
			err += dx
			y1 += sy


func _draw_fill(image: Image, cmd: Dictionary) -> void:
	image.fill(Color.from_string(str(cmd.get("color", "#FFFFFF")), Color.WHITE))


func _set_pixel_safe(image: Image, x: int, y: int, color: Color) -> void:
	var width = image.get_width()
	var height = image.get_height()
	if x >= 0 and x < width and y >= 0 and y < height:
		image.set_pixel(x, y, color)


func _stamp_filled_circle(image: Image, center_x: int, center_y: int, radius: int, color: Color) -> void:
	for dy in range(-radius, radius + 1):
		for dx in range(-radius, radius + 1):
			if dx * dx + dy * dy <= radius * radius:
				_set_pixel_safe(image, center_x + dx, center_y + dy, color)


func _resolve_world_size(node: Node2D, sprite: Sprite2D) -> Dictionary:
	var ppm = _get_pixels_per_meter()
	var world_width = 0.0
	var world_height = 0.0

	if sprite and sprite.texture:
		world_width = absf(sprite.scale.x) * float(sprite.texture.get_width()) / ppm
		world_height = absf(sprite.scale.y) * float(sprite.texture.get_height()) / ppm

	for child in node.get_children():
		if child is Polygon2D:
			var rect = child.get_rect()
			var poly_w = absf(child.scale.x) * rect.size.x / ppm
			var poly_h = absf(child.scale.y) * rect.size.y / ppm
			world_width = max(world_width, poly_w)
			world_height = max(world_height, poly_h)
		elif child is CollisionShape2D:
			var shape = child.shape
			if shape is RectangleShape2D:
				world_width = max(world_width, shape.size.x / ppm)
				world_height = max(world_height, shape.size.y / ppm)
			elif shape is CircleShape2D:
				var diameter = shape.radius * 2.0 / ppm
				world_width = max(world_width, diameter)
				world_height = max(world_height, diameter)

	if world_width <= 0.0:
		world_width = 1.0
	if world_height <= 0.0:
		world_height = 1.0

	return {"width": world_width, "height": world_height}


func _hide_shape_children(node: Node2D) -> void:
	for child in node.get_children():
		if child is Polygon2D:
			child.visible = false


func _get_pixels_per_meter() -> float:
	if _bridge:
		if "pixels_per_meter" in _bridge:
			return float(_bridge.pixels_per_meter)
		if "_visual_renderer" in _bridge and _bridge._visual_renderer and "_pixels_per_meter" in _bridge._visual_renderer:
			return float(_bridge._visual_renderer._pixels_per_meter)
	return 50.0


func _has_entity(entity_id: String) -> bool:
	if _bridge and "entities" in _bridge:
		return _bridge.entities.has(entity_id)
	return false


func _get_entity(entity_id: String) -> Node:
	if _bridge and "entities" in _bridge:
		return _bridge.entities[entity_id]
	return null
