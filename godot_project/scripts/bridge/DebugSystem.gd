class_name DebugSystem extends RefCounted

var _game_bridge: Node = null
var _debug_show_shapes: bool = false


func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge


func _js_set_debug_show_shapes(args: Array) -> void:
	if args.size() >= 1:
		_debug_show_shapes = bool(args[0])
		_game_bridge._visual_renderer.set_debug_show_shapes(_debug_show_shapes)


func _js_set_debug_settings(args: Array) -> void:
	if args.size() >= 1:
		var settings = args[0] as Dictionary
		if settings.has("showShapes"):
			_debug_show_shapes = settings["showShapes"]
			_game_bridge._visual_renderer.set_debug_show_shapes(_debug_show_shapes)


func is_debug_show_shapes() -> bool:
	return _debug_show_shapes
