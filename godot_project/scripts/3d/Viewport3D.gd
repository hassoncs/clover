class_name Viewport3D
extends Node2D

var sub_viewport: SubViewport
var sprite: Sprite2D
var camera: Camera3D
var light: DirectionalLight3D
var model_container: Node3D
var glb_model_container: Node3D  # Separate container for GLB models
var glb_loader: GLBLoader
var _bridge: Node = null  # Reference to GameBridge for coordinate conversion

func set_bridge(bridge: Node) -> void:
	_bridge = bridge

signal model_loaded(model: Node3D)

func _ready() -> void:
	_setup_viewport()
	glb_loader = GLBLoader.new(self)
	call_deferred("_center_on_screen")

func _setup_camera_look_at() -> void:
	camera.look_at(Vector3.ZERO)

func _center_on_screen() -> void:
	var viewport_size = get_viewport().get_visible_rect().size
	position = viewport_size / 2

func _setup_viewport() -> void:
	sub_viewport = SubViewport.new()
	sub_viewport.transparent_bg = true
	sub_viewport.size = Vector2i(512, 512)
	sub_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(sub_viewport)
	
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 4.0
	camera.position = Vector3(0, 0, 5)
	camera.current = true
	sub_viewport.add_child(camera)
	call_deferred("_setup_camera_look_at")
	
	light = DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-45, -45, 0)
	sub_viewport.add_child(light)
	
	var ambient = WorldEnvironment.new()
	var env = Environment.new()
	env.background_mode = Environment.BG_CLEAR_COLOR
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color.WHITE
	env.ambient_light_energy = 0.5
	ambient.environment = env
	sub_viewport.add_child(ambient)
	
	model_container = Node3D.new()
	model_container.name = "ModelContainer"
	sub_viewport.add_child(model_container)

	glb_model_container = Node3D.new()
	glb_model_container.name = "GLBModelContainer"
	sub_viewport.add_child(glb_model_container)

	sprite = Sprite2D.new()
	sprite.texture = sub_viewport.get_texture()
	sprite.z_index = 1000
	add_child(sprite)

func set_viewport_size(width: int, height: int) -> void:
	sub_viewport.size = Vector2i(width, height)

func load_glb(path: String) -> Node3D:
	clear_glb_models()
	var model = glb_loader.load_glb(path, glb_model_container)
	if model:
		model_loaded.emit(model)
	return model

func load_glb_from_buffer(buffer: PackedByteArray) -> Node3D:
	clear_glb_models()
	var model = glb_loader.load_glb_from_buffer(buffer, "", glb_model_container)
	if model:
		model_loaded.emit(model)
	return model

func load_glb_async(url: String, callback: Callable = Callable()) -> void:
	clear_glb_models()
	glb_loader.load_glb_async(url, glb_model_container, func(model):
		if model:
			model_loaded.emit(model)
		if callback.is_valid():
			callback.call(model)
	)

func clear_glb_models() -> void:
	for child in glb_model_container.get_children():
		child.queue_free()

func clear_models() -> void:
	clear_glb_models()

func set_model_rotation(rotation_deg: Vector3) -> void:
	glb_model_container.rotation_degrees = rotation_deg

func rotate_model(delta_deg: Vector3) -> void:
	glb_model_container.rotation_degrees += delta_deg

func set_model_position(x: float, y: float, z: float) -> void:
	glb_model_container.position = Vector3(x, y, z)

func set_camera_distance(distance: float) -> void:
	camera.position.z = distance

func set_camera_size(size: float) -> void:
	camera.size = size

func get_model_container() -> Node3D:
	return model_container

func create_floor(size: float = 10.0, color_hex: String = "555555", style: String = "plain") -> MeshInstance3D:
	print("[Viewport3D] Creating floor with size=", size, " color=", color_hex, " style=", style)
	
	# If grid style, make it much larger to simulate infinite
	var display_size = size
	if style == "grid":
		display_size = max(size, 1000.0)
	
	var plane_mesh = PlaneMesh.new()
	plane_mesh.size = Vector2(display_size, display_size)

	var material: Material
	
	if style == "grid":
		var shader_mat = ShaderMaterial.new()
		var shader := Shader.new()
		shader.code = """
shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_opaque, cull_disabled;

varying vec3 world_pos;

uniform float grid_size = 1.0;
uniform float line_width = 0.02;
uniform vec4 color : source_color = vec4(0.5, 0.5, 0.5, 0.5);
uniform float fade_start = 20.0;
uniform float fade_end = 40.0;

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

float grid(vec2 pos, float scale) {
	vec2 coord = pos * scale;
	vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
	float line = min(grid.x, grid.y);
	return 1.0 - min(line, 1.0);
}

void fragment() {
	// Base grid
	float g = grid(world_pos.xz, 1.0 / grid_size);
	
	// Thicker lines every 10 units
	float g_major = grid(world_pos.xz, 0.1 / grid_size); // 10x larger cells
	
	// Combine grids
	float combined_grid = max(g * 0.5, g_major);
	
	// Distance fade
	float dist = length(world_pos.xz - CAMERA_POSITION_WORLD.xz);
	float alpha = smoothstep(fade_end, fade_start, dist);
	
	// Axes
	// X axis (Z=0) is Red
	float axis_x = step(abs(world_pos.z), line_width * 2.0);
	// Z axis (X=0) is Blue
	float axis_z = step(abs(world_pos.x), line_width * 2.0);
	
	vec3 final_color = color.rgb;
	float final_alpha = combined_grid;
	
	if (axis_x > 0.5) {
		final_color = vec3(0.8, 0.2, 0.2);
		final_alpha = 1.0;
	} else if (axis_z > 0.5) {
		final_color = vec3(0.2, 0.2, 0.8);
		final_alpha = 1.0;
	}
	
	ALBEDO = final_color;
	ALPHA = final_alpha * alpha * color.a;
}
"""
		shader_mat.shader = shader
		shader_mat.set_shader_parameter("color", Color.from_string(color_hex, Color.GRAY))
		shader_mat.set_shader_parameter("grid_size", 1.0)
		shader_mat.set_shader_parameter("fade_start", display_size * 0.4) 
		shader_mat.set_shader_parameter("fade_end", display_size * 0.5)
		material = shader_mat
	else:
		var std_mat = StandardMaterial3D.new()
		std_mat.albedo_color = Color.from_string(color_hex, Color.GRAY)
		std_mat.roughness = 0.8
		std_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
		material = std_mat

	plane_mesh.material = material

	var floor_instance = MeshInstance3D.new()
	floor_instance.name = "Floor"
	floor_instance.mesh = plane_mesh
	
	# PlaneMesh is XZ plane (horizontal). No rotation needed.
	floor_instance.rotation_degrees = Vector3(0, 0, 0)
	
	# Move floor lower so duck sits ON it. Duck origin is usually (0,0,0).
	# If we want duck to sit on floor, floor should be at y=0.
	floor_instance.position = Vector3(0, 0, 0)

	model_container.add_child(floor_instance)
	print("[Viewport3D] Floor created at y=0 and added to model_container")
	return floor_instance

func set_camera_position(x: float, y: float, z: float) -> void:
	camera.position = Vector3(x, y, z)

func set_camera_look_at(x: float, y: float, z: float) -> void:
	camera.look_at(Vector3(x, y, z))

var _cube_counter: int = 0
var _cubes: Dictionary = {}

func create_cube(x: float, y: float, z: float, size: float = 0.5, color_hex: String = "ff0000") -> MeshInstance3D:
	print("[Viewport3D] Creating cube at pos=(", x, ",", y, ",", z, ") size=", size, " color=", color_hex)
	var box_mesh = BoxMesh.new()
	box_mesh.size = Vector3(size, size, size)

	var material = StandardMaterial3D.new()
	material.albedo_color = Color.from_string(color_hex, Color.RED)
	material.roughness = 0.5
	box_mesh.material = material

	var cube_instance = MeshInstance3D.new()
	_cube_counter += 1
	var cube_id = "cube_" + str(_cube_counter)
	cube_instance.name = cube_id
	cube_instance.mesh = box_mesh
	cube_instance.position = Vector3(x, y, z)

	model_container.add_child(cube_instance)
	_cubes[cube_id] = cube_instance
	print("[Viewport3D] Cube created: ", cube_id)
	return cube_instance

func clear_cubes() -> void:
	for cube_id in _cubes:
		var cube = _cubes[cube_id]
		if is_instance_valid(cube):
			cube.queue_free()
	_cubes.clear()
	_cube_counter = 0

func clear_all_primitives() -> void:
	clear_cubes()
	clear_models()

# ============================================================================
# BRIDGE METHODS (_js_ prefix for auto-registration)
# ============================================================================

func _js_show_3d_model(args: Array) -> Variant:
	if args.size() < 1: return false
	return load_glb(str(args[0])) != null

func _js_show_3d_model_from_url(args: Array) -> void:
	if args.size() < 1: return
	load_glb_async(str(args[0]))

func _js_set_3d_viewport_position(args: Array) -> void:
	if args.size() < 2 or not _bridge: return
	position = _bridge.game_to_godot_pos(Vector2(float(args[0]), float(args[1])))

func _js_set_3d_viewport_size(args: Array) -> void:
	if args.size() < 2: return
	set_viewport_size(int(args[0]), int(args[1]))

func _js_rotate_3d_model(args: Array) -> void:
	if args.size() < 3: return
	set_model_rotation(Vector3(float(args[0]), float(args[1]), float(args[2])))

func _js_set_3d_model_position(args: Array) -> void:
	if args.size() < 3: return
	set_model_position(float(args[0]), float(args[1]), float(args[2]))

func _js_set_3d_camera_distance(args: Array) -> void:
	if args.size() < 1: return
	set_camera_distance(float(args[0]))

func _js_set_3d_camera_size(args: Array) -> void:
	if args.size() < 1: return
	set_camera_size(float(args[0]))

func _js_set_3d_camera_position(args: Array) -> void:
	if args.size() < 3: return
	set_camera_position(float(args[0]), float(args[1]), float(args[2]))

func _js_set_3d_camera_look_at(args: Array) -> void:
	if args.size() < 3: return
	set_camera_look_at(float(args[0]), float(args[1]), float(args[2]))

func _js_clear_3d_models(args: Array) -> void:
	clear_models()

func _js_create_3d_floor(args: Array) -> void:
	var size_val = float(args[0]) if args.size() > 0 else 10.0
	var color = str(args[1]) if args.size() > 1 else "555555"
	var style = str(args[2]) if args.size() > 2 else "plain"
	create_floor(size_val, color, style)

func _js_create_3d_cube(args: Array) -> void:
	if args.size() < 3: return
	var size_val = float(args[3]) if args.size() > 3 else 0.5
	var color = str(args[4]) if args.size() > 4 else "ff0000"
	create_cube(float(args[0]), float(args[1]), float(args[2]), size_val, color)

func _js_clear_3d_cubes(args: Array) -> void:
	clear_cubes()

func _js_set_orbit_controls(args: Array) -> void:
	if args.size() < 1: return
	set_orbit_controls(bool(args[0]))

# Orbit Controls
var _orbit_enabled: bool = false
var _orbit_pressed: bool = false
var _orbit_sensitivity: float = 0.005
var _zoom_sensitivity: float = 0.5
var _current_yaw: float = 0.0
var _current_pitch: float = 0.0
var _current_dist: float = 5.0

func set_orbit_controls(enabled: bool) -> void:
	_orbit_enabled = enabled
	if enabled:
		# Initialize from current camera pos
		var cam_pos = camera.position
		_current_dist = cam_pos.length()
		_current_yaw = atan2(cam_pos.x, cam_pos.z)
		_current_pitch = asin(cam_pos.y / _current_dist)
		_update_orbit_camera()

func _input(event: InputEvent) -> void:
	if not _orbit_enabled: return
	
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			_orbit_pressed = event.pressed
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP:
			_current_dist = max(1.0, _current_dist - _zoom_sensitivity)
			_update_orbit_camera()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_current_dist = min(20.0, _current_dist + _zoom_sensitivity)
			_update_orbit_camera()
			
	elif event is InputEventMouseMotion and _orbit_pressed:
		_current_yaw -= event.relative.x * _orbit_sensitivity
		_current_pitch += event.relative.y * _orbit_sensitivity
		
		# Clamp pitch to avoid flipping (approx -90 to 90 degrees)
		_current_pitch = clamp(_current_pitch, -1.5, 1.5)
		
		_update_orbit_camera()

func _update_orbit_camera() -> void:
	var x = _current_dist * cos(_current_pitch) * sin(_current_yaw)
	var y = _current_dist * sin(_current_pitch)
	var z = _current_dist * cos(_current_pitch) * cos(_current_yaw)
	
	camera.position = Vector3(x, y, z)
	camera.look_at(Vector3.ZERO)

