class_name VisualRenderer
extends RefCounted

# ============================================================================
# VISUAL RENDERER MODULE
# Handles all visual rendering logic extracted from GameBridge
# ============================================================================

var _bridge: Node = null
var _pixels_per_meter: float = 50.0
var _debug_show_shapes: bool = false
var _texture_loader: TextureLoader = null

# Preload tracking
var _preload_pending_count: int = 0
var _preload_completed_count: int = 0
var _preload_failed_count: int = 0
var _preload_progress_callback: Callable = Callable()
var _js_preload_progress_callback: JavaScriptObject = null

func _init(bridge: Node) -> void:
	_bridge = bridge
	_texture_loader = TextureLoader.new(bridge)


# ============================================================================
# JS HANDLERS (called from JavaScript bridge)
# ============================================================================

func _js_set_entity_image(args: Array) -> void:
	if args.size() < 4:
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] setEntityImage requires 4 args: entity_id, url, width, height")
		return
	set_entity_image(str(args[0]), str(args[1]), float(args[2]), float(args[3]))


func _js_set_entity_atlas_region(args: Array) -> void:
	if args.size() < 8:
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] setEntityAtlasRegion requires 8 args: entity_id, atlas_url, x, y, w, h, width, height")
		return
	var entity_id = str(args[0])
	var atlas_url = str(args[1])
	var x = float(args[2])
	var y = float(args[3])
	var w = float(args[4])
	var h = float(args[5])
	var width = float(args[6])
	var height = float(args[7])
	set_entity_atlas_region(entity_id, atlas_url, x, y, w, h, width, height)


func _js_set_opacity(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	var opacity = float(args[1])
	set_opacity(entity_id, opacity)


func _js_set_visible(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	var visible = bool(args[1])
	set_visible(entity_id, visible)


func _js_set_debug_show_shapes(args: Array) -> void:
	if args.size() < 1:
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] setDebugShowShapes requires 1 arg: show_shapes (boolean)")
		return
	var enabled = bool(args[0])
	set_debug_show_shapes(enabled)


func _js_set_debug_settings(args: Array) -> void:
	if args.size() < 1:
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] setDebugSettings requires 1 arg: settings JSON string")
		return
	var json_str = str(args[0])
	set_debug_settings(json_str)


func _js_clear_texture_cache(args: Array) -> void:
	if args.size() > 0 and str(args[0]) != "":
		var url = str(args[0])
		clear_texture_cache(url)
	else:
		clear_texture_cache("")


func _js_preload_textures(args: Array) -> void:
	if args.size() < 1:
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] preloadTextures requires at least 1 arg: urls (JSON string)")
		return

	var urls_json = str(args[0])
	var urls = JSON.parse_string(urls_json)
	if urls == null or not (urls is Array):
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] preloadTextures: failed to parse URLs from JSON")
		return

	# Store JavaScript callback if provided
	_js_preload_progress_callback = null
	if args.size() > 1 and args[1] != null:
		_js_preload_progress_callback = args[1]

	preload_textures(urls, Callable())


# ============================================================================
# PUBLIC API
# ============================================================================

func set_entity_image(entity_id: String, url: String, width: float, height: float) -> void:
	if not _has_entity(entity_id):
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] set_entity_image: entity not found: " + entity_id)
		return

	var node = _get_entity(entity_id)
	var sprite: Sprite2D = EntityUtils.find_sprite_in_entity(node)

	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	var sprite_data = {"width": width, "height": height}

	if _texture_loader.is_cached(url):
		var texture = _texture_loader.get_cached(url)
		sprite.texture = texture
		_apply_sprite_scale(sprite, sprite_data, texture)
		_hide_shape_children(node)
		return

	_download_texture(sprite, url, sprite_data)


func set_entity_atlas_region(
	entity_id: String, atlas_url: String, x: float, y: float, w: float, h: float, width: float, height: float
) -> void:
	if not _has_entity(entity_id):
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] set_entity_atlas_region: entity not found: " + entity_id)
		return

	var node = _get_entity(entity_id)
	var sprite: Sprite2D = EntityUtils.find_sprite_in_entity(node)

	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	var sprite_data = {"width": width, "height": height}
	var region_dict = {"x": x, "y": y, "w": w, "h": h}

	if _texture_loader.is_cached(atlas_url):
		_apply_atlas_region(sprite, _texture_loader.get_cached(atlas_url), region_dict, sprite_data)
		_hide_shape_children(node)
	else:
		_download_atlas_texture(sprite, atlas_url, region_dict, sprite_data)


func set_opacity(entity_id: String, opacity: float) -> void:
	if not _has_entity(entity_id):
		return

	var node = _get_entity(entity_id)
	var sprite = EntityUtils.find_sprite_in_entity(node)
	if sprite:
		sprite.modulate.a = opacity


func set_visible(entity_id: String, visible: bool) -> void:
	if not _has_entity(entity_id):
		return

	var node = _get_entity(entity_id)
	if node:
		node.visible = visible


func set_debug_show_shapes(enabled: bool) -> void:
	_debug_show_shapes = enabled

	# Apply debug visibility to all existing entities
	if _bridge and "entities" in _bridge:
		var entities = _bridge.entities
		for entity_id in entities:
			var node = entities[entity_id]
			if node:
				_apply_debug_visibility(node)


func set_debug_settings(json_str: String) -> void:
	var json = JSON.new()
	var parse_result = json.parse(json_str)
	if parse_result != OK:
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] setDebugSettings: Invalid JSON: " + json_str)
		return

	var settings = json.data
	if not settings is Dictionary:
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] setDebugSettings: Expected object, got: " + str(typeof(settings)))
		return

	# Forward to devtools overlay if available
	if _bridge and "_devtools_overlay" in _bridge and _bridge._devtools_overlay:
		_bridge._devtools_overlay.set_settings(settings)


func clear_texture_cache(url: String = "") -> void:
	_texture_loader.clear_cache(url)


func preload_textures(urls: Array, progress_callback: Callable = Callable()) -> void:
	if urls.size() == 0:
		if progress_callback.is_valid():
			progress_callback.call(100, 0, 0)
		return

	print("[VisualRenderer] 🔄 Starting preload for ", urls.size(), " textures")
	_preload_progress_callback = progress_callback
	_preload_pending_count = urls.size()
	_preload_completed_count = 0
	_preload_failed_count = 0

	for url_variant in urls:
		var url = str(url_variant)
		if url == "":
			_on_preload_complete(url, false)
			continue

		if _texture_loader.is_cached(url):
			print("[VisualRenderer] ✅ Already cached: ", TextureLoader._short_url(url))
			_on_preload_complete(url, true)
			continue

		_download_texture_for_preload(url)


func update_pixels_per_meter(new_value: float) -> void:
	_pixels_per_meter = new_value


func set_entity_image_base64(
	entity_id: String, base64_data: String, width: float, height: float, sprite_data: Dictionary = {}
) -> void:
	if not _has_entity(entity_id):
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] set_entity_image_base64: entity not found: " + entity_id)
		return

	var node = _get_entity(entity_id)
	var sprite: Sprite2D = EntityUtils.find_sprite_in_entity(node)

	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	var raw_data = Marshalls.base64_to_raw(base64_data)
	if raw_data.is_empty():
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] set_entity_image_base64: failed to decode base64")
		return

	var texture = ImageLoader.load_texture_from_buffer(raw_data)
	if texture == null:
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] set_entity_image_base64: failed to parse image data")
		return

	if is_instance_valid(sprite):
		sprite.texture = texture
		var final_sprite_data = sprite_data if not sprite_data.is_empty() else {"width": width, "height": height}
		_apply_sprite_scale(sprite, final_sprite_data, texture)
		_hide_shape_children(node)


func set_entity_image_from_file(
	entity_id: String, file_path: String, width: float, height: float, sprite_data: Dictionary = {}
) -> void:
	if not _has_entity(entity_id):
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] set_entity_image_from_file: entity not found: " + entity_id)
		return

	var node = _get_entity(entity_id)
	var sprite: Sprite2D = EntityUtils.find_sprite_in_entity(node)

	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	var image = Image.new()
	var err = image.load(file_path)
	if err != OK:
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] set_entity_image_from_file: failed to load image from " + file_path + " error=" + str(err))
		return

	var texture = ImageTexture.create_from_image(image)

	if is_instance_valid(sprite):
		sprite.texture = texture
		var final_sprite_data = sprite_data if not sprite_data.is_empty() else {"width": width, "height": height}
		_apply_sprite_scale(sprite, final_sprite_data, texture)
		_hide_shape_children(node)


func set_entity_atlas_region_from_file(
	entity_id: String, file_path: String, x: float, y: float, w: float, h: float, width: float, height: float
) -> void:
	if not _has_entity(entity_id):
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] set_entity_atlas_region_from_file: entity not found: " + entity_id)
		return

	var node = _get_entity(entity_id)
	var sprite: Sprite2D = EntityUtils.find_sprite_in_entity(node)

	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)

	var image = Image.new()
	var err = image.load(file_path)
	if err != OK:
		if _bridge and "_push_error" in _bridge:
			_bridge._push_error("[VisualRenderer] set_entity_atlas_region_from_file: failed to load image from " + file_path + " error=" + str(err))
		return

	var texture = ImageTexture.create_from_image(image)
	var region_dict = {"x": x, "y": y, "w": w, "h": h}
	var sprite_data = {"width": width, "height": height}
	_apply_atlas_region(sprite, texture, region_dict, sprite_data)
	_hide_shape_children(node)


# ============================================================================
# VISUAL DISPATCHER
# ============================================================================

func _apply_blend_mode(canvas_item: CanvasItem, blend_mode_str: String) -> void:
	if blend_mode_str == "" or blend_mode_str == "mix":
		return
	var mat = CanvasItemMaterial.new()
	match blend_mode_str:
		"add":
			mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		"sub":
			mat.blend_mode = CanvasItemMaterial.BLEND_MODE_SUB
		"mul":
			mat.blend_mode = CanvasItemMaterial.BLEND_MODE_MUL
		_:
			return
	canvas_item.material = mat

func add_visual(node: Node2D, visual_data: Dictionary) -> void:
	# Skip if node already has visual children (prevents duplicate visuals)
	for child in node.get_children():
		if child is Polygon2D or child is Sprite2D or child is Label:
			return

	var visual_type = visual_data.get("type", "rect")
	var color = Color.from_string(visual_data.get("color", "#FF0000"), Color.RED)
	var opacity = visual_data.get("opacity", 1.0)
	var z_index_val = visual_data.get("zIndex", 0)
	var blend_mode = visual_data.get("blendMode", "")

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
			_apply_blend_mode(polygon, blend_mode)
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
			_apply_blend_mode(polygon, blend_mode)
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
			var radius = _get_dimension.call("radius", 0.5) * _pixels_per_meter
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
			_add_image_sprite(node, sprite_data, opacity, z_index_val)
		"text":
			_add_text_sprite(node, sprite_data, opacity, z_index_val)


# ============================================================================
# TEXTURE DOWNLOADING
# ============================================================================

func _download_texture_for_preload(url: String) -> void:
	_texture_loader.load_texture(url, func(texture: ImageTexture, fetched_url: String, success: bool):
		_on_preload_complete(fetched_url, success)
	)


func _download_atlas_texture(
	sprite: Sprite2D, url: String, region_dict: Dictionary, sprite_data: Dictionary
) -> void:
	_download_texture(
		sprite,
		url,
		sprite_data,
		func(texture: Texture2D):
			if is_instance_valid(sprite):
				_apply_atlas_region(sprite, texture, region_dict, sprite_data)
				var node = sprite.get_parent()
				if node:
					_hide_shape_children(node)
	)


func _download_texture(sprite: Sprite2D, url: String, sprite_data: Dictionary, callback: Callable = Callable()) -> void:
	_texture_loader.load_texture(url, func(texture: ImageTexture, fetched_url: String, success: bool):
		# TextureLoader now always returns a texture (fallback on failure)
		if texture == null:
			return

		if not success:
			if _bridge and "_push_error" in _bridge:
				_bridge._push_error("[VisualRenderer] Using fallback texture for: " + fetched_url)

		if is_instance_valid(sprite):
			sprite.texture = texture
			_apply_sprite_scale(sprite, sprite_data, texture)
			var parent_node = sprite.get_parent()
			if parent_node:
				_hide_shape_children(parent_node)
			if callback.is_valid():
				callback.call(texture)
	)


func _apply_atlas_region(
	sprite: Sprite2D, texture: Texture2D, region_dict: Dictionary, sprite_data: Dictionary = {}
) -> void:
	var atlas_texture = AtlasTexture.new()
	atlas_texture.atlas = texture
	atlas_texture.region = Rect2(
		region_dict.get("x", 0),
		region_dict.get("y", 0),
		region_dict.get("w", 0),
		region_dict.get("h", 0)
	)
	sprite.texture = atlas_texture
	_apply_sprite_scale(sprite, sprite_data, atlas_texture)


# ============================================================================
# PRELOAD TRACKING
# ============================================================================

func _on_preload_complete(url: String, success: bool) -> void:
	if success:
		_preload_completed_count += 1
	else:
		_preload_failed_count += 1

	var total_done = _preload_completed_count + _preload_failed_count
	var percent = int((float(total_done) / float(_preload_pending_count)) * 100.0)

	# Call GDScript callback if set
	if _preload_progress_callback.is_valid():
		_preload_progress_callback.call(percent, _preload_completed_count, _preload_failed_count)
	# Call JavaScript callback if set
	elif _js_preload_progress_callback != null:
		_js_preload_progress_callback.call("call", null, percent, _preload_completed_count, _preload_failed_count)


# ============================================================================
# HELPER METHODS
# ============================================================================

func _add_image_sprite(node: Node2D, sprite_data: Dictionary, opacity: float, z_index_val: int) -> void:
	var sprite = Sprite2D.new()
	var url = AssetUtils.resolve_url(sprite_data, _bridge)
	var img_width = sprite_data.get("imageWidth", sprite_data.get("width", 1.0))
	var img_height = sprite_data.get("imageHeight", sprite_data.get("height", 1.0))
	var asset_scale = sprite_data.get("scale", 1.0)
	var offset_x = sprite_data.get("offsetX", 0.0)
	var offset_y = sprite_data.get("offsetY", 0.0)

	if url == "":
		print("[VisualRenderer] ⚠️  Image sprite has no URL for entity: ", node.name)
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
		_download_texture(sprite, url, normalized_data)

	sprite.modulate.a = opacity
	sprite.z_index = z_index_val
	node.add_child(sprite)


func _add_text_sprite(node: Node2D, sprite_data: Dictionary, opacity: float, z_index_val: int) -> void:
	var label = Label.new()
	label.text = sprite_data.get("text", "")

	var font_size = int(sprite_data.get("fontSize", 16) * _pixels_per_meter / 50.0)
	label.add_theme_font_size_override("font_size", font_size)

	var text_color = Color.from_string(sprite_data.get("color", "#FFFFFF"), Color.WHITE)
	label.modulate = text_color
	label.modulate.a = opacity
	label.z_index = z_index_val
	node.add_child(label)


func _apply_sprite_scale(sprite: Sprite2D, sprite_data: Dictionary, texture: Texture2D) -> void:
	if texture == null:
		return

	var asset_scale = sprite_data.get("scale", 1.0)
	var offset_x = sprite_data.get("offsetX", 0.0) * _pixels_per_meter
	var offset_y = sprite_data.get("offsetY", 0.0) * _pixels_per_meter

	var target_w = sprite_data.get("width", 1.0) * _pixels_per_meter * asset_scale
	var target_h = sprite_data.get("height", 1.0) * _pixels_per_meter * asset_scale

	var tex_w = texture.get_width()
	var tex_h = texture.get_height()
	var is_square_texture = abs(tex_w - tex_h) < 2

	if is_square_texture and tex_w > 0:
		var canvas_size = float(tex_w)
		var fill_ratio = 0.9
		var physics_w = sprite_data.get("width", 1.0)
		var physics_h = sprite_data.get("height", 1.0)
		var aspect_ratio = physics_w / physics_h if physics_h > 0 else 1.0

		var silhouette_w: float
		var silhouette_h: float
		if aspect_ratio >= 1.0:
			silhouette_w = canvas_size * fill_ratio
			silhouette_h = silhouette_w / aspect_ratio
		else:
			silhouette_h = canvas_size * fill_ratio
			silhouette_w = silhouette_h * aspect_ratio

		var uniform_scale = target_w / silhouette_w if silhouette_w > 0 else 1.0
		sprite.scale = Vector2(uniform_scale, uniform_scale)
	else:
		var scale_x = target_w / tex_w if tex_w > 0 else 1.0
		var scale_y = target_h / tex_h if tex_h > 0 else 1.0
		var uniform_scale = min(scale_x, scale_y)
		sprite.scale = Vector2(uniform_scale, uniform_scale)

	sprite.position = Vector2(offset_x, offset_y)


func _create_polygon_texture(width: int, height: int, color: Color, padding: int = 0) -> ImageTexture:
	var tex_w = width + padding * 2
	var tex_h = height + padding * 2
	var image = Image.create(tex_w, tex_h, false, Image.FORMAT_RGBA8)
	image.fill(Color(0, 0, 0, 0))
	for y in range(padding, tex_h - padding):
		for x in range(padding, tex_w - padding):
			image.set_pixel(x, y, color)
	return ImageTexture.create_from_image(image)


func _has_entity(entity_id: String) -> bool:
	if _bridge and "entities" in _bridge:
		return _bridge.entities.has(entity_id)
	return false


func _get_entity(entity_id: String) -> Node:
	if _bridge and "entities" in _bridge:
		return _bridge.entities[entity_id]
	return null


# ============================================================================
# DEBUG VISIBILITY
# ============================================================================

func _hide_shape_children(node: Node2D) -> void:
	for child in node.get_children():
		if child is Polygon2D:
			child.visible = false


func apply_debug_visibility(node: Node2D) -> void:
	for child in node.get_children():
		if child is Polygon2D:
			child.visible = _debug_show_shapes
		elif child is Sprite2D:
			child.visible = not _debug_show_shapes


func _apply_debug_visibility(node: Node2D) -> void:
	apply_debug_visibility(node)

# =============================================================================
# BACKGROUND SYSTEM
# =============================================================================

var _background_layer: CanvasLayer = null
var _background_rect: TextureRect = null
var _parallax_layers: Array = []

func setup_background(bg_data: Dictionary) -> void:
	# Clean up existing background
	if _background_layer:
		_background_layer.queue_free()
		_background_layer = null
		_background_rect = null

	for layer in _parallax_layers:
		if is_instance_valid(layer):
			layer.queue_free()
	_parallax_layers.clear()

	if bg_data.is_empty():
		return

	var bg_type = bg_data.get("type", "")

	if bg_type == "parallax":
		_setup_parallax_background(bg_data)
		return

	if bg_type != "static":
		return

	var image_url = AssetUtils.resolve_url(bg_data, _bridge)
	var color = bg_data.get("color", "")

	_background_layer = CanvasLayer.new()
	_background_layer.layer = -100
	_background_layer.name = "BackgroundLayer"
	_bridge.add_child(_background_layer)

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
		var viewport_size = _bridge.get_viewport().get_visible_rect().size
		var img = Image.create(
			int(viewport_size.x), int(viewport_size.y), false, Image.FORMAT_RGBA8
		)
		img.fill(Color.from_string(color, Color.GRAY))
		_background_rect.texture = ImageTexture.create_from_image(img)


func _download_background_texture(url: String) -> void:
	_download_texture_generic(
		url,
		func(texture: Texture2D):
			if is_instance_valid(_background_rect):
				_background_rect.texture = texture
	)


func _setup_parallax_background(bg_data: Dictionary) -> void:
	var layers_data = bg_data.get("layers", [])
	if layers_data.is_empty():
		return

	# Map depth to z-index (further back = lower z-index)
	var depth_to_z = {"sky": -400, "far": -300, "mid": -200, "near": -100}

	for layer_data in layers_data:
		var layer_id = layer_data.get("id", "")
		var image_url = AssetUtils.resolve_url(layer_data, _bridge)
		var depth = layer_data.get("depth", "mid")
		var parallax_factor = layer_data.get("parallaxFactor", 0.5)
		var visible = layer_data.get("visible", true)

		if not visible or image_url == "":
			continue

		var layer = CanvasLayer.new()
		layer.layer = depth_to_z.get(depth, -200)
		layer.name = "ParallaxLayer_" + layer_id
		_bridge.add_child(layer)
		_parallax_layers.append(layer)

		var rect = TextureRect.new()
		rect.name = layer_id
		rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		rect.anchor_left = 0.0
		rect.anchor_top = 0.0
		rect.anchor_right = 1.0
		rect.anchor_bottom = 1.0
		layer.add_child(rect)

		# Download texture for this layer
		_download_texture_generic(
			image_url,
			func(texture: Texture2D):
				if is_instance_valid(rect):
					rect.texture = texture
		)


func _download_texture_generic(url: String, callback: Callable) -> void:
	if _texture_loader.is_cached(url):
		callback.call(_texture_loader.get_cached(url))
		return

	_texture_loader.load_texture(url, func(texture: ImageTexture, fetched_url: String, success: bool):
		# TextureLoader now always returns a texture (fallback on failure)
		if texture != null:
			callback.call(texture)
	)
