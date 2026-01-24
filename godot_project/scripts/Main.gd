extends Node2D

# Main scene controller
# Handles input and coordinates with GameBridge

@onready var debug_label: Label = $UI/DebugLabel
@onready var score_label: Label = $UI/ScoreLabel
@onready var game_root: Node2D = $GameRoot

var score: int = 0

# Physics Stacker game definition (embedded for spike testing)
var physics_stacker_json := """
{
  "metadata": {
    "id": "test-physics-stacker",
    "title": "Physics Stacker",
    "version": "1.0.0"
  },
  "world": {
    "gravity": { "x": 0, "y": 9.8 },
    "pixelsPerMeter": 50,
    "bounds": { "width": 14, "height": 18 }
  },
  "templates": {
    "foundation": {
      "id": "foundation",
      "tags": ["ground"],
      "sprite": { "type": "rect", "width": 4, "height": 0.6, "color": "#8B4513" },
      "physics": {
        "bodyType": "static",
        "shape": "box",
        "width": 4,
        "height": 0.6,
        "density": 0,
        "friction": 0.9,
        "restitution": 0
      }
    },
    "dropper": {
      "id": "dropper",
      "tags": ["dropper"],
      "sprite": { "type": "rect", "width": 2, "height": 0.3, "color": "#666666" },
      "physics": {
        "bodyType": "kinematic",
        "shape": "box",
        "width": 2,
        "height": 0.3,
        "isSensor": true
      }
    },
    "blockWide": {
      "id": "blockWide",
      "tags": ["block"],
      "sprite": { "type": "rect", "width": 1.8, "height": 0.6, "color": "#FF69B4" },
      "physics": {
        "bodyType": "dynamic",
        "shape": "box",
        "width": 1.8,
        "height": 0.6,
        "density": 1,
        "friction": 0.8,
        "restitution": 0.1
      }
    },
    "blockMedium": {
      "id": "blockMedium",
      "tags": ["block"],
      "sprite": { "type": "rect", "width": 1.4, "height": 0.6, "color": "#FF1493" },
      "physics": {
        "bodyType": "dynamic",
        "shape": "box",
        "width": 1.4,
        "height": 0.6,
        "density": 1,
        "friction": 0.8,
        "restitution": 0.1
      }
    },
    "blockSmall": {
      "id": "blockSmall",
      "tags": ["block"],
      "sprite": { "type": "rect", "width": 1.0, "height": 0.6, "color": "#DB7093" },
      "physics": {
        "bodyType": "dynamic",
        "shape": "box",
        "width": 1.0,
        "height": 0.6,
        "density": 1,
        "friction": 0.8,
        "restitution": 0.1
      }
    },
    "deathZone": {
      "id": "deathZone",
      "tags": ["death-zone"],
      "sprite": { "type": "rect", "width": 20, "height": 2, "color": "#FF000033" },
      "physics": {
        "bodyType": "static",
        "shape": "box",
        "width": 20,
        "height": 2,
        "isSensor": true
      }
    }
  },
  "entities": [
    { "id": "foundation", "name": "Foundation", "template": "foundation", "transform": { "x": 7, "y": 16, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "dropper", "name": "Block Dropper", "template": "dropper", "transform": { "x": 7, "y": 2, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "death-zone", "name": "Death Zone", "template": "deathZone", "transform": { "x": 7, "y": 19, "angle": 0, "scaleX": 1, "scaleY": 1 } }
  ]
}
"""

var dropper_node: Node2D = null
var oscillate_time: float = 0.0
var block_templates := ["blockWide", "blockMedium", "blockSmall"]

func _ready() -> void:
	# Set the game root for GameBridge
	GameBridge.game_root = game_root
	
	# Connect signals
	GameBridge.game_loaded.connect(_on_game_loaded)
	GameBridge.collision_occurred.connect(_on_collision)
	
	debug_label.text = ""

func _on_game_loaded(game_data: Dictionary) -> void:
	# Get dropper reference for oscillation
	dropper_node = GameBridge.get_entity("dropper")

func _on_collision(entity_a: String, entity_b: String, impulse: float) -> void:
	# Check if a block hit the death zone
	if "block" in entity_a and "death" in entity_b:
		score -= 100
		GameBridge.destroy_entity(entity_a)
	elif "block" in entity_b and "death" in entity_a:
		score -= 100
		GameBridge.destroy_entity(entity_b)
	else:
		# Block landed on something - score points!
		if "block" in entity_a or "block" in entity_b:
			score += 50
	
	score_label.text = "Score: " + str(score)

func _process(delta: float) -> void:
	# Oscillate the dropper (simulating the oscillate behavior)
	if dropper_node and is_instance_valid(dropper_node):
		oscillate_time += delta
		var amplitude = 4.0 * GameBridge.pixels_per_meter  # 4 meters
		var frequency = 0.3  # Hz
		var x_offset = amplitude * sin(2.0 * PI * frequency * oscillate_time)
		dropper_node.position.x = 7.0 * GameBridge.pixels_per_meter + x_offset

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_SPACE:
				_load_game()
			KEY_R:
				_reload_game()
	
	# Spawn block on click/tap
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_spawn_block()
		
		# Notify JS of tap event (for web integration)
		if OS.has_feature("web"):
			var mouse_pos = event.position
			var world_pos = mouse_pos / GameBridge.pixels_per_meter
			GameBridge.send_input("tap", world_pos.x, world_pos.y)

func _load_game() -> void:
	score = 0
	score_label.text = "Score: 0"
	var success = GameBridge.load_game_json(physics_stacker_json)
	if not success:
		print("Failed to load game!")

func _reload_game() -> void:
	_load_game()

func _spawn_block() -> void:
	if not dropper_node or not is_instance_valid(dropper_node):
		return
	
	# Spawn at dropper position
	var spawn_x = dropper_node.position.x / GameBridge.pixels_per_meter
	var spawn_y = dropper_node.position.y / GameBridge.pixels_per_meter + 0.5
	
	# Random block type
	var template = block_templates[randi() % block_templates.size()]
	GameBridge.spawn_entity(template, spawn_x, spawn_y)
