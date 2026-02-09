extends Node2D

# Headless test scene controller
# Mirrors Main.gd setup: sets GameBridge.game_root and adds the test adapter

@onready var game_root: Node2D = $GameRoot

func _ready() -> void:
	print("[HeadlessTestMain] _ready() - setting game_root on GameBridge")
	GameBridge.game_root = game_root
	print("[HeadlessTestMain] game_root set: ", game_root, " name=", game_root.name if game_root else "NULL")
