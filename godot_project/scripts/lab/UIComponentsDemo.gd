extends Control

@onready var checkboxes_container = $VBoxContainer/CheckboxesPanel/CheckboxesGrid
@onready var buttons_container = $VBoxContainer/ButtonsPanel/ButtonsGrid
@onready var status_label = $VBoxContainer/StatusLabel

const CHECKBOX_METADATA_URL = "http://localhost:8787/assets/generated/test-ui/checkbox/checkbox/metadata.json"
const BUTTON_METADATA_URL = "http://localhost:8787/assets/generated/test-ui/button/button/metadata.json"

func _ready():
	_create_checkboxes()
	_create_buttons()
	status_label.text = "Themed UI Components Demo - Hover and click to test"

func _create_checkboxes():
	var checkbox_labels = ["Option 1", "Option 2", "Option 3", "Option 4"]
	
	for i in range(4):
		var themed_checkbox = ThemedUIComponent.new()
		themed_checkbox.custom_minimum_size = Vector2(200, 48)
		themed_checkbox.setup(
			ThemedUIComponent.ComponentType.CHECKBOX,
			CHECKBOX_METADATA_URL,
			checkbox_labels[i]
		)
		themed_checkbox.toggled.connect(_on_checkbox_toggled.bind(i))
		checkboxes_container.add_child(themed_checkbox)

func _create_buttons():
	var button_labels = ["Action 1", "Action 2", "Action 3", "Action 4"]
	
	for i in range(4):
		var themed_button = ThemedUIComponent.new()
		themed_button.custom_minimum_size = Vector2(200, 48)
		themed_button.setup(
			ThemedUIComponent.ComponentType.BUTTON,
			BUTTON_METADATA_URL,
			button_labels[i]
		)
		themed_button.pressed.connect(_on_button_pressed.bind(i))
		buttons_container.add_child(themed_button)

func _on_checkbox_toggled(is_checked: bool, index: int):
	status_label.text = "Checkbox %d: %s" % [index + 1, "checked" if is_checked else "unchecked"]

func _on_button_pressed(index: int):
	status_label.text = "Button %d pressed!" % [index + 1]
