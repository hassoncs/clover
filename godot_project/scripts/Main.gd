extends Node2D

# Main scene controller
# Games are now loaded dynamically via GameBridge from React Native / Web

@onready var game_root: Node2D = $GameRoot

func _ready() -> void:
	# Set the game root for GameBridge
	GameBridge.game_root = game_root
