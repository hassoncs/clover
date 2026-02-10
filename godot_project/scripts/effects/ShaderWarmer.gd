class_name ShaderWarmer
extends RefCounted

## Pre-compiles and caches shaders to eliminate compilation stutter.
##
## Shader compilation can take 200-500ms per Shader.new() on WebGL.
## This class warms all builtin shaders at startup and caches custom
## shaders by hash to avoid recompilation.

var _warmed_shaders: Dictionary = {}  # path/hash -> Shader

## Pre-compile all builtin shaders from SPRITE_SHADER_PATHS and POST_SHADER_PATHS.
## Call this once at startup (e.g., in GraphExecutor._ready()).
func warm_builtin_shaders() -> void:
	print("[ShaderWarmer] Warming builtin shaders...")
	var start_time := Time.get_ticks_msec()
	var warmed_count := 0
	var failed_count := 0
	
	# Warm sprite shaders
	for shader_name in EffectsGraphExecutor.SPRITE_SHADER_PATHS.keys():
		var path: String = EffectsGraphExecutor.SPRITE_SHADER_PATHS[shader_name]
		if _warm_shader_from_path(path):
			warmed_count += 1
		else:
			failed_count += 1
	
	# Warm post-process shaders
	for shader_name in EffectsGraphExecutor.POST_SHADER_PATHS.keys():
		var path: String = EffectsGraphExecutor.POST_SHADER_PATHS[shader_name]
		if _warm_shader_from_path(path):
			warmed_count += 1
		else:
			failed_count += 1
	
	var elapsed := Time.get_ticks_msec() - start_time
	print("[ShaderWarmer] Warmed %d shaders in %dms (%d failed)" % [warmed_count, elapsed, failed_count])

## Compile and cache a custom GLSL shader.
## Returns the compiled Shader, or null on error.
## Subsequent calls with the same code return the cached instance.
func warm_custom_shader(glsl_code: String) -> Shader:
	if glsl_code == "":
		push_warning("[ShaderWarmer] Empty GLSL code provided")
		return null
	
	# Hash the code to use as cache key
	var code_hash := glsl_code.hash()
	var cache_key := "custom:%d" % code_hash
	
	# Return cached shader if available
	if _warmed_shaders.has(cache_key):
		return _warmed_shaders[cache_key]
	
	# Compile new shader
	var shader_code := glsl_code
	if not shader_code.contains("shader_type"):
		shader_code = "shader_type canvas_item;\n" + shader_code
	
	var shader := Shader.new()
	shader.code = shader_code
	
	# Validate compilation (Godot compiles on first use, but we can check for errors)
	# Note: Godot doesn't provide a direct way to check compilation errors synchronously,
	# so we cache even potentially invalid shaders. The error will surface when used.
	_warmed_shaders[cache_key] = shader
	
	return shader

## Get a pre-warmed builtin shader by path.
## Returns null if the shader wasn't warmed or failed to load.
func get_warmed_shader(path: String) -> Shader:
	if path == "":
		return null
	
	if _warmed_shaders.has(path):
		return _warmed_shaders[path]
	
	# Fallback: try to warm it now if it wasn't warmed at startup
	push_warning("[ShaderWarmer] Shader not pre-warmed: %s (warming now)" % path)
	if _warm_shader_from_path(path):
		return _warmed_shaders[path]
	
	return null

## Internal: Load and cache a shader from a resource path.
## Returns true on success, false on failure.
func _warm_shader_from_path(path: String) -> bool:
	if path == "":
		return false
	
	# Return true if already cached
	if _warmed_shaders.has(path):
		return true
	
	# Check if resource exists
	if not ResourceLoader.exists(path):
		push_warning("[ShaderWarmer] Shader not found: %s" % path)
		return false
	
	# Load shader
	var shader = load(path)
	if not (shader is Shader):
		push_warning("[ShaderWarmer] Failed to load shader: %s" % path)
		return false
	
	# Cache and return success
	_warmed_shaders[path] = shader
	return true
