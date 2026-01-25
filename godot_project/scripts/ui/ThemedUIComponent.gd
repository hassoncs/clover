class_name ThemedUIComponent
extends Control

enum ComponentType { BUTTON, CHECKBOX }

signal pressed()
signal toggled(is_checked: bool)

var _component_type: ComponentType = ComponentType.BUTTON
var _control_node: Control = null
var _metadata: Dictionary = {}
var _style_boxes: Dictionary = {}
var _icon_texture: Texture2D = null
var _is_loading: bool = true
var _pending_loads: int = 0

@export var metadata_url: String = ""
@export var component_type: ComponentType = ComponentType.BUTTON
@export var icon_texture_path: String = ""
@export var text: String = ""

func _init() -> void:
	pass

func _ready() -> void:
	_component_type = component_type
	_create_control_node()
	
	if icon_texture_path != "" and ResourceLoader.exists(icon_texture_path):
		_icon_texture = load(icon_texture_path)
	
	if metadata_url != "":
		_load_metadata(metadata_url)

func setup(p_type: ComponentType, p_metadata_url: String, p_text: String = "", p_icon_path: String = "") -> void:
	_component_type = p_type
	metadata_url = p_metadata_url
	text = p_text
	if p_icon_path != "":
		icon_texture_path = p_icon_path
		if ResourceLoader.exists(icon_texture_path):
			_icon_texture = load(icon_texture_path)
	
	if is_node_ready():
		_create_control_node()
		_load_metadata(metadata_url)

func _create_control_node() -> void:
	if _control_node:
		_control_node.queue_free()
	
	if _component_type == ComponentType.BUTTON:
		var btn = Button.new()
		btn.name = "Button"
		btn.text = text
		btn.flat = true
		btn.pressed.connect(_on_button_pressed)
		_control_node = btn
	else:
		var chk = CheckBox.new()
		chk.name = "CheckBox"
		chk.text = text
		chk.toggle_mode = true
		chk.flat = true
		chk.toggled.connect(_on_checkbox_toggled)
		_control_node = chk
	
	add_child(_control_node)
	
	if _control_node is BaseButton:
		var base_btn = _control_node as BaseButton
		base_btn.mouse_entered.connect(_on_mouse_entered)
		base_btn.mouse_exited.connect(_on_mouse_exited)

func _load_metadata(url: String) -> void:
	var http = HTTPRequest.new()
	add_child(http)
	
	http.request_completed.connect(func(result: int, code: int, headers: PackedStringArray, body: PackedByteArray):
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or code != 200:
			push_error("[ThemedUIComponent] Failed to load metadata from: " + url)
			_is_loading = false
			return
		
		var json = JSON.new()
		if json.parse(body.get_string_from_utf8()) != OK:
			push_error("[ThemedUIComponent] Invalid JSON in metadata")
			_is_loading = false
			return
		
		_metadata = json.get_data()
		_load_state_textures()
	)
	
	if http.request(url) != OK:
		http.queue_free()
		push_error("[ThemedUIComponent] HTTP request failed for: " + url)

func _load_state_textures() -> void:
	if not _metadata.has("states"):
		push_error("[ThemedUIComponent] Metadata missing 'states'")
		return
	
	var states = _metadata["states"]
	_pending_loads = states.size()
	
	for state_name in states:
		var state_data = states[state_name]
		var texture_url = state_data.get("publicUrl", "")
		if texture_url == "":
			_pending_loads -= 1
			continue
		
		_load_texture_for_state(state_name, texture_url)

func _load_texture_for_state(state_name: String, url: String) -> void:
	var http = HTTPRequest.new()
	add_child(http)
	
	http.request_completed.connect(func(result: int, code: int, headers: PackedStringArray, body: PackedByteArray):
		http.queue_free()
		_pending_loads -= 1
		
		if result != HTTPRequest.RESULT_SUCCESS or code != 200:
			push_warning("[ThemedUIComponent] Failed to load texture for state: " + state_name)
			_check_loading_complete()
			return
		
		var image = Image.new()
		if image.load_png_from_buffer(body) != OK:
			push_warning("[ThemedUIComponent] Failed to parse PNG for state: " + state_name)
			_check_loading_complete()
			return
		
		var texture = ImageTexture.create_from_image(image)
		_create_stylebox_for_state(state_name, texture)
		_check_loading_complete()
	)
	
	if http.request(url) != OK:
		http.queue_free()
		_pending_loads -= 1
		_check_loading_complete()

func _create_stylebox_for_state(state_name: String, texture: Texture2D) -> void:
	var style_box = StyleBoxTexture.new()
	style_box.texture = texture
	
	if _metadata.has("ninePatchMargins"):
		var margins = _metadata["ninePatchMargins"]
		style_box.texture_margin_left = margins.get("left", 12)
		style_box.texture_margin_right = margins.get("right", 12)
		style_box.texture_margin_top = margins.get("top", 12)
		style_box.texture_margin_bottom = margins.get("bottom", 12)
		
		style_box.content_margin_left = margins.get("left", 12) + 4
		style_box.content_margin_right = margins.get("right", 12) + 4
		style_box.content_margin_top = margins.get("top", 12) + 4
		style_box.content_margin_bottom = margins.get("bottom", 12) + 4
	
	_style_boxes[state_name] = style_box

func _check_loading_complete() -> void:
	if _pending_loads <= 0:
		_is_loading = false
		_apply_styles()

func _apply_styles() -> void:
	if not is_instance_valid(_control_node):
		return
	
	if _style_boxes.has("normal"):
		_control_node.add_theme_stylebox_override("normal", _style_boxes["normal"])
	
	if _style_boxes.has("hover"):
		_control_node.add_theme_stylebox_override("hover", _style_boxes["hover"])
	else:
		_control_node.add_theme_stylebox_override("hover", _style_boxes.get("normal", null))
	
	if _style_boxes.has("pressed"):
		_control_node.add_theme_stylebox_override("pressed", _style_boxes["pressed"])
	else:
		_control_node.add_theme_stylebox_override("pressed", _style_boxes.get("normal", null))
	
	if _style_boxes.has("disabled"):
		_control_node.add_theme_stylebox_override("disabled", _style_boxes["disabled"])
	
	if _style_boxes.has("focus"):
		_control_node.add_theme_stylebox_override("focus", _style_boxes["focus"])
	
	if _component_type == ComponentType.CHECKBOX and _icon_texture:
		var chk = _control_node as CheckBox
		chk.add_theme_icon_override("checked", _icon_texture)
		chk.add_theme_icon_override("checked_disabled", _icon_texture)

func _on_button_pressed() -> void:
	pressed.emit()

func _on_checkbox_toggled(is_checked: bool) -> void:
	toggled.emit(is_checked)

func _on_mouse_entered() -> void:
	pass

func _on_mouse_exited() -> void:
	pass

func set_text(value: String) -> void:
	text = value
	if is_instance_valid(_control_node):
		if _control_node is Button:
			(_control_node as Button).text = value
		elif _control_node is CheckBox:
			(_control_node as CheckBox).text = value

func set_checked(value: bool) -> void:
	if _component_type == ComponentType.CHECKBOX and is_instance_valid(_control_node):
		(_control_node as CheckBox).button_pressed = value

func is_checked() -> bool:
	if _component_type == ComponentType.CHECKBOX and is_instance_valid(_control_node):
		return (_control_node as CheckBox).button_pressed
	return false

func set_disabled(value: bool) -> void:
	if is_instance_valid(_control_node):
		(_control_node as BaseButton).disabled = value
