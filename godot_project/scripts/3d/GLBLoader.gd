class_name GLBLoader
extends RefCounted

var bridge: Node
var loaded_models: Dictionary = {}
var model_counter: int = 0

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

func load_glb(path: String, parent: Node3D = null) -> Node3D:
	var gltf_doc = GLTFDocument.new()
	var gltf_state = GLTFState.new()
	
	var error = gltf_doc.append_from_file(path, gltf_state)
	if error != OK:
		push_error("[GLBLoader] Failed to load GLB: " + path + " (error: " + str(error) + ")")
		return null
	
	var scene = gltf_doc.generate_scene(gltf_state)
	if scene == null:
		push_error("[GLBLoader] Failed to generate scene from GLB")
		return null
	
	model_counter += 1
	var model_id = "glb_" + str(model_counter)
	loaded_models[model_id] = scene
	
	if parent:
		parent.add_child(scene)
	
	_center_and_scale_model(scene)
	
	return scene

func load_glb_from_buffer(buffer: PackedByteArray, base_path: String = "", parent: Node3D = null) -> Node3D:
	var gltf_doc = GLTFDocument.new()
	var gltf_state = GLTFState.new()
	
	var error = gltf_doc.append_from_buffer(buffer, base_path, gltf_state)
	if error != OK:
		push_error("[GLBLoader] Failed to load GLB from buffer (error: " + str(error) + ")")
		return null
	
	var scene = gltf_doc.generate_scene(gltf_state)
	if scene == null:
		push_error("[GLBLoader] Failed to generate scene from buffer")
		return null
	
	model_counter += 1
	var model_id = "glb_" + str(model_counter)
	loaded_models[model_id] = scene
	
	if parent:
		parent.add_child(scene)
	
	_center_and_scale_model(scene)
	
	return scene

func load_glb_async(url: String, parent: Node3D = null, callback: Callable = Callable()) -> void:
	var http = HTTPRequest.new()
	bridge.add_child(http)
	
	http.request_completed.connect(func(result: int, code: int, headers: PackedStringArray, body: PackedByteArray):
		http.queue_free()
		
		if result != HTTPRequest.RESULT_SUCCESS or code != 200:
			push_error("[GLBLoader] Failed to download GLB: " + url + " result=" + str(result) + " code=" + str(code))
			if callback.is_valid():
				callback.call(null)
			return
		
		var model = load_glb_from_buffer(body, "", parent)
		if callback.is_valid():
			callback.call(model)
	)
	
	var err = http.request(url)
	if err != OK:
		http.queue_free()
		push_error("[GLBLoader] Failed to start GLB download: " + url + " error=" + str(err))
		if callback.is_valid():
			callback.call(null)

func unload_model(model_id: String) -> void:
	if loaded_models.has(model_id):
		var model = loaded_models[model_id]
		if is_instance_valid(model):
			model.queue_free()
		loaded_models.erase(model_id)

func _center_and_scale_model(model: Node3D, target_size: float = 2.0) -> void:
	var aabb = _calculate_aabb(model)
	if aabb.size == Vector3.ZERO:
		return
	
	var center = aabb.position + aabb.size / 2.0
	var max_dim = max(aabb.size.x, max(aabb.size.y, aabb.size.z))
	var scale_factor = 1.0
	if max_dim > 0:
		scale_factor = target_size / max_dim
	
	model.scale = Vector3.ONE * scale_factor
	model.position = -center * scale_factor

func _calculate_aabb(node: Node3D) -> AABB:
	var aabb = AABB()
	var first = true
	
	for child in node.get_children():
		if child is MeshInstance3D:
			var mesh_aabb = child.get_aabb()
			mesh_aabb = child.transform * mesh_aabb
			if first:
				aabb = mesh_aabb
				first = false
			else:
				aabb = aabb.merge(mesh_aabb)
		elif child is Node3D:
			var child_aabb = _calculate_aabb(child)
			child_aabb = child.transform * child_aabb
			if child_aabb.size != Vector3.ZERO:
				if first:
					aabb = child_aabb
					first = false
				else:
					aabb = aabb.merge(child_aabb)
	
	return aabb

func set_model_position(model: Node3D, x: float, y: float, z: float) -> void:
	model.position = Vector3(x, y, z)

func set_model_rotation(model: Node3D, x: float, y: float, z: float) -> void:
	model.rotation = Vector3(x, y, z)

func set_model_scale(model: Node3D, scale: float) -> void:
	model.scale = Vector3.ONE * scale

func clear_all() -> void:
	for model_id in loaded_models:
		var model = loaded_models[model_id]
		if is_instance_valid(model):
			model.queue_free()
	loaded_models.clear()
	model_counter = 0
