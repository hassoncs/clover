extends Node2D

# Main scene controller
# Games are now loaded dynamically via GameBridge from React Native / Web

@onready var game_root: Node2D = $GameRoot

func _ready() -> void:
	# Set the game root for GameBridge
	GameBridge.game_root = game_root
	
	# Check if we should load the UI components demo
	if OS.has_environment("LOAD_UI_DEMO"):
		_load_ui_demo()

func _load_ui_demo() -> void:
	var ui_demo = load("res://scenes/lab/ui_components_demo.tscn").instantiate()
	game_root.add_child(ui_demo)
