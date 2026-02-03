class_name UIButtonSystem
extends RefCounted

## UI Button Management System
## Handles TextureButton nodes, button callbacks, and cleanup

signal button_pressed(button_id: String)
signal button_event(button_id: String, event_type: String)

var bridge: Node
var _ui_buttons: Dictionary = {}  # button_id -> TextureButton node
var _button_callbacks: Dictionary = {}  # button_id -> Array of callbacks
var _ui_layer: CanvasLayer = null

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

## Setup UI buttons from configuration data
func _setup_ui_buttons(ui_data: Dictionary) -> void:
	# Clear existing buttons first
	_clear_ui_buttons()
	
	if not ui_data.has("buttons"):
		return
	
	var buttons_config = ui_data["buttons"]
	for button_config in buttons_config:
		_create_ui_button(button_config)

## Create a single UI button from configuration
func _create_ui_button(config: Dictionary) -> void:
	var button_id: String = config.get("id", "")
	if button_id == "":
		push_error("[UIButtonSystem] Button config missing ID")
		return
	
	# Destroy existing button with same ID
	if _ui_buttons.has(button_id):
		_clear_button(button_id)
	
	var layer = _get_or_create_ui_layer()
	
	var btn = TextureButton.new()
	btn.name = button_id
	
	# Position and size
	var pos_x = config.get("x", 0.0)
	var pos_y = config.get("y", 0.0)
	var width = config.get("width", 100.0)
	var height = config.get("height", 50.0)
	
	btn.position = Vector2(pos_x, pos_y)
	btn.custom_minimum_size = Vector2(width, height)
	btn.ignore_texture_size = true
	btn.stretch_mode = TextureButton.STRETCH_SCALE
	
	# Connect button signals
	btn.button_down.connect(_on_button_down.bind(button_id))
	btn.button_up.connect(_on_button_up.bind(button_id))
	btn.pressed.connect(_on_ui_button_pressed.bind(button_id))
	
	layer.add_child(btn)
	_ui_buttons[button_id] = btn
	
	# Load textures if URLs provided
	var normal_url = config.get("normalUrl", "")
	var pressed_url = config.get("pressedUrl", "")
	var hover_url = config.get("hoverUrl", "")
	
	if normal_url != "":
		_load_button_texture(btn, normal_url, "normal")
	if pressed_url != "":
		_load_button_texture(btn, pressed_url, "pressed")
	if hover_url != "":
		_load_button_texture(btn, hover_url, "hover")
	
	# Store button configuration for reference
	_button_callbacks[button_id] = []

## Button press handler
func _on_ui_button_pressed(button_id: String) -> void:
	if not _ui_buttons.has(button_id):
		return
	
	button_pressed.emit(button_id)
	_notify_button_event("pressed", button_id)
	
	# Execute registered callbacks
	if _button_callbacks.has(button_id):
		for callback in _button_callbacks[button_id]:
			if callback is Callable:
				callback.call(button_id)

## Handle button down event
func _on_button_down(button_id: String) -> void:
	_notify_button_event("down", button_id)

## Handle button up event  
func _on_button_up(button_id: String) -> void:
	_notify_button_event("up", button_id)

## Notify JavaScript bridge of button events
func _notify_button_event(event_type: String, button_id: String) -> void:
	button_event.emit(button_id, event_type)
	
	# Queue event for native polling
	bridge._queue_event("ui_button", {"event": event_type, "buttonId": button_id})
	
	# Call JavaScript callback if registered
	if bridge.has_method("_get_js_ui_button_callback"):
		var js_callback = bridge._get_js_ui_button_callback()
		if js_callback != null:
			js_callback.call(event_type, button_id)

## Clear all UI buttons and cleanup
func _clear_ui_buttons() -> void:
	for button_id in _ui_buttons:
		_clear_button(button_id)
	
	_ui_buttons.clear()
	_button_callbacks.clear()
	
	# Clean up UI layer
	if _ui_layer and is_instance_valid(_ui_layer):
		_ui_layer.queue_free()
		_ui_layer = null

## Clear a single button
func _clear_button(button_id: String) -> void:
	if _ui_buttons.has(button_id):
		var btn = _ui_buttons[button_id]
		if is_instance_valid(btn):
			btn.queue_free()
		_ui_buttons.erase(button_id)
	
	if _button_callbacks.has(button_id):
		_button_callbacks.erase(button_id)

## Get or create the UI layer
func _get_or_create_ui_layer() -> CanvasLayer:
	if _ui_layer and is_instance_valid(_ui_layer):
		return _ui_layer
	
	_ui_layer = CanvasLayer.new()
	_ui_layer.name = "UIButtonLayer"
	_ui_layer.layer = 100
	bridge.add_child(_ui_layer)
	return _ui_layer

## Load button texture from URL
func _load_button_texture(btn: TextureButton, url: String, texture_type: String) -> void:
	TextureLoader.fetch_texture(bridge, url, func(texture: ImageTexture, fetched_url: String, success: bool):
		if not is_instance_valid(btn):
			return
		if success and texture != null:
			btn.set("texture_" + texture_type, texture)
		else:
			btn.set("texture_" + texture_type, _create_placeholder_texture(fetched_url, int(btn.custom_minimum_size.x), int(btn.custom_minimum_size.y)))
	)

## Create placeholder texture when image loading fails
func _create_placeholder_texture(url: String, width: int, height: int) -> ImageTexture:
	var img_width = max(1, width)
	var img_height = max(1, height)
	var image = Image.create(img_width, img_height, false, Image.FORMAT_RGBA8)
	var color = Color(0.3, 0.3, 0.3, 0.8)
	image.fill(color)
	return ImageTexture.create_from_image(image)

## Add callback for button press events
func add_button_callback(button_id: String, callback: Callable) -> void:
	if not _button_callbacks.has(button_id):
		_button_callbacks[button_id] = []
	
	if callback is Callable:
		_button_callbacks[button_id].append(callback)

## Remove callback for button press events
func remove_button_callback(button_id: String, callback: Callable) -> void:
	if _button_callbacks.has(button_id):
		_button_callbacks[button_id].erase(callback)

## Check if button exists
func has_button(button_id: String) -> bool:
	return _ui_buttons.has(button_id)

## Get button by ID
func get_button(button_id: String) -> TextureButton:
	return _ui_buttons.get(button_id)

## Get all button IDs
func get_button_ids() -> Array:
	return _ui_buttons.keys()

## Show/hide button
func set_button_visible(button_id: String, visible: bool) -> void:
	if _ui_buttons.has(button_id):
		var btn = _ui_buttons[button_id]
		if is_instance_valid(btn):
			btn.visible = visible

## Set button position
func set_button_position(button_id: String, pos_x: float, pos_y: float) -> void:
	if _ui_buttons.has(button_id):
		var btn = _ui_buttons[button_id]
		if is_instance_valid(btn):
			btn.position = Vector2(pos_x, pos_y)

## Set button size
func set_button_size(button_id: String, width: float, height: float) -> void:
	if _ui_buttons.has(button_id):
		var btn = _ui_buttons[button_id]
		if is_instance_valid(btn):
			btn.custom_minimum_size = Vector2(width, height)

## Simulate button press (for testing)
func simulate_press(button_id: String) -> void:
	if _ui_buttons.has(button_id):
		var btn = _ui_buttons[button_id]
		if is_instance_valid(btn):
			btn.emit_signal("pressed")

## JavaScript callback for creating UI button
func _js_create_ui_button(args: Array) -> void:
	if args.size() < 8:
		push_error("[UIButtonSystem] createUIButton: insufficient arguments")
		return
	
	var config = {
		"id": str(args[0]),
		"normalUrl": str(args[1]),
		"pressedUrl": str(args[2]),
		"x": float(args[3]),
		"y": float(args[4]),
		"width": float(args[5]),
		"height": float(args[6])
	}
	
	_create_ui_button(config)

## JavaScript callback for destroying UI button
func _js_destroy_ui_button(args: Array) -> void:
	if args.size() < 1:
		return
	
	var button_id = str(args[0])
	_clear_button(button_id)

## JavaScript callback for button event subscription
func _js_on_ui_button_event(args: Array) -> void:
	if args.size() < 1 or args[0] == null:
		return
	
	bridge._js_ui_button_callback = args[0]
