@tool
class_name StyledButton
extends Button

## A button that uses a tileable texture with shader-based styling
## Supports rounded corners, drop shadow, bevel, and inner glow

@export_group("Material")
@export var material_texture: Texture2D:
    set(value):
        material_texture = value
        _update_material()

@export var texture_tiling: Vector2 = Vector2(1.0, 1.0):
    set(value):
        texture_tiling = value
        _update_uniforms()

@export_group("Shape")
@export var corner_radius: float = 18.0:
    set(value):
        corner_radius = value
        _update_uniforms()

@export_group("Effects")
@export var shadow_offset: Vector2 = Vector2(0.0, 4.0):
    set(value):
        shadow_offset = value
        _update_uniforms()

@export var shadow_size: float = 10.0:
    set(value):
        shadow_size = value
        _update_uniforms()

@export var shadow_color: Color = Color(0.0, 0.0, 0.0, 0.35):
    set(value):
        shadow_color = value
        _update_uniforms()

@export var border_size: float = 2.0:
    set(value):
        border_size = value
        _update_uniforms()

@export var border_color: Color = Color(1.0, 1.0, 1.0, 0.25):
    set(value):
        border_color = value
        _update_uniforms()

@export var bevel_strength: float = 0.25:
    set(value):
        bevel_strength = value
        _update_uniforms()

@export var inner_shadow_strength: float = 0.25:
    set(value):
        inner_shadow_strength = value
        _update_uniforms()

@export_group("State Colors")
@export var normal_tint: Color = Color(1.0, 1.0, 1.0, 1.0)
@export var hover_tint: Color = Color(1.1, 1.1, 1.1, 1.0)
@export var pressed_tint: Color = Color(0.9, 0.9, 0.9, 1.0)
@export var disabled_tint: Color = Color(0.7, 0.7, 0.7, 0.5)

var _surface: TextureRect
var _shader_material: ShaderMaterial

func _ready():
    _setup_surface()
    _update_material()
    _update_uniforms()
    
    # Connect state signals
    mouse_entered.connect(_on_mouse_entered)
    mouse_exited.connect(_on_mouse_exited)
    button_down.connect(_on_button_down)
    button_up.connect(_on_button_up)

func _setup_surface():
    # Create TextureRect for the shader surface
    _surface = TextureRect.new()
    _surface.name = "Surface"
    _surface.layout_mode = 1  # Anchors
    _surface.anchors_preset = Control.PRESET_FULL_RECT
    _surface.stretch_mode = TextureRect.STRETCH_TILE
    
    # Create shader material
    var shader = load("res://ui_shaders/styled_surface.gdshader")
    _shader_material = ShaderMaterial.new()
    _shader_material.shader = shader
    _surface.material = _shader_material
    
    # Add as first child so it's behind text
    add_child(_surface)
    move_child(_surface, 0)

func _update_material():
    if _shader_material and material_texture:
        _shader_material.set_shader_parameter("u_tex", material_texture)

func _update_uniforms():
    if not _shader_material:
        return
    
    _shader_material.set_shader_parameter("u_tile", texture_tiling)
    _shader_material.set_shader_parameter("u_radius_px", corner_radius)
    _shader_material.set_shader_parameter("u_shadow_offset_px", shadow_offset)
    _shader_material.set_shader_parameter("u_shadow_px", shadow_size)
    _shader_material.set_shader_parameter("u_shadow_color", shadow_color)
    _shader_material.set_shader_parameter("u_border_px", border_size)
    _shader_material.set_shader_parameter("u_border_color", border_color)
    _shader_material.set_shader_parameter("u_bevel_strength", bevel_strength)
    _shader_material.set_shader_parameter("u_inner_strength", inner_shadow_strength)

func _on_mouse_entered():
    if _shader_material:
        _shader_material.set_shader_parameter("u_tint", hover_tint)

func _on_mouse_exited():
    if _shader_material:
        _shader_material.set_shader_parameter("u_tint", normal_tint)

func _on_button_down():
    if _shader_material:
        _shader_material.set_shader_parameter("u_tint", pressed_tint)
        # Invert bevel for pressed effect
        var current_angle = _shader_material.get_shader_parameter("u_bevel_light_angle")
        _shader_material.set_shader_parameter("u_bevel_light_angle", current_angle + PI)

func _on_button_up():
    if _shader_material:
        _shader_material.set_shader_parameter("u_tint", hover_tint if is_hovered() else normal_tint)
        # Restore bevel
        var current_angle = _shader_material.get_shader_parameter("u_bevel_light_angle")
        _shader_material.set_shader_parameter("u_bevel_light_angle", current_angle - PI)

func set_theme_texture(texture: Texture2D):
    material_texture = texture
