class_name SyncSystem extends RefCounted

var _game_bridge: Node = null
var _js_transform_sync_callback: JavaScriptObject = null
var _js_property_sync_callback: JavaScriptObject = null


func _init(game_bridge: Node) -> void:
	_game_bridge = game_bridge


func _js_get_all_transforms(_args: Array) -> void:
	_notify_transform_sync()


func _js_get_all_properties(_args: Array) -> void:
	_notify_property_sync()


func _js_on_transform_sync(args: Array) -> void:
	if args.size() >= 1:
		_js_transform_sync_callback = args[0]


func _js_on_property_sync(args: Array) -> void:
	if args.size() >= 1:
		_js_property_sync_callback = args[0]


func _js_set_watch_config(args: Array) -> void:
	# Placeholder for watch configuration
	pass


func _notify_transform_sync() -> void:
	if _js_transform_sync_callback == null:
		return
	var transforms = _game_bridge.get_all_transforms()
	var json_str = JSON.stringify(transforms)
	_js_transform_sync_callback.call("call", null, json_str)


func _notify_property_sync() -> void:
	if _js_property_sync_callback == null:
		return
	var properties = _game_bridge.collect_all_properties()
	var json_str = JSON.stringify(properties)
	_js_property_sync_callback.call("call", null, json_str)
