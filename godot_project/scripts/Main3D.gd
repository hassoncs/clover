extends Node3D

@onready var game_root: Node3D = $GameRoot3D
@onready var camera: Camera3D = $Camera3D
@onready var light: DirectionalLight3D = $DirectionalLight3D

func _ready() -> void:
	GameBridge.game_root_3d = game_root
	GameBridge.camera_3d = camera
