class_name BackgroundSystem
extends RefCounted

var bridge: Node
var _background_layer: CanvasLayer = null
var _background_rect: TextureRect = null
var _parallax_layers: Array = []
var _texture_cache: Dictionary = {}

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

func setup_background(bg_data: Dictionary) -> void:
	# Clean up existing background
	_cleanup_background()

	if bg_data.is_empty():
		return

	var bg_type = bg_data.get("type", "")

	if bg_type == "parallax":
		_setup_parallax_background(bg_data)
		return

	if bg_type != "static":
		return

	var image_url = bg_data.get("imageUrl", "")
	var color = bg_data.get("color", "")

	_background_layer = CanvasLayer.new()
	_background_layer.layer = -100
	_background_layer.name = "BackgroundLayer"
	bridge.add_child(_background_layer)

	_background_rect = TextureRect.new()
	_background_rect.name = "Background"
	_background_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_background_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	_background_rect.anchor_left = 0.0
	_background_rect.anchor_top = 0.0
	_background_rect.anchor_right = 1.0
	_background_rect.anchor_bottom = 1.0
	_background_layer.add_child(_background_rect)

	if image_url != "":
		_download_background_texture(image_url)
	elif color != "":
		_apply_background_color(color)

func _cleanup_background() -> void:
	if _background_layer:
		_background_layer.queue_free()
		_background_layer = null
		_background_rect = null

	for layer in _parallax_layers:
		if is_instance_valid(layer.get("layer")):
			layer.layer.queue_free()
	_parallax_layers.clear()

func _download_background_texture(url: String) -> void:
	_download_image_texture(url, func(texture: Texture2D):
		if is_instance_valid(_background_rect):
			_background_rect.texture = texture
			print("[BG] Applied texture ", texture.get_width(), "x", texture.get_height(), " to TextureRect with STRETCH_KEEP_ASPECT_COVERED")
	)

func _apply_background_texture(texture: Texture2D) -> void:
	if not is_instance_valid(_background_rect) or texture == null:
		return

	_background_rect.texture = texture
	print("[BG] Applied texture ", texture.get_width(), "x", texture.get_height(), " to TextureRect with STRETCH_KEEP_ASPECT_COVERED")

func _apply_background_color(color: String) -> void:
	if not is_instance_valid(_background_rect):
		return

	var viewport_size = bridge.get_viewport().get_visible_rect().size
	var img = Image.create(int(viewport_size.x), int(viewport_size.y), false, Image.FORMAT_RGBA8)
	img.fill(Color.from_string(color, Color.GRAY))
	_background_rect.texture = ImageTexture.create_from_image(img)

func _setup_parallax_background(bg_data: Dictionary) -> void:
	var layers_data = bg_data.get("layers", [])
	if layers_data.is_empty():
		return

	# Map depth to z-index (further back = lower z-index)
	var depth_to_z = {
		"sky": -400,
		"far": -300,
		"mid": -200,
		"near": -100
	}

	for layer_data in layers_data:
		var layer_id = layer_data.get("id", "")
		var image_url = layer_data.get("imageUrl", "")
		var depth = layer_data.get("depth", "mid")
		var parallax_factor = layer_data.get("parallaxFactor", 0.5)
		var visible = layer_data.get("visible", true)

		if not visible or image_url == "":
			continue

		var layer = CanvasLayer.new()
		layer.layer = depth_to_z.get(depth, -200)
		layer.name = "ParallaxLayer_" + layer_id
		bridge.add_child(layer)

		var rect = TextureRect.new()
		rect.name = layer_id
		rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		rect.anchor_left = 0.0
		rect.anchor_top = 0.0
		rect.anchor_right = 1.0
		rect.anchor_bottom = 1.0
		layer.add_child(rect)

		_parallax_layers.append({"layer": layer, "rect": rect, "factor": parallax_factor, "url": image_url})

		# Download texture for this layer
		_download_image_texture(image_url, func(texture: Texture2D):
			if is_instance_valid(rect):
				rect.texture = texture
				print("[BG] Applied parallax layer texture ", texture.get_width(), "x", texture.get_height())
		)

	print("[BG] Setup ", _parallax_layers.size(), " parallax layers")

func _download_image_texture(url: String, callback: Callable) -> void:
	if _texture_cache.has(url):
		var texture = _texture_cache[url]
		callback.call(texture)
		return

	var http = HTTPRequest.new()
	bridge.add_child(http)

	http.request_completed.connect(func(result: int, response_code: int, headers: PackedStringArray, body: PackedByteArray):
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or response_code != 200:
			push_error("[BackgroundSystem] Failed to download image: " + url)
			return

		var image = Image.new()
		var err = image.load_png_from_buffer(body)
		if err != OK:
			err = image.load_jpg_from_buffer(body)
		if err != OK:
			err = image.load_webp_from_buffer(body)
		if err != OK:
			push_error("[BackgroundSystem] Failed to parse image: " + url)
			return

		var texture = ImageTexture.create_from_image(image)
		_texture_cache[url] = texture
		callback.call(texture)
	)

	var err = http.request(url)
	if err != OK:
		push_error("[BackgroundSystem] Failed to start image download: " + url)
		http.queue_free()

func clear_background() -> void:
	_cleanup_background()
