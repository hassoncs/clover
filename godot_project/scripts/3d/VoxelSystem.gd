class_name VoxelSystem
extends Node

var _game_root: Node3D = null
var _batches: Dictionary = {}
var _next_batch_id: int = 0
var _shared_box_mesh: BoxMesh = null

func _init() -> void:
	_shared_box_mesh = BoxMesh.new()
	_shared_box_mesh.size = Vector3(1.0, 1.0, 1.0)

func setup(game_root: Node3D) -> void:
	_game_root = game_root

func _js_create_voxel_batch(voxels_json: String) -> String:
	if _game_root == null:
		return ""

	var voxels = JSON.parse_string(voxels_json)
	if voxels == null or not (voxels is Array):
		return ""

	var batch_id = "voxel_batch_%d" % _next_batch_id
	_next_batch_id += 1

	var multi_mesh_instance = MultiMeshInstance3D.new()
	multi_mesh_instance.name = batch_id

	var multi_mesh = MultiMesh.new()
	multi_mesh.transform_format = MultiMesh.TRANSFORM_3D
	multi_mesh.use_colors = true
	multi_mesh.mesh = _shared_box_mesh
	multi_mesh.instance_count = voxels.size()

	for i in range(voxels.size()):
		var voxel = voxels[i]
		var x = float(voxel.get("x", 0.0))
		var y = float(voxel.get("y", 0.0))
		var z = float(voxel.get("z", 0.0))
		var color_str = str(voxel.get("color", "#FFFFFF"))

		var transform = Transform3D(Basis.IDENTITY, Vector3(x, y, z))
		multi_mesh.set_instance_transform(i, transform)
		multi_mesh.set_instance_color(i, Color.from_string(color_str, Color.WHITE))

	multi_mesh_instance.multimesh = multi_mesh

	var material = StandardMaterial3D.new()
	material.vertex_color_use_as_albedo = true
	material.roughness = 0.8
	multi_mesh_instance.material_override = material

	_game_root.add_child(multi_mesh_instance)
	_batches[batch_id] = multi_mesh_instance

	return batch_id

func _js_update_voxel_batch(batch_id: String, voxels_json: String) -> void:
	if not _batches.has(batch_id):
		return

	var voxels = JSON.parse_string(voxels_json)
	if voxels == null or not (voxels is Array):
		return

	var mmi = _batches[batch_id] as MultiMeshInstance3D
	if mmi == null or mmi.multimesh == null:
		return

	var multi_mesh = mmi.multimesh
	multi_mesh.instance_count = voxels.size()

	for i in range(voxels.size()):
		var voxel = voxels[i]
		var x = float(voxel.get("x", 0.0))
		var y = float(voxel.get("y", 0.0))
		var z = float(voxel.get("z", 0.0))
		var color_str = str(voxel.get("color", "#FFFFFF"))

		multi_mesh.set_instance_transform(i, Transform3D(Basis.IDENTITY, Vector3(x, y, z)))
		multi_mesh.set_instance_color(i, Color.from_string(color_str, Color.WHITE))

func _js_destroy_voxel_batch(batch_id: String) -> void:
	if not _batches.has(batch_id):
		return
	var mmi = _batches[batch_id] as MultiMeshInstance3D
	if mmi:
		mmi.queue_free()
	_batches.erase(batch_id)

func _js_place_voxel(x: float, y: float, z: float, color: String) -> String:
	if _game_root == null:
		return ""

	var mesh_instance = MeshInstance3D.new()
	var id = "voxel_%d" % _next_batch_id
	_next_batch_id += 1
	mesh_instance.name = id
	mesh_instance.mesh = _shared_box_mesh

	var material = StandardMaterial3D.new()
	material.albedo_color = Color.from_string(color, Color.WHITE)
	material.roughness = 0.8
	mesh_instance.material_override = material
	mesh_instance.position = Vector3(x, y, z)

	_game_root.add_child(mesh_instance)
	_batches[id] = mesh_instance

	return id

func _js_remove_voxel(voxel_id: String) -> void:
	if not _batches.has(voxel_id):
		return
	var node = _batches[voxel_id] as Node3D
	if node:
		node.queue_free()
	_batches.erase(voxel_id)
