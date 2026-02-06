extends Node2D

# Main scene controller
# Games are now loaded dynamically via GameBridge from React Native / Web

@onready var game_root: Node2D = $GameRoot

func _ready() -> void:
	print("[Main] _ready() - setting game_root on GameBridge")
	# Set the game root for GameBridge
	GameBridge.game_root = game_root
	print("[Main] game_root set: ", game_root, " name=", game_root.name if game_root else "NULL")
	
	# Check if we should load the UI components demo
	if OS.has_environment("LOAD_UI_DEMO"):
		_load_ui_demo()

func _load_ui_demo() -> void:
	var ui_demo = load("res://scenes/lab/ui_components_demo.tscn").instantiate()
	game_root.add_child(ui_demo)
