extends Node

## Effects extension for GameBridge.
## This script provides effect-related methods that integrate with the main GameBridge.
## Add as an autoload or instantiate in GameBridge.

var particle_factory: ParticleFactory
var graph_executor: EffectsGraphExecutor
var _game_bridge: Node = null
var _entity_sprite: Sprite2D = null
var _entity_original_texture: Texture2D = null
var _entity_original_scale: Vector2 = Vector2.ONE

func _ready() -> void:
	# Create subsystems
	particle_factory = ParticleFactory.new()
	particle_factory.name = "ParticleFactory"
	add_child(particle_factory)

	graph_executor = EffectsGraphExecutor.new()
	graph_executor.name = "GraphExecutor"
	add_child(graph_executor)

	# Find GameBridge
	_game_bridge = get_node_or_null("/root/GameBridge")

	_build_effects_method_map()
	_register_query_handlers()

	# If running in web, set up JS bridge methods
	if OS.has_feature("web"):
		_setup_js_effects_bridge()

func _process(_delta: float) -> void:
	if graph_executor == null or _entity_sprite == null or _entity_original_texture == null:
		return
	if graph_executor._state == EffectsGraphExecutor.State.RUNNING:
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

	}

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

	# For entity-scoped graphs, find the entity texture up front so it is
	# available during bind_pass_inputs (avoids "Missing input texture" warning).
	var entity_tex: Texture2D = null
	if str(plan_dict.get("scope", "")) == "entity":
		entity_tex = _find_entity_texture()

	var result = graph_executor.apply_plan(plan_dict, entity_tex)

	# Store sprite reference for display swapping while the graph runs.
	if bool(result.get("success", false)) and str(plan_dict.get("scope", "")) == "entity":
		_bind_entity_textures()

	return result

func clear_plan() -> void:
	_restore_entity_display()
	if graph_executor:
		graph_executor.clear()

func update_params(pass_id: String, params: Dictionary) -> Dictionary:
	if graph_executor:
		return graph_executor.update_params(pass_id, params)
	return {"success": false, "error": "GraphExecutor not initialized"}

func start_graph() -> void:
	if graph_executor:
		graph_executor.start()

func pause_graph() -> void:
	if graph_executor:
		graph_executor.pause()

func resume_graph() -> void:
	if graph_executor:
		graph_executor.resume()

func stop_graph() -> void:
	_restore_entity_display()
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

func _restore_entity_display() -> void:
	if _entity_sprite != null and _entity_original_texture != null:
		_entity_sprite.texture = _entity_original_texture
		_entity_sprite.scale = _entity_original_scale

func _bind_entity_textures() -> void:
	if graph_executor == null or _game_bridge == null:
		return

	# Prefer the PixelBufferManager's stored texture — it is available
	# immediately after createPixelBuffer runs, before deferred tree updates.
	if "_pixel_buffer_manager" in _game_bridge:
		var pbm = _game_bridge._pixel_buffer_manager
		if pbm != null and "_buffers" in pbm:
			var buffers: Dictionary = pbm._buffers
			for buf_id in buffers.keys():
				var buf: Dictionary = buffers[buf_id]
				var tex = buf.get("texture")
				if tex is Texture2D:
					graph_executor.set_entity_texture(tex)
					var spr = buf.get("sprite")
					if spr is Sprite2D:
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
			graph_executor.set_entity_texture(sprite.texture)
			_entity_sprite = sprite
			_entity_original_texture = sprite.texture
			_entity_original_scale = sprite.scale
			_entity_texture_retries = 0
			return

	# Sprite2D may not be ready yet (deferred creation). Retry a few times.
	if _entity_texture_retries < 10:
		_entity_texture_retries += 1
		get_tree().create_timer(0.1).timeout.connect(_bind_entity_textures, CONNECT_ONE_SHOT)

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
