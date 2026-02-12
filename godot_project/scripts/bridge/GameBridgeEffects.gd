extends Node

## Effects extension for GameBridge.
## This script provides effect-related methods that integrate with the main GameBridge.
## Add as an autoload or instantiate in GameBridge.

var particle_factory: ParticleFactory
var graph_executor: EffectsGraphExecutor
var _screen_executor: EffectsGraphExecutor
var _game_bridge: Node = null
var _entity_sprite: Sprite2D = null
var _entity_original_texture: Texture2D = null
var _entity_original_scale: Vector2 = Vector2.ONE
var _display_swap_delay: int = 0
var _frames_since_start: int = 0
var _pending_inject_commands: Array = []
var _brush_cache: Dictionary = {}
var _stroke_overlay_img: Image = null
var _stroke_overlay_tex: ImageTexture = null
var _stroke_overlay_dirty: bool = false
var _screen_overlay_layer: CanvasLayer = null
var _screen_overlay_rect: TextureRect = null
var _current_scope: String = ""
var _game_capture_viewport: SubViewport = null
var _game_capture_container: SubViewportContainer = null

func _ready() -> void:
	# Create subsystems
	particle_factory = ParticleFactory.new()
	particle_factory.name = "ParticleFactory"
	add_child(particle_factory)

	graph_executor = EffectsGraphExecutor.new()
	graph_executor.name = "GraphExecutor"
	add_child(graph_executor)

	_screen_executor = EffectsGraphExecutor.new()
	_screen_executor.name = "ScreenGraphExecutor"
	add_child(_screen_executor)

	# Find GameBridge
	_game_bridge = get_node_or_null("/root/GameBridge")

	_build_effects_method_map()
	_register_query_handlers()
	_register_methods_with_game_bridge()

	if OS.has_feature("web"):
		_setup_js_effects_bridge()

func _process(_delta: float) -> void:
	# Update screen overlay from dedicated screen executor
	if _screen_executor != null and _screen_executor._state == EffectsGraphExecutor.State.RUNNING:
		if _screen_overlay_rect != null:
			var screen_tex: Texture2D = _screen_executor.get_output_texture()
			if screen_tex != null and _screen_overlay_rect.texture != screen_tex:
				_screen_overlay_rect.texture = screen_tex

	# Update entity effects from entity executor
	if graph_executor == null:
		return
	if graph_executor._state != EffectsGraphExecutor.State.RUNNING:
		return

	_frames_since_start += 1

	if _entity_sprite == null or _entity_original_texture == null:
		return

	if _display_swap_delay > 0:
		_display_swap_delay -= 1
		return
	if _pending_inject_commands.size() > 0:
		_render_overlay_from_pending()
	elif _stroke_overlay_dirty:
		_clear_stroke_overlay()
	var output_tex: Texture2D = graph_executor.get_output_texture()
	if output_tex != null and _entity_sprite.texture != output_tex:
		_entity_sprite.texture = output_tex
		var orig_size: Vector2 = _entity_original_texture.get_size()
		var out_size: Vector2 = output_tex.get_size()
		if out_size.x > 0 and out_size.y > 0:
			_entity_sprite.scale = _entity_original_scale * (orig_size / out_size)

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
		"apply_plan": _js_apply_plan,
		"clear_plan": _js_clear_plan,
		"update_params": _js_update_params,
		"start_graph": _js_start_graph,
		"pause_graph": _js_pause_graph,
		"resume_graph": _js_resume_graph,
		"stop_graph": _js_stop_graph,
		"reset_graph": _js_reset_graph,
		"spawn_particle_preset": _js_spawn_particle_preset,
		"get_available_effects": _js_get_available_effects,
		"get_snapshot": _js_get_snapshot,
		"restore_snapshot": _js_restore_snapshot,
		"draw_to_active_buffer": _js_draw_to_active_buffer,
		"set_external_input": _js_set_external_input,
		"set_screen_input": _js_set_screen_input,
		"hot_swap_shader": _js_hot_swap_shader,

	}

func _register_methods_with_game_bridge() -> void:
	if _game_bridge == null:
		print("[GBE] _register_methods: game_bridge is null!")
		return
	var count := 0
	for method_name in _method_map:
		_game_bridge._method_map[method_name] = _method_map[method_name]
		count += 1
	print("[GBE] Registered %d methods with GameBridge" % count)

func _register_query_handlers() -> void:
	if _game_bridge == null:
		return

	var qs = _game_bridge._query_system
	if qs == null:
		return

	qs.register_handler("effects.applyGraph", func(args):
		if args.size() > 0 and args[0] is Dictionary:
			return apply_plan(args[0].get("plan", args[0]))
		return {"success": false, "error": "Missing plan argument"}
	)

	qs.register_handler("effects.clearGraph", func(_args):
		clear_plan()
		return {"success": true}
	)

	qs.register_handler("effects.updateParams", func(args):
		if args.size() > 0 and args[0] is Dictionary:
			var pass_id = str(args[0].get("passId", ""))
			var params = args[0].get("params", {})
			if not (params is Dictionary):
				params = {}
			return update_params(pass_id, params)
		return {"success": false, "error": "Missing arguments"}
	)

	qs.register_handler("effects.start", func(_args):
		start_graph()
		return {"success": true}
	)

	qs.register_handler("effects.pause", func(_args):
		pause_graph()
		return {"success": true}
	)

	qs.register_handler("effects.resume", func(_args):
		resume_graph()
		return {"success": true}
	)

	qs.register_handler("effects.stop", func(_args):
		stop_graph()
		return {"success": true}
	)

	qs.register_handler("effects.reset", func(_args):
		reset_graph()
		return {"success": true}
	)

	qs.register_handler("effects.snapshot", func(_args):
		return get_snapshot()
	)

	qs.register_handler("effects.restore", func(args):
		if args.size() > 0 and args[0] is Dictionary:
			return restore_snapshot(args[0].get("snapshot", args[0]))
		return {"success": false, "error": "Missing snapshot argument"}
	)

	qs.register_handler("effects.drawToActiveBuffer", func(args):
		if args.size() > 0 and args[0] is Dictionary:
			var entity_id = str(args[0].get("entityId", ""))
			var commands = args[0].get("commands", "")
			return draw_to_active_buffer(entity_id, commands)
		return {"success": false, "error": "Missing entityId or commands"}
	)

	qs.register_handler("effects.setExternalInput", func(args):
		if args.size() > 0 and args[0] is Dictionary:
			var name = str(args[0].get("name", ""))
			var image_data = str(args[0].get("imageData", ""))
			return set_external_input(name, image_data)
		return {"success": false, "error": "Missing name or imageData"}
	)

	qs.register_handler("effects.setScreenInput", func(args):
		if args.size() > 0 and args[0] is Dictionary:
			var enable = bool(args[0].get("enable", false))
			return set_screen_input(enable)
		return {"success": true}
	)

	qs.register_handler("effects.hotSwapShader", func(args):
		if args.size() > 0 and args[0] is Dictionary:
			var pass_id = str(args[0].get("passId", ""))
			var glsl_code = str(args[0].get("glslCode", ""))
			return hot_swap_shader(pass_id, glsl_code)
		return {"success": false, "error": "Missing passId or glslCode"}
	)

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

	var apply_plan_cb = JavaScriptBridge.create_callback(_js_apply_plan)
	callbacks.append(apply_plan_cb)
	bridge["applyPlan"] = apply_plan_cb

	var clear_plan_cb = JavaScriptBridge.create_callback(_js_clear_plan)
	callbacks.append(clear_plan_cb)
	bridge["clearPlan"] = clear_plan_cb

	var update_params_cb = JavaScriptBridge.create_callback(_js_update_params)
	callbacks.append(update_params_cb)
	bridge["updateParams"] = update_params_cb

	var start_graph_cb = JavaScriptBridge.create_callback(_js_start_graph)
	callbacks.append(start_graph_cb)
	bridge["startGraph"] = start_graph_cb

	var pause_graph_cb = JavaScriptBridge.create_callback(_js_pause_graph)
	callbacks.append(pause_graph_cb)
	bridge["pauseGraph"] = pause_graph_cb

	var resume_graph_cb = JavaScriptBridge.create_callback(_js_resume_graph)
	callbacks.append(resume_graph_cb)
	bridge["resumeGraph"] = resume_graph_cb

	var stop_graph_cb = JavaScriptBridge.create_callback(_js_stop_graph)
	callbacks.append(stop_graph_cb)
	bridge["stopGraph"] = stop_graph_cb

	var reset_graph_cb = JavaScriptBridge.create_callback(_js_reset_graph)
	callbacks.append(reset_graph_cb)
	bridge["resetGraph"] = reset_graph_cb

	var get_snapshot_cb = JavaScriptBridge.create_callback(_js_get_snapshot)
	callbacks.append(get_snapshot_cb)
	bridge["getSnapshot"] = get_snapshot_cb

	var restore_snapshot_cb = JavaScriptBridge.create_callback(_js_restore_snapshot)
	callbacks.append(restore_snapshot_cb)
	bridge["restoreSnapshot"] = restore_snapshot_cb

	var draw_to_active_buffer_cb = JavaScriptBridge.create_callback(_js_draw_to_active_buffer)
	callbacks.append(draw_to_active_buffer_cb)
	bridge["drawToActiveBuffer"] = draw_to_active_buffer_cb

	var set_external_input_cb = JavaScriptBridge.create_callback(_js_set_external_input)
	callbacks.append(set_external_input_cb)
	bridge["setExternalInput"] = set_external_input_cb

	var set_screen_input_cb = JavaScriptBridge.create_callback(_js_set_screen_input)
	callbacks.append(set_screen_input_cb)
	bridge["setScreenInput"] = set_screen_input_cb

	var hot_swap_shader_cb = JavaScriptBridge.create_callback(_js_hot_swap_shader)
	callbacks.append(hot_swap_shader_cb)
	bridge["hotSwapShader"] = hot_swap_shader_cb

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

func _js_apply_plan(args: Array) -> void:
	if args.size() < 1:
		_set_last_result({"success": false, "error": "Missing plan argument"})
		return
	var result = apply_plan(args[0])
	_set_last_result(result)

func _js_clear_plan(args: Array) -> void:
	clear_plan()

func _js_update_params(args: Array) -> void:
	if args.size() < 2:
		_set_last_result({"success": false, "error": "Missing pass_id or params"})
		return
	var result = update_params(str(args[0]), _parse_params(args[1]))
	_set_last_result(result)

func _js_start_graph(args: Array) -> void:
	start_graph()

func _js_pause_graph(args: Array) -> void:
	pause_graph()

func _js_resume_graph(args: Array) -> void:
	resume_graph()

func _js_stop_graph(args: Array) -> void:
	stop_graph()

func _js_reset_graph(args: Array) -> void:
	reset_graph()

func _js_get_snapshot(args: Array) -> void:
	var result = get_snapshot()
	_set_last_result(result)

func _js_restore_snapshot(args: Array) -> void:
	if args.size() < 1:
		_set_last_result({"success": false, "error": "Missing snapshot argument"})
		return
	var result = restore_snapshot(_parse_params(args[0]))
	_set_last_result(result)

func _js_draw_to_active_buffer(args: Array) -> void:
	if args.size() < 2:
		_set_last_result({"success": false, "error": "Missing entity_id or commands"})
		return
	var entity_id = str(args[0])
	var commands_json = args[1]
	var result = draw_to_active_buffer(entity_id, commands_json)
	_set_last_result(result)

func _js_set_external_input(args: Array) -> void:
	if args.size() < 2:
		_set_last_result({"success": false, "error": "Missing name or imageData"})
		return
	var name = str(args[0])
	var image_data = str(args[1])
	var result = set_external_input(name, image_data)
	_set_last_result(result)

func _js_set_screen_input(args: Array) -> void:
	if args.size() < 1:
		_set_last_result({"success": false, "error": "Missing enable parameter"})
		return
	var enable = bool(args[0])
	var result = set_screen_input(enable)
	_set_last_result(result)

func _js_hot_swap_shader(args: Array) -> void:
	if args.size() < 2:
		_set_last_result({"success": false, "error": "Missing pass_id or glsl_code"})
		return
	var pass_id = str(args[0])
	var glsl_code = str(args[1])
	var result = hot_swap_shader(pass_id, glsl_code)
	_set_last_result(result)

func _js_spawn_particle_preset(args: Array) -> void:
	if args.size() < 3:
		return
	var preset_name = str(args[0])
	var x = float(args[1])
	var y = float(args[2])
	var params = _parse_params(args[3] if args.size() > 3 else {})
	spawn_particle_preset(preset_name, x, y, params)

func _js_get_available_effects(args: Array) -> void:
	var sprite_effects = ["glow", "innerGlow", "outline", "dropShadow", "tint", "holographic", "pixelate", "dissolve", "waveDistortion", "rimLight", "colorMatrix"]
	var post_effects = ["vignette", "bloom", "nightVision", "speedLines", "underwater", "halftone", "oldFilm", "thermalVision", "ascii", "ripple", "fogOfWar", "scanlines", "chromaticAberration", "shockwave", "blur", "motionBlur"]
	var result = {
		"sprite": sprite_effects,
		"post": post_effects,
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
	push_warning("[GameBridgeEffects] apply_sprite_effect not implemented in v2 - use graph_executor.apply_plan() instead")

func update_sprite_effect_param(entity_id: String, param_name: String, value) -> void:
	push_warning("[GameBridgeEffects] update_sprite_effect_param not implemented in v2 - use graph_executor.update_params() instead")

func clear_sprite_effect(entity_id: String) -> void:
	push_warning("[GameBridgeEffects] clear_sprite_effect not implemented in v2 - use graph_executor.clear_plan() instead")

# ============================================================
# PUBLIC API - POST-PROCESSING
# ============================================================

func set_post_effect(effect_name: String, params = {}, layer: String = "main") -> void:
	push_warning("[GameBridgeEffects] set_post_effect not implemented in v2 - use graph_executor.apply_plan() instead")

func update_post_effect_param(param_name: String, value, layer: String = "main") -> void:
	push_warning("[GameBridgeEffects] update_post_effect_param not implemented in v2 - use graph_executor.update_params() instead")

func clear_post_effect(layer: String = "main") -> void:
	push_warning("[GameBridgeEffects] clear_post_effect not implemented in v2 - use graph_executor.clear_plan() instead")

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
			push_warning("[GameBridgeEffects] Camera does not support shake/add_trauma methods")

func zoom_punch(intensity: float = 0.1, duration: float = 0.15) -> void:
	var camera = _get_camera()
	if camera:
		if camera.has_method("zoom_punch"):
			camera.zoom_punch(intensity, duration)
		else:
			push_warning("[GameBridgeEffects] Camera does not support zoom_punch method")

func trigger_shockwave(world_x: float, world_y: float, duration: float = 0.5) -> void:
	push_warning("[GameBridgeEffects] trigger_shockwave not implemented in v2 - use graph_executor with shockwave effect instead")

func flash_screen(r: float = 1.0, g: float = 1.0, b: float = 1.0, a: float = 1.0, duration: float = 0.1) -> void:
	push_warning("[GameBridgeEffects] flash_screen not implemented in v2 - use graph_executor with flash effect instead")

# ============================================================
# PUBLIC API - DYNAMIC SHADERS
# ============================================================

func create_dynamic_shader(shader_id: String, shader_code: String) -> Dictionary:
	push_warning("[GameBridgeEffects] create_dynamic_shader not implemented in v2 - use graph_executor with custom shader source instead")
	return {"success": false, "error": "Not implemented in v2"}

func apply_dynamic_shader_to_entity(entity_id: String, shader_id: String, params = {}) -> void:
	push_warning("[GameBridgeEffects] apply_dynamic_shader_to_entity not implemented in v2 - use graph_executor.apply_plan() with custom shader instead")

func apply_dynamic_post_shader(shader_code: String, params = {}) -> void:
	push_warning("[GameBridgeEffects] apply_dynamic_post_shader not implemented in v2 - use graph_executor.apply_plan() with custom shader instead")

func apply_plan(plan_json) -> Dictionary:
	if graph_executor == null:
		return {"success": false, "error": "GraphExecutor not initialized"}

	var plan_dict: Dictionary = {}
	if plan_json is Dictionary:
		plan_dict = plan_json
	elif plan_json is String:
		var json = JSON.new()
		if json.parse(plan_json) == OK and json.data is Dictionary:
			plan_dict = json.data
		else:
			return {"success": false, "error": "Invalid JSON"}
	else:
		return {"success": false, "error": "Invalid plan format"}

	var scope: String = str(plan_dict.get("scope", ""))

	if scope == "screen":
		_setup_game_capture_viewport()
		if _game_capture_viewport != null:
			_screen_executor.set_source_viewport(_game_capture_viewport)
		var result = _screen_executor.apply_plan(plan_dict)
		if bool(result.get("success", false)):
			_create_screen_overlay()
			_screen_executor.start()
		return result

	_current_scope = "entity"

	var entity_tex: Texture2D = _find_entity_texture()
	if entity_tex != null:
		graph_executor.set_input_buffer("pixelBuffer", entity_tex)

	var result = graph_executor.apply_plan(plan_dict)

	if bool(result.get("success", false)):
		_store_entity_sprite_reference()
		_init_stroke_overlay()

	return result

func _setup_game_capture_viewport() -> void:
	if _game_capture_viewport != null:
		return
	if _game_bridge == null or _game_bridge.game_root == null:
		return

	var game_root: Node2D = _game_bridge.game_root
	var main_node: Node = game_root.get_parent()
	if main_node == null:
		return

	var win_size := game_root.get_viewport().size

	_game_capture_container = SubViewportContainer.new()
	_game_capture_container.name = "GameCaptureContainer"
	_game_capture_container.stretch = true
	_game_capture_container.size = Vector2(win_size)

	_game_capture_viewport = SubViewport.new()
	_game_capture_viewport.name = "GameCaptureViewport"
	_game_capture_viewport.handle_input_locally = false
	_game_capture_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_game_capture_viewport.size = win_size

	main_node.remove_child(game_root)
	_game_capture_container.add_child(_game_capture_viewport)
	_game_capture_viewport.add_child(game_root)
	main_node.add_child(_game_capture_container)

func _teardown_game_capture_viewport() -> void:
	if _game_capture_viewport == null:
		return
	if _game_bridge == null or _game_bridge.game_root == null:
		return

	var game_root: Node2D = _game_bridge.game_root
	var main_node: Node = _game_capture_container.get_parent()

	_game_capture_viewport.remove_child(game_root)
	main_node.remove_child(_game_capture_container)
	main_node.add_child(game_root)

	_game_capture_container.queue_free()
	_game_capture_container = null
	_game_capture_viewport = null

func _create_screen_overlay() -> void:
	_destroy_screen_overlay()

	if _screen_executor == null or _screen_executor._pass_entries.size() == 0:
		return

	# For single-pass screen effects, we can use the shader directly on a
	# ColorRect so SCREEN_TEXTURE works. For multi-pass, we must use a
	# TextureRect fed by the executor's output viewport.
	_screen_overlay_layer = CanvasLayer.new()
	_screen_overlay_layer.name = "ScreenEffectsOverlay"
	_screen_overlay_layer.layer = 100
	add_child(_screen_overlay_layer)

	_screen_overlay_rect = TextureRect.new()
	_screen_overlay_rect.name = "ScreenEffectsRect"
	_screen_overlay_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_screen_overlay_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	_screen_overlay_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_screen_overlay_layer.add_child(_screen_overlay_rect)

func _destroy_screen_overlay() -> void:
	if _screen_overlay_layer != null and is_instance_valid(_screen_overlay_layer):
		_screen_overlay_layer.queue_free()
	_screen_overlay_layer = null
	_screen_overlay_rect = null

func _render_overlay_from_pending() -> void:
	if _stroke_overlay_img == null or _stroke_overlay_tex == null:
		_pending_inject_commands.clear()
		return

	if _stroke_overlay_dirty:
		_stroke_overlay_img.fill(Color(0, 0, 0, 0))

	var vp_size := _stroke_overlay_img.get_size()
	var cmds := _pending_inject_commands.duplicate()
	_pending_inject_commands.clear()

	for cmd in cmds:
		if not (cmd is Dictionary):
			continue
		var cmd_type = str(cmd.get("type", ""))
		var color_data = cmd.get("color", [1.0, 1.0, 1.0, 1.0])
		var color := Color.WHITE
		if color_data is Array and color_data.size() >= 3:
			color = Color(float(color_data[0]), float(color_data[1]), float(color_data[2]),
				float(color_data[3]) if color_data.size() > 3 else 1.0)
		elif color_data is String:
			color = Color(color_data)
		var width_norm := float(cmd.get("width", 0.01))
		var radius_px := width_norm * float(vp_size.y) * 0.5

		var points: Array = []
		if cmd_type == "line":
			points = [
				Vector2(float(cmd.get("x1", 0)) * vp_size.x, float(cmd.get("y1", 0)) * vp_size.y),
				Vector2(float(cmd.get("x2", 0)) * vp_size.x, float(cmd.get("y2", 0)) * vp_size.y),
			]
		elif cmd_type == "stroke":
			var pts = cmd.get("points", [])
			for pt in pts:
				if pt is Dictionary:
					points.append(Vector2(float(pt.get("x", 0)) * vp_size.x, float(pt.get("y", 0)) * vp_size.y))

		for i in range(points.size() - 1):
			_draw_line_on_image(_stroke_overlay_img, points[i], points[i + 1], color, radius_px)

	_stroke_overlay_tex.update(_stroke_overlay_img)
	_set_overlay_on_materials(_stroke_overlay_tex)
	_stroke_overlay_dirty = true

func _clear_stroke_overlay() -> void:
	if _stroke_overlay_img == null or _stroke_overlay_tex == null:
		return
	_stroke_overlay_img.fill(Color(0, 0, 0, 0))
	_stroke_overlay_tex.update(_stroke_overlay_img)
	_stroke_overlay_dirty = false

func _set_overlay_on_materials(tex: Texture2D) -> void:
	if graph_executor == null:
		return
	for entry in graph_executor._pass_entries:
		for mat_key in ["material_a", "material_b"]:
			var mat: ShaderMaterial = entry.get(mat_key)
			if mat != null:
				mat.set_shader_parameter("stroke_overlay", tex)

func _init_stroke_overlay() -> void:
	var size := Vector2i(512, 512)
	for entry in graph_executor._pass_entries:
		var ppb: String = str(entry.get("ping_pong_buffer", ""))
		if ppb != "" and graph_executor._ping_pong_manager != null:
			var vps = graph_executor._ping_pong_manager.get_viewports(ppb)
			if vps.get("a") != null:
				size = vps.get("a").size
			break
	_stroke_overlay_img = Image.create(size.x, size.y, false, Image.FORMAT_RGBA8)
	_stroke_overlay_img.fill(Color(0, 0, 0, 0))
	_stroke_overlay_tex = ImageTexture.create_from_image(_stroke_overlay_img)
	_stroke_overlay_dirty = false

func clear_plan() -> void:
	_restore_entity_display()
	_current_scope = ""
	if graph_executor:
		graph_executor.clear()

func clear_screen_plan() -> void:
	_teardown_game_capture_viewport()
	_destroy_screen_overlay()
	if _screen_executor:
		_screen_executor.clear()

func update_params(pass_id: String, params: Dictionary) -> Dictionary:
	if graph_executor:
		return graph_executor.update_params(pass_id, params)
	return {"success": false, "error": "GraphExecutor not initialized"}

func start_graph() -> void:
	if graph_executor:
		_display_swap_delay = 2
		_frames_since_start = 0
		if _stroke_overlay_tex != null:
			_set_overlay_on_materials(_stroke_overlay_tex)
		graph_executor.start()

func pause_graph() -> void:
	if graph_executor:
		graph_executor.pause()

func resume_graph() -> void:
	if graph_executor:
		graph_executor.resume()

func stop_graph() -> void:
	_clear_all_draw_containers()
	_bake_output_to_entity()
	if graph_executor:
		graph_executor.stop()

func reset_graph() -> void:
	if graph_executor:
		graph_executor.reset()

func get_snapshot() -> Dictionary:
	if graph_executor:
		return graph_executor.get_snapshot()
	return {}

func restore_snapshot(snapshot: Dictionary) -> Dictionary:
	if graph_executor:
		return graph_executor.restore_snapshot(snapshot)
	return {"success": false, "error": "GraphExecutor not initialized"}

# ============================================================
# PUBLIC API - DRAW ROUTING
# ============================================================

func draw_to_active_buffer(entity_id: String, commands_json) -> Dictionary:
	print("[GBE] draw_to_active_buffer: entity=%s type=%s" % [entity_id, typeof(commands_json)])
	if graph_executor == null:
		print("[GBE] draw_to_active_buffer: NO graph_executor!")
		return {"success": false, "error": "GraphExecutor not initialized"}
	
	# Parse commands
	var commands: Array = []
	if commands_json is Array:
		commands = commands_json
	elif commands_json is String:
		var json = JSON.new()
		if json.parse(commands_json) == OK and json.data is Array:
			commands = json.data
		else:
			return {"success": false, "error": "Invalid commands JSON"}
	else:
		return {"success": false, "error": "Commands must be Array or JSON string"}
	
	# Route based on graph state
	if graph_executor._state == EffectsGraphExecutor.State.RUNNING:
		_draw_to_pixel_buffer(entity_id, commands)
		_pending_inject_commands.append_array(commands)
	else:
		_draw_to_pixel_buffer(entity_id, commands)
	return {"success": true}

func _draw_to_ping_pong(entity_id: String, commands: Array) -> Dictionary:
	if graph_executor == null or graph_executor._ping_pong_manager == null:
		return {"success": false, "error": "PingPongManager not available"}
	
	var ping_pong_mgr = graph_executor._ping_pong_manager

	var buffer_id := ""
	for entry in graph_executor._pass_entries:
		var ppb: String = str(entry.get("ping_pong_buffer", ""))
		if ppb != "":
			buffer_id = ppb
			break
	if buffer_id == "":
		return {"success": false, "error": "No active ping-pong buffer found"}



	for cmd in commands:
		if not (cmd is Dictionary):
			continue
		
		var cmd_type = str(cmd.get("type", ""))
		var color_data = cmd.get("color", [1.0, 1.0, 1.0, 1.0])
		var color := Color.WHITE
		if color_data is Array and color_data.size() >= 3:
			color = Color(float(color_data[0]), float(color_data[1]), float(color_data[2]),
				float(color_data[3]) if color_data.size() > 3 else 1.0)
		elif color_data is String:
			color = Color(color_data)
		var width_norm = float(cmd.get("width", 0.01))

		var flat_points: Array = []
		if cmd_type == "stroke":
			var points = cmd.get("points", [])
			for pt in points:
				if pt is Dictionary:
					flat_points.append(float(pt.get("x", 0.0)))
					flat_points.append(float(pt.get("y", 0.0)))
		elif cmd_type == "line":
			flat_points = [float(cmd.get("x1", 0.0)), float(cmd.get("y1", 0.0)),
				float(cmd.get("x2", 0.0)), float(cmd.get("y2", 0.0))]

		if flat_points.size() >= 4:
			ping_pong_mgr.add_stroke(buffer_id, flat_points, color, width_norm)
		
		elif cmd_type == "stamp":
			var uv_data = cmd.get("uv", {"x": 0.5, "y": 0.5})
			var uv := Vector2(float(uv_data.get("x", 0.5)), float(uv_data.get("y", 0.5)))
			push_warning("[GameBridgeEffects] Stamp command not fully implemented for ping-pong")
	
	return {"success": true}

func _draw_to_pixel_buffer(entity_id: String, commands: Array) -> Dictionary:
	# Forward to PixelBufferManager for pixel buffer drawing
	if _game_bridge == null or not ("_pixel_buffer_manager" in _game_bridge):
		return {"success": false, "error": "PixelBufferManager not available"}
	
	var pbm = _game_bridge._pixel_buffer_manager
	if pbm == null:
		return {"success": false, "error": "PixelBufferManager not initialized"}
	
	pbm.draw_commands_normalized(entity_id, commands)
	return {"success": true}

func _get_brush_image(radius: int, color: Color) -> Image:
	var key := "%d_%s" % [radius, color.to_html()]
	if _brush_cache.has(key):
		return _brush_cache[key]

	var diameter := radius * 2 + 1
	var brush := Image.create(diameter, diameter, false, Image.FORMAT_RGBA8)
	brush.fill(Color(0, 0, 0, 0))
	var center := float(radius)
	var r_sq := float(radius * radius)
	for y in range(diameter):
		for x in range(diameter):
			var dx := float(x) - center
			var dy := float(y) - center
			if dx * dx + dy * dy <= r_sq:
				brush.set_pixel(x, y, color)

	_brush_cache[key] = brush
	return brush

func _draw_line_on_image(img: Image, from: Vector2, to: Vector2, color: Color, radius_px: float) -> void:
	var r := int(ceil(radius_px))
	if r < 1:
		r = 1
	var brush := _get_brush_image(r, color)
	var brush_size := brush.get_size()
	var src_rect := Rect2i(Vector2i.ZERO, brush_size)

	var dx := to.x - from.x
	var dy := to.y - from.y
	var dist := sqrt(dx * dx + dy * dy)
	var spacing: float = max(r * 0.5, 1.0)
	var steps := int(dist / spacing) + 1

	for step in range(steps + 1):
		var t := float(step) / float(steps) if steps > 0 else 0.0
		var cx := int(from.x + dx * t) - r
		var cy := int(from.y + dy * t) - r
		img.blend_rect(brush, src_rect, Vector2i(cx, cy))

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

# ============================================================
# UTILITY
# ============================================================

var _entity_texture_retries: int = 0

func _clear_all_draw_containers() -> void:
	# Clear draw containers for all active ping-pong graphs to prevent
	# orphaned Line2D nodes from appearing in the baked output.
	if graph_executor == null or graph_executor._ping_pong_manager == null:
		return
	
	var ping_pong_manager = graph_executor._ping_pong_manager
	for entry in graph_executor._pass_entries:
		if not (entry is Dictionary):
			continue
		var ping_pong_buffer: String = str(entry.get("ping_pong_buffer", ""))
		if ping_pong_buffer != "":
			ping_pong_manager.clear_draw_container(ping_pong_buffer)

func _find_entity_texture() -> Texture2D:
	if _game_bridge == null:
		return null
	if "_pixel_buffer_manager" in _game_bridge:
		var pbm = _game_bridge._pixel_buffer_manager
		if pbm != null and "_buffers" in pbm:
			var buffers: Dictionary = pbm._buffers
			for buf_id in buffers.keys():
				var buf: Dictionary = buffers[buf_id]
				var tex = buf.get("texture")
				if tex is Texture2D:
					return tex
	var entities: Dictionary = _game_bridge.entities if "entities" in _game_bridge else {}
	for entity_id in entities.keys():
		var node = entities[entity_id]
		if node == null or not is_instance_valid(node):
			continue
		var sprite: Sprite2D = _find_sprite_in_tree(node, 3)
		if sprite != null and sprite.texture != null:
			return sprite.texture
	return null

func _bake_output_to_entity() -> void:
	# Capture the current shader output and bake it into the entity's
	# ImageTexture so the sprite keeps showing the evolved state after stop.
	if _entity_sprite == null or _entity_original_texture == null:
		return
	if graph_executor == null:
		_restore_entity_display()
		return

	var output_tex: Texture2D = graph_executor.get_output_texture()
	if output_tex == null:
		_restore_entity_display()
		return

	# Debounce guard: skip get_image() if the user rapidly toggles start/stop.
	# get_image() causes a 50-100ms main-thread stall on the first call after
	# start because the GPU texture hasn't been downloaded yet.
	if _frames_since_start < 3:
		_restore_entity_display()
		return

	var output_image: Image = output_tex.get_image()
	if output_image == null:
		_restore_entity_display()
		return

	# Resize to match the original entity texture dimensions so the
	# sprite scale can be restored to its original value.
	var orig_size: Vector2i = _entity_original_texture.get_image().get_size()
	if output_image.get_size() != orig_size:
		output_image.resize(orig_size.x, orig_size.y, Image.INTERPOLATE_BILINEAR)

	# Update the existing ImageTexture in-place if possible, otherwise create new.
	if _entity_original_texture is ImageTexture:
		(_entity_original_texture as ImageTexture).update(output_image)
		_entity_sprite.texture = _entity_original_texture
	else:
		var baked := ImageTexture.create_from_image(output_image)
		_entity_sprite.texture = baked

	_entity_sprite.scale = _entity_original_scale

	# Also update the PixelBufferManager's stored Image so that subsequent
	# draw commands operate on the baked content, not the pre-shader original.
	if _game_bridge and "_pixel_buffer_manager" in _game_bridge:
		var pbm = _game_bridge._pixel_buffer_manager
		if pbm != null and "_buffers" in pbm:
			for buf_id in pbm._buffers.keys():
				var buf: Dictionary = pbm._buffers[buf_id]
				if buf.get("texture") == _entity_original_texture:
					buf["image"] = output_image.duplicate()
					break

func _restore_entity_display() -> void:
	if _entity_sprite != null and _entity_original_texture != null:
		_entity_sprite.texture = _entity_original_texture
		_entity_sprite.scale = _entity_original_scale

func _store_entity_sprite_reference() -> void:
	if _game_bridge == null:
		return

	# Prefer the PixelBufferManager's stored sprite — it is available
	# immediately after createPixelBuffer runs, before deferred tree updates.
	if "_pixel_buffer_manager" in _game_bridge:
		var pbm = _game_bridge._pixel_buffer_manager
		if pbm != null and "_buffers" in pbm:
			var buffers: Dictionary = pbm._buffers
			for buf_id in buffers.keys():
				var buf: Dictionary = buffers[buf_id]
				var spr = buf.get("sprite")
				var tex = buf.get("texture")
				if spr is Sprite2D and tex is Texture2D:
					_entity_sprite = spr
					_entity_original_texture = tex
					_entity_original_scale = spr.scale
					_entity_texture_retries = 0
					return

	# Fallback: walk the entity tree looking for a Sprite2D with a texture.
	var entities: Dictionary = _game_bridge.entities if "entities" in _game_bridge else {}
	for entity_id in entities.keys():
		var node = entities[entity_id]
		if node == null or not is_instance_valid(node):
			continue
		var sprite: Sprite2D = _find_sprite_in_tree(node, 3)
		if sprite != null and sprite.texture != null:
			_entity_sprite = sprite
			_entity_original_texture = sprite.texture
			_entity_original_scale = sprite.scale
			_entity_texture_retries = 0
			return

	# Sprite2D may not be ready yet (deferred creation). Retry a few times.
	if _entity_texture_retries < 10:
		_entity_texture_retries += 1
		get_tree().create_timer(0.1).timeout.connect(_store_entity_sprite_reference, CONNECT_ONE_SHOT)

func _find_sprite_in_tree(node: Node, max_depth: int) -> Sprite2D:
	if max_depth <= 0:
		return null
	for child in node.get_children():
		if child is Sprite2D:
			return child
		var found := _find_sprite_in_tree(child, max_depth - 1)
		if found != null:
			return found
	return null

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
	
	return camera

# ============================================================
# PUBLIC API - EXTERNAL INPUT
# ============================================================

func set_external_input(name: String, image_data: String) -> Dictionary:
	if graph_executor == null:
		return {"success": false, "error": "GraphExecutor not initialized"}
	
	var texture: Texture2D = null
	
	if image_data.begins_with("data:image"):
		texture = _load_texture_from_base64(image_data)
	elif image_data.begins_with("http://") or image_data.begins_with("https://"):
		push_warning("[GameBridgeEffects] URL loading not yet implemented for external inputs")
		return {"success": false, "error": "URL loading not implemented"}
	else:
		push_warning("[GameBridgeEffects] Invalid image_data format (expected base64 or URL)")
		return {"success": false, "error": "Invalid image_data format"}
	
	if texture == null:
		return {"success": false, "error": "Failed to load texture"}
	
	graph_executor.set_input_buffer(name, texture)
	return {"success": true}

func set_screen_input(enable: bool) -> Dictionary:
	if graph_executor == null:
		return {"success": false, "error": "GraphExecutor not initialized"}
	
	if enable:
		push_warning("[GameBridgeEffects] Screen capture not yet implemented")
		return {"success": false, "error": "Screen capture not implemented"}
	else:
		return {"success": true}

func hot_swap_shader(pass_id: String, glsl_code: String) -> Dictionary:
	if graph_executor == null:
		return {"success": false, "error": "GraphExecutor not initialized"}
	return graph_executor.hot_swap_shader(pass_id, glsl_code)

func _load_texture_from_base64(data_uri: String) -> Texture2D:
	var parts = data_uri.split(",")
	if parts.size() < 2:
		return null
	
	var base64_data = parts[1]
	var image_bytes = Marshalls.base64_to_raw(base64_data)
	
	var image = Image.new()
	var err = OK
	
	if data_uri.contains("image/png"):
		err = image.load_png_from_buffer(image_bytes)
	elif data_uri.contains("image/jpeg") or data_uri.contains("image/jpg"):
		err = image.load_jpg_from_buffer(image_bytes)
	elif data_uri.contains("image/webp"):
		err = image.load_webp_from_buffer(image_bytes)
	else:
		push_warning("[GameBridgeEffects] Unsupported image format in data URI")
		return null
	
	if err != OK:
		push_warning("[GameBridgeEffects] Failed to load image from base64: ", err)
		return null
	
	return ImageTexture.create_from_image(image)
