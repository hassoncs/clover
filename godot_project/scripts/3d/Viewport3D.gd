class_name Viewport3D
extends Node2D

var sub_viewport: SubViewport
var sprite: Sprite2D
var camera: Camera3D
var light: DirectionalLight3D
var model_container: Node3D
var glb_loader: GLBLoader

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
	
	sprite = Sprite2D.new()
	sprite.texture = sub_viewport.get_texture()
	sprite.z_index = 1000
	add_child(sprite)

func set_viewport_size(width: int, height: int) -> void:
	sub_viewport.size = Vector2i(width, height)

func load_glb(path: String) -> Node3D:
	clear_models()
	var model = glb_loader.load_glb(path, model_container)
	if model:
		model_loaded.emit(model)
	return model

func load_glb_from_buffer(buffer: PackedByteArray) -> Node3D:
	clear_models()
	var model = glb_loader.load_glb_from_buffer(buffer, "", model_container)
	if model:
		model_loaded.emit(model)
	return model

func load_glb_async(url: String, callback: Callable = Callable()) -> void:
	clear_models()
	glb_loader.load_glb_async(url, model_container, func(model):
		if model:
			model_loaded.emit(model)
		if callback.is_valid():
			callback.call(model)
	)

func clear_models() -> void:
	for child in model_container.get_children():
		child.queue_free()

func set_model_rotation(rotation_deg: Vector3) -> void:
	model_container.rotation_degrees = rotation_deg

func rotate_model(delta_deg: Vector3) -> void:
	model_container.rotation_degrees += delta_deg

func set_camera_distance(distance: float) -> void:
	camera.position.z = distance

func set_camera_size(size: float) -> void:
	camera.size = size

func get_model_container() -> Node3D:
	return model_container
