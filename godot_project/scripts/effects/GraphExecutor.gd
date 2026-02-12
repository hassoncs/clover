class_name EffectsGraphExecutor
extends Node

enum State { IDLE, READY, RUNNING, PAUSED, STOPPED }

var _state: State = State.IDLE
var _plan: Dictionary = {}
var _resource_graph: EffectsResourceGraph = null
var _ping_pong_manager: EffectsPingPongManager = null
var _pass_entries: Array = []
var _pass_index: Dictionary = {}
var _plan_hash: String = ""
var _seed_feedback_on_next_frame: bool = false
var _viewport_pool: ViewportPool = null
var _shader_warmer: ShaderWarmer = null
var _buffer_registry: Dictionary = {}  # name -> texture

func _ready() -> void:
	set_process(false)
	
	# Create viewport pool for efficient viewport reuse
	_viewport_pool = ViewportPool.new(10)
	
	# Create shader warmer and pre-compile builtin shaders
	_shader_warmer = ShaderWarmer.new()
	_shader_warmer.warm_builtin_shaders()

func apply_plan(plan_json: Dictionary, entity_texture: Texture2D = null) -> Dictionary:
	clear()

	if not _validate_plan(plan_json):
		return {"success": false, "error": "Invalid CompiledPlan payload"}

	_plan = plan_json.duplicate(true)
	_plan_hash = str(_plan.get("hash", ""))

	var viewport_size: Vector2i = _resolve_base_size()
	_resource_graph = EffectsResourceGraph.new()
	_resource_graph.configure(self, viewport_size, _viewport_pool)

	if not _resource_graph.allocate(_plan.get("resourceMap", {}), str(_plan.get("scope", "screen"))):
		push_error("[EffectsGraphExecutor] Resource allocation failed")
		clear()
		return {"success": false, "error": "Resource allocation failed"}

	_bind_implicit_inputs()
	# Entity textures should be registered via set_input_buffer("pixelBuffer", texture)

	_ping_pong_manager = EffectsPingPongManager.new()
	_ping_pong_manager.configure(self, viewport_size, _viewport_pool)

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

	# ViewportPool and ShaderWarmer are RefCounted, just null them
	_viewport_pool = null
	_shader_warmer = null

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

	# When restarting from STOPPED, clear the stale ping-pong content
	# and rebind non-feedback inputs so the shader picks up the current
	# entity texture (which may have been baked + drawn on since last stop).
	if _state == State.STOPPED:
		for entry in _pass_entries:
			var ping_pong_buffer: String = str(entry.get("ping_pong_buffer", ""))
			if ping_pong_buffer != "" and _ping_pong_manager != null:
				_ping_pong_manager.reset(ping_pong_buffer)
			# skip_feedback=true — _process handles feedback bindings correctly
			_rebind_entry_inputs(entry, true)
		# On the first frame after reset the ping-pong viewports are empty.
		# If we let the shader read from them, it will treat every non-white
		# pixel in entity_input as "newly drawn" and pin it — preventing
		# previously-evolved content from continuing to evolve.
		# By seeding the feedback uniform with the entity texture on frame 1,
		# the shader sees the same content in both inputs and evolves
		# everything uniformly.
		_seed_feedback_on_next_frame = true

	if _state == State.READY:
		_seed_feedback_on_next_frame = true

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

func hot_swap_shader(pass_id: String, glsl_code: String) -> Dictionary:
	if pass_id == "":
		return {"success": false, "error": "pass_id is required"}
	if glsl_code == "":
		return {"success": false, "error": "glsl_code is required"}
	if not _pass_index.has(pass_id):
		return {"success": false, "error": "Unknown pass id: %s" % pass_id}

	var entry: Dictionary = _pass_index[pass_id]
	
	# Compile new shader
	var new_shader: Shader = _build_custom_shader(glsl_code)
	if new_shader == null:
		return {"success": false, "error": "Failed to compile shader"}
	
	# Check for shader compilation errors
	var shader_error: String = new_shader.get_code()
	if shader_error == "":
		return {"success": false, "error": "Shader compilation produced empty code"}
	
	# Get materials from entry
	var material: ShaderMaterial = entry.get("material")
	var material_a: ShaderMaterial = entry.get("material_a")
	var material_b: ShaderMaterial = entry.get("material_b")
	
	if material == null and material_a == null and material_b == null:
		return {"success": false, "error": "No material found for pass"}
	
	# Swap shader on all materials
	if material != null:
		material.shader = new_shader
		_apply_material_params(material, entry.get("params", {}))
	if material_a != null:
		material_a.shader = new_shader
		_apply_material_params(material_a, entry.get("params", {}))
	if material_b != null:
		material_b.shader = new_shader
		_apply_material_params(material_b, entry.get("params", {}))
	
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

		_ping_pong_manager.swap(ping_pong_buffer)
		_ping_pong_manager.clear_draw_container(ping_pong_buffer)

		var write_vp: SubViewport = _ping_pong_manager.get_write_viewport(ping_pong_buffer)
		var read_tex: Texture2D = _ping_pong_manager.get_read_texture(ping_pong_buffer)

		if read_tex != null:
			var write_material: ShaderMaterial = null
			if write_vp == entry.get("viewport_a"):
				write_material = entry.get("material_a")
			else:
				write_material = entry.get("material_b")

			var feedback_tex: Texture2D = read_tex
			if _seed_feedback_on_next_frame:
				var pixel_buffer_tex: Texture2D = _buffer_registry.get("pixelBuffer")
				if pixel_buffer_tex != null:
					feedback_tex = pixel_buffer_tex

			var input_bindings: Dictionary = pass_data.get("params", {}).get("inputBindings", {})
			for uniform_name in input_bindings.keys():
				var resource_id = str(input_bindings[uniform_name])
				if resource_id.begins_with("__feedback:"):
					if write_material != null:
						write_material.set_shader_parameter(str(uniform_name), feedback_tex)

		var write_mat: ShaderMaterial = entry.get("material_a") if write_vp == entry.get("viewport_a") else entry.get("material_b")
		if write_mat != null:
			write_mat.set_shader_parameter("dt", delta)

		_resource_graph.register_pass_output(str(entry.get("id", "")), write_vp, pass_data.get("provides", []))
		_update_ping_pong_write_mode(entry)

	if _seed_feedback_on_next_frame:
		_seed_feedback_on_next_frame = false

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

	_enforce_render_order()
	return true

func _enforce_render_order() -> void:
	# Sort _pass_entries by CompiledPlan order
	# The passes in _plan.passes should already be in topo order
	# We just need to ensure the scene graph matches
	
	for i in range(_pass_entries.size()):
		var entry: Dictionary = _pass_entries[i]
		
		# Handle single-pass entries
		var color_rect: ColorRect = entry.get("rect")
		if color_rect != null:
			var viewport: SubViewport = entry.get("viewport")
			if viewport != null:
				var current_index: int = color_rect.get_index()
				if current_index != i:
					viewport.move_child(color_rect, i)
		
		# Handle ping-pong pass entries (two ColorRects)
		var rect_a: ColorRect = entry.get("rect_a")
		if rect_a != null:
			var viewport_a: SubViewport = entry.get("viewport_a")
			if viewport_a != null:
				var current_index: int = rect_a.get_index()
				if current_index != i:
					viewport_a.move_child(rect_a, i)
		
		var rect_b: ColorRect = entry.get("rect_b")
		if rect_b != null:
			var viewport_b: SubViewport = entry.get("viewport_b")
			if viewport_b != null:
				var current_index: int = rect_b.get_index()
				if current_index != i:
					viewport_b.move_child(rect_b, i)

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

	# For screen-scope passes in SubViewports, bind the input texture to
	# SCREEN_TEXTURE uniform (since we rewrote the shader to not use
	# hint_screen_texture, the uniform needs an explicit texture).
	if str(_plan.get("scope", "")) == "screen":
		_bind_screen_texture_uniform(pass_data, material)

	rect.material = material
	viewport.add_child(rect)

	entry["viewport"] = viewport
	entry["rect"] = rect
	entry["material"] = material

	_resource_graph.register_pass_output(str(pass_data.get("id", "")), viewport, pass_data.get("provides", []))
	return true

func _bind_screen_texture_uniform(pass_data: Dictionary, material: ShaderMaterial) -> void:
	# Find the first required texture and bind it to SCREEN_TEXTURE uniform
	var requires: Array = pass_data.get("requires", [])
	for ref in requires:
		if not (ref is Dictionary):
			continue
		var resource_id = str(ref.get("id", ""))
		if resource_id == "":
			continue
		var tex = _resource_graph.get_texture(resource_id)
		if tex != null:
			material.set_shader_parameter("SCREEN_TEXTURE", tex)
			return

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

	var vp_size: Vector2i = viewport_a.size
	var texel := Vector2(1.0 / float(vp_size.x), 1.0 / float(vp_size.y))
	material_a.set_shader_parameter("texel_size", texel)
	material_b.set_shader_parameter("texel_size", texel)

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

	var glsl: String = str(shader_source.get("glsl", ""))
	if glsl == "":
		return null

	# For screen-scope effects running in SubViewports, SCREEN_TEXTURE
	# refers to the SubViewport's own backbuffer (empty), not the game
	# screen. Rewrite the shader to use an explicit sampler uniform that
	# the ResourceGraph will bind to the actual input texture.
	if str(_plan.get("scope", "")) == "screen" and glsl.contains("hint_screen_texture"):
		glsl = _rewrite_screen_texture_for_subviewport(glsl)

	return _build_custom_shader(glsl)

func _rewrite_screen_texture_for_subviewport(glsl: String) -> String:
	# Replace the SCREEN_TEXTURE declaration with a regular sampler2D.
	# The uniform name stays "SCREEN_TEXTURE" so existing texture()
	# calls keep working — we just remove the hint_screen_texture hint
	# so Godot treats it as a normal sampler that we bind manually.
	var result := glsl
	# Match variations: hint_screen_texture with optional filter hints
	var regex := RegEx.new()
	regex.compile("uniform\\s+sampler2D\\s+SCREEN_TEXTURE\\s*:[^;]*;")
	var m := regex.search(result)
	if m != null:
		result = result.replace(m.get_string(), "uniform sampler2D SCREEN_TEXTURE : filter_linear_mipmap;")
	# Replace SCREEN_UV with UV since we're now in a SubViewport ColorRect
	result = result.replace("SCREEN_UV", "UV")
	return result

func _build_custom_shader(glsl: String) -> Shader:
	# Use shader warmer if available for custom shaders (caches by hash)
	if _shader_warmer != null:
		return _shader_warmer.warm_custom_shader(glsl)
	
	# Fallback: build shader directly
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
	# For entity-scoped effects, match the pixel buffer size so the
	# ping-pong viewports operate at the same resolution as the pixel
	# buffer.  This avoids a quality change when baking back on stop.
	if str(_plan.get("scope", "screen")) == "entity":
		var pixel_buffer_tex: Texture2D = _buffer_registry.get("pixelBuffer")
		if pixel_buffer_tex != null:
			var tex_size: Vector2i = pixel_buffer_tex.get_size()
			if tex_size.x > 0 and tex_size.y > 0:
				return tex_size
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

func set_input_buffer(name: String, texture: Texture2D) -> void:
	_buffer_registry[name] = texture
	# If resource graph exists, update it
	if _resource_graph != null:
		_resource_graph.set_external_texture(name, texture)

func get_buffer(name: String) -> Texture2D:
	return _buffer_registry.get(name)

func set_input_buffer_from_entity(name: String, entity_id: String) -> void:
	# Get entity node from GameBridge
	var game_bridge = get_node_or_null("/root/GameBridge")
	if game_bridge == null:
		push_error("[EffectsGraphExecutor] GameBridge not found")
		return
	
	var entity_node: Node2D = game_bridge.get_entity_node(entity_id)
	if entity_node == null:
		push_error("[EffectsGraphExecutor] Entity '%s' not found" % entity_id)
		return
	
	# Find sprite in entity tree
	var sprite: Sprite2D = _find_sprite_in_tree(entity_node, 3)
	if sprite == null or sprite.texture == null:
		push_error("[EffectsGraphExecutor] No sprite texture found for entity '%s'" % entity_id)
		return
	
	# Register the texture as a named buffer
	set_input_buffer(name, sprite.texture)

func _find_sprite_in_tree(node: Node, max_depth: int) -> Sprite2D:
	if max_depth <= 0:
		return null
	if node is Sprite2D:
		return node as Sprite2D
	for child in node.get_children():
		var result = _find_sprite_in_tree(child, max_depth - 1)
		if result != null:
			return result
	return null

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
	print("[EffectsGraphExecutor] State %s -> %s" % [_state_name(_state), _state_name(next_state)])
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
