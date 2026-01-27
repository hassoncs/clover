class_name ThemedCheckbox
extends Control

signal toggled(is_checked: bool)

var checkbox: CheckBox
var _metadata: Dictionary = {}
var _style_boxes: Dictionary = {}  # state -> StyleBoxTexture
var _checkmark_texture: Texture2D = null
var _is_loading: bool = true
var _pending_loads: int = 0

@export var metadata_url: String = ""
@export var checkmark_texture_path: String = "res://icons/checkmark.png"

func _init() -> void:
	pass

func _ready() -> void:
	# Create the checkbox node
	checkbox = CheckBox.new()
	checkbox.name = "CheckBox"
	checkbox.toggle_mode = true
	checkbox.flat = true  # We handle all styling
	add_child(checkbox)
	
	# Connect signals
	checkbox.toggled.connect(_on_checkbox_toggled)
	checkbox.mouse_entered.connect(_on_mouse_entered)
	checkbox.mouse_exited.connect(_on_mouse_exited)
	
	# Load checkmark texture
	if ResourceLoader.exists(checkmark_texture_path):
		_checkmark_texture = load(checkmark_texture_path)
	
	# Start loading metadata if URL is set
	if metadata_url != "":
		_load_metadata(metadata_url)

func setup(p_metadata_url: String, p_checkmark_path: String = "") -> void:
	metadata_url = p_metadata_url
	if p_checkmark_path != "":
		checkmark_texture_path = p_checkmark_path
		if ResourceLoader.exists(checkmark_texture_path):
			_checkmark_texture = load(checkmark_texture_path)
	_load_metadata(metadata_url)

func _load_metadata(url: String) -> void:
	var http = HTTPRequest.new()
	add_child(http)
	
	http.request_completed.connect(func(result: int, code: int, headers: PackedStringArray, body: PackedByteArray):
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or code != 200:
			push_error("[ThemedCheckbox] Failed to load metadata from: " + url)
			_is_loading = false
			return
		
		var json = JSON.new()
		if json.parse(body.get_string_from_utf8()) != OK:
			push_error("[ThemedCheckbox] Invalid JSON in metadata")
			_is_loading = false
			return
		
		_metadata = json.get_data()
		_load_state_textures()
	)
	
	if http.request(url) != OK:
		http.queue_free()
		push_error("[ThemedCheckbox] HTTP request failed for: " + url)

func _load_state_textures() -> void:
	if not _metadata.has("states"):
		push_error("[ThemedCheckbox] Metadata missing 'states'")
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
			push_warning("[ThemedCheckbox] Failed to load texture for state: " + state_name)
			_check_loading_complete()
			return
		
		var image = Image.new()
		if image.load_png_from_buffer(body) != OK:
			push_warning("[ThemedCheckbox] Failed to parse PNG for state: " + state_name)
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
	
	# Apply nine-patch margins from metadata
	if _metadata.has("ninePatchMargins"):
		var margins = _metadata["ninePatchMargins"]
		style_box.texture_margin_left = margins.get("left", 12)
		style_box.texture_margin_right = margins.get("right", 12)
		style_box.texture_margin_top = margins.get("top", 12)
		style_box.texture_margin_bottom = margins.get("bottom", 12)
		
		# Also set content margins for text positioning
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
	if not is_instance_valid(checkbox):
		return
	
	# Apply normal state
	if _style_boxes.has("normal"):
		checkbox.add_theme_stylebox_override("normal", _style_boxes["normal"])
	
	# Apply hover state
	if _style_boxes.has("hover"):
		checkbox.add_theme_stylebox_override("hover", _style_boxes["hover"])
	else:
		checkbox.add_theme_stylebox_override("hover", _style_boxes.get("normal", null))
	
	# Apply pressed state
	if _style_boxes.has("pressed"):
		checkbox.add_theme_stylebox_override("pressed", _style_boxes["pressed"])
	else:
		checkbox.add_theme_stylebox_override("pressed", _style_boxes.get("normal", null))
	
	# Apply disabled state
	if _style_boxes.has("disabled"):
		checkbox.add_theme_stylebox_override("disabled", _style_boxes["disabled"])
	
	# Apply focus state
	if _style_boxes.has("focus"):
		checkbox.add_theme_stylebox_override("focus", _style_boxes["focus"])
	
	# Apply checkmark icon
	if _checkmark_texture:
		checkbox.add_theme_icon_override("checked", _checkmark_texture)
		checkbox.add_theme_icon_override("checked_disabled", _checkmark_texture)

func _on_checkbox_toggled(is_checked: bool) -> void:
	toggled.emit(is_checked)

func _on_mouse_entered() -> void:
	pass  # Godot handles hover state automatically

func _on_mouse_exited() -> void:
	pass  # Godot handles hover state automatically

func set_checked(value: bool) -> void:
	if is_instance_valid(checkbox):
		checkbox.button_pressed = value

func is_checked() -> bool:
	if is_instance_valid(checkbox):
		return checkbox.button_pressed
	return false

func set_disabled(value: bool) -> void:
	if is_instance_valid(checkbox):
		checkbox.disabled = value
