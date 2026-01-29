class_name QuerySystem
extends RefCounted

# =============================================================================
# QUERY SYSTEM
# Shared async query infrastructure for JS <-> GDScript communication
# Used by both GameBridge (core) and DebugBridge (dev-only)
# =============================================================================

signal query_received(request_id: String, method: String, args: Array)

var _handlers: Dictionary = {}
var _js_query_callback: JavaScriptObject = null

func _init() -> void:
	pass

func setup_js_bridge(bridge_object: JavaScriptObject) -> void:
	if OS.get_name() != "Web":
		return
	
	_js_query_callback = JavaScriptBridge.create_callback(_on_js_query)
	bridge_object["query"] = _js_query_callback

func register_handler(method_name: String, callback: Callable) -> void:
	_handlers[method_name] = callback

func unregister_handler(method_name: String) -> void:
	_handlers.erase(method_name)

func has_handler(method_name: String) -> bool:
	return _handlers.has(method_name)

# Methods that require async handling (use await)
var _async_methods: Array[String] = ["step"]

func _on_js_query(args: Array) -> void:
	if args.size() < 3:
		push_error("[QuerySystem] query requires 3 args: requestId, method, argsJson")
		return
	
	var request_id = String(args[0])
	var method = String(args[1])
	var args_json = String(args[2])
	
	var method_args: Array = []
	if args_json != "[]" and args_json != "":
		var parse_result = JSON.parse_string(args_json)
		if parse_result != null:
			method_args = parse_result if parse_result is Array else [parse_result]
	
	# For async methods, use the async dispatch path
	if method in _async_methods:
		_handle_async_query(request_id, method, method_args)
	else:
		var result = dispatch(method, method_args)
		send_response(request_id, result)

func _handle_async_query(request_id: String, method: String, method_args: Array) -> void:
	var result = await dispatch_async(method, method_args)
	send_response(request_id, result)

func dispatch(method: String, args: Array) -> Variant:
	print("[QuerySystem] dispatch: method=%s, args=%s" % [method, str(args)])
	if _handlers.has(method):
		var callback: Callable = _handlers[method]
		if callback.is_valid():
			var result = callback.call(args)
			print("[QuerySystem] dispatch result: %s" % str(result))
			return result
	
	push_error("[QuerySystem] Unknown query method: %s" % method)
	return {"error": "Unknown method: %s" % method}

# Async dispatch that properly awaits coroutines
func dispatch_async(method: String, args: Array) -> Variant:
	print("[QuerySystem] dispatch_async: method=%s, args=%s" % [method, str(args)])
	if _handlers.has(method):
		var callback: Callable = _handlers[method]
		if callback.is_valid():
			var result = callback.call(args)
			# If result is a coroutine/signal, await it
			if result is Object and result.has_signal("completed"):
				result = await result
			print("[QuerySystem] dispatch_async result: %s" % str(result))
			return result
	
	push_error("[QuerySystem] Unknown query method: %s" % method)
	return {"error": "Unknown method: %s" % method}

func send_response(request_id: String, result: Variant) -> void:
	if OS.get_name() != "Web":
		return
	
	var result_json = JSON.stringify(result) if result != null else "null"
	var escaped_json = result_json.replace("\\", "\\\\").replace("'", "\\'")
	var js_code = "(window.parent || window)._godotQueryResolve('%s', '%s');" % [request_id, escaped_json]
	JavaScriptBridge.eval(js_code)
