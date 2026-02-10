class_name ViewportPool
extends RefCounted

var _available: Array[SubViewport] = []
var _in_use: Dictionary = {}  # viewport -> buffer_id
var _size: int

func _init(pool_size: int = 10):
	_size = pool_size
	for i in range(pool_size):
		var vp := _create_viewport()
		_available.append(vp)

func _create_viewport() -> SubViewport:
	var vp := SubViewport.new()
	vp.transparent_bg = true
	vp.handle_input_locally = false
	vp.render_target_update_mode = SubViewport.UPDATE_ONCE
	vp.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE
	return vp

func acquire(buffer_id: String, size: Vector2i) -> SubViewport:
	if _available.is_empty():
		push_warning("[ViewportPool] Pool exhausted, creating new viewport")
		var vp := _create_viewport()
		_reset_viewport_state(vp)
		vp.size = size
		_in_use[vp] = buffer_id
		return vp
	
	var vp: SubViewport = _available.pop_back()
	_reset_viewport_state(vp)
	vp.size = size
	_in_use[vp] = buffer_id
	return vp

func release(viewport: SubViewport) -> void:
	if not _in_use.has(viewport):
		push_warning("[ViewportPool] Attempted to release viewport not in use")
		return
	
	_in_use.erase(viewport)
	_reset_viewport_state(viewport)
	_available.append(viewport)

func _reset_viewport_state(vp: SubViewport) -> void:
	# Clear all children
	for child in vp.get_children():
		vp.remove_child(child)
		child.queue_free()
	
	# Reset size to default
	vp.size = Vector2i(800, 600)
	
	# Reset render target flags
	vp.render_target_update_mode = SubViewport.UPDATE_DISABLED
	vp.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE
	
	# Reset other properties
	vp.transparent_bg = true
	vp.handle_input_locally = false
	vp.canvas_cull_mask = 0xFFFFFFFF  # Reset to default (all layers)
	
	# Clear any textures by forcing a clear
	vp.render_target_clear_mode = SubViewport.CLEAR_MODE_ALWAYS
	vp.render_target_update_mode = SubViewport.UPDATE_ONCE
	await vp.get_tree().process_frame if vp.get_tree() else null
	vp.render_target_update_mode = SubViewport.UPDATE_DISABLED
	vp.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE
