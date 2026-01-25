extends Control

# Test scene for manual QA of ThemedCheckbox components
# This scene creates multiple checkbox instances to verify:
# 1. Normal state appearance
# 2. Hover state (mouse over)
# 3. Pressed state (click)
# 4. Nine-patch stretching at different sizes
# 5. Checked/unchecked state

const METADATA_URL = "http://localhost:8787/assets/generated/test-ui/checkbox/metadata.json"

var checkboxes: Array[ThemedCheckbox] = []

func _ready() -> void:
	_create_ui()

func _create_ui() -> void:
	# Title
	var title = Label.new()
	title.text = "UI Component Test Scene - ThemedCheckbox"
	title.position = Vector2(20, 20)
	title.add_theme_font_size_override("font_size", 24)
	add_child(title)
	
	# Instructions
	var instructions = Label.new()
	instructions.text = "Hover over checkboxes to see state changes. Click to toggle checked state."
	instructions.position = Vector2(20, 60)
	add_child(instructions)
	
	# Row 1: Normal size (32x32)
	var label1 = Label.new()
	label1.text = "32x32 (normal size):"
	label1.position = Vector2(20, 100)
	add_child(label1)
	
	var cb1 = _create_checkbox(Vector2(200, 95), Vector2(32, 32), false)
	var cb2 = _create_checkbox(Vector2(250, 95), Vector2(32, 32), true)
	
	# Row 2: Medium size (48x48)
	var label2 = Label.new()
	label2.text = "48x48 (nine-patch test):"
	label2.position = Vector2(20, 150)
	add_child(label2)
	
	var cb3 = _create_checkbox(Vector2(200, 140), Vector2(48, 48), false)
	var cb4 = _create_checkbox(Vector2(260, 140), Vector2(48, 48), true)
	
	# Row 3: Large size (64x64)
	var label3 = Label.new()
	label3.text = "64x64 (stretch test):"
	label3.position = Vector2(20, 210)
	add_child(label3)
	
	var cb5 = _create_checkbox(Vector2(200, 200), Vector2(64, 64), false)
	var cb6 = _create_checkbox(Vector2(280, 200), Vector2(64, 64), true)
	
	# Row 4: Disabled state
	var label4 = Label.new()
	label4.text = "Disabled (32x32):"
	label4.position = Vector2(20, 290)
	add_child(label4)
	
	var cb7 = _create_checkbox(Vector2(200, 285), Vector2(32, 32), false, true)
	var cb8 = _create_checkbox(Vector2(250, 285), Vector2(32, 32), true, true)
	
	# Status label
	var status = Label.new()
	status.name = "StatusLabel"
	status.text = "Loading textures..."
	status.position = Vector2(20, 340)
	add_child(status)
	
	# Update status after a delay
	await get_tree().create_timer(3.0).timeout
	status.text = "Textures loaded (or failed - check console)"

func _create_checkbox(pos: Vector2, size: Vector2, checked: bool, disabled: bool = false) -> ThemedCheckbox:
	var cb = ThemedCheckbox.new()
	cb.position = pos
	cb.custom_minimum_size = size
	cb.size = size
	add_child(cb)
	
	# Setup after adding to tree
	cb.setup(METADATA_URL)
	
	# Set initial state after a short delay to allow loading
	cb.call_deferred("set_checked", checked)
	if disabled:
		cb.call_deferred("set_disabled", true)
	
	cb.toggled.connect(func(is_checked): 
		print("[Test] Checkbox toggled: ", is_checked)
	)
	
	checkboxes.append(cb)
	return cb
