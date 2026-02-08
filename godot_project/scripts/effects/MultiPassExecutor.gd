extends Node
class_name MultiPassExecutor

enum State { IDLE, RUNNING }

var _game_bridge: Node = null
var _pixel_buffer_manager: PixelBufferManager = null
var _buffers: Dictionary = {}
var _passes: Array = []
var _display_buffer: String = ""
var _entity_id: String = ""
var _target_sprite: Sprite2D = null
var _original_texture: Texture2D = null
var _state: State = State.IDLE
var _spec: Dictionary = {}
var _stop_mode: String = "freeze"
var _pending_inputs: Dictionary = {}
var _warmup_frames: int = 0

func _ready() -> void:
	set_process(false)

func setup(game_bridge: Node, pixel_buffer_manager: PixelBufferManager) -> void:
	_game_bridge = game_bridge
	_pixel_buffer_manager = pixel_buffer_manager

# ---------------------------------------------------------------------------
# apply_effect — parse spec, create viewports, wire reads, detect ping-pong
# ---------------------------------------------------------------------------

func apply_effect(entity_id: String, spec_dict: Dictionary) -> void:
	clear_effect()

	_entity_id = entity_id
	_spec = spec_dict
	_display_buffer = str(spec_dict.get("displayBuffer", ""))

	var lifecycle = spec_dict.get("lifecycle", {})
	if lifecycle is Dictionary:
		_stop_mode = str(lifecycle.get("stopMode", "freeze"))

	_target_sprite = _find_entity_sprite(entity_id)
	if _target_sprite == null:
		push_error("[MultiPassExecutor] Cannot find sprite for entity: %s" % entity_id)
		return

	_original_texture = _target_sprite.texture

	var buffers_spec = spec_dict.get("buffers", {})
	if not (buffers_spec is Dictionary):
		return

	var pb_buf = _get_pixel_buffer(entity_id)
	var default_w: int = 512
	var default_h: int = 512
	if pb_buf is Dictionary:
		default_w = int(pb_buf.get("width", 512))
		default_h = int(pb_buf.get("height", 512))

	for buffer_name in buffers_spec.keys():
		var bspec = buffers_spec[buffer_name]
		if not (bspec is Dictionary):
			continue
		var w: int = int(bspec.get("width", default_w))
		var h: int = int(bspec.get("height", default_h))
		var init_from: String = str(bspec.get("initFrom", "clear"))
		var clear_color: String = str(bspec.get("clearColor", ""))
		_buffers[buffer_name] = {
			"width": w,
			"height": h,
			"initFrom": init_from,
			"clearColor": clear_color,
			"writers": [],
		}

	var passes_spec = spec_dict.get("passes", [])
	if not (passes_spec is Array):
		return

	for pass_index in range(passes_spec.size()):
		var pspec = passes_spec[pass_index]
		if not (pspec is Dictionary):
			continue

		var pass_id: String = str(pspec.get("id", "pass_%d" % pass_index))
		var shader_code: String = str(pspec.get("shader", ""))
		var reads_map: Dictionary = pspec.get("reads", {})
		if not (reads_map is Dictionary):
			reads_map = {}
		var writes_buffer: String = str(pspec.get("writes", ""))
		var static_params: Dictionary = pspec.get("params", {})
		if not (static_params is Dictionary):
			static_params = {}
		var input_names: Array = pspec.get("inputs", [])
		if not (input_names is Array):
			input_names = []

		if shader_code == "":
			push_error("[MultiPassExecutor] Pass '%s' has empty shader" % pass_id)
			continue

		if not _buffers.has(writes_buffer):
			push_error("[MultiPassExecutor] Pass '%s' writes to unknown buffer '%s'" % [pass_id, writes_buffer])
			continue

		var buf_info: Dictionary = _buffers[writes_buffer]
		var vp_size = Vector2i(buf_info["width"], buf_info["height"])

		var viewport = SubViewport.new()
		viewport.name = "MP_%s" % pass_id
		viewport.size = vp_size
		viewport.transparent_bg = true
		viewport.render_target_update_mode = SubViewport.UPDATE_DISABLED
		viewport.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE

		var rect = ColorRect.new()
		rect.name = "Rect"
		rect.set_anchors_preset(Control.PRESET_FULL_RECT)
		rect.size = Vector2(vp_size)
		rect.mouse_filter = Control.MOUSE_FILTER_IGNORE

		var shader = Shader.new()
		if not shader_code.contains("shader_type"):
			shader_code = "shader_type canvas_item;\n" + shader_code
		shader.code = shader_code

		var material = ShaderMaterial.new()
		material.shader = shader

		var texel_size = Vector2(1.0 / float(vp_size.x), 1.0 / float(vp_size.y))
		material.set_shader_parameter("texel_size", texel_size)
		material.set_shader_parameter("dt", 0.016)

		for key in static_params.keys():
			material.set_shader_parameter(str(key), _convert_param(static_params[key]))

		for input_name in input_names:
			if not static_params.has(str(input_name)):
				material.set_shader_parameter(str(input_name), _default_for_input(str(input_name)))

		rect.material = material
		viewport.add_child(rect)
		add_child(viewport)

		var pass_entry = {
			"id": pass_id,
			"viewport": viewport,
			"rect": rect,
			"material": material,
			"writes_buffer": writes_buffer,
			"reads_map": reads_map,
			"input_names": input_names,
			"pass_index": pass_index,
		}
		_passes.append(pass_entry)
		buf_info["writers"].append(pass_index)

	_wire_buffer_reads()
	_setup_ping_pong()

	var auto_start = false
	if lifecycle is Dictionary:
		auto_start = lifecycle.get("autoStart", false)

	if auto_start:
		start_effect()

# ---------------------------------------------------------------------------
# Buffer read wiring
# ---------------------------------------------------------------------------

func _wire_buffer_reads() -> void:
	for pass_index in range(_passes.size()):
		var pass_entry: Dictionary = _passes[pass_index]
		var reads_map: Dictionary = pass_entry["reads_map"]
		var material: ShaderMaterial = pass_entry["material"]

		for sampler_name in reads_map.keys():
			var buffer_name: String = str(reads_map[sampler_name])
			if not _buffers.has(buffer_name):
				push_error("[MultiPassExecutor] Pass '%s' reads unknown buffer '%s'" % [pass_entry["id"], buffer_name])
				continue

			var buf_info: Dictionary = _buffers[buffer_name]
			var writers: Array = buf_info["writers"]
			var source_vp: SubViewport = null

			var best_earlier: int = -1
			var best_later: int = -1
			for writer_idx in writers:
				if writer_idx < pass_index:
					if best_earlier == -1 or writer_idx > best_earlier:
						best_earlier = writer_idx
				else:
					if best_later == -1 or writer_idx > best_later:
						best_later = writer_idx

			var source_idx: int = best_earlier if best_earlier >= 0 else best_later
			if source_idx >= 0 and source_idx < _passes.size():
				source_vp = _passes[source_idx]["viewport"]

			if source_vp != null:
				material.set_shader_parameter(str(sampler_name), source_vp.get_texture())

# ---------------------------------------------------------------------------
# Ping-pong detection — create viewport B for self-referencing feedback passes
# ---------------------------------------------------------------------------

func _setup_ping_pong() -> void:
	for pass_index in range(_passes.size()):
		var pass_entry: Dictionary = _passes[pass_index]
		var reads_map: Dictionary = pass_entry["reads_map"]

		var feedback_samplers: Array = []
		for sampler_name in reads_map.keys():
			var buffer_name: String = str(reads_map[sampler_name])
			if not _buffers.has(buffer_name):
				continue
			var writers: Array = _buffers[buffer_name]["writers"]

			var best_earlier: int = -1
			var best_later: int = -1
			for w in writers:
				if w < pass_index:
					if best_earlier == -1 or w > best_earlier:
						best_earlier = w
				else:
					if best_later == -1 or w > best_later:
						best_later = w
			var source_idx: int = best_earlier if best_earlier >= 0 else best_later
			if source_idx == pass_index:
				feedback_samplers.append(str(sampler_name))

		if feedback_samplers.size() == 0:
			continue

		var vp_a: SubViewport = pass_entry["viewport"]
		var vp_size: Vector2i = vp_a.size

		var vp_b := SubViewport.new()
		vp_b.name = vp_a.name + "_B"
		vp_b.size = vp_size
		vp_b.transparent_bg = true
		vp_b.render_target_update_mode = SubViewport.UPDATE_DISABLED
		vp_b.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE

		var rect_b := ColorRect.new()
		rect_b.name = "Rect"
		rect_b.set_anchors_preset(Control.PRESET_FULL_RECT)
		rect_b.size = Vector2(vp_size)
		rect_b.mouse_filter = Control.MOUSE_FILTER_IGNORE

		var material_b: ShaderMaterial = pass_entry["material"].duplicate()
		rect_b.material = material_b
		vp_b.add_child(rect_b)
		add_child(vp_b)

		pass_entry["viewport_b"] = vp_b
		pass_entry["rect_b"] = rect_b
		pass_entry["material_b"] = material_b
		pass_entry["feedback_samplers"] = feedback_samplers
		pass_entry["write_to_a"] = true

# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

func start_effect() -> void:
	if _state == State.RUNNING:
		return
	if _passes.size() == 0:
		return

	_state = State.RUNNING
	_warmup_frames = 0

	var entity_tex = _get_entity_texture()

	for pass_entry in _passes:
		var vp_a: SubViewport = pass_entry["viewport"]
		var writes_buf: String = pass_entry["writes_buffer"]
		var buf_info: Dictionary = _buffers[writes_buf]
		var has_pp: bool = pass_entry.has("viewport_b")

		if has_pp:
			var vp_b: SubViewport = pass_entry["viewport_b"]
			var samplers: Array = pass_entry["feedback_samplers"]

			if buf_info["initFrom"] == "entity" and entity_tex != null:
				# Feed entity texture directly to shader A as its sampler input.
				# A renders first frame reading entity texture -> produces output.
				# Then normal ping-pong: B reads A, A reads B, etc.
				for s in samplers:
					pass_entry["material"].set_shader_parameter(s, entity_tex)
				pass_entry["_entity_tex_samplers"] = samplers.duplicate()

			vp_a.render_target_clear_mode = SubViewport.CLEAR_MODE_NEVER
			vp_b.render_target_clear_mode = SubViewport.CLEAR_MODE_NEVER
			# Start with A rendering
			vp_a.render_target_update_mode = SubViewport.UPDATE_ALWAYS
			vp_b.render_target_update_mode = SubViewport.UPDATE_DISABLED
			pass_entry["write_to_a"] = true
		else:
			if buf_info["initFrom"] == "entity" and entity_tex != null:
				_render_texture_into_viewport(vp_a, entity_tex)
			else:
				vp_a.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE
				vp_a.render_target_update_mode = SubViewport.UPDATE_ALWAYS

	_seed_entity_buffers()
	set_process(true)

func stop_effect() -> void:
	if _state != State.RUNNING:
		return

	_state = State.IDLE
	set_process(false)

	for pass_entry in _passes:
		pass_entry["viewport"].render_target_update_mode = SubViewport.UPDATE_DISABLED
		if pass_entry.has("viewport_b"):
			pass_entry["viewport_b"].render_target_update_mode = SubViewport.UPDATE_DISABLED

	if _stop_mode == "freeze" and _display_buffer != "" and _target_sprite != null:
		_capture_display_to_pixel_buffer()

func clear_effect() -> void:
	_state = State.IDLE
	set_process(false)

	for pass_entry in _passes:
		var vp = pass_entry.get("viewport")
		if vp and is_instance_valid(vp):
			vp.queue_free()
		var vp_b = pass_entry.get("viewport_b")
		if vp_b and is_instance_valid(vp_b):
			vp_b.queue_free()

	_passes.clear()
	_buffers.clear()
	_pending_inputs.clear()
	_spec = {}
	_display_buffer = ""

	if _target_sprite != null and _original_texture != null and is_instance_valid(_target_sprite):
		_target_sprite.texture = _original_texture

	_target_sprite = null
	_original_texture = null
	_entity_id = ""

func set_pass_inputs(pass_id: String, inputs: Dictionary) -> void:
	_pending_inputs[pass_id] = inputs

# ---------------------------------------------------------------------------
# Entity texture seeding
# ---------------------------------------------------------------------------

func _get_entity_texture() -> ImageTexture:
	var pb_buf = _get_pixel_buffer(_entity_id)
	if pb_buf == null:
		return null
	return pb_buf.get("texture")

func _render_texture_into_viewport(vp: SubViewport, tex: ImageTexture) -> void:
	var blit_rect = TextureRect.new()
	blit_rect.texture = tex
	blit_rect.stretch_mode = TextureRect.STRETCH_SCALE
	blit_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	blit_rect.size = Vector2(vp.size)
	blit_rect.name = "_seed_blit"

	var shader_rect = vp.get_node_or_null("Rect")
	if shader_rect:
		shader_rect.visible = false

	vp.add_child(blit_rect)
	vp.render_target_clear_mode = SubViewport.CLEAR_MODE_NEVER
	vp.render_target_update_mode = SubViewport.UPDATE_ONCE

	blit_rect.set_meta("_cleanup", true)

func _cleanup_seed_blits() -> void:
	for pass_entry in _passes:
		for vp_key in ["viewport", "viewport_b"]:
			var vp = pass_entry.get(vp_key)
			if vp == null or not is_instance_valid(vp):
				continue
			for child in vp.get_children():
				if child.has_meta("_cleanup"):
					child.queue_free()
			var shader_rect = vp.get_node_or_null("Rect")
			if shader_rect:
				shader_rect.visible = true

func _seed_entity_buffers() -> void:
	var pb_buf = _get_pixel_buffer(_entity_id)
	if pb_buf == null:
		return

	var entity_texture: ImageTexture = pb_buf.get("texture")
	if entity_texture == null:
		return

	for buffer_name in _buffers.keys():
		var buf_info: Dictionary = _buffers[buffer_name]
		if buf_info["initFrom"] != "entity":
			continue

		for pass_index in range(_passes.size()):
			var pass_entry: Dictionary = _passes[pass_index]
			if pass_entry.has("viewport_b"):
				continue

			var reads_map: Dictionary = pass_entry["reads_map"]
			var material: ShaderMaterial = pass_entry["material"]

			for sampler_name in reads_map.keys():
				if str(reads_map[sampler_name]) == buffer_name:
					var writers: Array = buf_info["writers"]
					var has_earlier_writer = false
					for w in writers:
						if w < pass_index:
							has_earlier_writer = true
							break

					if not has_earlier_writer:
						material.set_shader_parameter(str(sampler_name), entity_texture)
						pass_entry["_seed_sampler"] = str(sampler_name)
						pass_entry["_seed_buffer"] = buffer_name

# ---------------------------------------------------------------------------
# Process loop
# ---------------------------------------------------------------------------

func _process(delta: float) -> void:
	if _state != State.RUNNING:
		return

	for pass_entry in _passes:
		pass_entry["material"].set_shader_parameter("dt", delta)
		if pass_entry.has("material_b"):
			pass_entry["material_b"].set_shader_parameter("dt", delta)

	_apply_pending_inputs()

	if _warmup_frames >= 0:
		_warmup_frames += 1

		if _warmup_frames == 2:
			# Frame 1 has rendered.
			# Ping-pong passes seeded with entity texture: A has output.
			# Swap to B reading A, start normal ping-pong.
			for pass_entry in _passes:
				if pass_entry.has("_entity_tex_samplers"):
					var vp_a: SubViewport = pass_entry["viewport"]
					var vp_b: SubViewport = pass_entry["viewport_b"]
					var samplers: Array = pass_entry["_entity_tex_samplers"]
					for s in samplers:
						pass_entry["material_b"].set_shader_parameter(s, vp_a.get_texture())
					vp_b.render_target_update_mode = SubViewport.UPDATE_ALWAYS
					vp_a.render_target_update_mode = SubViewport.UPDATE_DISABLED
					pass_entry["write_to_a"] = false
					pass_entry.erase("_entity_tex_samplers")

			# Non-ping-pong passes with blit seeding
			_cleanup_seed_blits()
			for pass_entry in _passes:
				if not pass_entry.has("viewport_b"):
					var vp: SubViewport = pass_entry["viewport"]
					vp.render_target_clear_mode = SubViewport.CLEAR_MODE_NEVER
					vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS

			_restore_viewport_textures()

			# Assign display texture now
			if _display_buffer != "" and _target_sprite != null:
				var display_vp = _get_active_display_viewport()
				if display_vp != null:
					_target_sprite.texture = display_vp.get_texture()

			_warmup_frames = -1
		return

	_do_ping_pong()

	if _display_buffer != "" and _target_sprite != null:
		var display_vp = _get_active_display_viewport()
		if display_vp != null:
			_target_sprite.texture = display_vp.get_texture()

func _do_ping_pong() -> void:
	for pass_entry in _passes:
		if not pass_entry.has("viewport_b"):
			continue

		var vp_a: SubViewport = pass_entry["viewport"]
		var vp_b: SubViewport = pass_entry["viewport_b"]
		var write_to_a: bool = pass_entry["write_to_a"]
		var samplers: Array = pass_entry["feedback_samplers"]

		if write_to_a:
			for s in samplers:
				pass_entry["material"].set_shader_parameter(s, vp_b.get_texture())
			vp_a.render_target_update_mode = SubViewport.UPDATE_ALWAYS
			vp_b.render_target_update_mode = SubViewport.UPDATE_DISABLED
		else:
			for s in samplers:
				pass_entry["material_b"].set_shader_parameter(s, vp_a.get_texture())
			vp_b.render_target_update_mode = SubViewport.UPDATE_ALWAYS
			vp_a.render_target_update_mode = SubViewport.UPDATE_DISABLED

		pass_entry["write_to_a"] = not write_to_a

# ---------------------------------------------------------------------------
# Viewport texture management
# ---------------------------------------------------------------------------

func _restore_viewport_textures() -> void:
	for pass_entry in _passes:
		if not pass_entry.has("_seed_sampler"):
			continue

		if pass_entry.has("viewport_b"):
			pass_entry.erase("_seed_sampler")
			pass_entry.erase("_seed_buffer")
			continue

		var sampler_name: String = pass_entry["_seed_sampler"]
		var buffer_name: String = pass_entry["_seed_buffer"]
		var buf_info: Dictionary = _buffers[buffer_name]
		var writers: Array = buf_info["writers"]
		var pass_index: int = pass_entry["pass_index"]

		var best_earlier: int = -1
		var best_later: int = -1
		for w in writers:
			if w < pass_index:
				if best_earlier == -1 or w > best_earlier:
					best_earlier = w
			else:
				if best_later == -1 or w > best_later:
					best_later = w

		var source_idx: int = best_earlier if best_earlier >= 0 else best_later
		if source_idx >= 0 and source_idx < _passes.size():
			var source_vp: SubViewport = _passes[source_idx]["viewport"]
			var material: ShaderMaterial = pass_entry["material"]
			material.set_shader_parameter(sampler_name, source_vp.get_texture())

		pass_entry.erase("_seed_sampler")
		pass_entry.erase("_seed_buffer")

func _get_active_display_viewport() -> SubViewport:
	if _display_buffer == "" or not _buffers.has(_display_buffer):
		return null
	var writers: Array = _buffers[_display_buffer]["writers"]
	if writers.size() == 0:
		return null
	var last_writer_idx: int = writers[writers.size() - 1]
	var pass_entry: Dictionary = _passes[last_writer_idx]

	if pass_entry.has("viewport_b"):
		# write_to_a was already flipped, so current write was the opposite
		if pass_entry.get("write_to_a", true):
			return pass_entry["viewport_b"]
		else:
			return pass_entry["viewport"]

	return pass_entry["viewport"]

func _find_last_writer_viewport(buffer_name: String) -> SubViewport:
	if not _buffers.has(buffer_name):
		return null
	var writers: Array = _buffers[buffer_name]["writers"]
	if writers.size() == 0:
		return null
	var last_writer_idx: int = writers[writers.size() - 1]
	var pass_entry: Dictionary = _passes[last_writer_idx]

	if pass_entry.has("viewport_b"):
		if pass_entry.get("write_to_a", true):
			return pass_entry["viewport_b"]
		else:
			return pass_entry["viewport"]

	return pass_entry["viewport"]

# ---------------------------------------------------------------------------
# Capture
# ---------------------------------------------------------------------------

func _capture_display_to_pixel_buffer() -> void:
	var pb_buf = _get_pixel_buffer(_entity_id)
	if pb_buf == null:
		return

	var display_vp = _find_last_writer_viewport(_display_buffer)
	if display_vp == null:
		return

	var vp_img = display_vp.get_texture().get_image()
	if vp_img == null:
		return

	var pb_image: Image = pb_buf.get("image")
	var pb_texture: ImageTexture = pb_buf.get("texture")
	if pb_image == null or pb_texture == null:
		return

	var target_w = pb_image.get_width()
	var target_h = pb_image.get_height()
	if vp_img.get_width() != target_w or vp_img.get_height() != target_h:
		vp_img.resize(target_w, target_h)

	pb_image.copy_from(vp_img)
	pb_texture.update(pb_image)
	_target_sprite.texture = pb_texture

# ---------------------------------------------------------------------------
# Dynamic inputs
# ---------------------------------------------------------------------------

func _apply_pending_inputs() -> void:
	for pass_id in _pending_inputs.keys():
		var inputs: Dictionary = _pending_inputs[pass_id]
		for pass_entry in _passes:
			if pass_entry["id"] == pass_id:
				var material: ShaderMaterial = pass_entry["material"]
				for key in inputs.keys():
					material.set_shader_parameter(str(key), _convert_param(inputs[key]))
				if pass_entry.has("material_b"):
					var material_b: ShaderMaterial = pass_entry["material_b"]
					for key in inputs.keys():
						material_b.set_shader_parameter(str(key), _convert_param(inputs[key]))
				break
	_pending_inputs.clear()

# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

func _find_entity_sprite(entity_id: String) -> Sprite2D:
	if not _game_bridge:
		return null
	if not _game_bridge.entities.has(entity_id):
		return null
	var entity = _game_bridge.entities[entity_id]
	for child in entity.get_children():
		if child is Sprite2D:
			return child
	return null

func _get_pixel_buffer(entity_id: String) -> Variant:
	if _pixel_buffer_manager == null:
		return null
	if not _pixel_buffer_manager._buffers.has(entity_id):
		return null
	return _pixel_buffer_manager._buffers[entity_id]

func _convert_param(value) -> Variant:
	if value is Array:
		match value.size():
			2: return Vector2(float(value[0]), float(value[1]))
			3: return Vector3(float(value[0]), float(value[1]), float(value[2]))
			4: return Color(float(value[0]), float(value[1]), float(value[2]), float(value[3]))
	if value is float or value is int:
		return float(value)
	if value is bool:
		return value
	if value is String:
		return value
	return value

func _default_for_input(input_name: String) -> Variant:
	if input_name.ends_with("_pos") or input_name.ends_with("_vel"):
		return Vector2(0.0, 0.0)
	if input_name.ends_with("_color"):
		return Color(0.0, 0.0, 0.0, 0.0)
	if input_name.ends_with("_radius"):
		return 0.005
	return 0.0
