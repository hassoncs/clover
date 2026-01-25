class_name ParticleManager
extends RefCounted

var bridge: Node

func _init(game_bridge: Node) -> void:
	bridge = game_bridge

func spawn_particle(particle_type: String, x: float, y: float) -> void:
	var godot_pos = CoordinateUtils.game_to_godot_pos(Vector2(x, y), bridge.pixels_per_meter)
	
	var particles: GPUParticles2D = null
	
	match particle_type:
		"explosion":
			particles = _create_explosion_particles()
		"sparkle":
			particles = _create_sparkle_particles()
		"smoke":
			particles = _create_smoke_particles()
		"dust":
			particles = _create_dust_particles()
		_:
			push_error("[ParticleManager] Unknown particle type: " + particle_type)
			return
	
	if particles:
		particles.position = godot_pos
		particles.one_shot = true
		particles.emitting = true
		bridge.game_root.add_child(particles)
		
		var lifetime = particles.lifetime
		bridge.get_tree().create_timer(lifetime + 0.5).timeout.connect(func():
			if is_instance_valid(particles):
				particles.queue_free()
		)

func _create_explosion_particles() -> GPUParticles2D:
	var particles = GPUParticles2D.new()
	var material = ParticleProcessMaterial.new()
	
	material.direction = Vector3(0, -1, 0)
	material.spread = 180.0
	material.initial_velocity_min = 100.0
	material.initial_velocity_max = 200.0
	material.gravity = Vector3(0, 200, 0)
	material.scale_min = 0.5
	material.scale_max = 1.5
	material.color = Color(1.0, 0.5, 0.0, 1.0)
	
	particles.process_material = material
	particles.amount = 30
	particles.lifetime = 0.8
	
	return particles

func _create_sparkle_particles() -> GPUParticles2D:
	var particles = GPUParticles2D.new()
	var material = ParticleProcessMaterial.new()
	
	material.direction = Vector3(0, -1, 0)
	material.spread = 360.0
	material.initial_velocity_min = 50.0
	material.initial_velocity_max = 100.0
	material.gravity = Vector3(0, 50, 0)
	material.scale_min = 0.2
	material.scale_max = 0.5
	material.color = Color(1.0, 1.0, 0.5, 1.0)
	
	particles.process_material = material
	particles.amount = 20
	particles.lifetime = 1.0
	
	return particles

func _create_smoke_particles() -> GPUParticles2D:
	var particles = GPUParticles2D.new()
	var material = ParticleProcessMaterial.new()
	
	material.direction = Vector3(0, -1, 0)
	material.spread = 30.0
	material.initial_velocity_min = 20.0
	material.initial_velocity_max = 50.0
	material.gravity = Vector3(0, -50, 0)
	material.scale_min = 1.0
	material.scale_max = 2.0
	material.color = Color(0.5, 0.5, 0.5, 0.5)
	
	particles.process_material = material
	particles.amount = 15
	particles.lifetime = 1.5
	
	return particles

func _create_dust_particles() -> GPUParticles2D:
	var particles = GPUParticles2D.new()
	var material = ParticleProcessMaterial.new()
	
	material.direction = Vector3(0, 0, 0)
	material.spread = 360.0
	material.initial_velocity_min = 10.0
	material.initial_velocity_max = 30.0
	material.gravity = Vector3(0, 20, 0)
	material.scale_min = 0.3
	material.scale_max = 0.8
	material.color = Color(0.8, 0.7, 0.6, 0.6)
	
	particles.process_material = material
	particles.amount = 10
	particles.lifetime = 0.6
	
	return particles
