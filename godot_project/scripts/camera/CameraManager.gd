extends Node

## Native camera manager using CameraTextureProvider GDExtension.
## Handles camera capture for native platforms (iOS/Android).
## Web uses WebCameraReceiver instead.

var _provider: Node = null
var _target_entity_id: String = ""
var _is_background_mode: bool = false
var _background_rect: TextureRect = null
var _original_texture: Texture2D = null

func _ready() -> void:
	set_process(true)

func start_camera(entity_id: String, width: int = 640, height: int = 480) -> void:
	if OS.has_feature("web"):
		push_warning("[CameraManager] start_camera called on web - use WebCameraReceiver instead")
		return
	
	if not ClassDB.class_exists("CameraTextureProvider"):
		push_warning("[CameraManager] CameraTextureProvider GDExtension not loaded")
		return
	
	stop_camera()
	
	_target_entity_id = entity_id
	_is_background_mode = false
	
	# Create CameraTextureProvider node
	_provider = ClassDB.instantiate("CameraTextureProvider")
	if _provider == null:
		push_error("[CameraManager] Failed to instantiate CameraTextureProvider")
		return
	
	_provider.name = "CameraTextureProvider"
	_provider.set("frame_width", width)
	_provider.set("frame_height", height)
	add_child(_provider)
	
	print("[CameraManager] Started camera for entity '", entity_id, "' at ", width, "x", height)

func stop_camera() -> void:
	if _provider != null and is_instance_valid(_provider):
		_provider.queue_free()
		_provider = null
	
	# Restore original texture if we had one
	if _target_entity_id != "" and _original_texture != null:
		var node = GameBridge.get_entity_node(_target_entity_id)
		if node != null:
			var sprite = EntityUtils.find_sprite_in_entity(node)
			if sprite != null:
				sprite.texture = _original_texture
	
	_target_entity_id = ""
	_original_texture = null
	_is_background_mode = false

func start_camera_background(width: int = 640, height: int = 480) -> void:
	if OS.has_feature("web"):
		push_warning("[CameraManager] start_camera_background called on web - not supported")
		return
	
	if not ClassDB.class_exists("CameraTextureProvider"):
		push_warning("[CameraManager] CameraTextureProvider GDExtension not loaded")
		return
	
	stop_camera_background()
	
	_is_background_mode = true
	
	# Create CameraTextureProvider node
	_provider = ClassDB.instantiate("CameraTextureProvider")
	if _provider == null:
		push_error("[CameraManager] Failed to instantiate CameraTextureProvider")
		return
	
	_provider.name = "CameraTextureProvider"
	_provider.set("frame_width", width)
	_provider.set("frame_height", height)
	add_child(_provider)
	
	# Create background rect (similar to VisualRenderer pattern)
	var canvas_layer = CanvasLayer.new()
	canvas_layer.name = "CameraBackgroundLayer"
	canvas_layer.layer = -100
	GameBridge.game_root.add_child(canvas_layer)
	
	_background_rect = TextureRect.new()
	_background_rect.name = "CameraBackground"
	_background_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_background_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	_background_rect.anchor_left = 0.0
	_background_rect.anchor_top = 0.0
	_background_rect.anchor_right = 1.0
	_background_rect.anchor_bottom = 1.0
	canvas_layer.add_child(_background_rect)
	
	print("[CameraManager] Started camera background at ", width, "x", height)

func stop_camera_background() -> void:
	if _provider != null and is_instance_valid(_provider):
		_provider.queue_free()
		_provider = null
	
	if _background_rect != null and is_instance_valid(_background_rect):
		var canvas_layer = _background_rect.get_parent()
		if canvas_layer != null and is_instance_valid(canvas_layer):
			canvas_layer.queue_free()
		_background_rect = null
	
	_is_background_mode = false

func _process(_delta: float) -> void:
	if _provider == null or not is_instance_valid(_provider):
		return
	
	# Check if provider is active and has a texture
	var is_active = _provider.get("is_active")
	if not is_active:
		return
	
	var texture = _provider.get("texture")
	if texture == null:
		return
	
	# Update target sprite or background rect
	if _is_background_mode:
		if _background_rect != null and is_instance_valid(_background_rect):
			_background_rect.texture = texture
	else:
		if _target_entity_id != "":
			_update_sprite_texture(texture)

func _update_sprite_texture(texture: Texture2D) -> void:
	var node = GameBridge.get_entity_node(_target_entity_id)
	if node == null:
		return
	
	var sprite = EntityUtils.find_sprite_in_entity(node)
	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)
	
	# Save original texture on first update
	if _original_texture == null and sprite.texture != null:
		_original_texture = sprite.texture
	
	sprite.texture = texture
	
	# Apply scaling to match entity size
	var record = GameBridge.get_record(_target_entity_id)
	if record:
		var frame_width = _provider.get("frame_width")
		var frame_height = _provider.get("frame_height")
		if frame_width > 0 and frame_height > 0:
			var target_w = record.width * GameBridge.pixels_per_meter
			var target_h = record.height * GameBridge.pixels_per_meter
			sprite.scale = Vector2(target_w / frame_width, target_h / frame_height)
