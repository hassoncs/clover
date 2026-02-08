class_name EffectsV2PingPongManager
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
		push_error("[EffectsV2PingPongManager] register called with empty buffer_id")
		return

	if _buffers.has(buffer_id):
		push_warning("[EffectsV2PingPongManager] Overwriting existing buffer: %s" % buffer_id)
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
		push_error("[EffectsV2PingPongManager] initialize called for unknown buffer: %s" % buffer_id)
		return

	if _host == null or not is_instance_valid(_host):
		push_error("[EffectsV2PingPongManager] Host node not configured")
		return

	var entry: Dictionary = _buffers[buffer_id]
	_release_entry(entry)

	var size := _resolve_size(entry.get("policy", {}))
	var viewport_a := _create_viewport("EffectsV2PPA_%s" % buffer_id, size)
	var viewport_b := _create_viewport("EffectsV2PPB_%s" % buffer_id, size)

	_host.add_child(viewport_a)
	_host.add_child(viewport_b)

	entry["viewport_a"] = viewport_a
	entry["viewport_b"] = viewport_b
	entry["read_index"] = 0
	entry["write_index"] = 1
	entry["initialized"] = true
	entry["frozen"] = false

func swap(buffer_id: String) -> void:
	if not _buffers.has(buffer_id):
		push_error("[EffectsV2PingPongManager] swap called for unknown buffer: %s" % buffer_id)
		return

	var entry: Dictionary = _buffers[buffer_id]
	if not bool(entry.get("initialized", false)):
		push_warning("[EffectsV2PingPongManager] swap ignored for uninitialized buffer: %s" % buffer_id)
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

func _release_entry(entry: Dictionary) -> void:
	var viewport_a: SubViewport = entry.get("viewport_a")
	if viewport_a and is_instance_valid(viewport_a):
		viewport_a.queue_free()
	var viewport_b: SubViewport = entry.get("viewport_b")
	if viewport_b and is_instance_valid(viewport_b):
		viewport_b.queue_free()
	entry["viewport_a"] = null
	entry["viewport_b"] = null
	entry["initialized"] = false
