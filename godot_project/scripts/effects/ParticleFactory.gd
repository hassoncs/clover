extends Node
class_name ParticleFactory

## Factory for creating pre-configured particle effects.
## Uses CPUParticles2D for cross-platform compatibility (safer on Web).

# Particle presets matching the TypeScript definitions
enum Preset {
	FIRE,
	SMOKE,
	SPARKS,
	MAGIC,
	EXPLOSION,
	RAIN,
	SNOW,
	BUBBLES,
	CONFETTI,
	DUST,
	LEAVES,
	STARS,
	BLOOD,
	COINS,
}

# Default textures (can be overridden)
var _default_particle_texture: Texture2D

func _ready() -> void:
	# Create a simple circle texture for particles
	_default_particle_texture = _create_circle_texture(8, Color.WHITE)

# ============================================================
# MAIN FACTORY METHOD
# ============================================================

func create_particles(preset: Preset, position: Vector2 = Vector2.ZERO, params: Dictionary = {}) -> CPUParticles2D:
	var particles: CPUParticles2D
	
	match preset:
		Preset.FIRE:
			particles = _create_fire(params)
		Preset.SMOKE:
			particles = _create_smoke(params)
		Preset.SPARKS:
			particles = _create_sparks(params)
		Preset.MAGIC:
			particles = _create_magic(params)
		Preset.EXPLOSION:
			particles = _create_explosion(params)
		Preset.RAIN:
			particles = _create_rain(params)
		Preset.SNOW:
			particles = _create_snow(params)
		Preset.BUBBLES:
			particles = _create_bubbles(params)
		Preset.CONFETTI:
			particles = _create_confetti(params)
		Preset.DUST:
			particles = _create_dust(params)
		Preset.LEAVES:
			particles = _create_leaves(params)
		Preset.STARS:
			particles = _create_stars(params)
		Preset.BLOOD:
			particles = _create_blood(params)
		Preset.COINS:
			particles = _create_coins(params)
		_:
			particles = _create_default(params)
	
	particles.position = position
	
	# Apply common overrides
	if params.has("amount"):
		particles.amount = params["amount"]
	if params.has("lifetime"):
		particles.lifetime = params["lifetime"]
	if params.has("one_shot"):
		particles.one_shot = params["one_shot"]
	if params.has("color"):
		particles.color = params["color"]
	
	return particles

func spawn_one_shot(preset: Preset, position: Vector2, parent: Node = null, params: Dictionary = {}) -> CPUParticles2D:
	## Spawns a one-shot particle effect that auto-removes itself.
	params["one_shot"] = true
	var particles = create_particles(preset, position, params)
	
	if parent:
		parent.add_child(particles)
	else:
		get_tree().current_scene.add_child(particles)
	
	particles.emitting = true
	particles.finished.connect(particles.queue_free)
	
	return particles

# ============================================================
# PRESET IMPLEMENTATIONS
# ============================================================

func _create_fire(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 30)
	p.lifetime = params.get("lifetime", 0.8)
	p.texture = _default_particle_texture
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(10, 2)
	
	p.direction = Vector2(0, -1)
	p.spread = 20.0
	p.initial_velocity_min = 30.0
	p.initial_velocity_max = 60.0
	p.gravity = Vector2(0, -50)  # Fire rises
	
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.5
	p.scale_amount_curve = _create_scale_curve([1.0, 1.2, 0.0])
	
	p.color_ramp = _create_gradient([
		[0.0, Color(1, 1, 0.8, 1)],      # Bright yellow
		[0.3, Color(1, 0.6, 0.1, 1)],    # Orange
		[0.6, Color(1, 0.2, 0.0, 0.8)],  # Red
		[1.0, Color(0.2, 0.1, 0.1, 0)]   # Smoke/transparent
	])
	
	return p

func _create_smoke(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 20)
	p.lifetime = params.get("lifetime", 2.0)
	p.texture = _default_particle_texture
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 5.0
	
	p.direction = Vector2(0, -1)
	p.spread = 30.0
	p.initial_velocity_min = 10.0
	p.initial_velocity_max = 30.0
	p.gravity = Vector2(0, -20)
	
	p.scale_amount_min = 1.0
	p.scale_amount_max = 2.0
	p.scale_amount_curve = _create_scale_curve([0.5, 1.0, 1.5])
	
	p.color_ramp = _create_gradient([
		[0.0, Color(0.5, 0.5, 0.5, 0.5)],
		[0.5, Color(0.4, 0.4, 0.4, 0.3)],
		[1.0, Color(0.3, 0.3, 0.3, 0)]
	])
	
	return p

func _create_sparks(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 20)
	p.lifetime = params.get("lifetime", 0.5)
	p.one_shot = true
	p.explosiveness = 1.0
	p.texture = _default_particle_texture
	
	p.direction = Vector2(0, -1)
	p.spread = 180.0
	p.initial_velocity_min = 100.0
	p.initial_velocity_max = 250.0
	p.gravity = Vector2(0, 400)
	
	p.scale_amount_min = 0.3
	p.scale_amount_max = 0.8
	
	p.color = params.get("color", Color(1, 0.8, 0.2, 1))
	p.color_ramp = _create_gradient([
		[0.0, Color(1, 1, 0.8, 1)],
		[0.5, Color(1, 0.5, 0.1, 1)],
		[1.0, Color(1, 0.2, 0, 0)]
	])
	
	return p

func _create_magic(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 25)
	p.lifetime = params.get("lifetime", 1.0)
	p.texture = _default_particle_texture
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 20.0
	
	p.direction = Vector2(0, -1)
	p.spread = 180.0
	p.initial_velocity_min = 20.0
	p.initial_velocity_max = 50.0
	p.gravity = Vector2(0, -30)
	
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.0
	p.scale_amount_curve = _create_scale_curve([0.0, 1.0, 0.0])
	
	var magic_color = params.get("color", Color(0.5, 0.3, 1.0, 1))
	p.color_ramp = _create_gradient([
		[0.0, Color(1, 1, 1, 0)],
		[0.2, magic_color],
		[0.8, magic_color],
		[1.0, Color(magic_color.r, magic_color.g, magic_color.b, 0)]
	])
	
	return p

func _create_explosion(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 50)
	p.lifetime = params.get("lifetime", 0.6)
	p.one_shot = true
	p.explosiveness = 1.0
	p.texture = _default_particle_texture
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 5.0
	
	p.direction = Vector2(0, 0)
	p.spread = 180.0
	p.initial_velocity_min = 200.0
	p.initial_velocity_max = 400.0
	p.damping_min = 50.0
	p.damping_max = 100.0
	
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.5
	p.scale_amount_curve = _create_scale_curve([1.0, 0.8, 0.0])
	
	p.color_ramp = _create_gradient([
		[0.0, Color(1, 1, 1, 1)],
		[0.2, Color(1, 0.9, 0.5, 1)],
		[0.4, Color(1, 0.5, 0.1, 1)],
		[0.7, Color(0.5, 0.2, 0.1, 0.5)],
		[1.0, Color(0.2, 0.1, 0.1, 0)]
	])
	
	return p

func _create_rain(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 100)
	p.lifetime = params.get("lifetime", 1.0)
	p.texture = _create_line_texture(1, 8, Color(0.7, 0.8, 1.0, 0.5))
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(500, 10)
	
	p.direction = Vector2(0.1, 1)
	p.spread = 5.0
	p.initial_velocity_min = 400.0
	p.initial_velocity_max = 500.0
	p.gravity = Vector2(0, 100)
	
	p.scale_amount_min = 0.8
	p.scale_amount_max = 1.2
	
	return p

func _create_snow(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 50)
	p.lifetime = params.get("lifetime", 5.0)
	p.texture = _default_particle_texture
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(500, 10)
	
	p.direction = Vector2(0, 1)
	p.spread = 10.0
	p.initial_velocity_min = 20.0
	p.initial_velocity_max = 50.0
	p.gravity = Vector2(0, 10)
	
	# Wobble
	p.angular_velocity_min = -90.0
	p.angular_velocity_max = 90.0
	
	p.scale_amount_min = 0.3
	p.scale_amount_max = 0.8
	
	p.color = Color(1, 1, 1, 0.8)
	
	return p

func _create_bubbles(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 15)
	p.lifetime = params.get("lifetime", 2.0)
	p.texture = _create_circle_texture(6, Color(0.8, 0.9, 1.0, 0.3))
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(50, 5)
	
	p.direction = Vector2(0, -1)
	p.spread = 20.0
	p.initial_velocity_min = 30.0
	p.initial_velocity_max = 60.0
	p.gravity = Vector2(0, -50)
	
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.5
	p.scale_amount_curve = _create_scale_curve([0.5, 1.0, 1.2])
	
	p.color_ramp = _create_gradient([
		[0.0, Color(0.8, 0.9, 1.0, 0)],
		[0.2, Color(0.8, 0.9, 1.0, 0.4)],
		[0.9, Color(0.8, 0.9, 1.0, 0.4)],
		[1.0, Color(1, 1, 1, 0)]
	])
	
	return p

func _create_confetti(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 100)
	p.lifetime = params.get("lifetime", 3.0)
	p.one_shot = true
	p.explosiveness = 0.9
	p.texture = _create_rect_texture(4, 6, Color.WHITE)
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 10.0
	
	p.direction = Vector2(0, -1)
	p.spread = 60.0
	p.initial_velocity_min = 200.0
	p.initial_velocity_max = 400.0
	p.gravity = Vector2(0, 200)
	
	p.angular_velocity_min = -360.0
	p.angular_velocity_max = 360.0
	
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.0
	
	# Random colors
	p.color_ramp = _create_gradient([
		[0.0, Color(1, 0.2, 0.2, 1)],
		[0.2, Color(1, 1, 0.2, 1)],
		[0.4, Color(0.2, 1, 0.2, 1)],
		[0.6, Color(0.2, 0.2, 1, 1)],
		[0.8, Color(1, 0.2, 1, 1)],
		[1.0, Color(1, 0.2, 0.2, 0.5)]
	])
	
	return p

func _create_dust(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 10)
	p.lifetime = params.get("lifetime", 1.5)
	p.texture = _default_particle_texture
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(20, 5)
	
	p.direction = Vector2(1, -0.5)
	p.spread = 30.0
	p.initial_velocity_min = 20.0
	p.initial_velocity_max = 50.0
	p.gravity = Vector2(0, 20)
	
	p.scale_amount_min = 0.3
	p.scale_amount_max = 0.6
	
	p.color_ramp = _create_gradient([
		[0.0, Color(0.8, 0.7, 0.6, 0)],
		[0.2, Color(0.8, 0.7, 0.6, 0.5)],
		[1.0, Color(0.8, 0.7, 0.6, 0)]
	])
	
	return p

func _create_leaves(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 20)
	p.lifetime = params.get("lifetime", 4.0)
	p.texture = _create_leaf_texture()
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(300, 10)
	
	p.direction = Vector2(0.3, 1)
	p.spread = 20.0
	p.initial_velocity_min = 30.0
	p.initial_velocity_max = 60.0
	p.gravity = Vector2(20, 30)
	
	p.angular_velocity_min = -180.0
	p.angular_velocity_max = 180.0
	
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.0
	
	p.color_ramp = _create_gradient([
		[0.0, Color(0.3, 0.7, 0.2, 1)],
		[0.5, Color(0.8, 0.6, 0.2, 1)],
		[1.0, Color(0.6, 0.3, 0.1, 0.5)]
	])
	
	return p

func _create_stars(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 15)
	p.lifetime = params.get("lifetime", 1.0)
	p.one_shot = true
	p.explosiveness = 0.8
	p.texture = _create_star_texture()
	
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	p.emission_sphere_radius = 20.0
	
	p.direction = Vector2(0, -1)
	p.spread = 180.0
	p.initial_velocity_min = 50.0
	p.initial_velocity_max = 100.0
	p.gravity = Vector2(0, -20)
	
	p.angular_velocity_min = 90.0
	p.angular_velocity_max = 180.0
	
	p.scale_amount_min = 0.5
	p.scale_amount_max = 1.0
	p.scale_amount_curve = _create_scale_curve([0.0, 1.0, 0.0])
	
	p.color = Color(1, 1, 0.5, 1)
	
	return p

func _create_blood(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 15)
	p.lifetime = params.get("lifetime", 0.8)
	p.one_shot = true
	p.explosiveness = 1.0
	p.texture = _default_particle_texture
	
	p.direction = Vector2(0, -1)
	p.spread = 60.0
	p.initial_velocity_min = 80.0
	p.initial_velocity_max = 150.0
	p.gravity = Vector2(0, 500)
	
	p.scale_amount_min = 0.3
	p.scale_amount_max = 0.8
	
	p.color_ramp = _create_gradient([
		[0.0, Color(0.8, 0.1, 0.1, 1)],
		[0.5, Color(0.6, 0.05, 0.05, 1)],
		[1.0, Color(0.3, 0.02, 0.02, 0.5)]
	])
	
	return p

func _create_coins(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 10)
	p.lifetime = params.get("lifetime", 1.5)
	p.one_shot = true
	p.explosiveness = 0.8
	p.texture = _create_circle_texture(6, Color(1, 0.85, 0.2, 1))
	
	p.direction = Vector2(0, -1)
	p.spread = 45.0
	p.initial_velocity_min = 150.0
	p.initial_velocity_max = 250.0
	p.gravity = Vector2(0, 400)
	
	p.angular_velocity_min = 180.0
	p.angular_velocity_max = 360.0
	
	p.scale_amount_min = 0.6
	p.scale_amount_max = 1.0
	
	return p

func _create_default(params: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.amount = params.get("amount", 20)
	p.lifetime = params.get("lifetime", 1.0)
	p.texture = _default_particle_texture
	p.color = params.get("color", Color.WHITE)
	return p

# ============================================================
# TEXTURE GENERATION
# ============================================================

func _create_circle_texture(radius: int, color: Color) -> ImageTexture:
	var size = radius * 2
	var image = Image.create(size, size, false, Image.FORMAT_RGBA8)
	var center = Vector2(radius, radius)
	
	for x in range(size):
		for y in range(size):
			var dist = Vector2(x, y).distance_to(center)
			if dist <= radius:
				var alpha = 1.0 - (dist / radius)
				image.set_pixel(x, y, Color(color.r, color.g, color.b, color.a * alpha))
			else:
				image.set_pixel(x, y, Color(0, 0, 0, 0))
	
	return ImageTexture.create_from_image(image)

func _create_line_texture(width: int, height: int, color: Color) -> ImageTexture:
	var image = Image.create(width, height, false, Image.FORMAT_RGBA8)
	image.fill(color)
	return ImageTexture.create_from_image(image)

func _create_rect_texture(width: int, height: int, color: Color) -> ImageTexture:
	var image = Image.create(width, height, false, Image.FORMAT_RGBA8)
	image.fill(color)
	return ImageTexture.create_from_image(image)

func _create_leaf_texture() -> ImageTexture:
	var size = 12
	var image = Image.create(size, size, false, Image.FORMAT_RGBA8)
	
	# Simple leaf shape
	for x in range(size):
		for y in range(size):
			var nx = float(x) / size - 0.5
			var ny = float(y) / size - 0.5
			var dist = abs(nx) * 2.0 + abs(ny) * 1.5
			if dist < 0.5:
				image.set_pixel(x, y, Color(0.4, 0.7, 0.3, 1))
			else:
				image.set_pixel(x, y, Color(0, 0, 0, 0))
	
	return ImageTexture.create_from_image(image)

func _create_star_texture() -> ImageTexture:
	var size = 16
	var image = Image.create(size, size, false, Image.FORMAT_RGBA8)
	var center = Vector2(size / 2.0, size / 2.0)
	
	for x in range(size):
		for y in range(size):
			var pos = Vector2(x, y)
			var dir = (pos - center).normalized()
			var angle = atan2(dir.y, dir.x)
			var dist = pos.distance_to(center)
			
			# Star pattern
			var star_radius = 4.0 + 3.0 * abs(cos(angle * 5.0))
			
			if dist < star_radius:
				var alpha = 1.0 - (dist / star_radius)
				image.set_pixel(x, y, Color(1, 1, 0.8, alpha))
			else:
				image.set_pixel(x, y, Color(0, 0, 0, 0))
	
	return ImageTexture.create_from_image(image)

# ============================================================
# UTILITY
# ============================================================

func _create_gradient(stops: Array) -> Gradient:
	var gradient = Gradient.new()
	gradient.offsets = PackedFloat32Array()
	gradient.colors = PackedColorArray()
	
	for stop in stops:
		gradient.add_point(stop[0], stop[1])
	
	return gradient

func _create_scale_curve(values: Array) -> Curve:
	var curve = Curve.new()
	var step = 1.0 / (values.size() - 1)
	
	for i in range(values.size()):
		curve.add_point(Vector2(i * step, values[i]))
	
	return curve

func get_preset_by_name(name: String) -> Preset:
	match name.to_lower():
		"fire": return Preset.FIRE
		"smoke": return Preset.SMOKE
		"sparks": return Preset.SPARKS
		"magic": return Preset.MAGIC
		"explosion": return Preset.EXPLOSION
		"rain": return Preset.RAIN
		"snow": return Preset.SNOW
		"bubbles": return Preset.BUBBLES
		"confetti": return Preset.CONFETTI
		"dust": return Preset.DUST
		"leaves": return Preset.LEAVES
		"stars": return Preset.STARS
		"blood": return Preset.BLOOD
		"coins": return Preset.COINS
		_: return Preset.SPARKS
