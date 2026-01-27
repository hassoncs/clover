extends Node3D

@onready var camera: Camera3D = $Camera3D
@onready var models_root: Node3D = $ModelsRoot

var current_model: Node3D = null
var rotation_speed: float = 1.0
var auto_rotate: bool = true

var _js_bridge_obj: JavaScriptObject = null
var _js_callbacks: Array = []

func _ready() -> void:
	_setup_js_bridge()
	
	# Load test model automatically if it exists
	var test_path = "res://models/test_model.glb"
	if FileAccess.file_exists(test_path):
		load_glb(test_path)

func _process(delta: float) -> void:
	if auto_rotate and current_model:
		current_model.rotate_y(rotation_speed * delta)

func _setup_js_bridge() -> void:
	if not OS.has_feature("web"):
		return
	
	var window = JavaScriptBridge.get_interface("window")
	if window == null:
		push_error("[Lab3D] Could not get window object")
		return
	
	_js_bridge_obj = JavaScriptBridge.create_object("Object")
	
	var load_glb_cb = JavaScriptBridge.create_callback(_js_load_glb)
	_js_callbacks.append(load_glb_cb)
	_js_bridge_obj["loadGLB"] = load_glb_cb
	
	var set_rotation_cb = JavaScriptBridge.create_callback(_js_set_rotation)
	_js_callbacks.append(set_rotation_cb)
	_js_bridge_obj["setRotationSpeed"] = set_rotation_cb
	
	var toggle_rotate_cb = JavaScriptBridge.create_callback(_js_toggle_rotate)
	_js_callbacks.append(toggle_rotate_cb)
	_js_bridge_obj["toggleAutoRotate"] = toggle_rotate_cb
	
	var set_camera_cb = JavaScriptBridge.create_callback(_js_set_camera)
	_js_callbacks.append(set_camera_cb)
	_js_bridge_obj["setCameraDistance"] = set_camera_cb
	
	window["Lab3DBridge"] = _js_bridge_obj
	print("[Lab3D] JS bridge initialized")

func _js_load_glb(args: Array) -> void:
	if args.size() < 1:
		push_error("[Lab3D] loadGLB requires path argument")
		return
	var path = str(args[0])
	load_glb(path)

func _js_set_rotation(args: Array) -> void:
	if args.size() < 1:
		return
	rotation_speed = float(args[0])

func _js_toggle_rotate(args: Array) -> void:
	auto_rotate = !auto_rotate

func _js_set_camera(args: Array) -> void:
	if args.size() < 1:
		return
	var distance = float(args[0])
	camera.transform.origin = Vector3(0, distance, distance)
	camera.look_at(Vector3.ZERO, Vector3.UP)

func load_glb(path: String) -> Node3D:
	print("[Lab3D] Loading GLB: ", path)
	
	# Clear existing model
	if current_model:
		current_model.queue_free()
		current_model = null
	
	var gltf_doc = GLTFDocument.new()
	var gltf_state = GLTFState.new()
	
	var error = gltf_doc.append_from_file(path, gltf_state)
	if error != OK:
		push_error("[Lab3D] Failed to load GLB: " + path + " (error: " + str(error) + ")")
		return null
	
	var scene = gltf_doc.generate_scene(gltf_state)
	if scene == null:
		push_error("[Lab3D] Failed to generate scene from GLB")
		return null
	
	# Add to scene
	models_root.add_child(scene)
	current_model = scene
	
	# Center and scale the model
	_center_model(scene)
	
	print("[Lab3D] GLB loaded successfully: ", path)
	return scene

func load_glb_from_buffer(buffer: PackedByteArray, base_path: String = "") -> Node3D:
	print("[Lab3D] Loading GLB from buffer, size: ", buffer.size())
	
	if current_model:
		current_model.queue_free()
		current_model = null
	
	var gltf_doc = GLTFDocument.new()
	var gltf_state = GLTFState.new()
	
	var error = gltf_doc.append_from_buffer(buffer, base_path, gltf_state)
	if error != OK:
		push_error("[Lab3D] Failed to load GLB from buffer (error: " + str(error) + ")")
		return null
	
	var scene = gltf_doc.generate_scene(gltf_state)
	if scene == null:
		push_error("[Lab3D] Failed to generate scene from buffer")
		return null
	
	models_root.add_child(scene)
	current_model = scene
	_center_model(scene)
	
	print("[Lab3D] GLB loaded from buffer successfully")
	return scene

func _center_model(model: Node3D) -> void:
	# Calculate AABB to center and scale the model
	var aabb = _calculate_aabb(model)
	if aabb.size == Vector3.ZERO:
		return
	
	# Center the model
	var center = aabb.position + aabb.size / 2.0
	model.position = -center
	model.position.y = -aabb.position.y  # Place on ground plane
	
	# Scale to fit in view (target size ~2 units)
	var max_dim = max(aabb.size.x, max(aabb.size.y, aabb.size.z))
	if max_dim > 0:
		var target_size = 2.0
		var scale_factor = target_size / max_dim
		model.scale = Vector3.ONE * scale_factor
	
	print("[Lab3D] Model centered. AABB: ", aabb, " Scale: ", model.scale)

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
