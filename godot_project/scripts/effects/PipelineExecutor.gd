extends Node
class_name PipelineExecutor

const WELL_KNOWN_SAMPLERS = {
	"inputTex": true,
	"historyTex": true,
	"screenTex": true,
	"depthTex": true,
}

const EFFECT_TYPE_TO_SHADER = {
	"glow": "glow",
	"innerGlow": "inner_glow",
	"outline": "outline",
	"dropShadow": "drop_shadow",
	"tint": "tint",
	"holographic": "holographic",
	"pixelate": "pixelate",
	"dissolve": "dissolve",
	"waveDistortion": "wave",
	"shockwave": "shockwave",
	"chromaticAberration": "chromatic_aberration",
	"vignette": "vignette",
	"scanlines": "scanlines",
	"posterize": "posterize",
	"blur": "blur",
	"motionBlur": "motion_blur",
	"rimLight": "rim_light",
	"colorMatrix": "color_matrix",
	"bloom": "bloom",
	"nightVision": "night_vision",
	"speedLines": "speed_lines",
	"underwater": "underwater",
	"halftone": "halftone",
	"oldFilm": "old_film",
	"thermalVision": "thermal_vision",
	"ascii": "ascii",
	"ripple": "ripple",
	"fogOfWar": "fog_of_war",
}

enum PipelineState { IDLE, RUNNING, PAUSED, STOPPED }

var _effects_manager: EffectsManager
var _resolve_sprite: Callable
var _active_passes: Dictionary = {}

var _pipeline_state: PipelineState = PipelineState.IDLE
var _feedback_passes: Dictionary = {}
var _stop_mode: String = "freeze"
var _current_spec: Dictionary = {}
var _capture_in_progress: bool = false

func _ready() -> void:
	set_process(false)

func configure(effects_manager: EffectsManager, sprite_resolver: Callable) -> void:
	_effects_manager = effects_manager
	_resolve_sprite = sprite_resolver

func apply_pipeline(spec_dict: Dictionary) -> void:
	if _effects_manager == null:
		push_error("[PipelineExecutor] EffectsManager is not configured")
		return

	clear_pipeline()

	_current_spec = spec_dict

	var lifecycle = spec_dict.get("lifecycle", {})
	if lifecycle is Dictionary:
		_stop_mode = str(lifecycle.get("stopMode", "freeze"))

	var sprite_passes = spec_dict.get("spritePasses", [])
	if sprite_passes is Array:
		_execute_sprite_passes(sprite_passes)

	var screen_passes = spec_dict.get("screenPasses", [])
	if screen_passes is Array:
		_execute_screen_passes(screen_passes)

	_setup_feedback_passes(spec_dict)

	var auto_start = true
	if lifecycle is Dictionary:
		auto_start = lifecycle.get("autoStart", true)

	if auto_start and _feedback_passes.size() > 0:
		start_pipeline()

func clear_pipeline() -> void:
	_pipeline_state = PipelineState.IDLE
	set_process(false)
	_cleanup_feedback_viewports()

	for pass_id in _active_passes.keys():
		var entry = _active_passes[pass_id]
		if not (entry is Dictionary):
			continue

		if entry.get("kind", "") == "sprite":
			var sprite = entry.get("sprite")
			if sprite and is_instance_valid(sprite):
				sprite.material = entry.get("previous_material")
		elif entry.get("kind", "") == "screen":
			var layer_name = str(entry.get("layer_name", ""))
			var rect = entry.get("rect")
			if rect and is_instance_valid(rect):
				rect.queue_free()
			if _effects_manager._post_process_rects.has(layer_name):
				_effects_manager._post_process_rects.erase(layer_name)
			if _effects_manager._active_post_effects.has(layer_name):
				_effects_manager._active_post_effects.erase(layer_name)

	_active_passes.clear()
	_current_spec = {}

func update_pass_param(pass_id: String, param_name: String, value) -> void:
	if not _active_passes.has(pass_id):
		push_error("[PipelineExecutor] Unknown pass id: %s" % pass_id)
		return

	var entry = _active_passes[pass_id]
	if not (entry is Dictionary):
		return

	var declared_uniforms: Dictionary = entry.get("declared_uniforms", {})
	var declared_samplers: Dictionary = entry.get("declared_samplers", {})
	if not declared_uniforms.has(param_name) and not declared_samplers.has(param_name):
		push_error("[PipelineExecutor] Undeclared parameter '%s' for pass '%s'" % [param_name, pass_id])
		return

	var material = entry.get("material")
	if material and material is ShaderMaterial:
		material.set_shader_parameter(param_name, _effects_manager._convert_param(value))

	if _feedback_passes.has(pass_id):
		var fb = _feedback_passes[pass_id]
		var mat_a = fb.get("material_a")
		var mat_b = fb.get("material_b")
		if mat_a and mat_a is ShaderMaterial and param_name != "historyTex":
			mat_a.set_shader_parameter(param_name, _effects_manager._convert_param(value))
		if mat_b and mat_b is ShaderMaterial and param_name != "historyTex":
			mat_b.set_shader_parameter(param_name, _effects_manager._convert_param(value))

# ============================================================
# LIFECYCLE STATE MACHINE
# ============================================================

func start_pipeline() -> void:
	if _pipeline_state == PipelineState.RUNNING:
		push_warning("[PipelineExecutor] Pipeline already running")
		return

	if _pipeline_state != PipelineState.IDLE and _pipeline_state != PipelineState.STOPPED:
		push_warning("[PipelineExecutor] Cannot start from state: %s" % _state_name(_pipeline_state))
		return

	if _feedback_passes.size() == 0:
		push_warning("[PipelineExecutor] No feedback passes to start")
		return

	if _pipeline_state == PipelineState.IDLE:
		_init_feedback_textures()

	_pipeline_state = PipelineState.RUNNING
	set_process(true)

func pause_pipeline() -> void:
	if _pipeline_state != PipelineState.RUNNING:
		push_warning("[PipelineExecutor] Cannot pause from state: %s" % _state_name(_pipeline_state))
		return

	_pipeline_state = PipelineState.PAUSED
	set_process(false)

func resume_pipeline() -> void:
	if _pipeline_state != PipelineState.PAUSED:
		push_warning("[PipelineExecutor] Cannot resume from state: %s" % _state_name(_pipeline_state))
		return

	_pipeline_state = PipelineState.RUNNING
	set_process(true)

func stop_pipeline() -> void:
	if _pipeline_state != PipelineState.RUNNING and _pipeline_state != PipelineState.PAUSED:
		push_warning("[PipelineExecutor] Cannot stop from state: %s" % _state_name(_pipeline_state))
		return

	_pipeline_state = PipelineState.STOPPED
	set_process(false)

	if _stop_mode == "clear":
		_clear_feedback_textures()

func reset_pipeline() -> void:
	_pipeline_state = PipelineState.IDLE
	set_process(false)
	_clear_feedback_textures()

func get_pipeline_state() -> String:
	return _state_name(_pipeline_state)

func _state_name(state: PipelineState) -> String:
	match state:
		PipelineState.IDLE:
			return "idle"
		PipelineState.RUNNING:
			return "running"
		PipelineState.PAUSED:
			return "paused"
		PipelineState.STOPPED:
			return "stopped"
	return "unknown"

# ============================================================
# SNAPSHOT CAPTURE / RESTORE
# ============================================================

func capture_snapshot() -> Dictionary:
	if _capture_in_progress:
		push_warning("[PipelineExecutor] Capture already in progress, rejecting concurrent request")
		return {}

	if _active_passes.size() == 0:
		return {}

	_capture_in_progress = true

	var passes: Array = []
	for pass_id in _active_passes.keys():
		var entry = _active_passes[pass_id]
		if not (entry is Dictionary):
			continue

		var material = entry.get("material")
		if not (material is ShaderMaterial):
			continue

		var declared_uniforms: Dictionary = entry.get("declared_uniforms", {})
		var declared_samplers: Dictionary = entry.get("declared_samplers", {})
		var params: Dictionary = {}

		for uniform_name in declared_uniforms.keys():
			var val = material.get_shader_parameter(str(uniform_name))
			if val != null:
				params[str(uniform_name)] = val

		for sampler_name in declared_samplers.keys():
			if WELL_KNOWN_SAMPLERS.has(str(sampler_name)):
				continue
			var val = material.get_shader_parameter(str(sampler_name))
			if val != null and not (val is Texture2D):
				params[str(sampler_name)] = val

		passes.append({
			"passId": str(pass_id),
			"params": params,
			"hasFeedbackState": _feedback_passes.has(pass_id),
		})

	_capture_in_progress = false

	return {
		"pipelineId": str(_current_spec.get("id", "")),
		"passes": passes,
		"lifecycleState": _state_name(_pipeline_state),
		"timestamp": Time.get_unix_time_from_system() * 1000.0,
	}

func restore_snapshot(snapshot_dict: Dictionary) -> bool:
	if not (snapshot_dict is Dictionary) or not snapshot_dict.has("passes"):
		push_warning("[PipelineExecutor] Invalid snapshot dictionary")
		return false

	var passes = snapshot_dict.get("passes", [])
	if not (passes is Array):
		return false

	var all_restored := true
	for pass_snapshot in passes:
		if not (pass_snapshot is Dictionary):
			all_restored = false
			continue

		var pass_id = str(pass_snapshot.get("passId", ""))
		if pass_id == "" or not _active_passes.has(pass_id):
			push_warning("[PipelineExecutor] Snapshot pass '%s' not found in active passes" % pass_id)
			all_restored = false
			continue

		var params = pass_snapshot.get("params", {})
		if not (params is Dictionary):
			continue

		var entry = _active_passes[pass_id]
		var declared_uniforms: Dictionary = entry.get("declared_uniforms", {})
		var declared_samplers: Dictionary = entry.get("declared_samplers", {})

		for param_name in params.keys():
			var name_str = str(param_name)
			if not declared_uniforms.has(name_str) and not declared_samplers.has(name_str):
				continue
			update_pass_param(pass_id, name_str, params[param_name])

	return all_restored

# ============================================================
# FEEDBACK CORE — PING-PONG RENDER TARGETS
# ============================================================

func _setup_feedback_passes(spec_dict: Dictionary) -> void:
	var all_passes: Array = []
	var sprite_passes = spec_dict.get("spritePasses", [])
	if sprite_passes is Array:
		all_passes.append_array(sprite_passes)
	var screen_passes = spec_dict.get("screenPasses", [])
	if screen_passes is Array:
		all_passes.append_array(screen_passes)

	for pass_spec in all_passes:
		if not (pass_spec is Dictionary):
			continue
		var persistence = str(pass_spec.get("persistence", "none"))
		if persistence != "pingPong":
			continue

		var pass_id = str(pass_spec.get("id", ""))
		if pass_id == "":
			continue

		if not _active_passes.has(pass_id):
			continue

		var viewport_size = _get_viewport_size()
		var fb_entry = _create_feedback_pair(pass_id, pass_spec, viewport_size)
		if fb_entry.size() > 0:
			_feedback_passes[pass_id] = fb_entry

func _create_feedback_pair(pass_id: String, pass_spec: Dictionary, vp_size: Vector2i) -> Dictionary:
	var is_sprite = _active_passes[pass_id].get("kind", "") == "sprite"
	var shader = _resolve_shader(pass_spec, is_sprite)
	if shader == null:
		push_error("[PipelineExecutor] Cannot create feedback pair: shader not found for pass '%s'" % pass_id)
		return {}

	var viewport_a = SubViewport.new()
	viewport_a.name = "FeedbackA_%s" % pass_id
	viewport_a.size = vp_size
	viewport_a.transparent_bg = true
	viewport_a.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	viewport_a.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE

	var rect_a = ColorRect.new()
	rect_a.name = "ColorRect"
	rect_a.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect_a.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var material_a = ShaderMaterial.new()
	material_a.shader = shader
	_bind_feedback_params(pass_spec, material_a)
	rect_a.material = material_a
	viewport_a.add_child(rect_a)
	add_child(viewport_a)

	var viewport_b = SubViewport.new()
	viewport_b.name = "FeedbackB_%s" % pass_id
	viewport_b.size = vp_size
	viewport_b.transparent_bg = true
	viewport_b.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	viewport_b.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE

	var rect_b = ColorRect.new()
	rect_b.name = "ColorRect"
	rect_b.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect_b.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var material_b = ShaderMaterial.new()
	material_b.shader = shader
	_bind_feedback_params(pass_spec, material_b)
	rect_b.material = material_b
	viewport_b.add_child(rect_b)
	add_child(viewport_b)

	return {
		"viewport_a": viewport_a,
		"viewport_b": viewport_b,
		"rect_a": rect_a,
		"rect_b": rect_b,
		"material_a": material_a,
		"material_b": material_b,
		"current_read_index": 0,
		"pass_id": pass_id,
	}

func _bind_feedback_params(pass_spec: Dictionary, material: ShaderMaterial) -> void:
	var params = pass_spec.get("params", {})
	if not (params is Dictionary):
		return

	var declared_uniforms = _declared_uniforms(pass_spec)
	var declared_samplers = _declared_samplers(pass_spec)

	for key in params.keys():
		if key == "historyTex":
			continue
		if not declared_uniforms.has(key) and not declared_samplers.has(key):
			continue
		material.set_shader_parameter(str(key), _effects_manager._convert_param(params[key]))

func _init_feedback_textures() -> void:
	for pass_id in _feedback_passes.keys():
		var fb = _feedback_passes[pass_id]
		fb["current_read_index"] = 0

		var viewport_a: SubViewport = fb["viewport_a"]
		var viewport_b: SubViewport = fb["viewport_b"]

		viewport_a.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE
		viewport_b.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE

		var material_a: ShaderMaterial = fb["material_a"]
		material_a.set_shader_parameter("historyTex", viewport_b.get_texture())

		var material_b: ShaderMaterial = fb["material_b"]
		material_b.set_shader_parameter("historyTex", viewport_a.get_texture())

func _clear_feedback_textures() -> void:
	for pass_id in _feedback_passes.keys():
		var fb = _feedback_passes[pass_id]
		fb["current_read_index"] = 0

		var viewport_a: SubViewport = fb["viewport_a"]
		var viewport_b: SubViewport = fb["viewport_b"]

		if is_instance_valid(viewport_a) and is_instance_valid(viewport_b):
			viewport_a.render_target_clear_mode = SubViewport.CLEAR_MODE_ALWAYS
			viewport_b.render_target_clear_mode = SubViewport.CLEAR_MODE_ALWAYS

func _cleanup_feedback_viewports() -> void:
	for pass_id in _feedback_passes.keys():
		var fb = _feedback_passes[pass_id]
		var viewport_a = fb.get("viewport_a")
		var viewport_b = fb.get("viewport_b")
		if viewport_a and is_instance_valid(viewport_a):
			viewport_a.queue_free()
		if viewport_b and is_instance_valid(viewport_b):
			viewport_b.queue_free()
	_feedback_passes.clear()

func _process(_delta: float) -> void:
	if _pipeline_state != PipelineState.RUNNING:
		return

	for pass_id in _feedback_passes.keys():
		var fb = _feedback_passes[pass_id]
		var read_idx: int = fb["current_read_index"]
		var write_idx: int = 1 - read_idx

		var read_vp: SubViewport = fb["viewport_a"] if read_idx == 0 else fb["viewport_b"]
		var write_mat: ShaderMaterial = fb["material_a"] if write_idx == 0 else fb["material_b"]

		write_mat.set_shader_parameter("historyTex", read_vp.get_texture())

		fb["current_read_index"] = write_idx

		_update_screen_output(pass_id, fb)

func _update_screen_output(pass_id: String, fb: Dictionary) -> void:
	if not _active_passes.has(pass_id):
		return

	var entry = _active_passes[pass_id]
	var write_idx: int = fb["current_read_index"]
	var write_vp: SubViewport = fb["viewport_a"] if write_idx == 0 else fb["viewport_b"]

	if entry.get("kind", "") == "screen":
		var screen_material = entry.get("material")
		if screen_material and screen_material is ShaderMaterial:
			screen_material.set_shader_parameter("historyTex", write_vp.get_texture())

func _get_viewport_size() -> Vector2i:
	var vp = get_viewport()
	if vp:
		return vp.get_visible_rect().size
	return Vector2i(800, 600)

# ============================================================
# PASS EXECUTION
# ============================================================

func _execute_sprite_passes(passes: Array) -> void:
	var previous_pass_ids: Dictionary = {}

	for pass_index in range(passes.size()):
		var pass_entry = passes[pass_index]
		if not (pass_entry is Dictionary):
			continue

		var pass_id = str(pass_entry.get("id", ""))
		if pass_id == "":
			push_error("[PipelineExecutor] spritePasses[%d] is missing id" % pass_index)
			continue

		if not _validate_samplers(pass_entry, pass_id, previous_pass_ids):
			continue

		var sprite = _resolve_sprite_for_pass(pass_entry)
		if sprite == null:
			push_error("[PipelineExecutor] Sprite pass '%s' is missing target sprite" % pass_id)
			continue

		var shader = _resolve_shader(pass_entry, true)
		if shader == null:
			continue

		var material = ShaderMaterial.new()
		material.shader = shader
		if not _bind_declared_params(pass_entry, material):
			continue

		var previous_material = sprite.material
		sprite.material = material

		_active_passes[pass_id] = {
			"kind": "sprite",
			"sprite": sprite,
			"material": material,
			"previous_material": previous_material,
			"declared_uniforms": _declared_uniforms(pass_entry),
			"declared_samplers": _declared_samplers(pass_entry),
		}
		previous_pass_ids[pass_id] = true

func _execute_screen_passes(passes: Array) -> void:
	var previous_pass_ids: Dictionary = {}

	for pass_index in range(passes.size()):
		var pass_entry = passes[pass_index]
		if not (pass_entry is Dictionary):
			continue

		var pass_id = str(pass_entry.get("id", ""))
		if pass_id == "":
			push_error("[PipelineExecutor] screenPasses[%d] is missing id" % pass_index)
			continue

		if not _validate_samplers(pass_entry, pass_id, previous_pass_ids):
			continue

		var shader = _resolve_shader(pass_entry, false)
		if shader == null:
			continue

		var material = ShaderMaterial.new()
		material.shader = shader
		if not _bind_declared_params(pass_entry, material):
			continue

		var layer_name = "pipeline_%s" % pass_id
		var rect = _effects_manager._get_or_create_post_rect(layer_name, pass_index)
		rect.material = material

		_active_passes[pass_id] = {
			"kind": "screen",
			"rect": rect,
			"material": material,
			"layer_name": layer_name,
			"declared_uniforms": _declared_uniforms(pass_entry),
			"declared_samplers": _declared_samplers(pass_entry),
		}
		previous_pass_ids[pass_id] = true

func _resolve_shader(pass_entry: Dictionary, is_sprite: bool) -> Shader:
	var shader_source = pass_entry.get("shaderSource", {})
	if not (shader_source is Dictionary):
		push_error("[PipelineExecutor] Pass '%s' has invalid shaderSource" % str(pass_entry.get("id", "")))
		return null

	var source_type = str(shader_source.get("type", ""))
	if source_type == "builtin":
		var effect_type = str(shader_source.get("effectType", ""))
		var shader_name = _map_effect_type_to_shader(effect_type)
		if shader_name == "":
			push_error("[PipelineExecutor] Unsupported built-in effectType: %s" % effect_type)
			return null

		if is_sprite:
			return _effects_manager.get_sprite_shader(shader_name)

		return _effects_manager._post_shaders.get(shader_name)

	if source_type == "custom":
		var glsl = str(shader_source.get("glsl", ""))
		if glsl == "":
			push_error("[PipelineExecutor] Pass '%s' has empty custom GLSL" % str(pass_entry.get("id", "")))
			return null
		return _build_custom_shader(glsl)

	push_error("[PipelineExecutor] Unsupported shader source type: %s" % source_type)
	return null

func _build_custom_shader(glsl: String) -> Shader:
	var shader_code = glsl
	if not shader_code.contains("shader_type"):
		shader_code = "shader_type canvas_item;\n" + shader_code

	var shader = Shader.new()
	shader.code = shader_code
	return shader

func _bind_declared_params(pass_entry: Dictionary, material: ShaderMaterial) -> bool:
	var declared_uniforms = _declared_uniforms(pass_entry)
	var declared_samplers = _declared_samplers(pass_entry)
	var params = pass_entry.get("params", {})

	if not (params is Dictionary):
		return true

	for key in params.keys():
		if not declared_uniforms.has(key) and not declared_samplers.has(key):
			push_error("[PipelineExecutor] Pass '%s' attempted undeclared binding '%s'" % [str(pass_entry.get("id", "")), str(key)])
			return false

		material.set_shader_parameter(str(key), _effects_manager._convert_param(params[key]))

	return true

func _declared_uniforms(pass_entry: Dictionary) -> Dictionary:
	var result: Dictionary = {}
	var uniforms = pass_entry.get("uniforms", [])
	if uniforms is Array:
		for uniform in uniforms:
			if uniform is Dictionary and uniform.has("name"):
				result[str(uniform["name"])] = true
	return result

func _declared_samplers(pass_entry: Dictionary) -> Dictionary:
	var result: Dictionary = {}
	var samplers = pass_entry.get("samplers", [])
	if samplers is Array:
		for sampler in samplers:
			result[str(sampler)] = true
	return result

func _validate_samplers(pass_entry: Dictionary, pass_id: String, previous_pass_ids: Dictionary) -> bool:
	var samplers = pass_entry.get("samplers", [])
	if not (samplers is Array):
		return true

	for sampler in samplers:
		var sampler_name = str(sampler)
		if WELL_KNOWN_SAMPLERS.has(sampler_name):
			continue
		if previous_pass_ids.has(sampler_name):
			continue
		push_error("[PipelineExecutor] Pass '%s' has invalid sampler binding '%s'" % [pass_id, sampler_name])
		return false

	return true

func _resolve_sprite_for_pass(pass_entry: Dictionary) -> CanvasItem:
	if not _resolve_sprite.is_valid():
		return null

	var target_entity_id = str(pass_entry.get("targetEntityId", ""))
	if target_entity_id == "":
		var params = pass_entry.get("params", {})
		if params is Dictionary:
			target_entity_id = str(params.get("targetEntityId", params.get("entityId", params.get("targetId", ""))))

	if target_entity_id == "":
		return null

	return _resolve_sprite.call(target_entity_id)

func _map_effect_type_to_shader(effect_type: String) -> String:
	if EFFECT_TYPE_TO_SHADER.has(effect_type):
		return EFFECT_TYPE_TO_SHADER[effect_type]
	return ""
