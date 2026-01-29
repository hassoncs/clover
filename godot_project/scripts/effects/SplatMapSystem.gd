class_name SplatMapSystem extends RefCounted

const SPLAT_PROXY_SCENE = preload("res://scenes/SplatProxy.tscn")

var _splat_enabled: bool = false
var _splat_viewport: SubViewport = null
var _splat_canvas: CanvasLayer = null
var _splat_proxies: Dictionary = {}  # entity_id -> SplatProxy node
var _game_bridge: Node = null


func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge


func setup_splat_map() -> void:
	if _splat_enabled:
		return

	_splat_viewport = SubViewport.new()
	_splat_viewport.name = "SplatMap"
	_splat_viewport.size = Vector2(512, 512)
	_splat_viewport.transparent_bg = false
	_splat_viewport.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE
	_splat_viewport.render_target_clear_mode = SubViewport.CLEAR_MODE_ALWAYS
	_game_bridge.add_child(_splat_viewport)

	_splat_canvas = CanvasLayer.new()
	_splat_viewport.add_child(_splat_canvas)

	# Background black (no force)
	var bg = ColorRect.new()
	bg.color = Color.BLACK
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_splat_canvas.add_child(bg)

	_splat_enabled = true


func enable_splat_map() -> void:
	if not _splat_enabled:
		setup_splat_map()


func disable_splat_map() -> void:
	if _splat_enabled and _splat_viewport:
		for proxy in _splat_proxies.values():
			proxy.queue_free()
		_splat_proxies.clear()
		_splat_viewport.queue_free()
		_splat_viewport = null
		_splat_canvas = null
		_splat_enabled = false


func get_splat_texture() -> Texture2D:
	return _splat_viewport.get_texture()


func update_splat_proxies(entities: Dictionary, camera: Camera2D, viewport: Viewport) -> void:
	if not _splat_enabled or not _splat_viewport or not _splat_canvas:
		return

	for entity_id in entities:
		var entity = entities[entity_id]

		# Skip stationary entities (optimization for 100+ entities)
		var vel = Vector2.ZERO
		if entity is RigidBody2D:
			vel = entity.linear_velocity
		elif entity is CharacterBody2D:
			vel = entity.velocity
		elif entity is Area2D and entity.has_meta("velocity"):
			vel = entity.get_meta("velocity")

		# Cull low-velocity entities (reduce updates)
		if vel.length_squared() < 0.01 and _splat_proxies.has(entity_id):
			continue

		if not _splat_proxies.has(entity_id):
			var proxy = SPLAT_PROXY_SCENE.instantiate()
			_splat_canvas.add_child(proxy)
			_splat_proxies[entity_id] = proxy

		var proxy = _splat_proxies[entity_id]

		# Sync position (map game world to viewport)
		if camera:
			var screen_pos = entity.get_global_transform_with_canvas().origin
			# Map screen pos to splat viewport
			var viewport_size = viewport.get_visible_rect().size
			var uv = screen_pos / viewport_size
			proxy.position = uv * Vector2(_splat_viewport.size)

		# Encode Velocity
		# R = X vel, G = Y vel, B = Presence
		# Normalize velocity (-20..20 -> 0..1)
		var r = clamp((vel.x / 40.0) + 0.5, 0.0, 1.0)
		var g = clamp((-vel.y / 40.0) + 0.5, 0.0, 1.0)
		proxy.modulate = Color(r, g, 1.0, 1.0)

	# Cleanup proxies for destroyed entities
	for id in _splat_proxies:
		if not entities.has(id):
			_splat_proxies[id].queue_free()
			_splat_proxies.erase(id)


func is_enabled() -> bool:
	return _splat_enabled
