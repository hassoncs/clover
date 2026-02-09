class_name EffectsGraphExecutor
extends Node

enum State { IDLE, READY, RUNNING, PAUSED, STOPPED }

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

const SPRITE_SHADER_PATHS = {
	"outline": "res://shaders/sprite/outline.gdshader",
	"glow": "res://shaders/sprite/glow.gdshader",
	"tint": "res://shaders/sprite/tint.gdshader",
	"flash": "res://shaders/sprite/flash.gdshader",
	"pixelate": "res://shaders/sprite/pixelate.gdshader",
	"posterize": "res://shaders/sprite/posterize.gdshader",
	"silhouette": "res://shaders/sprite/silhouette.gdshader",
	"rainbow": "res://shaders/sprite/rainbow.gdshader",
	"dissolve": "res://shaders/sprite/dissolve.gdshader",
	"holographic": "res://shaders/sprite/holographic.gdshader",
	"wave": "res://shaders/sprite/wave.gdshader",
	"rim_light": "res://shaders/sprite/rim_light.gdshader",
	"color_matrix": "res://shaders/sprite/color_matrix.gdshader",
	"inner_glow": "res://shaders/sprite/inner_glow.gdshader",
	"drop_shadow": "res://shaders/sprite/drop_shadow.gdshader",
}

const POST_SHADER_PATHS = {
	"vignette": "res://shaders/post_process/vignette.gdshader",
	"bloom": "res://shaders/post_process/bloom.gdshader",
	"night_vision": "res://shaders/post_process/night_vision.gdshader",
	"speed_lines": "res://shaders/post_process/speed_lines.gdshader",
	"underwater": "res://shaders/post_process/underwater.gdshader",
	"halftone": "res://shaders/post_process/halftone.gdshader",
	"old_film": "res://shaders/post_process/old_film.gdshader",
	"thermal_vision": "res://shaders/post_process/thermal_vision.gdshader",
	"ascii": "res://shaders/post_process/ascii.gdshader",
	"ripple": "res://shaders/post_process/ripple.gdshader",
	"fog_of_war": "res://shaders/post_process/fog_of_war.gdshader",
	"scanlines": "res://shaders/post_process/scanlines.gdshader",
	"chromatic_aberration": "res://shaders/post_process/chromatic_aberration.gdshader",
	"shockwave": "res://shaders/post_process/shockwave.gdshader",
	"blur": "res://shaders/post_process/blur.gdshader",
	"crt": "res://shaders/post_process/crt.gdshader",
	"color_grading": "res://shaders/post_process/color_grading.gdshader",
	"color_grade": "res://shaders/post_process/color_grading.gdshader",
	"glitch": "res://shaders/post_process/glitch.gdshader",
	"motion_blur": "res://shaders/post_process/motion_blur.gdshader",
	"pixelate_screen": "res://shaders/post_process/pixelate_screen.gdshader",
	"shimmer": "res://shaders/post_process/shimmer.gdshader",
}

var _state: State = State.IDLE
var _plan: Dictionary = {}
var _resource_graph: EffectsResourceGraph = null
var _ping_pong_manager: EffectsPingPongManager = null
var _pass_entries: Array = []
var _pass_index: Dictionary = {}
var _plan_hash: String = ""

func _ready() -> void:
	set_process(false)

func apply_plan(plan_json: Dictionary, entity_texture: Texture2D = null) -> Dictionary:
	clear()

	if not _validate_plan(plan_json):
		return {"success": false, "error": "Invalid CompiledPlan payload"}

	_plan = plan_json.duplicate(true)
	_plan_hash = str(_plan.get("hash", ""))

	var viewport_size: Vector2i = _resolve_base_size()
	_resource_graph = EffectsResourceGraph.new()
	_resource_graph.configure(self, viewport_size)

	if not _resource_graph.allocate(_plan.get("resourceMap", {}), str(_plan.get("scope", "screen"))):
		push_error("[EffectsGraphExecutor] Resource allocation failed")
		clear()
		return {"success": false, "error": "Resource allocation failed"}

	_bind_implicit_inputs()
	if entity_texture != null:
		_resource_graph.set_external_texture("__entityTexture", entity_texture)

	_ping_pong_manager = EffectsPingPongManager.new()
	_ping_pong_manager.configure(self, viewport_size)

	if not _build_passes(_plan.get("passes", [])):
		clear()
		return {"success": false, "error": "Failed to build one or more passes"}

	_transition_to(State.READY)
	return {"success": true}

func clear() -> void:
	set_process(false)

	for entry in _pass_entries:
		if not (entry is Dictionary):
			continue
		var rect: ColorRect = entry.get("rect")
		if rect and is_instance_valid(rect):
			rect.queue_free()
		var rect_a: ColorRect = entry.get("rect_a")
		if rect_a and is_instance_valid(rect_a):
			rect_a.queue_free()
		var rect_b: ColorRect = entry.get("rect_b")
		if rect_b and is_instance_valid(rect_b):
			rect_b.queue_free()

	_pass_entries.clear()
	_pass_index.clear()

	if _ping_pong_manager != null:
		_ping_pong_manager.release()
		_ping_pong_manager = null

	if _resource_graph != null:
		_resource_graph.release()
		_resource_graph = null

	_plan = {}
	_plan_hash = ""
	_transition_to(State.IDLE)

func update_params(pass_id: String, params: Dictionary) -> Dictionary:
	if pass_id == "":
		return {"success": false, "error": "pass_id is required"}
	if not _pass_index.has(pass_id):
		return {"success": false, "error": "Unknown pass id: %s" % pass_id}
	if not (params is Dictionary):
		return {"success": false, "error": "params must be a Dictionary"}

	var entry: Dictionary = _pass_index[pass_id]
	_apply_material_params(entry.get("material"), params)
	_apply_material_params(entry.get("material_a"), params)
	_apply_material_params(entry.get("material_b"), params)

	entry["params"] = params.duplicate(true)
	return {"success": true}

func start() -> void:
	if _state != State.READY and _state != State.STOPPED:
		push_warning("[EffectsGraphExecutor] Cannot start from state %s" % _state_name(_state))
		return

	for entry in _pass_entries:
		_enable_entry_updates(entry, true)

	_transition_to(State.RUNNING)
	set_process(true)

func pause() -> void:
	if _state != State.RUNNING:
		push_warning("[EffectsGraphExecutor] Cannot pause from state %s" % _state_name(_state))
		return

	for entry in _pass_entries:
		_enable_entry_updates(entry, false)

	set_process(false)
	_transition_to(State.PAUSED)

func resume() -> void:
	if _state != State.PAUSED:
		push_warning("[EffectsGraphExecutor] Cannot resume from state %s" % _state_name(_state))
		return

	for entry in _pass_entries:
		_enable_entry_updates(entry, true)

	set_process(true)
	_transition_to(State.RUNNING)

func stop() -> void:
	if _state != State.RUNNING and _state != State.PAUSED:
		push_warning("[EffectsGraphExecutor] Cannot stop from state %s" % _state_name(_state))
		return

	for entry in _pass_entries:
		_enable_entry_updates(entry, false)
		var ping_pong_buffer: String = str(entry.get("ping_pong_buffer", ""))
		if ping_pong_buffer != "" and _ping_pong_manager != null:
			_ping_pong_manager.stop(ping_pong_buffer)

	set_process(false)
	_transition_to(State.STOPPED)

func reset() -> void:
	for entry in _pass_entries:
		var ping_pong_buffer: String = str(entry.get("ping_pong_buffer", ""))
		if ping_pong_buffer != "" and _ping_pong_manager != null:
			_ping_pong_manager.reset(ping_pong_buffer)
		_rebind_entry_inputs(entry)

	if _plan.size() > 0:
		_transition_to(State.READY)
	else:
		_transition_to(State.IDLE)

func get_snapshot() -> Dictionary:
	var pass_snapshots: Array = []
	for entry in _pass_entries:
		if not (entry is Dictionary):
			continue
		pass_snapshots.append({
			"id": str(entry.get("id", "")),
			"params": entry.get("params", {}).duplicate(true),
		})

	return {
		"planId": str(_plan.get("id", "")),
		"planHash": _plan_hash,
		"state": _state_name(_state),
		"scope": str(_plan.get("scope", "")),
		"passes": pass_snapshots,
		"timestamp": Time.get_unix_time_from_system() * 1000.0,
	}

func restore_snapshot(snapshot: Dictionary) -> Dictionary:
	if not (snapshot is Dictionary):
		return {"success": false, "error": "Snapshot must be a Dictionary"}

	var snapshot_hash: String = str(snapshot.get("planHash", ""))
	if snapshot_hash != _plan_hash:
		return {"success": false, "error": "Snapshot hash does not match active plan"}

	var pass_snapshots: Array = snapshot.get("passes", [])
	if not (pass_snapshots is Array):
		return {"success": false, "error": "Snapshot passes must be an Array"}

	for pass_snapshot in pass_snapshots:
		if not (pass_snapshot is Dictionary):
			continue
		var pass_id: String = str(pass_snapshot.get("id", ""))
		var params: Dictionary = pass_snapshot.get("params", {})
		if pass_id == "" or not (params is Dictionary):
			continue
		var result = update_params(pass_id, params)
		if not bool(result.get("success", false)):
			return result

	return {"success": true}

func _process(delta: float) -> void:
	if _state != State.RUNNING:
		return

	var should_rebind_inputs := false
	for entry in _pass_entries:
		if not (entry is Dictionary):
			continue
		var ping_pong_buffer: String = str(entry.get("ping_pong_buffer", ""))
		if ping_pong_buffer == "" or _ping_pong_manager == null:
			continue

		var pass_data: Dictionary = entry.get("pass_data", {})

		# Swap FIRST — the previous write viewport just rendered,
		# so it becomes the new read source.
		_ping_pong_manager.swap(ping_pong_buffer)

		var write_vp: SubViewport = _ping_pong_manager.get_write_viewport(ping_pong_buffer)
		var read_tex: Texture2D = _ping_pong_manager.get_read_texture(ping_pong_buffer)

		if read_tex != null:
			# Determine which material belongs to the NEW write viewport.
			# Only set the feedback texture on this material to prevent
			# a feedback loop (reading from a viewport we are writing to).
			var write_material: ShaderMaterial = null
			if write_vp == entry.get("viewport_a"):
				write_material = entry.get("material_a")
			else:
				write_material = entry.get("material_b")

			var input_bindings: Dictionary = pass_data.get("params", {}).get("inputBindings", {})
			for uniform_name in input_bindings.keys():
				var resource_id = str(input_bindings[uniform_name])
				if resource_id.begins_with("__feedback:"):
					if write_material != null:
						write_material.set_shader_parameter(str(uniform_name), read_tex)

		# Auto-set common shader uniforms on both materials
		var vp_a: SubViewport = _ping_pong_manager.get_viewports(ping_pong_buffer).get("a")
		if vp_a != null:
			var vp_size: Vector2i = vp_a.size
			var texel := Vector2(1.0 / float(vp_size.x), 1.0 / float(vp_size.y))
			for mat_key in ["material_a", "material_b"]:
				var mat: ShaderMaterial = entry.get(mat_key)
				if mat != null:
					mat.set_shader_parameter("texel_size", texel)
					mat.set_shader_parameter("dt", delta)

		_resource_graph.register_pass_output(str(entry.get("id", "")), write_vp, pass_data.get("provides", []))
		_update_ping_pong_write_mode(entry)
		should_rebind_inputs = true

	if should_rebind_inputs:
		for pass_entry in _pass_entries:
			var has_ping_pong: bool = str(pass_entry.get("ping_pong_buffer", "")) != ""
			_rebind_entry_inputs(pass_entry, has_ping_pong)

func _build_passes(passes: Array) -> bool:
	if not (passes is Array):
		push_error("[EffectsGraphExecutor] passes must be an Array")
		return false

	for pass_data in passes:
		if not (pass_data is Dictionary):
			push_error("[EffectsGraphExecutor] pass entry must be a Dictionary")
			return false

		var pass_id: String = str(pass_data.get("id", ""))
		if pass_id == "":
			push_error("[EffectsGraphExecutor] pass missing id")
			return false

		var shader: Shader = _resolve_shader(pass_data)
		if shader == null:
			push_error("[EffectsGraphExecutor] Failed to resolve shader for pass '%s'" % pass_id)
			return false

		var entry: Dictionary = {
			"id": pass_id,
			"pass_data": pass_data,
			"params": pass_data.get("params", {}).duplicate(true),
		}

		if str(pass_data.get("persistence", "none")) == "pingPong":
			if not _setup_ping_pong_pass(entry, pass_data, shader):
				return false
		else:
			if not _setup_single_pass(entry, pass_data, shader):
				return false

		_pass_entries.append(entry)
		_pass_index[pass_id] = entry

	return true

func _setup_single_pass(entry: Dictionary, pass_data: Dictionary, shader: Shader) -> bool:
	var viewport := _resolve_output_viewport(pass_data)
	if viewport == null:
		push_error("[EffectsGraphExecutor] Missing output viewport for pass '%s'" % str(pass_data.get("id", "")))
		return false

	var rect := ColorRect.new()
	rect.name = "EffectsRect_%s" % str(pass_data.get("id", ""))
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var material := ShaderMaterial.new()
	material.shader = shader
	_resource_graph.bind_pass_inputs(pass_data, material)
	_apply_material_params(material, pass_data.get("params", {}))

	rect.material = material
	viewport.add_child(rect)

	entry["viewport"] = viewport
	entry["rect"] = rect
	entry["material"] = material

	_resource_graph.register_pass_output(str(pass_data.get("id", "")), viewport, pass_data.get("provides", []))
	return true

func _setup_ping_pong_pass(entry: Dictionary, pass_data: Dictionary, shader: Shader) -> bool:
	var pass_id: String = str(pass_data.get("id", ""))
	var buffer_id: String = "__pingpong:%s" % pass_id
	var policy: Dictionary = _find_feedback_policy(pass_id)
	_ping_pong_manager.register(buffer_id, policy)
	_ping_pong_manager.initialize(buffer_id)

	var pair: Dictionary = _ping_pong_manager.get_viewports(buffer_id)
	var viewport_a: SubViewport = pair.get("a")
	var viewport_b: SubViewport = pair.get("b")
	if viewport_a == null or viewport_b == null:
		push_error("[EffectsGraphExecutor] Failed to initialize ping-pong viewports for pass '%s'" % pass_id)
		return false

	# Point feedback resources at the ping-pong read texture so that
	# bind_pass_inputs below gets the correct initial binding instead
	# of a stale / missing ResourceGraph viewport.
	var init_read_tex: Texture2D = _ping_pong_manager.get_read_texture(buffer_id)
	var pp_input_bindings: Dictionary = pass_data.get("params", {}).get("inputBindings", {})
	for _uniform_name in pp_input_bindings.keys():
		var _res_id = str(pp_input_bindings[_uniform_name])
		if _res_id.begins_with("__feedback:"):
			_resource_graph.set_external_texture(_res_id, init_read_tex)

	var material_a := ShaderMaterial.new()
	material_a.shader = shader
	var material_b := ShaderMaterial.new()
	material_b.shader = shader

	_resource_graph.bind_pass_inputs(pass_data, material_a)
	_resource_graph.bind_pass_inputs(pass_data, material_b)
	_apply_material_params(material_a, pass_data.get("params", {}))
	_apply_material_params(material_b, pass_data.get("params", {}))

	var rect_a := ColorRect.new()
	rect_a.name = "EffectsRectA_%s" % pass_id
	rect_a.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect_a.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rect_a.material = material_a
	viewport_a.add_child(rect_a)

	var rect_b := ColorRect.new()
	rect_b.name = "EffectsRectB_%s" % pass_id
	rect_b.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect_b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rect_b.material = material_b
	viewport_b.add_child(rect_b)

	entry["ping_pong_buffer"] = buffer_id
	entry["viewport_a"] = viewport_a
	entry["viewport_b"] = viewport_b
	entry["rect_a"] = rect_a
	entry["rect_b"] = rect_b
	entry["material_a"] = material_a
	entry["material_b"] = material_b

	var write_viewport: SubViewport = _ping_pong_manager.get_write_viewport(buffer_id)
	_resource_graph.register_pass_output(pass_id, write_viewport, pass_data.get("provides", []))
	return true

func _resolve_output_viewport(pass_data: Dictionary) -> SubViewport:
	var provides: Array = pass_data.get("provides", [])
	if provides.size() == 0:
		return null

	var first_ref = provides[0]
	if not (first_ref is Dictionary):
		return null

	var resource_id: String = str(first_ref.get("id", ""))
	if resource_id == "":
		return null

	var meta: Dictionary = _resource_graph.get_resource_meta(resource_id)
	var viewport: SubViewport = meta.get("viewport")
	return viewport

func _resolve_shader(pass_data: Dictionary) -> Shader:
	var shader_source = pass_data.get("shaderSource", {})
	if not (shader_source is Dictionary):
		return null

	var source_type: String = str(shader_source.get("type", ""))
	if source_type == "custom":
		var glsl: String = str(shader_source.get("glsl", ""))
		if glsl == "":
			return null
		return _build_custom_shader(glsl)

	if source_type == "builtin":
		var effect_type: String = str(shader_source.get("effectType", ""))
		if not EFFECT_TYPE_TO_SHADER.has(effect_type):
			return null
		var shader_name: String = EFFECT_TYPE_TO_SHADER[effect_type]
		var shader_path: String = _resolve_builtin_shader_path(shader_name)
		if shader_path == "":
			return null
		var shader = load(shader_path)
		if shader is Shader:
			return shader

	return null

func _resolve_builtin_shader_path(shader_name: String) -> String:
	var scope: String = str(_plan.get("scope", "screen"))
	if scope == "entity":
		if SPRITE_SHADER_PATHS.has(shader_name):
			return SPRITE_SHADER_PATHS[shader_name]
		if POST_SHADER_PATHS.has(shader_name):
			return POST_SHADER_PATHS[shader_name]
		return ""

	if POST_SHADER_PATHS.has(shader_name):
		return POST_SHADER_PATHS[shader_name]
	if SPRITE_SHADER_PATHS.has(shader_name):
		return SPRITE_SHADER_PATHS[shader_name]
	return ""

func _build_custom_shader(glsl: String) -> Shader:
	var shader_code := glsl
	if not shader_code.contains("shader_type"):
		shader_code = "shader_type canvas_item;\n" + shader_code
	var shader := Shader.new()
	shader.code = shader_code
	return shader

func _validate_plan(plan_json: Dictionary) -> bool:
	if not (plan_json is Dictionary):
		return false
	if str(plan_json.get("id", "")) == "":
		return false
	if not (plan_json.get("passes", null) is Array):
		return false
	if not (plan_json.get("resourceMap", null) is Dictionary):
		return false
	if str(plan_json.get("scope", "")) == "":
		return false
	return true

func _resolve_base_size() -> Vector2i:
	var viewport = get_viewport()
	if viewport:
		var size = viewport.get_visible_rect().size
		if size.x > 0 and size.y > 0:
			return size
	return Vector2i(800, 600)

func _bind_implicit_inputs() -> void:
	var viewport = get_viewport()
	if viewport == null:
		return
	var screen_tex: Texture2D = viewport.get_texture()
	if screen_tex != null:
		_resource_graph.set_external_texture("__screenColor", screen_tex)

	if str(_plan.get("scope", "screen")) == "entity":
		# Bridge will set an explicit entity texture if available.
		_resource_graph.set_external_texture("__entityTexture", null)

func set_entity_texture(texture: Texture2D) -> void:
	if _resource_graph != null:
		_resource_graph.set_external_texture("__entityTexture", texture)
		for entry in _pass_entries:
			var has_ping_pong: bool = str(entry.get("ping_pong_buffer", "")) != ""
			_rebind_entry_inputs(entry, has_ping_pong)

func _find_feedback_policy(pass_id: String) -> Dictionary:
	var feedback_policies: Dictionary = _plan.get("feedbackPolicies", {})
	for key in feedback_policies.keys():
		if not str(key).begins_with("__feedback:"):
			continue
		if str(key).contains(pass_id):
			return feedback_policies[key]
	return {"swapPolicy": "pingPong", "stopBehavior": "freeze", "initMode": "clear"}

func _apply_material_params(material: ShaderMaterial, params: Dictionary) -> void:
	if material == null or not (params is Dictionary):
		return
	for key in params.keys():
		if str(key) == "inputBindings":
			continue
		material.set_shader_parameter(str(key), _convert_param(params[key]))

func _convert_param(value):
	if value is Array:
		match value.size():
			2:
				return Vector2(float(value[0]), float(value[1]))
			3:
				return Vector3(float(value[0]), float(value[1]), float(value[2]))
			4:
				return Color(float(value[0]), float(value[1]), float(value[2]), float(value[3]))
	if value is int or value is float:
		return float(value)
	if value is bool:
		return value
	if value is String:
		return value
	return value

func _rebind_entry_inputs(entry: Dictionary, skip_feedback: bool = false) -> void:
	var pass_data: Dictionary = entry.get("pass_data", {})
	var material: ShaderMaterial = entry.get("material")
	var material_a: ShaderMaterial = entry.get("material_a")
	var material_b: ShaderMaterial = entry.get("material_b")
	if material != null:
		_resource_graph.bind_pass_inputs(pass_data, material, skip_feedback)
	if material_a != null:
		_resource_graph.bind_pass_inputs(pass_data, material_a, skip_feedback)
	if material_b != null:
		_resource_graph.bind_pass_inputs(pass_data, material_b, skip_feedback)

func _enable_entry_updates(entry: Dictionary, enabled: bool) -> void:
	var mode: int = SubViewport.UPDATE_ALWAYS if enabled else SubViewport.UPDATE_DISABLED
	var viewport: SubViewport = entry.get("viewport")
	if viewport != null:
		viewport.render_target_update_mode = mode
	if str(entry.get("ping_pong_buffer", "")) != "":
		if enabled:
			_update_ping_pong_write_mode(entry)
		else:
			var viewport_a: SubViewport = entry.get("viewport_a")
			if viewport_a != null:
				viewport_a.render_target_update_mode = SubViewport.UPDATE_DISABLED
			var viewport_b: SubViewport = entry.get("viewport_b")
			if viewport_b != null:
				viewport_b.render_target_update_mode = SubViewport.UPDATE_DISABLED
	else:
		var viewport_a: SubViewport = entry.get("viewport_a")
		if viewport_a != null:
			viewport_a.render_target_update_mode = mode
		var viewport_b: SubViewport = entry.get("viewport_b")
		if viewport_b != null:
			viewport_b.render_target_update_mode = mode

func _update_ping_pong_write_mode(entry: Dictionary) -> void:
	var buffer_id: String = str(entry.get("ping_pong_buffer", ""))
	if buffer_id == "" or _ping_pong_manager == null:
		return
	var pair: Dictionary = _ping_pong_manager.get_viewports(buffer_id)
	var viewport_a: SubViewport = pair.get("a")
	var viewport_b: SubViewport = pair.get("b")
	var write_vp: SubViewport = _ping_pong_manager.get_write_viewport(buffer_id)
	if viewport_a != null:
		viewport_a.render_target_update_mode = SubViewport.UPDATE_ALWAYS if write_vp == viewport_a else SubViewport.UPDATE_DISABLED
	if viewport_b != null:
		viewport_b.render_target_update_mode = SubViewport.UPDATE_ALWAYS if write_vp == viewport_b else SubViewport.UPDATE_DISABLED

func get_output_texture() -> Texture2D:
	if _pass_entries.size() == 0:
		return null
	var last_entry: Dictionary = _pass_entries[_pass_entries.size() - 1]
	var ping_pong_buffer: String = str(last_entry.get("ping_pong_buffer", ""))
	if ping_pong_buffer != "" and _ping_pong_manager != null:
		return _ping_pong_manager.get_read_texture(ping_pong_buffer)
	var viewport: SubViewport = last_entry.get("viewport")
	if viewport != null and is_instance_valid(viewport):
		return viewport.get_texture()
	return null

func _transition_to(next_state: State) -> void:
	if _state == next_state:
		return
	push_warning("[EffectsGraphExecutor] State %s -> %s" % [_state_name(_state), _state_name(next_state)])
	_state = next_state

func _state_name(state: State) -> String:
	match state:
		State.IDLE:
			return "idle"
		State.READY:
			return "ready"
		State.RUNNING:
			return "running"
		State.PAUSED:
			return "paused"
		State.STOPPED:
			return "stopped"
	return "unknown"
