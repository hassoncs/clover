class_name UIManager
extends RefCounted

var _bridge: Node
var _ui_buttons: Dictionary = {}
var _audio_cache: Dictionary = {}
var _current_music_player: AudioStreamPlayer = null

func _init(bridge: Node) -> void:
	_bridge = bridge


# =============================================================================
# JS HANDLERS (called from JavaScript bridge)
# =============================================================================

func _js_create_ui_button(args: Array) -> void:
	# args: [buttonId, normalImageUrl, pressedImageUrl, x, y, width, height]
	if args.size() < 7:
		push_error("[UIManager] createUIButton requires 7 args: buttonId, normalUrl, pressedUrl, x, y, width, height")
		return
	create_ui_button(
		str(args[0]),
		str(args[1]),
		str(args[2]),
		float(args[3]),
		float(args[4]),
		float(args[5]),
		float(args[6])
	)


func _js_destroy_ui_button(args: Array) -> void:
	if args.size() < 1:
		return
	destroy_ui_button(str(args[0]))


func _js_spawn_particle(args: Array) -> void:
	if args.size() < 3:
		push_error("[UIManager] spawnParticle requires 3 args: type, x, y")
		return
	spawn_particle(str(args[0]), float(args[1]), float(args[2]))


func _js_play_sound(args: Array) -> void:
	if args.size() < 1:
		push_error("[UIManager] playSound requires 1 arg: resource_path")
		return
	var volume = 1.0
	var pitch = 1.0
	if args.size() >= 2:
		volume = float(args[1])
	if args.size() >= 3:
		pitch = float(args[2])
	play_sound(str(args[0]), volume, pitch)


func _js_play_music(args: Array) -> void:
	if args.size() < 1:
		push_error("[UIManager] playMusic requires 1 arg: resource_path")
		return
	var volume = 0.7
	var loop = true
	if args.size() >= 2:
		volume = float(args[1])
	if args.size() >= 3:
		loop = bool(args[2])
	play_music(str(args[0]), volume, loop)


func _js_stop_music(_args: Array) -> void:
	stop_music()


# =============================================================================
# UI BUTTON SYSTEM
# =============================================================================

func create_ui_button(
	button_id: String,
	normal_url: String,
	pressed_url: String,
	pos_x: float,
	pos_y: float,
	btn_width: float,
	btn_height: float
) -> void:
	if _ui_buttons.has(button_id):
		_ui_buttons[button_id].queue_free()
		_ui_buttons.erase(button_id)

	var button = TextureButton.new()
	button.name = button_id
	button.position = Vector2(pos_x, pos_y)
	button.custom_minimum_size = Vector2(btn_width, btn_height)
	button.size = Vector2(btn_width, btn_height)
	button.ignore_texture_size = true
	button.stretch_mode = TextureButton.STRETCH_SCALE

	var normal_tex = _create_placeholder_texture(AssetUtils.get_asset_url(normal_url, _bridge), int(btn_width), int(btn_height))
	var pressed_tex = _create_placeholder_texture(AssetUtils.get_asset_url(pressed_url, _bridge), int(btn_width), int(btn_height))

	button.texture_normal = normal_tex
	button.texture_pressed = pressed_tex

	button.button_down.connect(_on_ui_button_down.bind(button_id))
	button.button_up.connect(_on_ui_button_up.bind(button_id))
	button.pressed.connect(_on_ui_button_pressed.bind(button_id))

	var ui_layer = _get_or_create_ui_layer()
	ui_layer.add_child(button)
	_ui_buttons[button_id] = button


func destroy_ui_button(button_id: String) -> void:
	if _ui_buttons.has(button_id):
		_ui_buttons[button_id].queue_free()
		_ui_buttons.erase(button_id)


func _on_ui_button_down(button_id: String) -> void:
	if _bridge and _bridge._event_emitter:
		_bridge._event_emitter.emit_ui_button_event("button_down", button_id)


func _on_ui_button_up(button_id: String) -> void:
	if _bridge and _bridge._event_emitter:
		_bridge._event_emitter.emit_ui_button_event("button_up", button_id)


func _on_ui_button_pressed(button_id: String) -> void:
	if _bridge and _bridge._event_emitter:
		_bridge._event_emitter.emit_ui_button_event("button_pressed", button_id)


func _get_or_create_ui_layer() -> CanvasLayer:
	var ui_layer = _bridge.get_node_or_null("UILayer")
	if ui_layer:
		return ui_layer

	ui_layer = CanvasLayer.new()
	ui_layer.name = "UILayer"
	ui_layer.layer = 100
	_bridge.add_child(ui_layer)
	return ui_layer


func _create_placeholder_texture(url: String, width: int, height: int) -> ImageTexture:
	var color = Color.GRAY

	if "dummyimage.com" in url:
		var parts = url.split("/")
		for i in range(parts.size()):
			if "x" in parts[i] and parts[i].is_valid_int() == false:
				if i + 1 < parts.size():
					var color_str = parts[i + 1]
					if color_str.length() == 3 or color_str.length() == 6:
						color = Color.from_string("#" + color_str, Color.GRAY)
						break

	var image = Image.create(width, height, false, Image.FORMAT_RGBA8)
	image.fill(color)

	var texture = ImageTexture.create_from_image(image)
	return texture


# =============================================================================
# AUDIO SYSTEM
# =============================================================================

func play_sound(resource_path: String, volume: float = 1.0, pitch: float = 1.0) -> void:
	pitch = clampf(pitch, 0.1, 4.0)
	print("[UIManager] Playing sound '%s' volume=%s pitch=%s" % [resource_path, volume, pitch])

	if _audio_cache.has(resource_path):
		_play_cached_audio(_audio_cache[resource_path], volume, pitch)
		return

	var resource = load(resource_path)
	if resource == null or not (resource is AudioStream):
		push_error("[UIManager] play_sound: failed to load audio resource: " + resource_path)
		return

	_audio_cache[resource_path] = resource
	_play_cached_audio(resource, volume, pitch)


func _play_cached_audio(audio_stream: AudioStream, volume: float, pitch: float = 1.0) -> void:
	var player = AudioStreamPlayer.new()
	player.stream = audio_stream
	player.volume_db = linear_to_db(volume)
	player.pitch_scale = pitch
	_bridge.add_child(player)
	player.play()
	player.finished.connect(player.queue_free)


func play_music(resource_path: String, volume: float = 0.7, loop: bool = true) -> void:
	print("[UIManager] Starting music '%s' volume=%s loop=%s" % [resource_path, volume, loop])

	if _current_music_player != null:
		stop_music()

	var resource = load(resource_path)
	if resource == null or not (resource is AudioStream):
		push_error("[UIManager] play_music: failed to load audio resource: " + resource_path)
		return

	if loop:
		if resource is AudioStreamWAV:
			resource.loop_mode = AudioStreamWAV.LOOP_FORWARD
		elif resource is AudioStreamOggVorbis:
			resource.loop = true
		elif resource is AudioStreamMP3:
			resource.loop = true

	var player = AudioStreamPlayer.new()
	player.stream = resource
	player.volume_db = linear_to_db(volume)
	_bridge.add_child(player)
	player.play()
	_current_music_player = player


func stop_music() -> void:
	print("[UIManager] Stopping music")
	if _current_music_player != null:
		_current_music_player.stop()
		_current_music_player.queue_free()
		_current_music_player = null


# =============================================================================
# PARTICLE SYSTEM
# =============================================================================

func spawn_particle(particle_type: String, x: float, y: float) -> void:
	var godot_pos = _game_to_godot_pos(Vector2(x, y))

	var particles: CPUParticles2D = null

	# Try to load from scene first
	var scene_path = "res://particles/" + particle_type + ".tscn"
	if ResourceLoader.exists(scene_path):
		var scene = load(scene_path)
		if scene:
			var instance = scene.instantiate()
			if instance is CPUParticles2D:
				particles = instance
			elif instance is GPUParticles2D:
				push_warning("[UIManager] GPUParticles2D not supported, using fallback")
			else:
				for child in instance.get_children():
					if child is CPUParticles2D:
						particles = child
						child.get_parent().remove_child(child)
						instance.queue_free()
						break
				if particles == null:
					instance.queue_free()

	# Fallback to generated particles
	if particles == null:
		particles = _create_particles(particle_type)

	particles.position = godot_pos
	particles.one_shot = true
	particles.emitting = false

	var game_root = _bridge.get_node_or_null("GameRoot")
	if game_root:
		game_root.add_child(particles)
	else:
		var main = _bridge.get_tree().current_scene
		if main:
			main.add_child(particles)

	particles.emitting = true
	particles.finished.connect(particles.queue_free)


func _create_particles(particle_type: String) -> CPUParticles2D:
	var particles = CPUParticles2D.new()
	particles.amount = 16
	particles.explosiveness = 1.0
	particles.spread = 180.0
	particles.gravity = Vector2(0, 0)
	particles.initial_velocity_min = 50.0
	particles.initial_velocity_max = 100.0
	particles.scale_amount_min = 2.0
	particles.scale_amount_max = 4.0
	particles.color = Color.YELLOW
	particles.lifetime = 0.5
	particles.one_shot = true
	particles.emitting = false

	var color_config = _get_particle_color(particle_type)
	particles.color = color_config.color
	particles.scale_amount_min = color_config.scale_min
	particles.scale_amount_max = color_config.scale_max
	particles.initial_velocity_min = color_config.velocity_min
	particles.initial_velocity_max = color_config.velocity_max
	particles.lifetime = color_config.lifetime

	return particles


func _get_particle_color(particle_type: String) -> Dictionary:
	match particle_type:
		"explosion":
			return {"color": Color(1.0, 0.5, 0.0), "scale_min": 4.0, "scale_max": 8.0, "velocity_min": 100.0, "velocity_max": 200.0, "lifetime": 0.8}
		"sparkle":
			return {"color": Color(1.0, 1.0, 0.5), "scale_min": 1.0, "scale_max": 3.0, "velocity_min": 30.0, "velocity_max": 60.0, "lifetime": 0.4}
		"smoke":
			return {"color": Color(0.5, 0.5, 0.5), "scale_min": 8.0, "scale_max": 16.0, "velocity_min": 10.0, "velocity_max": 30.0, "lifetime": 1.0}
		"confetti":
			return {"color": Color(randf(), randf(), randf()), "scale_min": 2.0, "scale_max": 5.0, "velocity_min": 80.0, "velocity_max": 150.0, "lifetime": 0.6}
		_:
			return {"color": Color.YELLOW, "scale_min": 2.0, "scale_max": 4.0, "velocity_min": 50.0, "velocity_max": 100.0, "lifetime": 0.5}


func _game_to_godot_pos(game_pos: Vector2) -> Vector2:
	var viewport_size = _get_viewport_size()
	var godot_x = (viewport_size.x / 2.0) + game_pos.x
	var godot_y = (viewport_size.y / 2.0) - game_pos.y
	return Vector2(godot_x, godot_y)


func _get_viewport_size() -> Vector2:
	var viewport = _bridge.get_viewport()
	if viewport:
		return viewport.get_visible_rect().size
	return Vector2(1152, 648)

# =============================================================================
# THEMED UI COMPONENTS
# =============================================================================

func create_themed_ui_component(
	component_id: String,
	component_type: int,
	metadata_url: String,
	pos_x: float,
	pos_y: float,
	width: float,
	height: float,
	label_text: String = ""
) -> void:
	var ui_layer = _get_or_create_ui_layer()

	var themed_comp = load("res://scripts/ui/ThemedUIComponent.gd").new()
	themed_comp.name = component_id
	themed_comp.position = Vector2(pos_x, pos_y)
	themed_comp.custom_minimum_size = Vector2(width, height)
	themed_comp.setup(component_type, metadata_url, label_text, "", _bridge)

	ui_layer.add_child(themed_comp)
	_ui_buttons[component_id] = themed_comp


func destroy_themed_ui_component(component_id: String) -> void:
	if _ui_buttons.has(component_id):
		_ui_buttons[component_id].queue_free()
		_ui_buttons.erase(component_id)


# =============================================================================
# JS CALLBACK SETUP
# =============================================================================

func _js_on_ui_button_event(args: Array) -> void:
	if args.size() >= 1 and _bridge and _bridge._event_emitter:
		_bridge._event_emitter.set_ui_button_callback(args[0])
