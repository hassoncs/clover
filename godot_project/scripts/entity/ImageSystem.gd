class_name ImageSystem extends RefCounted

var _game_bridge: Node = null
var _texture_cache: Dictionary = {}


func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge


func _js_set_entity_image(args: Array) -> void:
	if args.size() >= 5:
		set_entity_image(str(args[0]), str(args[1]), float(args[2]), float(args[3]))


func set_entity_image(entity_id: String, url: String, width: float, height: float) -> void:
	_game_bridge._visual_renderer.set_entity_image(entity_id, url, width, height)


func _js_set_entity_atlas_region(args: Array) -> void:
	if args.size() >= 7:
		var entity_id = str(args[0])
		var url = str(args[1])
		var x = int(args[2])
		var y = int(args[3])
		var w = int(args[4])
		var h = int(args[5])
		var scale = float(args[6]) if args.size() > 6 else 1.0
		_game_bridge._visual_renderer.set_entity_atlas_region(entity_id, url, x, y, w, h, scale)


func _js_clear_texture_cache(args: Array) -> void:
	_texture_cache.clear()


func _js_preload_textures(args: Array) -> void:
	# Placeholder for texture preloading
	pass
