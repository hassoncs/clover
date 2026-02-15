class_name VisualRenderer3D
extends RefCounted

var _bridge: Node = null
var _glb_loader: GLBLoader = null

func _init(bridge: Node = null) -> void:
	_bridge = bridge
	if _bridge:
		_glb_loader = GLBLoader.new(_bridge)

func add_visual(parent: Node3D, visual_data: Dictionary) -> void:
	var visual_type = str(visual_data.get("type", "primitive"))
	match visual_type:
		"primitive":
			_add_primitive(parent, visual_data)
		"voxels":
			_add_voxels(parent, visual_data)
		"model":
			_add_model(parent, visual_data)
		"sprite3d":
			_add_sprite3d(parent, visual_data)
		_:
			_add_primitive(parent, visual_data)

func _add_primitive(parent: Node3D, visual_data: Dictionary) -> void:
	var mesh_instance = MeshInstance3D.new()
	mesh_instance.name = str(visual_data.get("name", "PrimitiveVisual3D"))
	mesh_instance.mesh = _create_primitive_mesh(visual_data)
	mesh_instance.material_override = _create_material(visual_data)
	parent.add_child(mesh_instance)

func _create_primitive_mesh(visual_data: Dictionary) -> Mesh:
	var primitive = str(visual_data.get("primitive", visual_data.get("shape", "box")))
	match primitive:
		"sphere":
			var sphere = SphereMesh.new()
			sphere.radius = float(visual_data.get("radius", 0.5))
			sphere.height = sphere.radius * 2.0
			return sphere
		"cylinder":
			var cylinder = CylinderMesh.new()
			cylinder.top_radius = float(visual_data.get("radius", 0.5))
			cylinder.bottom_radius = float(visual_data.get("radius", 0.5))
			cylinder.height = float(visual_data.get("height", 1.0))
			return cylinder
		"capsule":
			var capsule = CapsuleMesh.new()
			capsule.radius = float(visual_data.get("radius", 0.5))
			capsule.height = float(visual_data.get("height", 1.0))
			return capsule
		"plane":
			var plane = PlaneMesh.new()
			var width = float(visual_data.get("width", 1.0))
			var depth = float(visual_data.get("depth", 1.0))
			plane.size = Vector2(width, depth)
			return plane
		_:
			var box = BoxMesh.new()
			var size_data = visual_data.get("size", {})
			box.size = Vector3(float(size_data.get("x", visual_data.get("width", 1.0))), float(size_data.get("y", visual_data.get("height", 1.0))), float(size_data.get("z", visual_data.get("depth", 1.0))))
			return box

func _create_material(visual_data: Dictionary) -> Material:
	var material = StandardMaterial3D.new()
	material.albedo_color = Color.from_string(str(visual_data.get("color", "#FFFFFF")), Color.WHITE)
	material.roughness = float(visual_data.get("roughness", 0.6))
	material.metallic = float(visual_data.get("metallic", 0.0))
	material.emission_enabled = bool(visual_data.get("emissive", false))
	if material.emission_enabled:
		material.emission = Color.from_string(str(visual_data.get("emissionColor", "#FFFFFF")), Color.WHITE)
		material.emission_energy_multiplier = float(visual_data.get("emissionEnergy", 1.0))
	if visual_data.has("transparency"):
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.albedo_color.a = 1.0 - clamp(float(visual_data.get("transparency", 0.0)), 0.0, 1.0)
	return material

func _add_voxels(parent: Node3D, visual_data: Dictionary) -> void:
	var voxels = visual_data.get("voxels", [])
	if not (voxels is Array):
		return

	var container = Node3D.new()
	container.name = str(visual_data.get("name", "VoxelContainer"))
	parent.add_child(container)

	for voxel in voxels:
		if not (voxel is Dictionary):
			continue
		var mesh_instance = MeshInstance3D.new()
		var mesh = BoxMesh.new()
		var voxel_size = float(voxel.get("size", visual_data.get("voxelSize", 1.0)))
		mesh.size = Vector3(voxel_size, voxel_size, voxel_size)
		mesh_instance.mesh = mesh
		var material = StandardMaterial3D.new()
		material.albedo_color = Color.from_string(str(voxel.get("color", visual_data.get("color", "#FFFFFF"))), Color.WHITE)
		mesh_instance.material_override = material
		mesh_instance.position = Vector3(float(voxel.get("x", 0.0)), float(voxel.get("y", 0.0)), float(voxel.get("z", 0.0)))
		container.add_child(mesh_instance)

func _add_model(parent: Node3D, visual_data: Dictionary) -> void:
	if _glb_loader == null and _bridge:
		_glb_loader = GLBLoader.new(_bridge)

	var container = Node3D.new()
	container.name = str(visual_data.get("name", "ModelContainer3D"))
	parent.add_child(container)

	var model_path = str(visual_data.get("path", visual_data.get("modelPath", "")))
	var model_url = str(visual_data.get("url", ""))

	if _glb_loader == null:
		return

	if model_url != "":
		_glb_loader.load_glb_async(model_url, container)
	elif model_path != "":
		_glb_loader.load_glb(model_path, container)

func _add_sprite3d(parent: Node3D, visual_data: Dictionary) -> void:
	var sprite = Sprite3D.new()
	sprite.name = str(visual_data.get("name", "Sprite3DVisual"))

	var texture_path = str(visual_data.get("texture", visual_data.get("texturePath", "")))
	if texture_path != "" and ResourceLoader.exists(texture_path):
		var texture = load(texture_path)
		if texture is Texture2D:
			sprite.texture = texture

	var billboarding = bool(visual_data.get("billboard", true))
	sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED if billboarding else BaseMaterial3D.BILLBOARD_DISABLED
	sprite.modulate = Color.from_string(str(visual_data.get("color", "#FFFFFF")), Color.WHITE)
	sprite.pixel_size = float(visual_data.get("pixelSize", 0.01))
	parent.add_child(sprite)
