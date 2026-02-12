extends Node2D

@onready var game_root: Node2D = $GameRoot

func _ready() -> void:
	GameBridge.game_root = game_root

	if OS.has_environment("LOAD_UI_DEMO"):
		var ui_demo = load("res://scenes/lab/ui_components_demo.tscn").instantiate()
		game_root.add_child(ui_demo)
