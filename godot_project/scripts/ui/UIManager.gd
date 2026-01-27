class_name UIManager
extends RefCounted

var bridge: Node
var ui_buttons: Dictionary = {}
var ui_layer: CanvasLayer = null

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

func create_ui_button(button_id: String, normal_url: String, pressed_url: String,
		pos_x: float, pos_y: float, btn_width: float, btn_height: float) -> void:
	
	if ui_buttons.has(button_id):
		destroy_ui_button(button_id)
	
	var layer = _get_or_create_ui_layer()
	
	var btn = TextureButton.new()
	btn.name = button_id
	btn.position = Vector2(pos_x, pos_y)
	btn.custom_minimum_size = Vector2(btn_width, btn_height)
	btn.ignore_texture_size = true
	btn.stretch_mode = TextureButton.STRETCH_SCALE
	
	btn.button_down.connect(func(): _on_button_down(button_id))
	btn.button_up.connect(func(): _on_button_up(button_id))
	btn.pressed.connect(func(): _on_button_pressed(button_id))
	
	layer.add_child(btn)
	ui_buttons[button_id] = btn
	
	_load_button_texture(btn, normal_url, "normal")
	_load_button_texture(btn, pressed_url, "pressed")

func destroy_ui_button(button_id: String) -> void:
	if ui_buttons.has(button_id):
		var btn = ui_buttons[button_id]
		if is_instance_valid(btn):
			btn.queue_free()
		ui_buttons.erase(button_id)

func _get_or_create_ui_layer() -> CanvasLayer:
	if ui_layer and is_instance_valid(ui_layer):
		return ui_layer
	
	ui_layer = CanvasLayer.new()
	ui_layer.name = "UILayer"
	ui_layer.layer = 100
	bridge.add_child(ui_layer)
	return ui_layer

func _load_button_texture(btn: TextureButton, url: String, texture_type: String) -> void:
	var http = HTTPRequest.new()
	bridge.add_child(http)
	
	http.request_completed.connect(func(result: int, code: int, headers: PackedStringArray, body: PackedByteArray):
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or code != 200:
			btn.set(texture_type + "_texture", _create_placeholder_texture(url, int(btn.custom_minimum_size.x), int(btn.custom_minimum_size.y)))
			return
		
		var image = Image.new()
		if image.load_png_from_buffer(body) != OK:
			if image.load_jpg_from_buffer(body) != OK:
				if image.load_webp_from_buffer(body) != OK:
					return
		
		var texture = ImageTexture.create_from_image(image)
		if is_instance_valid(btn):
			btn.set("texture_" + texture_type, texture)
	)
	
	if http.request(url) != OK:
		http.queue_free()
		btn.set("texture_" + texture_type, _create_placeholder_texture(url, int(btn.custom_minimum_size.x), int(btn.custom_minimum_size.y)))

func _create_placeholder_texture(url: String, width: int, height: int) -> ImageTexture:
	var image = Image.create(max(1, width), max(1, height), false, Image.FORMAT_RGBA8)
	var color = Color(0.3, 0.3, 0.3, 0.8)
	image.fill(color)
	return ImageTexture.create_from_image(image)

func _on_button_down(button_id: String) -> void:
	_notify_button_event("down", button_id)

func _on_button_up(button_id: String) -> void:
	_notify_button_event("up", button_id)

func _on_button_pressed(button_id: String) -> void:
	_notify_button_event("pressed", button_id)

func _notify_button_event(event_type: String, button_id: String) -> void:
	bridge._queue_event("ui_button", {"event": event_type, "buttonId": button_id})
	if bridge._js_ui_button_callback:
		bridge._js_ui_button_callback.call(event_type, button_id)

func clear_all() -> void:
	for button_id in ui_buttons:
		var btn = ui_buttons[button_id]
		if is_instance_valid(btn):
			btn.queue_free()
	ui_buttons.clear()
