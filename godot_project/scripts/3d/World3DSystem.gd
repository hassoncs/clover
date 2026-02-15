class_name World3DSystem
extends RefCounted

var _bridge: Node = null
var _game_root: Node3D = null
var _floor_node: StaticBody3D = null
var _environment: WorldEnvironment = null

func _init(bridge: Node):
	_bridge = bridge

func setup(world_data: Dictionary, game_root: Node3D, env_node: WorldEnvironment, light_node: DirectionalLight3D):
	_game_root = game_root
	_environment = env_node
	_setup_gravity(world_data)
	_setup_floor(world_data, game_root)
	_setup_sky(world_data, env_node)
	_setup_lighting(world_data, env_node, light_node)
	_setup_fog(world_data, env_node)

func _setup_gravity(world_data: Dictionary) -> void:
	if not _bridge:
		return
	var gravity = world_data.get("gravity", {"x": 0.0, "y": -9.8, "z": 0.0})
	var gravity_vec = Vector3(float(gravity.get("x", 0.0)), float(gravity.get("y", -9.8)), float(gravity.get("z", 0.0)))
	var world_3d = _bridge.get_viewport().find_world_3d()
	if world_3d:
		var space = world_3d.space
		PhysicsServer3D.area_set_param(space, PhysicsServer3D.AREA_PARAM_GRAVITY, gravity_vec.length())
		if gravity_vec.length() > 0.0:
			PhysicsServer3D.area_set_param(space, PhysicsServer3D.AREA_PARAM_GRAVITY_VECTOR, gravity_vec.normalized())

func _setup_floor(world_data: Dictionary, game_root: Node3D) -> void:
	if _floor_node and is_instance_valid(_floor_node):
		_floor_node.queue_free()
		_floor_node = null

	var floor_data = world_data.get("floor", {})
	if floor_data is Dictionary and floor_data.has("enabled") and not bool(floor_data.get("enabled", true)):
		return

	var size_data = floor_data.get("size", {"x": 50.0, "z": 50.0})
	var half_height = float(floor_data.get("thickness", 0.5)) * 0.5
	var floor_width = float(size_data.get("x", 50.0))
	var floor_depth = float(size_data.get("z", 50.0))
	var floor_y = float(floor_data.get("y", 0.0)) - half_height

	var body = StaticBody3D.new()
	body.name = "WorldFloor3D"
	body.position = Vector3(0, floor_y, 0)

	var collision = CollisionShape3D.new()
	var shape = BoxShape3D.new()
	shape.size = Vector3(floor_width, half_height * 2.0, floor_depth)
	collision.shape = shape
	body.add_child(collision)

	var mesh_instance = MeshInstance3D.new()
	var mesh = BoxMesh.new()
	mesh.size = shape.size
	mesh_instance.mesh = mesh
	var material = StandardMaterial3D.new()
	material.albedo_color = Color.from_string(str(floor_data.get("color", "#4A4A4A")), Color(0.3, 0.3, 0.3, 1.0))
	material.roughness = float(floor_data.get("roughness", 0.9))
	mesh_instance.material_override = material
	body.add_child(mesh_instance)

	game_root.add_child(body)
	_floor_node = body

func _setup_sky(world_data: Dictionary, env_node: WorldEnvironment) -> void:
	if env_node == null:
		return
	if env_node.environment == null:
		env_node.environment = Environment.new()

	var env = env_node.environment
	var sky_data = world_data.get("sky", {})
	if sky_data is Dictionary and bool(sky_data.get("enabled", true)):
		env.background_mode = Environment.BG_COLOR
		env.background_color = Color.from_string(str(sky_data.get("color", "#A6D3FF")), Color(0.65, 0.83, 1.0, 1.0))
	else:
		env.background_mode = Environment.BG_COLOR
		env.background_color = Color(0.1, 0.1, 0.12, 1.0)

func _setup_lighting(world_data: Dictionary, env_node: WorldEnvironment, light_node: DirectionalLight3D) -> void:
	if env_node == null:
		return
	if env_node.environment == null:
		env_node.environment = Environment.new()

	var env = env_node.environment
	var lighting_data = world_data.get("lighting", {})
	var preset_name = str(lighting_data.get("preset", "bright-day"))
	var preset = _resolve_preset(preset_name)

	var ambient = preset.get("ambient", {})
	var directional = preset.get("directional", {})

	var ambient_override = lighting_data.get("ambient", null)
	if ambient_override is Dictionary:
		for k in ambient_override:
			ambient[k] = ambient_override[k]
	var directional_override = lighting_data.get("directional", null)
	if directional_override is Dictionary:
		for k in directional_override:
			directional[k] = directional_override[k]

	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color.from_string(str(ambient.get("color", "#FFFFFF")), Color.WHITE)
	env.ambient_light_energy = float(ambient.get("energy", 0.4))

	if light_node:
		light_node.light_color = Color.from_string(str(directional.get("color", "#FFFAF0")), Color(1.0, 0.98, 0.94, 1.0))
		light_node.light_energy = float(directional.get("energy", 1.0))
		light_node.shadow_enabled = bool(directional.get("shadows", true))
		var rot = directional.get("rotation", {"x": -45.0, "y": -45.0, "z": 0.0})
		light_node.rotation_degrees = Vector3(float(rot.get("x", -45.0)), float(rot.get("y", -45.0)), float(rot.get("z", 0.0)))

func _setup_fog(world_data: Dictionary, env_node: WorldEnvironment) -> void:
	if env_node == null:
		return
	if env_node.environment == null:
		env_node.environment = Environment.new()
	var env = env_node.environment

	var fog_data = world_data.get("fog", {})
	var enabled = bool(fog_data.get("enabled", false))
	env.fog_enabled = enabled
	if not enabled:
		return

	env.fog_light_color = Color.from_string(str(fog_data.get("color", "#BFD7FF")), Color(0.75, 0.84, 1.0, 1.0))
	env.fog_light_energy = float(fog_data.get("energy", 1.0))
	env.fog_density = float(fog_data.get("density", 0.01))
	env.fog_sky_affect = float(fog_data.get("skyAffect", 1.0))

func _resolve_preset(preset_name: String) -> Dictionary:
	match preset_name:
		"bright-day":
			return {"ambient": {"color": "#FFFFFF", "energy": 0.4}, "directional": {"color": "#FFFAF0", "energy": 1.0, "rotation": {"x": -45, "y": -45, "z": 0}, "shadows": true}}
		"overcast":
			return {"ambient": {"color": "#E0E0E0", "energy": 0.7}, "directional": {"color": "#C0C0C0", "energy": 0.5, "rotation": {"x": -60, "y": -30, "z": 0}, "shadows": false}}
		"sunset":
			return {"ambient": {"color": "#FFCCAA", "energy": 0.45}, "directional": {"color": "#FF9966", "energy": 0.9, "rotation": {"x": -20, "y": -70, "z": 0}, "shadows": true}}
		"night":
			return {"ambient": {"color": "#6B7FAF", "energy": 0.2}, "directional": {"color": "#A0B8FF", "energy": 0.2, "rotation": {"x": -50, "y": -20, "z": 0}, "shadows": false}}
		"studio":
			return {"ambient": {"color": "#FFFFFF", "energy": 0.6}, "directional": {"color": "#FFFFFF", "energy": 1.2, "rotation": {"x": -35, "y": -20, "z": 0}, "shadows": true}}
		"dramatic":
			return {"ambient": {"color": "#B8C4FF", "energy": 0.25}, "directional": {"color": "#FFE0CC", "energy": 1.4, "rotation": {"x": -15, "y": -80, "z": 0}, "shadows": true}}
		_:
			return _resolve_preset("bright-day")

func _js_set_3d_gravity(args: Array) -> void:
	if args.size() < 3 or not _bridge:
		return
	var gravity = Vector3(float(args[0]), float(args[1]), float(args[2]))
	var world_3d = _bridge.get_viewport().find_world_3d()
	if world_3d == null:
		return
	PhysicsServer3D.area_set_param(
		world_3d.space,
		PhysicsServer3D.AREA_PARAM_GRAVITY_VECTOR,
		gravity
	)

func _js_set_3d_fog(args: Array) -> void:
	if args.size() < 1 or not _environment:
		return
	var enabled = bool(args[0])
	if _environment.environment:
		_environment.environment.fog_enabled = enabled
