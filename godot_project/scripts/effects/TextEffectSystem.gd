class_name TextEffectSystem
extends RefCounted

var _viewport_pool: ViewportPool
var _font_cache: Dictionary = {}
var _shader_cache: Dictionary = {}

func _init(viewport_pool: ViewportPool) -> void:
    _viewport_pool = viewport_pool

func create_text_effect_node(config: Dictionary, tier: String = "mid") -> Node:
    var text_config = config.get("text", {})
    var font_config = config.get("font", {})
    var effects_config = config.get("effects", {})
    
    var needs_complex_effects = _needs_subviewport(effects_config)
    
    if tier == "low" or not needs_complex_effects:
        return await _create_msdf_node(text_config, font_config, effects_config)
    else:
        return await _create_subviewport_node(text_config, font_config, effects_config, tier)

func _needs_subviewport(effects: Dictionary) -> bool:
    if effects.get("dropShadow", {}).get("enabled", false):
        return true
    if effects.get("outerGlow", {}).get("enabled", false):
        return true
    if effects.get("gradient", {}).get("enabled", false):
        return true
    if effects.get("bevel", {}).get("enabled", false):
        return true
    if effects.get("innerGlow", {}).get("enabled", false):
        return true
    return false

func _create_msdf_node(text_config: Dictionary, font_config: Dictionary, effects: Dictionary) -> Label:
    var label = Label.new()
    
    var font = await _load_font(font_config)
    if font_config.get("useMsdf", false):
        font.multichannel_signed_distance_field = true
        font.msdf_pixel_range = font_config.get("msdfPixelRange", 16)
    
    label.add_theme_font_override("font", font)
    label.add_theme_font_size_override("font_size", text_config.get("fontSize", 32))
    label.text = text_config.get("content", "")
    
    var shader = _get_msdf_shader()
    var material = ShaderMaterial.new()
    material.shader = shader
    
    var sdf_effects = effects.get("sdfEffects", {})
    _apply_msdf_params(material, text_config, sdf_effects)
    
    label.material = material
    return label

func _create_subviewport_node(text_config: Dictionary, font_config: Dictionary, effects: Dictionary, tier: String) -> SubViewportContainer:
    var viewport_size = _calculate_text_size(text_config, font_config)
    
    var viewport = _viewport_pool.acquire("text_effect", viewport_size)
    viewport.transparent_bg = true
    
    var label = Label.new()
    label.text = text_config.get("content", "")
    
    var font = await _load_font(font_config)
    label.add_theme_font_override("font", font)
    label.add_theme_font_size_override("font_size", text_config.get("fontSize", 32))
    
    viewport.add_child(label)
    
    var container = SubViewportContainer.new()
    container.stretch = true
    container.add_child(viewport)
    
    return container

func _load_font(font_config: Dictionary) -> FontFile:
    var url = font_config.get("url", "")
    
    if url == "":
        return ThemeDB.fallback_font
    
    if _font_cache.has(url):
        return _font_cache[url]
    
    var cache_path = "user://fonts/%s.ttf" % url.md5_text()
    
    if FileAccess.file_exists(cache_path):
        var cached_font = FontFile.new()
        cached_font.load_dynamic_font(cache_path)
        _font_cache[url] = cached_font
        return cached_font
    
    var font = FontFile.new()
    var http = HTTPRequest.new()
    
    var result = await _download_font(url, http)
    if result.success:
        font.data = result.data
        
        DirAccess.make_dir_recursive_absolute("user://fonts")
        var f = FileAccess.open(cache_path, FileAccess.WRITE)
        f.store_buffer(result.data)
        f.close()
        
        _font_cache[url] = font
    else:
        push_warning("[TextEffectSystem] Failed to download font from %s, using fallback" % url)
        font = ThemeDB.fallback_font
    
    http.queue_free()
    return font

func _download_font(url: String, http: HTTPRequest) -> Dictionary:
    var result = { "success": false, "data": PackedByteArray() }
    
    var callback = func(response_code: int, _headers: PackedStringArray, body: PackedByteArray):
        if response_code == 200:
            result.success = true
            result.data = body
    
    http.request_completed.connect(callback)
    http.request(url)
    
    await http.request_completed
    return result

func _get_msdf_shader() -> Shader:
    if _shader_cache.has("msdf_uber"):
        return _shader_cache["msdf_uber"]
    
    var shader = Shader.new()
    shader.code = ""  # Will be populated from inline GLSL
    _shader_cache["msdf_uber"] = shader
    return shader

func _apply_msdf_params(material: ShaderMaterial, text_config: Dictionary, effects: Dictionary) -> void:
    var color_str = text_config.get("color", "#FFFFFF")
    material.set_shader_parameter("fill_color", Color(color_str))
    material.set_shader_parameter("font_size", text_config.get("fontSize", 32))
    
    material.set_shader_parameter("outline_enabled", effects.get("outlineEnabled", false))
    var outline_color = effects.get("outlineColor", "#000000")
    material.set_shader_parameter("outline_color", Color(outline_color))
    material.set_shader_parameter("outline_size", effects.get("outlineSize", 3.0))
    
    material.set_shader_parameter("shadow_enabled", effects.get("shadowEnabled", false))
    var shadow_color = effects.get("shadowColor", "#00000080")
    material.set_shader_parameter("shadow_color", Color(shadow_color))
    material.set_shader_parameter("shadow_spread", effects.get("shadowSpread", 4.0))
    
    material.set_shader_parameter("glow_enabled", effects.get("glowEnabled", false))
    var glow_color = effects.get("glowColor", "#FF6B00")
    material.set_shader_parameter("glow_color", Color(glow_color))
    material.set_shader_parameter("glow_spread", effects.get("glowSpread", 8.0))
    material.set_shader_parameter("glow_intensity", effects.get("glowIntensity", 1.5))

func _calculate_text_size(text_config: Dictionary, font_config: Dictionary) -> Vector2i:
    var content = text_config.get("content", "")
    var font_size = text_config.get("fontSize", 32)
    
    var estimated_width = int(content.length() * font_size * 0.6)
    var estimated_height = int(font_size * 1.5)
    
    return Vector2i(estimated_width + 40, estimated_height + 20)

func clear_font_cache() -> void:
    _font_cache.clear()

func get_cache_stats() -> Dictionary:
    return {
        "fonts_cached": _font_cache.size(),
        "shaders_cached": _shader_cache.size(),
    }
