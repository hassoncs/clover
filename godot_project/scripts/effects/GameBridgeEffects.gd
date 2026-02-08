extends Node

## Effects extension for GameBridge.
## This script provides effect-related methods that integrate with the main GameBridge.
## Add as an autoload or instantiate in GameBridge.

var effects_manager: EffectsManager
var particle_factory: ParticleFactory
var pipeline_executor: PipelineExecutor
var multi_pass_executor: MultiPassExecutor
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

	pipeline_executor = PipelineExecutor.new()
	pipeline_executor.name = "PipelineExecutor"
	add_child(pipeline_executor)
	pipeline_executor.configure(effects_manager, Callable(self, "_get_entity_sprite"))

	multi_pass_executor = MultiPassExecutor.new()
	multi_pass_executor.name = "MultiPassExecutor"
	add_child(multi_pass_executor)

	# Find GameBridge
	_game_bridge = get_node_or_null("/root/GameBridge")
	if _game_bridge and "_pixel_buffer_manager" in _game_bridge:
		multi_pass_executor.setup(_game_bridge, _game_bridge._pixel_buffer_manager)

	_build_effects_method_map()

	# If running in web, set up JS bridge methods
	if OS.has_feature("web"):
		_setup_js_effects_bridge()

var _method_map: Dictionary = {}

func _build_effects_method_map() -> void:
	_method_map = {
		"apply_sprite_effect": _js_apply_sprite_effect,
		"update_sprite_effect_param": _js_update_sprite_effect_param,
		"clear_sprite_effect": _js_clear_sprite_effect,
		"set_post_effect": _js_set_post_effect,
		"update_post_effect_param": _js_update_post_effect_param,
		"clear_post_effect": _js_clear_post_effect,
		"screen_shake": _js_screen_shake,
		"zoom_punch": _js_zoom_punch,
		"trigger_shockwave": _js_trigger_shockwave,
		"flash_screen": _js_flash_screen,
		"create_dynamic_shader": _js_create_dynamic_shader,
		"apply_dynamic_shader_to_entity": _js_apply_dynamic_shader,
		"apply_dynamic_post_shader": _js_apply_dynamic_post_shader,
		"apply_pipeline": _js_apply_pipeline,
		"clear_pipeline": _js_clear_pipeline,
		"update_pipeline_pass_param": _js_update_pipeline_pass_param,
		"start_pipeline": _js_start_pipeline,
		"pause_pipeline": _js_pause_pipeline,
		"resume_pipeline": _js_resume_pipeline,
		"stop_pipeline": _js_stop_pipeline,
		"reset_pipeline": _js_reset_pipeline,
		"spawn_particle_preset": _js_spawn_particle_preset,
		"get_available_effects": _js_get_available_effects,
		"capture_pipeline_snapshot": _js_capture_pipeline_snapshot,
		"restore_pipeline_snapshot": _js_restore_pipeline_snapshot,
		"apply_multi_pass_effect": _js_apply_multi_pass_effect,
		"start_multi_pass_effect": _js_start_multi_pass_effect,
		"stop_multi_pass_effect": _js_stop_multi_pass_effect,
		"set_multi_pass_input": _js_set_multi_pass_input,
		"clear_multi_pass_effect": _js_clear_multi_pass_effect,
	}

func native_dispatch(method_name: String, args_json: String) -> Variant:
	if not _method_map.has(method_name):
		push_warning("[GameBridgeEffects] Unknown native method: " + method_name)
		return null
	var args: Array = []
	if args_json != "[]" and args_json != "":
		var json = JSON.new()
		if json.parse(args_json) == OK:
			args = json.data if json.data is Array else [json.data]
	return _method_map[method_name].call(args)

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

	var apply_pipeline_cb = JavaScriptBridge.create_callback(_js_apply_pipeline)
	callbacks.append(apply_pipeline_cb)
	bridge["applyPipeline"] = apply_pipeline_cb

	var clear_pipeline_cb = JavaScriptBridge.create_callback(_js_clear_pipeline)
	callbacks.append(clear_pipeline_cb)
	bridge["clearPipeline"] = clear_pipeline_cb

	var update_pipeline_pass_param_cb = JavaScriptBridge.create_callback(_js_update_pipeline_pass_param)
	callbacks.append(update_pipeline_pass_param_cb)
	bridge["updatePipelinePassParam"] = update_pipeline_pass_param_cb

	var start_pipeline_cb = JavaScriptBridge.create_callback(_js_start_pipeline)
	callbacks.append(start_pipeline_cb)
	bridge["startPipeline"] = start_pipeline_cb

	var pause_pipeline_cb = JavaScriptBridge.create_callback(_js_pause_pipeline)
	callbacks.append(pause_pipeline_cb)
	bridge["pausePipeline"] = pause_pipeline_cb

	var resume_pipeline_cb = JavaScriptBridge.create_callback(_js_resume_pipeline)
	callbacks.append(resume_pipeline_cb)
	bridge["resumePipeline"] = resume_pipeline_cb

	var stop_pipeline_cb = JavaScriptBridge.create_callback(_js_stop_pipeline)
	callbacks.append(stop_pipeline_cb)
	bridge["stopPipeline"] = stop_pipeline_cb

	var reset_pipeline_cb = JavaScriptBridge.create_callback(_js_reset_pipeline)
	callbacks.append(reset_pipeline_cb)
	bridge["resetPipeline"] = reset_pipeline_cb

	var capture_snapshot_cb = JavaScriptBridge.create_callback(_js_capture_pipeline_snapshot)
	callbacks.append(capture_snapshot_cb)
	bridge["capturePipelineSnapshot"] = capture_snapshot_cb

	var restore_snapshot_cb = JavaScriptBridge.create_callback(_js_restore_pipeline_snapshot)
	callbacks.append(restore_snapshot_cb)
	bridge["restorePipelineSnapshot"] = restore_snapshot_cb

	# Particles
	var spawn_particle_preset_cb = JavaScriptBridge.create_callback(_js_spawn_particle_preset)
	callbacks.append(spawn_particle_preset_cb)
	bridge["spawnParticlePreset"] = spawn_particle_preset_cb
	
	# Effect info
	var get_available_effects_cb = JavaScriptBridge.create_callback(_js_get_available_effects)
	callbacks.append(get_available_effects_cb)
	bridge["getAvailableEffects"] = get_available_effects_cb
	
	var apply_multi_pass_effect_cb = JavaScriptBridge.create_callback(_js_apply_multi_pass_effect)
	callbacks.append(apply_multi_pass_effect_cb)
	bridge["applyMultiPassEffect"] = apply_multi_pass_effect_cb

	var start_multi_pass_effect_cb = JavaScriptBridge.create_callback(_js_start_multi_pass_effect)
	callbacks.append(start_multi_pass_effect_cb)
	bridge["startMultiPassEffect"] = start_multi_pass_effect_cb

	var stop_multi_pass_effect_cb = JavaScriptBridge.create_callback(_js_stop_multi_pass_effect)
	callbacks.append(stop_multi_pass_effect_cb)
	bridge["stopMultiPassEffect"] = stop_multi_pass_effect_cb

	var set_multi_pass_input_cb = JavaScriptBridge.create_callback(_js_set_multi_pass_input)
	callbacks.append(set_multi_pass_input_cb)
	bridge["setMultiPassInput"] = set_multi_pass_input_cb

	var clear_multi_pass_effect_cb = JavaScriptBridge.create_callback(_js_clear_multi_pass_effect)
	callbacks.append(clear_multi_pass_effect_cb)
	bridge["clearMultiPassEffect"] = clear_multi_pass_effect_cb

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

func _js_apply_pipeline(args: Array) -> void:
	if args.size() < 1:
		return
	apply_pipeline(args[0])

func _js_clear_pipeline(args: Array) -> void:
	clear_pipeline()

func _js_update_pipeline_pass_param(args: Array) -> void:
	if args.size() < 3:
		return
	update_pipeline_pass_param(str(args[0]), str(args[1]), args[2])

func _js_start_pipeline(args: Array) -> void:
	start_pipeline()

func _js_pause_pipeline(args: Array) -> void:
	pause_pipeline()

func _js_resume_pipeline(args: Array) -> void:
	resume_pipeline()

func _js_stop_pipeline(args: Array) -> void:
	stop_pipeline()

func _js_reset_pipeline(args: Array) -> void:
	reset_pipeline()

func _js_capture_pipeline_snapshot(args: Array) -> void:
	var result = capture_pipeline_snapshot()
	_set_last_result(result)

func _js_restore_pipeline_snapshot(args: Array) -> void:
	if args.size() < 1:
		_set_last_result({"success": false, "error": "Missing snapshot argument"})
		return
	var snapshot = _parse_params(args[0])
	var success = restore_pipeline_snapshot(snapshot)
	_set_last_result({"success": success})

func _js_spawn_particle_preset(args: Array) -> void:
	if args.size() < 3:
		return
	var preset_name = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	var params = _parse_params(args[3] if args.size() > 3 else {})
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

func apply_sprite_effect(entity_id: String, effect_name: String, params = {}) -> void:
	var sprite = _get_entity_sprite(entity_id)
	if sprite:
		var parsed_params = _parse_params(params)
		effects_manager.apply_sprite_effect(sprite, effect_name, parsed_params)

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

func set_post_effect(effect_name: String, params = {}, layer: String = "main") -> void:
	var parsed_params = _parse_params(params)
	effects_manager.set_post_effect(effect_name, parsed_params, layer)

func update_post_effect_param(param_name: String, value, layer: String = "main") -> void:
	effects_manager.update_post_effect_param(param_name, value, layer)

func clear_post_effect(layer: String = "main") -> void:
	effects_manager.clear_post_effect(layer)

# ============================================================
# PUBLIC API - CAMERA EFFECTS
# ============================================================

func screen_shake(intensity: float, duration: float = 0.3) -> void:
	var camera = _get_camera()
	if camera:
		if camera.has_method("shake"):
			camera.shake(intensity, duration)
		elif camera.has_method("add_trauma"):
			camera.add_trauma(intensity)
		else:
			effects_manager.screen_shake(intensity, duration)

func zoom_punch(intensity: float = 0.1, duration: float = 0.15) -> void:
	var camera = _get_camera()
	if camera:
		if camera.has_method("zoom_punch"):
			camera.zoom_punch(intensity, duration)
		else:
			effects_manager.zoom_punch(intensity, duration)

func trigger_shockwave(world_x: float, world_y: float, duration: float = 0.5) -> void:
	var ppm = 50.0
	if _game_bridge:
		ppm = _game_bridge.pixels_per_meter
	var world_pos = Vector2(world_x, world_y) * ppm
	effects_manager.trigger_shockwave(world_pos, duration)

func flash_screen(r: float = 1.0, g: float = 1.0, b: float = 1.0, a: float = 1.0, duration: float = 0.1) -> void:
	var color = Color(r, g, b, a)
	effects_manager.flash_screen(color, duration)

# ============================================================
# PUBLIC API - DYNAMIC SHADERS
# ============================================================

func create_dynamic_shader(shader_id: String, shader_code: String) -> Dictionary:
	return effects_manager.create_dynamic_shader(shader_id, shader_code)

func apply_dynamic_shader_to_entity(entity_id: String, shader_id: String, params = {}) -> void:
	var sprite = _get_entity_sprite(entity_id)
	if sprite:
		var parsed_params = _parse_params(params)
		effects_manager.apply_dynamic_shader_to_sprite(sprite, shader_id, parsed_params)

func apply_dynamic_post_shader(shader_code: String, params = {}) -> void:
	var parsed_params = _parse_params(params)
	effects_manager.apply_dynamic_post_shader(shader_code, parsed_params)

func apply_pipeline(spec_json) -> void:
	if pipeline_executor == null:
		return

	var spec_dict: Dictionary = {}
	if spec_json is Dictionary:
		spec_dict = spec_json
	elif spec_json is String:
		var json = JSON.new()
		if json.parse(spec_json) == OK and json.data is Dictionary:
			spec_dict = json.data

	pipeline_executor.apply_pipeline(spec_dict)

func clear_pipeline() -> void:
	if pipeline_executor:
		pipeline_executor.clear_pipeline()

func update_pipeline_pass_param(pass_id: String, param_name: String, value) -> void:
	if pipeline_executor:
		pipeline_executor.update_pass_param(pass_id, param_name, value)

func start_pipeline() -> void:
	if pipeline_executor:
		pipeline_executor.start_pipeline()

func pause_pipeline() -> void:
	if pipeline_executor:
		pipeline_executor.pause_pipeline()

func resume_pipeline() -> void:
	if pipeline_executor:
		pipeline_executor.resume_pipeline()

func stop_pipeline() -> void:
	if pipeline_executor:
		pipeline_executor.stop_pipeline()

func reset_pipeline() -> void:
	if pipeline_executor:
		pipeline_executor.reset_pipeline()

func capture_pipeline_snapshot() -> Dictionary:
	if pipeline_executor:
		return pipeline_executor.capture_snapshot()
	return {}

func restore_pipeline_snapshot(snapshot: Dictionary) -> bool:
	if pipeline_executor:
		return pipeline_executor.restore_snapshot(snapshot)
	return false

# ============================================================
# PUBLIC API - PARTICLES
# ============================================================

func spawn_particle_preset(preset_name: String, world_x: float, world_y: float, params = {}) -> CPUParticles2D:
	var ppm = 50.0
	if _game_bridge:
		ppm = _game_bridge.pixels_per_meter
	var position = Vector2(world_x, world_y) * ppm
	
	var preset = particle_factory.get_preset_by_name(preset_name)
	var parent = get_tree().current_scene
	var parsed_params = _parse_params(params)
	
	var particles = particle_factory.spawn_one_shot(preset, position, parent, parsed_params)
	return particles

# ============================================================
# PUBLIC API - MULTI-PASS EFFECTS
# ============================================================

func _js_apply_multi_pass_effect(args: Array) -> void:
	if args.size() < 2:
		return
	var entity_id = str(args[0])
	var spec = args[1]
	var spec_dict: Dictionary = {}
	if spec is Dictionary:
		spec_dict = spec
	elif spec is String:
		var json = JSON.new()
		if json.parse(spec) == OK and json.data is Dictionary:
			spec_dict = json.data
	apply_multi_pass_effect(entity_id, spec_dict)

func _js_start_multi_pass_effect(args: Array) -> void:
	start_multi_pass_effect()

func _js_stop_multi_pass_effect(args: Array) -> void:
	stop_multi_pass_effect()

func _js_set_multi_pass_input(args: Array) -> void:
	if args.size() < 2:
		return
	var pass_id = str(args[0])
	var inputs = _parse_params(args[1])
	set_multi_pass_input(pass_id, inputs)

func _js_clear_multi_pass_effect(args: Array) -> void:
	clear_multi_pass_effect()

func apply_multi_pass_effect(entity_id: String, spec_dict: Dictionary) -> void:
	if multi_pass_executor == null:
		return
	if _game_bridge == null:
		_game_bridge = get_node_or_null("/root/GameBridge")
	if _game_bridge and multi_pass_executor._game_bridge == null:
		multi_pass_executor.setup(_game_bridge, _game_bridge._pixel_buffer_manager if "_pixel_buffer_manager" in _game_bridge else null)
	multi_pass_executor.apply_effect(entity_id, spec_dict)

func start_multi_pass_effect() -> void:
	if multi_pass_executor:
		multi_pass_executor.start_effect()

func stop_multi_pass_effect() -> void:
	if multi_pass_executor:
		multi_pass_executor.stop_effect()

func set_multi_pass_input(pass_id: String, inputs: Dictionary) -> void:
	if multi_pass_executor:
		multi_pass_executor.set_pass_inputs(pass_id, inputs)

func clear_multi_pass_effect() -> void:
	if multi_pass_executor:
		multi_pass_executor.clear_effect()

# ============================================================
# UTILITY
# ============================================================

func _get_entity_sprite(entity_id: String) -> CanvasItem:
	if not _game_bridge:
		_game_bridge = get_node_or_null("/root/GameBridge")
	if not _game_bridge:
		return null
	
	var entity = _game_bridge.get_entity(entity_id)
	if not entity:
		return null
	
	# Prefer Sprite2D (used by pixel buffers and image entities)
	for child in entity.get_children():
		if child is Sprite2D:
			return child
	
	# Fall back to Polygon2D (shape-based rendering)
	for child in entity.get_children():
		if child is Polygon2D:
			return child
	
	# Fallback to entity itself if it's a CanvasItem
	if entity is CanvasItem:
		return entity
	
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
