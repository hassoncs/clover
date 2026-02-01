class_name SplatMapSystem extends RefCounted

var _bridge: Node
var _enabled: bool = false
var _viewport: SubViewport = null
var _canvas: CanvasLayer = null
var _proxies: Dictionary = {}  # entity_id -> SplatProxy node

const SPLAT_PROXY_SCENE = preload("res://scenes/SplatProxy.tscn")

func _init(bridge: Node) -> void:
	_bridge = bridge

func setup() -> void:
	if _enabled:
		return

	_viewport = SubViewport.new()
	_viewport.name = "SplatMap"
	_viewport.size = Vector2(512, 512)  # Low res is fine for splat map
	_viewport.transparent_bg = false
	_viewport.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE
	_viewport.render_target_clear_mode = SubViewport.CLEAR_MODE_ALWAYS
	_bridge.add_child(_viewport)

	_canvas = CanvasLayer.new()
	_viewport.add_child(_canvas)

	# Background black (no force)
	var bg = ColorRect.new()
	bg.color = Color.BLACK
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_canvas.add_child(bg)

	_enabled = true

func enable() -> void:
	if not _enabled:
		setup()

func disable() -> void:
	if _enabled and _viewport:
		for proxy in _proxies.values():
			proxy.queue_free()
		_proxies.clear()
		_viewport.queue_free()
		_viewport = null
		_canvas = null
		_enabled = false

func get_texture() -> Texture2D:
	if _viewport:
		return _viewport.get_texture()
	return null

func process(_delta: float) -> void:
	if not _enabled or not _viewport or not _canvas:
		return

	for entity_id in _bridge.entity_registry:
		var entity = _bridge.get_entity_node(entity_id)
		if not entity:
			continue

		# Skip stationary entities (optimization for 100+ entities)
		var vel = Vector2.ZERO
		if entity is RigidBody2D:
			vel = entity.linear_velocity
		elif entity is CharacterBody2D:
			vel = entity.velocity
		else:
			var record = _bridge.get_record(entity_id)
			if record:
				vel = record.velocity

		# Cull low-velocity entities (reduce updates)
		if vel.length_squared() < 0.01 and _proxies.has(entity_id):
			continue  # Skip update for stationary entities

		if not _proxies.has(entity_id):
			var proxy = SPLAT_PROXY_SCENE.instantiate()
			_canvas.add_child(proxy)
			_proxies[entity_id] = proxy

		var proxy = _proxies[entity_id]

		# Sync position (map game world to viewport)
		var cam = _bridge.get_viewport().get_camera_2d()
		if cam:
			var screen_pos = entity.get_global_transform_with_canvas().origin
			# Map screen pos to splat viewport
			var viewport_size = _bridge.get_viewport().get_visible_rect().size
			var uv = screen_pos / viewport_size
			proxy.position = uv * Vector2(_viewport.size)

		# Encode Velocity
		# R = X vel, G = Y vel, B = Presence
		# Normalize velocity (-20..20 -> 0..1)
		var r = clamp((vel.x / 40.0) + 0.5, 0.0, 1.0)
		var g = clamp((-vel.y / 40.0) + 0.5, 0.0, 1.0)  # Flip Y for texture space
		proxy.modulate = Color(r, g, 1.0, 1.0)

		# Scale proxy based on mass/size if possible, default to fixed size for now
		proxy.scale = Vector2(0.5, 0.5)

	# Clean up dead proxies
	var dead_ids = []
	for id in _proxies:
		if not _bridge.entity_registry.has(id):
			dead_ids.append(id)
	for id in dead_ids:
		_proxies[id].queue_free()
		_proxies.erase(id)
