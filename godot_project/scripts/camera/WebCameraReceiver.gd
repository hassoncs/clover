extends Node

var _target_entity_id: String = ""
var _texture: ImageTexture = null
var _image: Image = null
var _is_active: bool = false
var _width: int = 0
var _height: int = 0

func setup(entity_id: String) -> void:
	_target_entity_id = entity_id
	_is_active = true
	_texture = null
	_image = null

func stop() -> void:
	_is_active = false
	_target_entity_id = ""

func _process(_delta: float) -> void:
	if not _is_active or _target_entity_id == "":
		return
	
	if not OS.has_feature("web"):
		return
		
	var window = JavaScriptBridge.get_interface("window")
	if window == null:
		return
		
	var data = window._cameraFrameData
	if data == null:
		return
		
	var w = int(window._cameraFrameWidth)
	var h = int(window._cameraFrameHeight)
	
	if w <= 0 or h <= 0:
		return
		
	# data should be a PackedByteArray (Uint8Array in JS)
	if not (data is PackedByteArray):
		# If it's not PackedByteArray, we might need to convert it or it might be a JavaScriptObject
		if data is JavaScriptObject:
			# This is tricky, JavaScriptBridge might not auto-convert Uint8ClampedArray to PackedByteArray
			# Let's try to use eval to get it as a PackedByteArray if possible, 
			# or use a helper in JS to return it in a way Godot likes.
			pass
		return

	if _image == null or _width != w or _height != h:
		_width = w
		_height = h
		_image = Image.create_from_data(_width, _height, false, Image.FORMAT_RGBA8, data)
		_texture = ImageTexture.create_from_image(_image)
		_update_sprite_texture()
	else:
		_image.set_data(_width, _height, false, Image.FORMAT_RGBA8, data)
		_texture.update(_image)

func _update_sprite_texture() -> void:
	var node = GameBridge.get_entity_node(_target_entity_id)
	if node == null:
		return
		
	var sprite = EntityUtils.find_sprite_in_entity(node)
	if sprite == null:
		sprite = Sprite2D.new()
		node.add_child(sprite)
	
	sprite.texture = _texture
	
	# Apply scaling similar to VisualRenderer
	var sprite_data = {"width": float(_width) / GameBridge.pixels_per_meter, "height": float(_height) / GameBridge.pixels_per_meter}
	# We don't have easy access to _apply_sprite_scale here as it's in VisualRenderer
	# But we can manually scale it for now or move the logic.
	# For simplicity, let's just set it to 1:1 pixels for now or match entity size.
	var record = GameBridge.get_record(_target_entity_id)
	if record:
		var target_w = record.width * GameBridge.pixels_per_meter
		var target_h = record.height * GameBridge.pixels_per_meter
		sprite.scale = Vector2(target_w / _width, target_h / _height)
