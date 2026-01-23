extends Node

## Effects extension for GameBridge.
## This script provides effect-related methods that integrate with the main GameBridge.
## Add as an autoload or instantiate in GameBridge.

var effects_manager: EffectsManager
var particle_factory: ParticleFactory
var _game_bridge: Node = null

# Dynamic shader cache
var _dynamic_shaders: Dictionary = {}

func _ready() -> void:
	# Create subsystems
	effects_manager = EffectsManager.new()
	effects_manager.name = "EffectsManager"
	add_child(effects_manager)
	
	particle_factory = ParticleFactory.new()
	particle_factory.name = "ParticleFactory"
	add_child(particle_factory)
	
	# Find GameBridge
	_game_bridge = get_node_or_null("/root/GameBridge")
	
	# If running in web, set up JS bridge methods
	if OS.has_feature("web"):
		_setup_js_effects_bridge()

func _setup_js_effects_bridge() -> void:
	var window = JavaScriptBridge.get_interface("window")
	if window == null:
		return
	
	var bridge = window.GodotBridge
	if bridge == null:
		# Wait for GameBridge to set up first
		await get_tree().create_timer(0.1).timeout
		_setup_js_effects_bridge()
		return
	
	# Store callbacks to prevent GC
	var callbacks = []
	
	# Sprite effects
	var apply_sprite_effect_cb = JavaScriptBridge.create_callback(_js_apply_sprite_effect)
	callbacks.append(apply_sprite_effect_cb)
	bridge["applySpriteEffect"] = apply_sprite_effect_cb
	
	var update_sprite_effect_cb = JavaScriptBridge.create_callback(_js_update_sprite_effect_param)
	callbacks.append(update_sprite_effect_cb)
	bridge["updateSpriteEffectParam"] = update_sprite_effect_cb
	
	var clear_sprite_effect_cb = JavaScriptBridge.create_callback(_js_clear_sprite_effect)
	callbacks.append(clear_sprite_effect_cb)
	bridge["clearSpriteEffect"] = clear_sprite_effect_cb
	
	# Post-processing effects
	var set_post_effect_cb = JavaScriptBridge.create_callback(_js_set_post_effect)
	callbacks.append(set_post_effect_cb)
	bridge["setPostEffect"] = set_post_effect_cb
	
	var update_post_effect_cb = JavaScriptBridge.create_callback(_js_update_post_effect_param)
	callbacks.append(update_post_effect_cb)
	bridge["updatePostEffectParam"] = update_post_effect_cb
	
	var clear_post_effect_cb = JavaScriptBridge.create_callback(_js_clear_post_effect)
	callbacks.append(clear_post_effect_cb)
	bridge["clearPostEffect"] = clear_post_effect_cb
	
	# Camera effects
	var screen_shake_cb = JavaScriptBridge.create_callback(_js_screen_shake)
	callbacks.append(screen_shake_cb)
	bridge["screenShake"] = screen_shake_cb
	
	var zoom_punch_cb = JavaScriptBridge.create_callback(_js_zoom_punch)
	callbacks.append(zoom_punch_cb)
	bridge["zoomPunch"] = zoom_punch_cb
	
	var trigger_shockwave_cb = JavaScriptBridge.create_callback(_js_trigger_shockwave)
	callbacks.append(trigger_shockwave_cb)
	bridge["triggerShockwave"] = trigger_shockwave_cb
	
	var flash_screen_cb = JavaScriptBridge.create_callback(_js_flash_screen)
	callbacks.append(flash_screen_cb)
	bridge["flashScreen"] = flash_screen_cb
	
	# Dynamic shaders
	var create_dynamic_shader_cb = JavaScriptBridge.create_callback(_js_create_dynamic_shader)
	callbacks.append(create_dynamic_shader_cb)
	bridge["createDynamicShader"] = create_dynamic_shader_cb
	
	var apply_dynamic_shader_cb = JavaScriptBridge.create_callback(_js_apply_dynamic_shader)
	callbacks.append(apply_dynamic_shader_cb)
	bridge["applyDynamicShader"] = apply_dynamic_shader_cb
	
	var apply_dynamic_post_shader_cb = JavaScriptBridge.create_callback(_js_apply_dynamic_post_shader)
	callbacks.append(apply_dynamic_post_shader_cb)
	bridge["applyDynamicPostShader"] = apply_dynamic_post_shader_cb
	
	# Particles
	var spawn_particle_preset_cb = JavaScriptBridge.create_callback(_js_spawn_particle_preset)
	callbacks.append(spawn_particle_preset_cb)
	bridge["spawnParticlePreset"] = spawn_particle_preset_cb
	
	# Effect info
	var get_available_effects_cb = JavaScriptBridge.create_callback(_js_get_available_effects)
	callbacks.append(get_available_effects_cb)
	bridge["getAvailableEffects"] = get_available_effects_cb
	
	# Store callbacks to prevent garbage collection
	set_meta("_js_callbacks", callbacks)
	
	# Signal that effects bridge is ready
	bridge["_effectsReady"] = true

# ============================================================
# JS CALLBACK IMPLEMENTATIONS
# ============================================================

func _js_apply_sprite_effect(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	var effect_name = str(args[1])
	var params = _parse_params(args[2] if args.size() > 2 else {})
	apply_sprite_effect(entity_id, effect_name, params)

func _js_update_sprite_effect_param(args: Array) -> void:
	if args.size() < 3:
		return
	var entity_id = str(args[0])
	var param_name = str(args[1])
	var value = args[2]
	update_sprite_effect_param(entity_id, param_name, value)

func _js_clear_sprite_effect(args: Array) -> void:
	if args.size() < 1:
		return
	clear_sprite_effect(str(args[0]))

func _js_set_post_effect(args: Array) -> void:
	if args.size() < 1:
		return
	var effect_name = str(args[0])
	var params = _parse_params(args[1] if args.size() > 1 else {})
	var layer = str(args[2]) if args.size() > 2 else "main"
	set_post_effect(effect_name, params, layer)

func _js_update_post_effect_param(args: Array) -> void:
	if args.size() < 2:
		return
	var param_name = str(args[0])
	var value = args[1]
	var layer = str(args[2]) if args.size() > 2 else "main"
	update_post_effect_param(param_name, value, layer)

func _js_clear_post_effect(args: Array) -> void:
	var layer = str(args[0]) if args.size() > 0 else "main"
	clear_post_effect(layer)

func _js_screen_shake(args: Array) -> void:
	print("[GameBridgeEffects] _js_screen_shake called with args: ", args)
	if args.size() < 1:
		return
	var intensity = float(args[0])
	var duration = float(args[1]) if args.size() > 1 else 0.3
	screen_shake(intensity, duration)

func _js_zoom_punch(args: Array) -> void:
	var intensity = float(args[0]) if args.size() > 0 else 0.1
	var duration = float(args[1]) if args.size() > 1 else 0.15
	zoom_punch(intensity, duration)

func _js_trigger_shockwave(args: Array) -> void:
	if args.size() < 2:
		return
	var x = float(args[0])
	var y = float(args[1])
	var duration = float(args[2]) if args.size() > 2 else 0.5
	trigger_shockwave(x, y, duration)

func _js_flash_screen(args: Array) -> void:
	var color = Color.WHITE
	if args.size() > 0:
		if args[0] is Array and args[0].size() >= 3:
			color = Color(args[0][0], args[0][1], args[0][2], args[0][3] if args[0].size() > 3 else 1.0)
		elif args[0] is String:
			color = Color.from_string(args[0], Color.WHITE)
	var duration = float(args[1]) if args.size() > 1 else 0.1
	flash_screen(color, duration)

func _js_create_dynamic_shader(args: Array) -> void:
	if args.size() < 2:
		_set_last_result({"success": false, "error": "Missing required arguments: shader_id and shader_code"})
		return
	var shader_id = str(args[0])
	var shader_code = str(args[1])
	var result = create_dynamic_shader(shader_id, shader_code)
	_set_last_result(result)

func _js_apply_dynamic_shader(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	var shader_id = str(args[1])
	var params = _parse_params(args[2] if args.size() > 2 else {})
	apply_dynamic_shader_to_entity(entity_id, shader_id, params)

func _js_apply_dynamic_post_shader(args: Array) -> void:
	if args.size() < 1:
		return
	var shader_code = str(args[0])
	var params = _parse_params(args[1] if args.size() > 1 else {})
	apply_dynamic_post_shader(shader_code, params)

func _js_spawn_particle_preset(args: Array) -> void:
	print("[GameBridgeEffects] _js_spawn_particle_preset called with args: ", args)
	if args.size() < 3:
		print("[GameBridgeEffects] Not enough args for spawn_particle_preset")
		return
	var preset_name = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	var params = _parse_params(args[3] if args.size() > 3 else {})
	print("[GameBridgeEffects] Spawning particle preset: ", preset_name, " at (", x, ", ", y, ")")
	spawn_particle_preset(preset_name, x, y, params)

func _js_get_available_effects(args: Array) -> void:
	var result = {
		"sprite": effects_manager.get_available_sprite_effects(),
		"post": effects_manager.get_available_post_effects(),
		"particles": ["fire", "smoke", "sparks", "magic", "explosion", "rain", "snow", "bubbles", "confetti", "dust", "leaves", "stars", "blood", "coins"]
	}
	JavaScriptBridge.eval("window.GodotBridge._lastResult = %s;" % JSON.stringify(result))

func _parse_params(value) -> Dictionary:
	if value is Dictionary:
		return value
	if value is String:
		var json = JSON.new()
		if json.parse(value) == OK:
			return json.data if json.data is Dictionary else {}
	return {}

func _set_last_result(result: Dictionary) -> void:
	# Store result for JS to retrieve
	JavaScriptBridge.eval("window.GodotBridge._lastResult = %s;" % JSON.stringify(result))

# ============================================================
# PUBLIC API - SPRITE EFFECTS
# ============================================================

func apply_sprite_effect(entity_id: String, effect_name: String, params: Dictionary = {}) -> void:
	var sprite = _get_entity_sprite(entity_id)
	if sprite:
		effects_manager.apply_sprite_effect(sprite, effect_name, params)

func update_sprite_effect_param(entity_id: String, param_name: String, value) -> void:
	var sprite = _get_entity_sprite(entity_id)
	if sprite:
		effects_manager.update_sprite_effect_param(sprite, param_name, value)

func clear_sprite_effect(entity_id: String) -> void:
	var sprite = _get_entity_sprite(entity_id)
	if sprite:
		effects_manager.clear_sprite_effect(sprite)

# ============================================================
# PUBLIC API - POST-PROCESSING
# ============================================================

func set_post_effect(effect_name: String, params: Dictionary = {}, layer: String = "main") -> void:
	effects_manager.set_post_effect(effect_name, params, layer)

func update_post_effect_param(param_name: String, value, layer: String = "main") -> void:
	effects_manager.update_post_effect_param(param_name, value, layer)

func clear_post_effect(layer: String = "main") -> void:
	effects_manager.clear_post_effect(layer)

# ============================================================
# PUBLIC API - CAMERA EFFECTS
# ============================================================

func screen_shake(intensity: float, duration: float = 0.3) -> void:
	var camera = _get_camera()
	print("[GameBridgeEffects] screen_shake: camera=", camera, " intensity=", intensity, " duration=", duration)
	if camera:
		print("[GameBridgeEffects] camera has shake:", camera.has_method("shake"), " has add_trauma:", camera.has_method("add_trauma"))
		if camera.has_method("shake"):
			camera.shake(intensity, duration)
		elif camera.has_method("add_trauma"):
			camera.add_trauma(intensity)
		else:
			print("[GameBridgeEffects] Using effects_manager fallback for shake")
			effects_manager.screen_shake(intensity, duration)
	else:
		print("[GameBridgeEffects] No camera found!")

func zoom_punch(intensity: float = 0.1, duration: float = 0.15) -> void:
	var camera = _get_camera()
	print("[GameBridgeEffects] zoom_punch: camera=", camera, " intensity=", intensity, " duration=", duration)
	if camera:
		print("[GameBridgeEffects] camera has zoom_punch:", camera.has_method("zoom_punch"))
		if camera.has_method("zoom_punch"):
			camera.zoom_punch(intensity, duration)
		else:
			print("[GameBridgeEffects] Using effects_manager fallback for zoom_punch")
			effects_manager.zoom_punch(intensity, duration)
	else:
		print("[GameBridgeEffects] No camera found for zoom_punch!")

func trigger_shockwave(world_x: float, world_y: float, duration: float = 0.5) -> void:
	var ppm = 50.0
	if _game_bridge:
		ppm = _game_bridge.pixels_per_meter
	var world_pos = Vector2(world_x, world_y) * ppm
	effects_manager.trigger_shockwave(world_pos, duration)

func flash_screen(color: Color = Color.WHITE, duration: float = 0.1) -> void:
	effects_manager.flash_screen(color, duration)

# ============================================================
# PUBLIC API - DYNAMIC SHADERS
# ============================================================

func create_dynamic_shader(shader_id: String, shader_code: String) -> Dictionary:
	return effects_manager.create_dynamic_shader(shader_id, shader_code)

func apply_dynamic_shader_to_entity(entity_id: String, shader_id: String, params: Dictionary = {}) -> void:
	var sprite = _get_entity_sprite(entity_id)
	if sprite:
		effects_manager.apply_dynamic_shader_to_sprite(sprite, shader_id, params)

func apply_dynamic_post_shader(shader_code: String, params: Dictionary = {}) -> void:
	effects_manager.apply_dynamic_post_shader(shader_code, params)

# ============================================================
# PUBLIC API - PARTICLES
# ============================================================

func spawn_particle_preset(preset_name: String, world_x: float, world_y: float, params: Dictionary = {}) -> CPUParticles2D:
	var ppm = 50.0
	if _game_bridge:
		ppm = _game_bridge.pixels_per_meter
	var position = Vector2(world_x, world_y) * ppm
	
	var preset = particle_factory.get_preset_by_name(preset_name)
	var parent = get_tree().current_scene
	
	print("[GameBridgeEffects] spawn_particle_preset: ppm=", ppm, " position=", position, " preset=", preset, " parent=", parent)
	
	var particles = particle_factory.spawn_one_shot(preset, position, parent, params)
	print("[GameBridgeEffects] Spawned particles: ", particles, " emitting=", particles.emitting if particles else "null")
	return particles

# ============================================================
# UTILITY
# ============================================================

func _get_entity_sprite(entity_id: String) -> CanvasItem:
	if not _game_bridge:
		_game_bridge = get_node_or_null("/root/GameBridge")
	if not _game_bridge:
		print("[GameBridgeEffects] _get_entity_sprite: GameBridge not found")
		return null
	
	var entity = _game_bridge.get_entity(entity_id)
	if not entity:
		print("[GameBridgeEffects] _get_entity_sprite: entity not found: ", entity_id)
		return null
	
	# Look for Sprite2D or Polygon2D child
	for child in entity.get_children():
		if child is Sprite2D or child is Polygon2D:
			print("[GameBridgeEffects] _get_entity_sprite: found ", child.get_class(), " for ", entity_id)
			return child
	
	# Fallback to entity itself if it's a CanvasItem
	if entity is CanvasItem:
		print("[GameBridgeEffects] _get_entity_sprite: using entity itself for ", entity_id)
		return entity
	
	print("[GameBridgeEffects] _get_entity_sprite: no sprite found for ", entity_id, " children: ", entity.get_children())
	return null

func _get_camera() -> Camera2D:
	var camera: Camera2D = null
	
	if _game_bridge and _game_bridge.camera:
		camera = _game_bridge.camera
	else:
		var viewport = get_viewport()
		if viewport:
			camera = viewport.get_camera_2d()
	
	if camera and effects_manager:
		effects_manager.set_camera(camera)
	
	return camera
