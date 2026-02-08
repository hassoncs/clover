class_name EffectsV2ResourceGraph
extends RefCounted

var _host: Node = null
var _base_size: Vector2i = Vector2i(800, 600)
var _scope: String = "screen"
var _resources: Dictionary = {}
var _pass_outputs: Dictionary = {}

func configure(host: Node, base_size: Vector2i) -> void:
	_host = host
	if base_size.x > 0 and base_size.y > 0:
		_base_size = base_size

func allocate(resource_map: Dictionary, scope: String) -> bool:
	release()
	_scope = scope

	if _host == null or not is_instance_valid(_host):
		push_error("[EffectsV2ResourceGraph] Host node not configured")
		return false

	for resource_id in resource_map.keys():
		var resource = resource_map[resource_id]
		if not (resource is Dictionary):
			push_error("[EffectsV2ResourceGraph] Resource '%s' is not a dictionary" % str(resource_id))
			return false

		var type_str: String = str(resource.get("type", ""))
		if type_str != "texture" and type_str != "buffer":
			push_error("[EffectsV2ResourceGraph] Resource '%s' has unsupported type '%s'" % [str(resource_id), type_str])
			return false

		var entry := {
			"id": str(resource_id),
			"type": type_str,
			"format": str(resource.get("format", "rgba8")),
			"resolution": str(resource.get("resolution", "full")),
			"viewport": null,
			"external_texture": null,
		}

		if _is_implicit_input(str(resource_id)):
			_resources[str(resource_id)] = entry
			continue

		var viewport := _create_resource_viewport(str(resource_id), entry["resolution"], resource)
		if viewport == null:
			push_error("[EffectsV2ResourceGraph] Failed to allocate viewport for resource '%s'" % str(resource_id))
			return false

		_host.add_child(viewport)
		entry["viewport"] = viewport
		_resources[str(resource_id)] = entry

	return true

func set_external_texture(resource_id: String, texture: Texture2D) -> void:
	if not _resources.has(resource_id):
		_resources[resource_id] = {
			"id": resource_id,
			"type": "texture",
			"format": "rgba8",
			"resolution": "full",
			"viewport": null,
			"external_texture": texture,
		}
		return

	var entry: Dictionary = _resources[resource_id]
	entry["external_texture"] = texture

func register_pass_output(pass_id: String, viewport: SubViewport, provided_resources: Array) -> void:
	if pass_id == "":
		return
	_pass_outputs[pass_id] = viewport

	for ref in provided_resources:
		if not (ref is Dictionary):
			continue
		var resource_id: String = str(ref.get("id", ""))
		if resource_id == "" or not _resources.has(resource_id):
			continue
		var entry: Dictionary = _resources[resource_id]
		entry["viewport"] = viewport

func get_texture(resource_id: String) -> Texture2D:
	if not _resources.has(resource_id):
		return null

	var entry: Dictionary = _resources[resource_id]
	var external_texture: Texture2D = entry.get("external_texture")
	if external_texture != null:
		return external_texture

	var viewport: SubViewport = entry.get("viewport")
	if viewport and is_instance_valid(viewport):
		return viewport.get_texture()

	return null

func bind_pass_inputs(pass_data: Dictionary, material: ShaderMaterial) -> void:
	if material == null:
		return

	var explicit_bindings = _extract_explicit_input_bindings(pass_data)
	for uniform_name in explicit_bindings.keys():
		var resource_id = str(explicit_bindings[uniform_name])
		var tex = get_texture(resource_id)
		if tex == null:
			push_warning("[EffectsV2ResourceGraph] Missing input texture '%s' for uniform '%s'" % [resource_id, str(uniform_name)])
			continue
		material.set_shader_parameter(str(uniform_name), tex)

	var requires: Array = pass_data.get("requires", [])
	for index in range(requires.size()):
		var ref = requires[index]
		if not (ref is Dictionary):
			continue

		var resource_id = str(ref.get("id", ""))
		if resource_id == "":
			continue
		if explicit_bindings.values().has(resource_id):
			continue

		var tex = get_texture(resource_id)
		if tex == null:
			push_warning("[EffectsV2ResourceGraph] Missing input texture '%s'" % resource_id)
			continue

		material.set_shader_parameter(resource_id, tex)
		if index == 0:
			material.set_shader_parameter("inputTex", tex)
		if resource_id.begins_with("__feedback:"):
			material.set_shader_parameter("historyTex", tex)

func get_output_viewport(pass_id: String) -> SubViewport:
	if not _pass_outputs.has(pass_id):
		return null
	return _pass_outputs[pass_id]

func release() -> void:
	for resource_id in _resources.keys():
		var entry: Dictionary = _resources[resource_id]
		var viewport: SubViewport = entry.get("viewport")
		if viewport and is_instance_valid(viewport):
			viewport.queue_free()
	_resources.clear()
	_pass_outputs.clear()

func get_resource_meta(resource_id: String) -> Dictionary:
	if not _resources.has(resource_id):
		return {}
	return _resources[resource_id].duplicate(true)

func _is_implicit_input(resource_id: String) -> bool:
	if resource_id == "__screenColor":
		return true
	if resource_id == "__entityTexture":
		return true
	return false

func _create_resource_viewport(resource_id: String, resolution: String, resource_data: Dictionary) -> SubViewport:
	var size := _resolve_size(resolution, resource_data)
	if size.x <= 0 or size.y <= 0:
		return null

	var viewport := SubViewport.new()
	viewport.name = "EffectsV2Resource_%s" % resource_id
	viewport.size = size
	viewport.transparent_bg = true
	viewport.render_target_clear_mode = SubViewport.CLEAR_MODE_ONCE
	viewport.render_target_update_mode = SubViewport.UPDATE_DISABLED
	return viewport

func _resolve_size(resolution: String, resource_data: Dictionary) -> Vector2i:
	match resolution:
		"half":
			return Vector2i(max(1, int(_base_size.x / 2)), max(1, int(_base_size.y / 2)))
		"quarter":
			return Vector2i(max(1, int(_base_size.x / 4)), max(1, int(_base_size.y / 4)))
		"custom":
			var width: int = int(resource_data.get("customWidth", resource_data.get("width", _base_size.x)))
			var height: int = int(resource_data.get("customHeight", resource_data.get("height", _base_size.y)))
			if width <= 0:
				width = _base_size.x
			if height <= 0:
				height = _base_size.y
			return Vector2i(width, height)
		_:
			return _base_size

func _extract_explicit_input_bindings(pass_data: Dictionary) -> Dictionary:
	var params = pass_data.get("params", {})
	if not (params is Dictionary):
		return {}
	var input_bindings = params.get("inputBindings", {})
	if not (input_bindings is Dictionary):
		return {}
	return input_bindings
