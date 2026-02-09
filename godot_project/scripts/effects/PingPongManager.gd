class_name EffectsPingPongManager
extends RefCounted

var _host: Node = null
var _default_size: Vector2i = Vector2i(800, 600)
var _buffers: Dictionary = {}

func configure(host: Node, default_size: Vector2i) -> void:
	_host = host
	if default_size.x > 0 and default_size.y > 0:
		_default_size = default_size

func register(buffer_id: String, policy: Dictionary) -> void:
	if buffer_id == "":
		push_error("[EffectsPingPongManager] register called with empty buffer_id")
		return

	if _buffers.has(buffer_id):
		push_warning("[EffectsPingPongManager] Overwriting existing buffer: %s" % buffer_id)
		_release_entry(_buffers[buffer_id])

	_buffers[buffer_id] = {
		"policy": policy.duplicate(true),
		"viewport_a": null,
		"viewport_b": null,
		"read_index": 0,
		"write_index": 1,
		"initialized": false,
		"frozen": false,
	}

func initialize(buffer_id: String) -> void:
	if not _buffers.has(buffer_id):
		push_error("[EffectsPingPongManager] initialize called for unknown buffer: %s" % buffer_id)
		return

	if _host == null or not is_instance_valid(_host):
		push_error("[EffectsPingPongManager] Host node not configured")
		return

	var entry: Dictionary = _buffers[buffer_id]
	_release_entry(entry)

	var size := _resolve_size(entry.get("policy", {}))
	var viewport_a := _create_viewport("EffectsPPA_%s" % buffer_id, size)
	var viewport_b := _create_viewport("EffectsPPB_%s" % buffer_id, size)

	_host.add_child(viewport_a)
	_host.add_child(viewport_b)

	var draw_container_a := Node2D.new()
	draw_container_a.name = "DrawContainer_A"
	viewport_a.add_child(draw_container_a)

	var draw_container_b := Node2D.new()
	draw_container_b.name = "DrawContainer_B"
	viewport_b.add_child(draw_container_b)

	entry["viewport_a"] = viewport_a
	entry["viewport_b"] = viewport_b
	entry["draw_container_a"] = draw_container_a
	entry["draw_container_b"] = draw_container_b
	entry["read_index"] = 0
	entry["write_index"] = 1
	entry["initialized"] = true
	entry["frozen"] = false

func swap(buffer_id: String) -> void:
	if not _buffers.has(buffer_id):
		push_error("[EffectsPingPongManager] swap called for unknown buffer: %s" % buffer_id)
		return

	var entry: Dictionary = _buffers[buffer_id]
	if not bool(entry.get("initialized", false)):
		push_warning("[EffectsPingPongManager] swap ignored for uninitialized buffer: %s" % buffer_id)
		return

	if bool(entry.get("frozen", false)):
		return

	var next_read: int = int(entry.get("write_index", 1))
	entry["write_index"] = int(entry.get("read_index", 0))
	entry["read_index"] = next_read

func get_read_texture(buffer_id: String) -> Texture2D:
	if not _buffers.has(buffer_id):
		return null

	var entry: Dictionary = _buffers[buffer_id]
	if not bool(entry.get("initialized", false)):
		return null

	var read_vp: SubViewport = _get_viewport(entry, int(entry.get("read_index", 0)))
	if read_vp == null:
		return null
	return read_vp.get_texture()

func get_write_viewport(buffer_id: String) -> SubViewport:
	if not _buffers.has(buffer_id):
		return null

	var entry: Dictionary = _buffers[buffer_id]
	if not bool(entry.get("initialized", false)):
		return null

	return _get_viewport(entry, int(entry.get("write_index", 1)))

func get_viewports(buffer_id: String) -> Dictionary:
	if not _buffers.has(buffer_id):
		return {}
	var entry: Dictionary = _buffers[buffer_id]
	return {
		"a": entry.get("viewport_a"),
		"b": entry.get("viewport_b"),
	}

func stop(buffer_id: String) -> void:
	if not _buffers.has(buffer_id):
		return

	var entry: Dictionary = _buffers[buffer_id]
	var policy: Dictionary = entry.get("policy", {})
	var stop_behavior: String = str(policy.get("stopBehavior", "freeze"))

	if stop_behavior == "clear":
		_clear_viewports(entry)
		entry["read_index"] = 0
		entry["write_index"] = 1
		entry["frozen"] = false
	else:
		entry["frozen"] = true
		_set_update_modes(entry, false)

func reset(buffer_id: String) -> void:
	if not _buffers.has(buffer_id):
		return

	var entry: Dictionary = _buffers[buffer_id]
	entry["read_index"] = 0
	entry["write_index"] = 1
	entry["frozen"] = false
	_clear_viewports(entry)

func release() -> void:
	for buffer_id in _buffers.keys():
		_release_entry(_buffers[buffer_id])
	_buffers.clear()

func set_updates_enabled(buffer_id: String, enabled: bool) -> void:
	if not _buffers.has(buffer_id):
		return
	_set_update_modes(_buffers[buffer_id], enabled)

func _resolve_size(policy: Dictionary) -> Vector2i:
	var width: int = int(policy.get("width", _default_size.x))
	var height: int = int(policy.get("height", _default_size.y))
	if width <= 0:
		width = _default_size.x
	if height <= 0:
		height = _default_size.y
	return Vector2i(width, height)

func _create_viewport(name: String, size: Vector2i) -> SubViewport:
	var viewport := SubViewport.new()
	viewport.name = name
	viewport.size = size
	viewport.transparent_bg = true
	viewport.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE
	viewport.render_target_update_mode = SubViewport.UPDATE_DISABLED
	return viewport

func _get_viewport(entry: Dictionary, index: int) -> SubViewport:
	if index == 0:
		return entry.get("viewport_a")
	return entry.get("viewport_b")

func _set_update_modes(entry: Dictionary, enabled: bool) -> void:
	var mode: int = SubViewport.UPDATE_ALWAYS if enabled else SubViewport.UPDATE_DISABLED
	var viewport_a: SubViewport = entry.get("viewport_a")
	if viewport_a and is_instance_valid(viewport_a):
		viewport_a.render_target_update_mode = mode
	var viewport_b: SubViewport = entry.get("viewport_b")
	if viewport_b and is_instance_valid(viewport_b):
		viewport_b.render_target_update_mode = mode

func _clear_viewports(entry: Dictionary) -> void:
	var viewport_a: SubViewport = entry.get("viewport_a")
	if viewport_a and is_instance_valid(viewport_a):
		viewport_a.render_target_clear_mode = SubViewport.CLEAR_MODE_ALWAYS
		viewport_a.render_target_update_mode = SubViewport.UPDATE_ONCE
	var viewport_b: SubViewport = entry.get("viewport_b")
	if viewport_b and is_instance_valid(viewport_b):
		viewport_b.render_target_clear_mode = SubViewport.CLEAR_MODE_ALWAYS
		viewport_b.render_target_update_mode = SubViewport.UPDATE_ONCE

func add_stroke(buffer_id: String, flat_points: Array, color: Color, width_norm: float) -> void:
	if not _buffers.has(buffer_id):
		push_error("[EffectsPingPongManager] add_stroke called for unknown buffer: %s" % buffer_id)
		return
	
	var entry: Dictionary = _buffers[buffer_id]
	if not bool(entry.get("initialized", false)):
		push_error("[EffectsPingPongManager] add_stroke called for uninitialized buffer: %s" % buffer_id)
		return
	
	var write_vp: SubViewport = _get_viewport(entry, int(entry.get("write_index", 1)))
	if write_vp == null:
		return
	
	var draw_container: Node2D = entry.get("draw_container_b") if int(entry.get("write_index", 1)) == 1 else entry.get("draw_container_a")
	if draw_container == null or not is_instance_valid(draw_container):
		return
	
	var viewport_size := write_vp.size
	var points := _parse_flat_points(flat_points, viewport_size)
	var width_pixels := _normalized_width_to_pixels(width_norm, viewport_size)
	
	var line := Line2D.new()
	line.points = points
	line.default_color = color
	line.width = width_pixels
	line.joint_mode = Line2D.LINE_JOINT_ROUND
	line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	line.end_cap_mode = Line2D.LINE_CAP_ROUND
	draw_container.add_child(line)

func add_stamp(buffer_id: String, uv: Vector2, texture: Texture2D, color: Color) -> void:
	if not _buffers.has(buffer_id):
		push_error("[EffectsPingPongManager] add_stamp called for unknown buffer: %s" % buffer_id)
		return
	
	var entry: Dictionary = _buffers[buffer_id]
	if not bool(entry.get("initialized", false)):
		push_error("[EffectsPingPongManager] add_stamp called for uninitialized buffer: %s" % buffer_id)
		return
	
	var write_vp: SubViewport = _get_viewport(entry, int(entry.get("write_index", 1)))
	if write_vp == null:
		return
	
	var draw_container: Node2D = entry.get("draw_container_b") if int(entry.get("write_index", 1)) == 1 else entry.get("draw_container_a")
	if draw_container == null or not is_instance_valid(draw_container):
		return
	
	var viewport_size := write_vp.size
	var pos := _normalized_to_viewport(uv, viewport_size)
	
	var sprite := Sprite2D.new()
	sprite.texture = texture
	sprite.modulate = color
	sprite.position = pos
	draw_container.add_child(sprite)

func clear_draw_container(buffer_id: String) -> void:
	if not _buffers.has(buffer_id):
		return
	
	var entry: Dictionary = _buffers[buffer_id]
	if not bool(entry.get("initialized", false)):
		return
	
	var draw_container: Node2D = entry.get("draw_container_b") if int(entry.get("write_index", 1)) == 1 else entry.get("draw_container_a")
	if draw_container == null or not is_instance_valid(draw_container):
		return
	
	for child in draw_container.get_children():
		draw_container.remove_child(child)
		child.queue_free()

func get_draw_container(buffer_id: String) -> Node2D:
	if not _buffers.has(buffer_id):
		return null
	
	var entry: Dictionary = _buffers[buffer_id]
	if not bool(entry.get("initialized", false)):
		return null
	
	return entry.get("draw_container_b") if int(entry.get("write_index", 1)) == 1 else entry.get("draw_container_a")

func _normalized_to_viewport(uv: Vector2, viewport_size: Vector2i) -> Vector2:
	return Vector2(uv.x * viewport_size.x, uv.y * viewport_size.y)

func _normalized_width_to_pixels(width_norm: float, viewport_size: Vector2i) -> float:
	return width_norm * viewport_size.y

func _parse_flat_points(flat: Array, viewport_size: Vector2i) -> PackedVector2Array:
	var result := PackedVector2Array()
	var i := 0
	while i < flat.size() - 1:
		var uv := Vector2(float(flat[i]), float(flat[i + 1]))
		result.append(_normalized_to_viewport(uv, viewport_size))
		i += 2
	return result

func _release_entry(entry: Dictionary) -> void:
	var draw_container_a: Node2D = entry.get("draw_container_a")
	if draw_container_a and is_instance_valid(draw_container_a):
		if draw_container_a.get_parent():
			draw_container_a.get_parent().remove_child(draw_container_a)
		draw_container_a.queue_free()
	
	var draw_container_b: Node2D = entry.get("draw_container_b")
	if draw_container_b and is_instance_valid(draw_container_b):
		if draw_container_b.get_parent():
			draw_container_b.get_parent().remove_child(draw_container_b)
		draw_container_b.queue_free()
	
	var viewport_a: SubViewport = entry.get("viewport_a")
	if viewport_a and is_instance_valid(viewport_a):
		viewport_a.queue_free()
	var viewport_b: SubViewport = entry.get("viewport_b")
	if viewport_b and is_instance_valid(viewport_b):
		viewport_b.queue_free()
	
	entry["draw_container_a"] = null
	entry["draw_container_b"] = null
	entry["viewport_a"] = null
	entry["viewport_b"] = null
	entry["initialized"] = false
