class_name AudioManager
extends RefCounted

var bridge: Node
var audio_cache: Dictionary = {}

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

func play_sound(resource_path: String) -> void:
	var stream: AudioStream = null
	
	if audio_cache.has(resource_path):
		stream = audio_cache[resource_path]
	else:
		stream = load(resource_path)
		if stream:
			audio_cache[resource_path] = stream
	
	if stream == null:
		push_error("[AudioManager] Failed to load sound: " + resource_path)
		return
	
	var player = AudioStreamPlayer.new()
	player.stream = stream
	player.finished.connect(func(): player.queue_free())
	bridge.add_child(player)
	player.play()

func play_sound_at_position(resource_path: String, x: float, y: float) -> void:
	var stream: AudioStream = null
	
	if audio_cache.has(resource_path):
		stream = audio_cache[resource_path]
	else:
		stream = load(resource_path)
		if stream:
			audio_cache[resource_path] = stream
	
	if stream == null:
		push_error("[AudioManager] Failed to load sound: " + resource_path)
		return
	
	var player = AudioStreamPlayer2D.new()
	player.stream = stream
	player.position = CoordinateUtils.game_to_godot_pos(Vector2(x, y), bridge.pixels_per_meter)
	player.finished.connect(func(): player.queue_free())
	bridge.add_child(player)
	player.play()

func clear_cache() -> void:
	audio_cache.clear()
