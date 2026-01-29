class_name VisualRenderer
extends RefCounted

# ============================================================================
# VISUAL RENDERER MODULE
# Handles all visual rendering logic extracted from GameBridge
# ============================================================================

var _pixels_per_meter: float = 50.0
var _debug_show_shapes: bool = false
var _texture_cache: Dictionary = {}
var _font_cache: Dictionary = {}

# Callback for image texture downloads (injected from GameBridge)
var _download_image_texture_cb: Callable = func(_url: String, _callback: Callable): pass

func _init(pixels_per_meter: float, debug_show_shapes: bool, texture_cache: Dictionary, font_cache: Dictionary, download_image_texture_cb: Callable):
	_pixels_per_meter = pixels_per_meter
	_debug_show_shapes = debug_show_shapes
	_texture_cache = texture_cache
	_font_cache = font_cache
	_download_image_texture_cb = download_image_texture_cb


func update_pixels_per_meter(new_value: float) -> void:
	_pixels_per_meter = new_value

# ============================================================================
# VISUAL DISPATCHER
# ============================================================================

func add_visual(node: Node2D, visual_data: Dictionary) -> void:
	# Handles visual component for entities (including image-only entities without physics)
	var visual_type = visual_data.get("type", "rect")
	var color = Color.from_string(visual_data.get("color", "#FF0000"), Color.RED)
	var opacity = visual_data.get("opacity", 1.0)
	var z_index_val = visual_data.get("zIndex", 0)
	
	match visual_type:
		"rect":
			var polygon = Polygon2D.new()
			var w = visual_data.get("width", 1.0) * _pixels_per_meter
			var h = visual_data.get("height", 1.0) * _pixels_per_meter
			var hw = w / 2.0
			var hh = h / 2.0
			polygon.polygon = PackedVector2Array([
				Vector2(-hw, -hh),
				Vector2(hw, -hh),
				Vector2(hw, hh),
				Vector2(-hw, hh)
			])
			color.a = opacity
			polygon.z_index = z_index_val
			var tex_size = max(int(w), int(h), 64)
			var padding = 16
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE
			polygon.uv = PackedVector2Array([
				Vector2(padding, padding),
				Vector2(tex_size + padding, padding),
				Vector2(tex_size + padding, tex_size + padding),
				Vector2(padding, tex_size + padding)
			])
			node.add_child(polygon)
		"circle":
			var polygon = Polygon2D.new()
			var radius = visual_data.get("radius", 0.5) * _pixels_per_meter
			var points: PackedVector2Array = []
			var uvs: PackedVector2Array = []
			var tex_size = max(int(radius * 2), 64)
			var padding = 16
			for i in range(32):
				var angle = i * TAU / 32
				points.append(Vector2(cos(angle), sin(angle)) * radius)
				uvs.append(Vector2(
					(cos(angle) + 1.0) * 0.5 * tex_size + padding,
					(sin(angle) + 1.0) * 0.5 * tex_size + padding
				))
			polygon.polygon = points
			color.a = opacity
			polygon.z_index = z_index_val
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE
			polygon.uv = uvs
			node.add_child(polygon)
		"polygon":
			var polygon = Polygon2D.new()
			var vertices = visual_data.get("vertices", [])
			var points: PackedVector2Array = []
			var min_pt = Vector2(INF, INF)
			var max_pt = Vector2(-INF, -INF)
			for v in vertices:
				var pt = Vector2(v.x, v.y) * _pixels_per_meter
				points.append(pt)
				min_pt.x = min(min_pt.x, pt.x)
				min_pt.y = min(min_pt.y, pt.y)
				max_pt.x = max(max_pt.x, pt.x)
				max_pt.y = max(max_pt.y, pt.y)
			polygon.polygon = points
			color.a = opacity
			polygon.z_index = z_index_val
			var poly_size = max_pt - min_pt
			var tex_size = max(int(poly_size.x), int(poly_size.y), 64)
			var padding = 16
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE
			var uvs: PackedVector2Array = []
			for pt in points:
				uvs.append(Vector2(
					(pt.x - min_pt.x) / poly_size.x * tex_size + padding if poly_size.x > 0 else padding,
					(pt.y - min_pt.y) / poly_size.y * tex_size + padding if poly_size.y > 0 else padding
				))
			polygon.uv = uvs
			node.add_child(polygon)
		"image":
			_add_image_sprite(node, visual_data, opacity, z_index_val)
		"text":
			_add_text_sprite(node, visual_data, opacity, z_index_val)

# ============================================================================
# SPRITE RENDERING
# ============================================================================

func add_sprite(node: Node2D, sprite_data: Dictionary, physics_data: Dictionary, zone_data = null) -> void:
	var sprite_type = sprite_data.get("type", "rect")
	var color = Color.from_string(sprite_data.get("color", "#FF0000"), Color.RED)
	var opacity = sprite_data.get("opacity", 1.0)
	var z_index_val = sprite_data.get("zIndex", 0)

	# Helper function to get dimension from sprite_data, physics_data, zone_data, or default
	var _get_dimension = func(key: String, default_val: float):
		if sprite_data.has(key):
			return sprite_data.get(key)
		elif physics_data and physics_data.has(key):
			return physics_data.get(key)
		elif zone_data and zone_data.has("shape") and zone_data.shape.has(key):
			return zone_data.shape.get(key)
		else:
			return default_val

	match sprite_type:
		"rect":
			var polygon = Polygon2D.new()
			var w = _get_dimension.call("width", 1.0) * _pixels_per_meter
			var h = _get_dimension.call("height", 1.0) * _pixels_per_meter
			var hw = w / 2.0
			var hh = h / 2.0
			polygon.polygon = PackedVector2Array([
				Vector2(-hw, -hh),
				Vector2(hw, -hh),
				Vector2(hw, hh),
				Vector2(-hw, hh)
			])
			color.a = opacity
			polygon.z_index = z_index_val
			# Add texture for shader compatibility (WebGL needs valid TEXTURE_PIXEL_SIZE)
			# Bake the color INTO the texture with padding for edge-detection shaders
			var tex_size = max(int(w), int(h), 64)
			var padding = 16  # Transparent padding for outline/glow shaders
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE  # Don't multiply - color is in texture
			# UV maps to the padded texture (shape is offset by padding)
			polygon.uv = PackedVector2Array([
				Vector2(padding, padding),
				Vector2(tex_size + padding, padding),
				Vector2(tex_size + padding, tex_size + padding),
				Vector2(padding, tex_size + padding)
			])
			node.add_child(polygon)
		"circle":
			var polygon = Polygon2D.new()
			var radius = _get_dimension.call("radius", 0.5) * _pixels_per_meter
			var points: PackedVector2Array = []
			var uvs: PackedVector2Array = []
			var tex_size = max(int(radius * 2), 64)
			var padding = 16  # Transparent padding for edge-detection shaders
			for i in range(32):
				var angle = i * TAU / 32
				points.append(Vector2(cos(angle), sin(angle)) * radius)
				# Map circle points to UV space, offset by padding
				uvs.append(Vector2(
					(cos(angle) + 1.0) * 0.5 * tex_size + padding,
					(sin(angle) + 1.0) * 0.5 * tex_size + padding
				))
			polygon.polygon = points
			color.a = opacity
			polygon.z_index = z_index_val
			# Add texture for shader compatibility
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE  # Don't multiply - color is in texture
			polygon.uv = uvs
			node.add_child(polygon)
		"polygon":
			var polygon = Polygon2D.new()
			var vertices = sprite_data.get("vertices", [])
			var points: PackedVector2Array = []
			var min_pt = Vector2(INF, INF)
			var max_pt = Vector2(-INF, -INF)
			for v in vertices:
				var pt = Vector2(v.x, v.y) * _pixels_per_meter
				points.append(pt)
				min_pt.x = min(min_pt.x, pt.x)
				min_pt.y = min(min_pt.y, pt.y)
				max_pt.x = max(max_pt.x, pt.x)
				max_pt.y = max(max_pt.y, pt.y)
			polygon.polygon = points
			color.a = opacity
			polygon.z_index = z_index_val
			# Add texture for shader compatibility
			var poly_size = max_pt - min_pt
			var tex_size = max(int(poly_size.x), int(poly_size.y), 64)
			var padding = 16  # Transparent padding for edge-detection shaders
			polygon.texture = _create_polygon_texture(tex_size, tex_size, color, padding)
			polygon.color = Color.WHITE  # Don't multiply - color is in texture
			var uvs: PackedVector2Array = []
			for pt in points:
				uvs.append(Vector2(
					(pt.x - min_pt.x) / poly_size.x * tex_size + padding if poly_size.x > 0 else padding,
					(pt.y - min_pt.y) / poly_size.y * tex_size + padding if poly_size.y > 0 else padding
				))
			polygon.uv = uvs
			node.add_child(polygon)
		"image":
			_add_image_sprite(node, sprite_data, opacity, z_index_val)
		"text":
			_add_text_sprite(node, sprite_data, opacity, z_index_val)

func _add_image_sprite(node: Node2D, sprite_data: Dictionary, opacity: float, z_index_val: int) -> void:
	var sprite = Sprite2D.new()
	var url = sprite_data.get("imageUrl", sprite_data.get("url", ""))
	var img_width = sprite_data.get("imageWidth", sprite_data.get("width", 1.0))
	var img_height = sprite_data.get("imageHeight", sprite_data.get("height", 1.0))
	var asset_scale = sprite_data.get("scale", 1.0)
	var offset_x = sprite_data.get("offsetX", 0.0)
	var offset_y = sprite_data.get("offsetY", 0.0)

	if url == "":
		sprite.modulate.a = opacity
		sprite.z_index = z_index_val
		node.add_child(sprite)
		return

	if url.begins_with("res://"):
		var texture = load(url)
		if texture:
			sprite.texture = texture
			var local_sprite_data = {
				"width": img_width,
				"height": img_height,
				"scale": asset_scale,
				"offsetX": offset_x,
				"offsetY": offset_y
			}
			_apply_sprite_scale(sprite, local_sprite_data, texture)
	else:
		var normalized_data = {
			"width": img_width,
			"height": img_height,
			"scale": asset_scale,
			"offsetX": offset_x,
			"offsetY": offset_y
		}
		_queue_texture_download(sprite, url, normalized_data)

	sprite.modulate.a = opacity
	sprite.z_index = z_index_val
	node.add_child(sprite)

func _add_text_sprite(node: Node2D, sprite_data: Dictionary, opacity: float, z_index_val: int) -> void:
	var label = Label.new()
	label.text = sprite_data.get("text", "")

	var font_size = int(sprite_data.get("fontSize", 16) * _pixels_per_meter / 50.0)
	label.add_theme_font_size_override("font_size", font_size)

	var font_url = sprite_data.get("fontUrl", "")
	if font_url != "":
		_queue_font_download(label, font_url)

	var text_color = Color.from_string(sprite_data.get("color", "#FFFFFF"), Color.WHITE)
	label.modulate = text_color
	label.modulate.a = opacity
	label.z_index = z_index_val
	node.add_child(label)

# ============================================================================
# TEXTURE AND FONT LOADING
# ============================================================================

func _queue_texture_download(sprite: Sprite2D, url: String, sprite_data: Dictionary) -> void:
	_download_image_texture_cb.call(url, func(texture: Texture2D):
		if is_instance_valid(sprite):
			sprite.texture = texture
			_apply_sprite_scale(sprite, sprite_data, texture)
	)

func _queue_font_download(label: Label, url: String) -> void:
	if _font_cache.has(url):
		label.add_theme_font_override("font", _font_cache[url])
		return

	var http = HTTPRequest.new()

	http.request_completed.connect(func(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
			push_error("[GameBridge] Failed to download font: " + url + " (code: " + str(response_code) + ")")
			return

		var font = FontFile.new()
		font.data = body

		_font_cache[url] = font

		if is_instance_valid(label):
			label.add_theme_font_override("font", font)
	)

	var err = http.request(url)
	if err != OK:
		push_error("[GameBridge] Failed to start font download: " + url)
		http.queue_free()

# ============================================================================
# SCALE AND TEXTURE MANAGEMENT
# ============================================================================

func _apply_sprite_scale(sprite: Sprite2D, sprite_data: Dictionary, texture: Texture2D) -> void:
	if texture == null:
		return

	# Get asset placement values (scale multiplier, offsets)
	var asset_scale = sprite_data.get("scale", 1.0)
	var offset_x = sprite_data.get("offsetX", 0.0) * _pixels_per_meter
	var offset_y = sprite_data.get("offsetY", 0.0) * _pixels_per_meter

	var target_w = sprite_data.get("width", 1.0) * _pixels_per_meter * asset_scale
	var target_h = sprite_data.get("height", 1.0) * _pixels_per_meter * asset_scale

	# Check if this is a generated asset (square texture with content that preserves aspect ratio)
	# Generated assets have content that fills 90% of the larger dimension, centered in canvas
	var tex_w = texture.get_width()
	var tex_h = texture.get_height()
	var is_square_texture = abs(tex_w - tex_h) < 2  # Allow 1px tolerance

	if is_square_texture and tex_w > 0:
		# For generated square textures (e.g., 512x512), use uniform scaling
		# The actual content fills 90% of canvas on the larger dimension
		var canvas_size = float(tex_w)
		var fill_ratio = 0.9
		var physics_w = sprite_data.get("width", 1.0)
		var physics_h = sprite_data.get("height", 1.0)
		var aspect_ratio = physics_w / physics_h if physics_h > 0 else 1.0

		# Calculate silhouette dimensions within the canvas (matches generation logic)
		var silhouette_w: float
		var silhouette_h: float
		if aspect_ratio >= 1.0:
			silhouette_w = canvas_size * fill_ratio
			silhouette_h = silhouette_w / aspect_ratio
		else:
			silhouette_h = canvas_size * fill_ratio
			silhouette_w = silhouette_h * aspect_ratio

		# Uniform scale: map silhouette pixels to target world pixels
		var uniform_scale = target_w / silhouette_w if silhouette_w > 0 else 1.0
		sprite.scale = Vector2(uniform_scale, uniform_scale)
	else:
		# Non-square textures: use uniform scaling to preserve aspect ratio (contain behavior)
		var scale_x = target_w / tex_w if tex_w > 0 else 1.0
		var scale_y = target_h / tex_h if tex_h > 0 else 1.0
		var uniform_scale = min(scale_x, scale_y)
		sprite.scale = Vector2(uniform_scale, uniform_scale)

	# Apply offset to position the sprite relative to physics body center
	sprite.position = Vector2(offset_x, offset_y)

func _create_polygon_texture(width: int, height: int, color: Color, padding: int = 0) -> ImageTexture:
	# Create texture with optional transparent padding for shader edge detection
	var tex_w = width + padding * 2
	var tex_h = height + padding * 2
	var image = Image.create(tex_w, tex_h, false, Image.FORMAT_RGBA8)
	image.fill(Color(0, 0, 0, 0))  # Start transparent
	# Fill the center region with the actual color
	for y in range(padding, tex_h - padding):
		for x in range(padding, tex_w - padding):
			image.set_pixel(x, y, color)
	return ImageTexture.create_from_image(image)

# ============================================================================
# DEBUG VISIBILITY
# ============================================================================

func hide_shape_children(node: Node2D) -> void:
	"""Hide Polygon2D shape children when a texture sprite is applied.
	This prevents double-rendering of shapes and textures."""
	for child in node.get_children():
		if child is Polygon2D:
			child.visible = false

func apply_debug_visibility(node: Node2D) -> void:
	"""Apply current debug mode visibility to a node's children.
	When debug mode is ON: show Polygon2D shapes, hide Sprite2D textures.
	When debug mode is OFF: hide Polygon2D shapes, show Sprite2D textures."""
	for child in node.get_children():
		if child is Polygon2D:
			child.visible = _debug_show_shapes
		elif child is Sprite2D:
			child.visible = not _debug_show_shapes

# ============================================================================
# SPRITE LOOKUP
# ============================================================================

func find_sprite_in_entity(node: Node) -> CanvasItem:
	if node is Sprite2D or node is AnimatedSprite2D:
		return node
	for child in node.get_children():
		if child is Sprite2D or child is AnimatedSprite2D:
			return child
		var found = find_sprite_in_entity(child)
		if found:
			return found
	return null
