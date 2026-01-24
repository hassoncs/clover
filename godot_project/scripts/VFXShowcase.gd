extends Node2D

## VFX Showcase - Interactive demonstration of all visual effects.
## Click sprites to apply effects, click empty areas to spawn particles.

@onready var sprite_grid: Node2D = $SpriteGrid
@onready var sprite_effects_list: ItemList = $UI/Panel/VBox/SpriteEffectsList
@onready var screen_effects_list: ItemList = $UI/Panel/VBox/ScreenEffectsList
@onready var particles_list: ItemList = $UI/Panel/VBox/ParticlesList
@onready var shake_btn: Button = $UI/Panel/VBox/CameraButtons/ShakeBtn
@onready var zoom_btn: Button = $UI/Panel/VBox/CameraButtons/ZoomBtn
@onready var flash_btn: Button = $UI/Panel/VBox/CameraButtons/FlashBtn
@onready var clear_btn: Button = $UI/Panel/VBox/ClearBtn
@onready var camera: Camera2D = $Camera2D

var effects_manager: EffectsManager
var particle_factory: ParticleFactory

var demo_sprites: Array[Sprite2D] = []
var selected_sprite: Sprite2D = null
var current_sprite_effect: String = ""
var current_screen_effect: String = ""

# Available effects
var sprite_effects = [
	"outline", "glow", "tint", "flash", "pixelate", "posterize",
	"silhouette", "rainbow", "dissolve", "holographic", "wave",
	"rim_light", "color_matrix", "inner_glow", "drop_shadow"
]

var screen_effects = [
	"vignette", "scanlines", "chromatic_aberration", "shockwave",
	"blur", "crt", "color_grading", "glitch", "motion_blur",
	"pixelate_screen", "shimmer"
]

var particle_presets = [
	"fire", "smoke", "sparks", "magic", "explosion", "rain",
	"snow", "bubbles", "confetti", "dust", "leaves", "stars"
]

func _ready() -> void:
	# Create effects systems
	effects_manager = EffectsManager.new()
	add_child(effects_manager)
	effects_manager.set_camera(camera)
	
	particle_factory = ParticleFactory.new()
	add_child(particle_factory)
	
	# Create demo sprites
	_create_demo_sprites()
	
	# Populate UI lists
	_populate_lists()
	
	# Connect signals
	sprite_effects_list.item_selected.connect(_on_sprite_effect_selected)
	screen_effects_list.item_selected.connect(_on_screen_effect_selected)
	particles_list.item_selected.connect(_on_particle_selected)
	shake_btn.pressed.connect(_on_shake_pressed)
	zoom_btn.pressed.connect(_on_zoom_pressed)
	flash_btn.pressed.connect(_on_flash_pressed)
	clear_btn.pressed.connect(_on_clear_pressed)

func _create_demo_sprites() -> void:
	var colors = [
		Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW,
		Color.MAGENTA, Color.CYAN, Color.ORANGE, Color.PURPLE,
		Color.WHITE
	]
	
	var grid_cols = 3
	var spacing = 150
	
	for i in range(9):
		var sprite = Sprite2D.new()
		sprite.texture = _create_demo_texture(64, colors[i])
		
		var col = i % grid_cols
		var row = i / grid_cols
		sprite.position = Vector2(col * spacing, row * spacing)
		
		sprite_grid.add_child(sprite)
		demo_sprites.append(sprite)
	
	# Select first sprite by default
	if demo_sprites.size() > 0:
		selected_sprite = demo_sprites[0]
		_highlight_selected_sprite()

func _create_demo_texture(size: int, color: Color) -> ImageTexture:
	var image = Image.create(size, size, false, Image.FORMAT_RGBA8)
	
	# Draw a simple shape with some detail
	for x in range(size):
		for y in range(size):
			var dx = x - size / 2.0
			var dy = y - size / 2.0
			var dist = sqrt(dx * dx + dy * dy)
			
			if dist < size / 2.0 - 2:
				# Inner gradient
				var t = dist / (size / 2.0)
				var c = color.lerp(color.darkened(0.3), t)
				image.set_pixel(x, y, c)
			elif dist < size / 2.0:
				# Border
				image.set_pixel(x, y, color.darkened(0.5))
			else:
				image.set_pixel(x, y, Color.TRANSPARENT)
	
	return ImageTexture.create_from_image(image)

func _populate_lists() -> void:
	for effect in sprite_effects:
		sprite_effects_list.add_item(effect)
	
	for effect in screen_effects:
		screen_effects_list.add_item(effect)
	
	for preset in particle_presets:
		particles_list.add_item(preset)

func _highlight_selected_sprite() -> void:
	for sprite in demo_sprites:
		sprite.modulate = Color.WHITE
	
	if selected_sprite:
		selected_sprite.modulate = Color(1.2, 1.2, 1.2, 1.0)

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var click_pos = get_global_mouse_position()
		
		# Check if clicking on a sprite
		var clicked_sprite: Sprite2D = null
		for sprite in demo_sprites:
			var sprite_rect = Rect2(
				sprite.global_position - Vector2(32, 32),
				Vector2(64, 64)
			)
			if sprite_rect.has_point(click_pos):
				clicked_sprite = sprite
				break
		
		if clicked_sprite:
			selected_sprite = clicked_sprite
			_highlight_selected_sprite()
			
			# Apply current effect to newly selected sprite
			if current_sprite_effect != "":
				_apply_sprite_effect(current_sprite_effect)
		else:
			# Click in empty area - spawn selected particle
			var selected_items = particles_list.get_selected_items()
			if selected_items.size() > 0:
				var preset_name = particle_presets[selected_items[0]]
				var preset = particle_factory.get_preset_by_name(preset_name)
				particle_factory.spawn_one_shot(preset, click_pos, self)

func _on_sprite_effect_selected(index: int) -> void:
	current_sprite_effect = sprite_effects[index]
	_apply_sprite_effect(current_sprite_effect)

func _apply_sprite_effect(effect_name: String) -> void:
	if not selected_sprite:
		return
	
	# Clear previous effect
	effects_manager.clear_sprite_effect(selected_sprite)
	
	# Apply new effect with appropriate params
	var params = _get_effect_params(effect_name)
	effects_manager.apply_sprite_effect(selected_sprite, effect_name, params)

func _get_effect_params(effect_name: String) -> Dictionary:
	match effect_name:
		"outline":
			return {"outline_color": Color.YELLOW, "outline_width": 3.0}
		"glow":
			return {"glow_color": Color(1, 0.8, 0.2), "glow_intensity": 2.0, "glow_radius": 8.0}
		"tint":
			return {"tint_color": Color(0.5, 1.0, 0.5), "tint_amount": 0.5}
		"flash":
			return {"flash_color": Color.WHITE, "flash_amount": 0.7}
		"pixelate":
			return {"pixel_size": 8.0}
		"posterize":
			return {"color_levels": 4.0}
		"silhouette":
			return {"silhouette_color": Color(0, 0, 0, 0.7)}
		"rainbow":
			return {"speed": 1.0, "saturation_boost": 0.5}
		"dissolve":
			return {"dissolve_amount": 0.3, "edge_color": Color(1, 0.5, 0)}
		"holographic":
			return {"speed": 1.0, "chromatic_offset": 0.005}
		"wave":
			return {"amplitude_x": 0.03, "amplitude_y": 0.02, "frequency_x": 10.0, "speed": 2.0}
		"rim_light":
			return {"rim_color": Color.CYAN, "rim_width": 5.0, "rim_intensity": 1.5}
		"color_matrix":
			return {"preset": 2}  # Sepia
		"inner_glow":
			return {"glow_color": Color(1, 0.5, 0), "glow_width": 8.0}
		"drop_shadow":
			return {"shadow_color": Color(0, 0, 0, 0.5), "shadow_offset": Vector2(5, 5)}
	return {}

func _on_screen_effect_selected(index: int) -> void:
	current_screen_effect = screen_effects[index]
	_apply_screen_effect(current_screen_effect)

func _apply_screen_effect(effect_name: String) -> void:
	# Clear previous
	effects_manager.clear_post_effect()
	
	var params = _get_screen_effect_params(effect_name)
	effects_manager.set_post_effect(effect_name, params)

func _get_screen_effect_params(effect_name: String) -> Dictionary:
	match effect_name:
		"vignette":
			return {"vignette_intensity": 0.5, "vignette_opacity": 0.6}
		"scanlines":
			return {"scanline_count": 200.0, "scanline_opacity": 0.3}
		"chromatic_aberration":
			return {"strength": 5.0, "radial": true}
		"shockwave":
			# Trigger animated shockwave
			effects_manager.trigger_shockwave(Vector2(350, 450), 0.6)
			return {}
		"blur":
			return {"blur_amount": 2.0, "blur_quality": 2}
		"crt":
			return {"scanline_opacity": 0.3, "enable_curvature": true, "curvature": 0.1}
		"color_grading":
			return {"preset": 1}  # Warm vintage
		"glitch":
			return {"glitch_intensity": 0.15, "glitch_speed": 15.0}
		"motion_blur":
			return {"velocity": Vector2(10, 0), "strength": 0.5}
		"pixelate_screen":
			return {"pixel_size": 4.0, "color_reduction": true, "color_levels": 16.0}
		"shimmer":
			return {"amplitude": 0.005, "speed": 2.0}
	return {}

func _on_particle_selected(index: int) -> void:
	# Just highlight - actual spawn happens on click
	pass

func _on_shake_pressed() -> void:
	# Simple shake using camera offset
	var tween = create_tween()
	for i in range(10):
		var offset = Vector2(randf_range(-15, 15), randf_range(-10, 10))
		tween.tween_property(camera, "offset", offset, 0.03)
	tween.tween_property(camera, "offset", Vector2.ZERO, 0.05)

func _on_zoom_pressed() -> void:
	var original_zoom = camera.zoom
	var tween = create_tween()
	tween.tween_property(camera, "zoom", original_zoom + Vector2(0.15, 0.15), 0.05)
	tween.tween_property(camera, "zoom", original_zoom, 0.1).set_ease(Tween.EASE_OUT)

func _on_flash_pressed() -> void:
	effects_manager.flash_screen(Color.WHITE, 0.15)

func _on_clear_pressed() -> void:
	# Clear all sprite effects
	for sprite in demo_sprites:
		effects_manager.clear_sprite_effect(sprite)
	
	# Clear screen effects
	effects_manager.clear_all_post_effects()
	
	current_sprite_effect = ""
	current_screen_effect = ""
	
	# Deselect lists
	sprite_effects_list.deselect_all()
	screen_effects_list.deselect_all()
