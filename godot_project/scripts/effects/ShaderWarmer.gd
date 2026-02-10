class_name ShaderWarmer
extends RefCounted

## Pre-compiles and caches shaders to eliminate compilation stutter.
##
## Shader compilation can take 200-500ms per Shader.new() on WebGL.
## This class warms all builtin shaders at startup and caches custom
## shaders by hash to avoid recompilation.

var _warmed_shaders: Dictionary = {}  # hash -> Shader

## Pre-compile builtin shaders from inline GLSL.
## Call this once at startup (e.g., in GraphExecutor._ready()).
## Note: Builtin shaders are now provided as inline GLSL from TypeScript,
## so this method is a no-op placeholder for future use.
func warm_builtin_shaders() -> void:
	print("[ShaderWarmer] Ready (builtin shaders loaded on-demand from inline GLSL)")

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


