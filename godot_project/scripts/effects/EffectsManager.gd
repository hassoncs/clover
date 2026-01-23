extends Node
class_name EffectsManager

## Central manager for all visual effects in the game.
## Handles post-processing, sprite effects, and dynamic shader creation.

signal effect_started(effect_name: String)
signal effect_ended(effect_name: String)
signal shader_compiled(shader_id: String, success: bool)

# Post-processing layer
var _post_process_layer: CanvasLayer
var _post_process_rects: Dictionary = {}  # Multiple stacked ColorRects for compositing
var _active_post_effects: Dictionary = {}

# Camera reference
var _camera: Camera2D

# Shader cache
var _sprite_shaders: Dictionary = {}
var _post_shaders: Dictionary = {}
var _dynamic_shaders: Dictionary = {}

# Preloaded sprite shaders
const SPRITE_SHADER_PATHS = {
	"outline": "res://shaders/sprite/outline.gdshader",
	"glow": "res://shaders/sprite/glow.gdshader",
	"tint": "res://shaders/sprite/tint.gdshader",
	"flash": "res://shaders/sprite/flash.gdshader",
	"pixelate": "res://shaders/sprite/pixelate.gdshader",
	"posterize": "res://shaders/sprite/posterize.gdshader",
	"silhouette": "res://shaders/sprite/silhouette.gdshader",
	"rainbow": "res://shaders/sprite/rainbow.gdshader",
	"dissolve": "res://shaders/sprite/dissolve.gdshader",
	"holographic": "res://shaders/sprite/holographic.gdshader",
	"wave": "res://shaders/sprite/wave.gdshader",
	"rim_light": "res://shaders/sprite/rim_light.gdshader",
	"color_matrix": "res://shaders/sprite/color_matrix.gdshader",
	"inner_glow": "res://shaders/sprite/inner_glow.gdshader",
	"drop_shadow": "res://shaders/sprite/drop_shadow.gdshader",
}

# Preloaded post-process shaders
const POST_SHADER_PATHS = {
	"vignette": "res://shaders/post_process/vignette.gdshader",
	"scanlines": "res://shaders/post_process/scanlines.gdshader",
	"chromatic_aberration": "res://shaders/post_process/chromatic_aberration.gdshader",
	"chromatic": "res://shaders/post_process/chromatic_aberration.gdshader",  # Alias
	"shockwave": "res://shaders/post_process/shockwave.gdshader",
	"blur": "res://shaders/post_process/blur.gdshader",
	"crt": "res://shaders/post_process/crt.gdshader",
	"color_grading": "res://shaders/post_process/color_grading.gdshader",
	"color_grade": "res://shaders/post_process/color_grading.gdshader",  # Alias
	"glitch": "res://shaders/post_process/glitch.gdshader",
	"motion_blur": "res://shaders/post_process/motion_blur.gdshader",
	"pixelate_screen": "res://shaders/post_process/pixelate_screen.gdshader",
	"shimmer": "res://shaders/post_process/shimmer.gdshader",
}

func _ready() -> void:
	_load_shaders()
	_setup_post_process_layer()

func _load_shaders() -> void:
	# Load sprite shaders
	for shader_name in SPRITE_SHADER_PATHS:
		var shader = load(SPRITE_SHADER_PATHS[shader_name])
		if shader:
			_sprite_shaders[shader_name] = shader
		else:
			push_warning("Failed to load sprite shader: " + shader_name)
	
	# Load post-process shaders
	for shader_name in POST_SHADER_PATHS:
		var shader = load(POST_SHADER_PATHS[shader_name])
		if shader:
			_post_shaders[shader_name] = shader
		else:
			push_warning("Failed to load post shader: " + shader_name)

func _setup_post_process_layer() -> void:
	_post_process_layer = CanvasLayer.new()
	_post_process_layer.name = "PostProcessLayer"
	_post_process_layer.layer = 100
	add_child(_post_process_layer)

func _get_or_create_post_rect(layer_name: String, z_index: int = 0) -> ColorRect:
	if _post_process_rects.has(layer_name):
		return _post_process_rects[layer_name]
	
	var rect = ColorRect.new()
	rect.name = "PostProcess_" + layer_name
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rect.z_index = z_index
	rect.color = Color.TRANSPARENT  # Important: default to transparent
	_post_process_layer.add_child(rect)
	_post_process_rects[layer_name] = rect
	return rect

# ============================================================
# CAMERA SETUP
# ============================================================

func set_camera(camera: Camera2D) -> void:
	_camera = camera

func get_camera() -> Camera2D:
	return _camera

# ============================================================
# SPRITE EFFECTS
# ============================================================

func apply_sprite_effect(sprite: CanvasItem, effect_name: String, params: Dictionary = {}) -> ShaderMaterial:
	if not _sprite_shaders.has(effect_name):
		push_error("Unknown sprite effect: " + effect_name)
		return null
	
	var material = ShaderMaterial.new()
	material.shader = _sprite_shaders[effect_name]
	
	for key in params:
		material.set_shader_parameter(key, _convert_param(params[key]))
	
	sprite.material = material
	return material

func update_sprite_effect_param(sprite: CanvasItem, param_name: String, value) -> void:
	if sprite.material and sprite.material is ShaderMaterial:
		sprite.material.set_shader_parameter(param_name, _convert_param(value))

func clear_sprite_effect(sprite: CanvasItem) -> void:
	sprite.material = null

func get_sprite_shader(effect_name: String) -> Shader:
	return _sprite_shaders.get(effect_name)

# ============================================================
# POST-PROCESSING EFFECTS
# ============================================================

func set_post_effect(effect_name: String, params: Dictionary = {}, layer_name: String = "main") -> void:
	if not _post_shaders.has(effect_name):
		push_error("Unknown post effect: " + effect_name)
		return
	
	var rect = _get_or_create_post_rect(layer_name)
	var material = ShaderMaterial.new()
	material.shader = _post_shaders[effect_name]
	
	for key in params:
		material.set_shader_parameter(key, _convert_param(params[key]))
	
	rect.material = material
	_active_post_effects[layer_name] = effect_name
	effect_started.emit(effect_name)

func update_post_effect_param(param_name: String, value, layer_name: String = "main") -> void:
	if _post_process_rects.has(layer_name):
		var rect = _post_process_rects[layer_name]
		if rect.material:
			rect.material.set_shader_parameter(param_name, _convert_param(value))

func clear_post_effect(layer_name: String = "main") -> void:
	if _post_process_rects.has(layer_name):
		var rect = _post_process_rects[layer_name]
		var effect_name = _active_post_effects.get(layer_name, "")
		rect.material = null
		rect.color = Color.TRANSPARENT  # Reset to transparent when clearing
		_active_post_effects.erase(layer_name)
		if effect_name:
			effect_ended.emit(effect_name)

func clear_all_post_effects() -> void:
	for layer_name in _post_process_rects:
		clear_post_effect(layer_name)

func get_active_post_effects() -> Array:
	return _active_post_effects.values()

# ============================================================
# DYNAMIC SHADERS (AI-GENERATED)
# ============================================================

func create_dynamic_shader(shader_id: String, shader_code: String) -> Dictionary:
	var shader = Shader.new()
	shader.code = shader_code
	
	# In Godot 4, we need to check for shader compilation errors
	# The shader won't report errors until we try to use it
	# We can detect errors by checking if the shader is valid after setting the code
	
	# Create a temporary material and sprite to force shader compilation
	var test_material = ShaderMaterial.new()
	test_material.shader = shader
	
	# Check for shader errors by examining the shader's compiled code
	# Godot 4 provides get_shader_uniform_list() which will be empty if shader failed
	var error_message = ""
	var success = true
	
	# Try to get shader info - if the shader has syntax errors, this may fail
	# We also check by looking at RenderingServer shader warnings
	var shader_rid = shader.get_rid()
	if not shader_rid.is_valid():
		success = false
		error_message = "Shader RID is invalid - likely syntax error in shader code"
	else:
		# Attempt to validate by checking if we can get uniforms
		# A completely broken shader often has issues here
		var uniforms = test_material.shader.get_shader_uniform_list()
		# Note: Even invalid shaders may return empty list, so this isn't foolproof
		# The real test is rendering, but we can catch obvious errors
		
		# Check for common GLSL/Godot shader syntax issues
		if not shader_code.contains("shader_type"):
			success = false
			error_message = "Missing 'shader_type' declaration (e.g., 'shader_type canvas_item;')"
		elif not shader_code.contains("void fragment()") and not shader_code.contains("void vertex()"):
			success = false
			error_message = "Shader must contain at least a 'void fragment()' or 'void vertex()' function"
	
	if success:
		# Store in cache
		_dynamic_shaders[shader_id] = shader
		shader_compiled.emit(shader_id, true)
		return {"success": true, "shader_id": shader_id}
	else:
		shader_compiled.emit(shader_id, false)
		return {"success": false, "error": error_message, "shader_id": shader_id}

func apply_dynamic_shader_to_sprite(sprite: CanvasItem, shader_id: String, params: Dictionary = {}) -> ShaderMaterial:
	if not _dynamic_shaders.has(shader_id):
		push_error("Dynamic shader not found: " + shader_id)
		return null
	
	var material = ShaderMaterial.new()
	material.shader = _dynamic_shaders[shader_id]
	
	for key in params:
		material.set_shader_parameter(key, _convert_param(params[key]))
	
	sprite.material = material
	return material

func apply_dynamic_post_shader(shader_code: String, params: Dictionary = {}, layer_name: String = "dynamic") -> void:
	var shader = Shader.new()
	shader.code = shader_code
	
	var rect = _get_or_create_post_rect(layer_name, 10)  # Higher z for dynamic
	var material = ShaderMaterial.new()
	material.shader = shader
	
	for key in params:
		material.set_shader_parameter(key, _convert_param(params[key]))
	
	rect.material = material
	_active_post_effects[layer_name] = "dynamic"

func get_dynamic_shader(shader_id: String) -> Shader:
	return _dynamic_shaders.get(shader_id)

func remove_dynamic_shader(shader_id: String) -> void:
	_dynamic_shaders.erase(shader_id)

# ============================================================
# ANIMATED EFFECTS
# ============================================================

func trigger_shockwave(world_pos: Vector2, duration: float = 0.5, params: Dictionary = {}) -> void:
	var viewport = get_viewport()
	var canvas_transform = viewport.get_canvas_transform()
	var screen_pos = canvas_transform * world_pos
	var viewport_size = viewport.get_visible_rect().size
	var uv_center = screen_pos / viewport_size
	
	var effect_params = {
		"center": uv_center,
		"radius": 0.0,
		"thickness": params.get("thickness", 0.1),
		"amplitude": params.get("amplitude", 0.03),
	}
	
	set_post_effect("shockwave", effect_params, "shockwave")
	
	var tween = create_tween()
	tween.tween_method(
		func(r): update_post_effect_param("radius", r, "shockwave"),
		0.0, 1.5, duration
	)
	tween.tween_callback(func(): clear_post_effect("shockwave"))

func flash_screen(color: Color = Color.WHITE, duration: float = 0.1) -> void:
	var rect = _get_or_create_post_rect("flash", 50)
	rect.color = color
	rect.material = null
	
	var tween = create_tween()
	tween.tween_property(rect, "color:a", 0.0, duration)
	tween.tween_callback(func(): rect.color = Color.TRANSPARENT)

func fade_to_color(color: Color, duration: float = 0.5, layer_name: String = "fade") -> void:
	var rect = _get_or_create_post_rect(layer_name, 100)
	rect.material = null
	rect.color = Color(color.r, color.g, color.b, 0.0)
	
	var tween = create_tween()
	tween.tween_property(rect, "color:a", color.a, duration)

func fade_from_color(duration: float = 0.5, layer_name: String = "fade") -> void:
	if _post_process_rects.has(layer_name):
		var rect = _post_process_rects[layer_name]
		var tween = create_tween()
		tween.tween_property(rect, "color:a", 0.0, duration)

# ============================================================
# CAMERA EFFECTS
# ============================================================

func screen_shake(intensity: float, duration: float = 0.3) -> void:
	print("[EffectsManager] screen_shake called: camera=", _camera, " intensity=", intensity)
	if _camera and _camera.has_method("add_trauma"):
		_camera.add_trauma(intensity)
	elif _camera:
		_do_simple_shake(_camera, intensity * 20.0, duration)
	else:
		print("[EffectsManager] No camera for shake!")

func _do_simple_shake(cam: Camera2D, strength: float, duration: float) -> void:
	var original_offset = cam.offset
	var elapsed = 0.0
	var shake_tween = create_tween()
	shake_tween.set_loops(int(duration / 0.05))
	shake_tween.tween_callback(func():
		var shake_offset = Vector2(
			randf_range(-strength, strength),
			randf_range(-strength, strength)
		)
		cam.offset = original_offset + shake_offset
	).set_delay(0.05)
	shake_tween.tween_callback(func(): cam.offset = original_offset)

func zoom_punch(intensity: float = 0.1, duration: float = 0.15) -> void:
	print("[EffectsManager] zoom_punch called: camera=", _camera, " intensity=", intensity)
	if not _camera:
		print("[EffectsManager] No camera for zoom_punch!")
		return
	
	var original_zoom = _camera.zoom
	var tween = create_tween()
	tween.tween_property(_camera, "zoom", original_zoom + Vector2(intensity, intensity), duration * 0.3)
	tween.tween_property(_camera, "zoom", original_zoom, duration * 0.7).set_ease(Tween.EASE_OUT)

func focus_on(target_position: Vector2, target_zoom: Vector2, duration: float = 0.5) -> void:
	if not _camera:
		return
	
	var tween = create_tween().set_parallel(true)
	tween.tween_property(_camera, "global_position", target_position, duration).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(_camera, "zoom", target_zoom, duration).set_ease(Tween.EASE_IN_OUT)

# ============================================================
# UTILITY
# ============================================================

func _convert_param(value):
	# Convert arrays to Godot types
	if value is Array:
		if value.size() == 2:
			return Vector2(value[0], value[1])
		elif value.size() == 3:
			return Vector3(value[0], value[1], value[2])
		elif value.size() == 4:
			return Color(value[0], value[1], value[2], value[3])
	return value

func prewarm_shaders() -> void:
	# Pre-compile all shaders to avoid first-use stutter
	var temp_rect = ColorRect.new()
	temp_rect.size = Vector2(1, 1)
	temp_rect.visible = false
	add_child(temp_rect)
	
	for shader in _sprite_shaders.values():
		var mat = ShaderMaterial.new()
		mat.shader = shader
		temp_rect.material = mat
		await get_tree().process_frame
	
	for shader in _post_shaders.values():
		var mat = ShaderMaterial.new()
		mat.shader = shader
		temp_rect.material = mat
		await get_tree().process_frame
	
	temp_rect.queue_free()

func get_available_sprite_effects() -> Array:
	return _sprite_shaders.keys()

func get_available_post_effects() -> Array:
	return _post_shaders.keys()
